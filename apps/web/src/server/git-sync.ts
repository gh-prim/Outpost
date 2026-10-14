import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { decryptSecret, encryptSecret, prisma, WorkspaceRole } from "@outpost/db";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import type { z } from "zod";
import { auditContext, recordAudit } from "./audit";
import { createCollection, updateCollection } from "./collections";
import type { Actor } from "./context";
import { HttpError, notFound } from "./errors";
import { requireWorkspaceRole } from "./policy";
import type { collectionDocument, gitSyncInput } from "./schemas";
import { toSlug } from "./slug";

type CollectionDocument = z.infer<typeof collectionDocument>;
type EnvValue = { key: string; value: string; type: string; enabled: boolean };

export async function getGitSync(actor: Actor, workspaceId: string) {
  await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.VIEWER);
  const sync = await prisma.gitSync.findUnique({ where: { workspaceId } });
  if (!sync) return null;
  const { token, ...rest } = sync;
  return { ...rest, hasToken: Boolean(token) };
}

export async function configureGitSync(actor: Actor, workspaceId: string, input: z.infer<typeof gitSyncInput>) {
  const { workspace } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.ADMIN);
  const token = input.token === undefined ? undefined : input.token === null ? null : encryptSecret(input.token);
  const data = {
    repoUrl: input.repoUrl,
    branch: input.branch,
    directory: input.directory,
    ...(token !== undefined ? { token } : {}),
  };
  await prisma.gitSync.upsert({ where: { workspaceId }, create: { ...data, workspaceId }, update: data });
  await recordAudit({
    ...auditContext(actor),
    organizationId: workspace.organizationId,
    action: "git_sync.configure",
    targetType: "workspace",
    targetId: workspaceId,
    metadata: { repoUrl: input.repoUrl, branch: input.branch, directory: input.directory },
  });
  return getGitSync(actor, workspaceId);
}

async function requireSync(workspaceId: string) {
  const sync = await prisma.gitSync.findUnique({ where: { workspaceId } });
  if (!sync) throw notFound("Git sync configuration");
  return sync;
}

function onAuth(token: string | null) {
  // Works with GitHub, GitLab, Gitea and Bitbucket personal access tokens.
  return token ? () => ({ username: "x-access-token", password: decryptSecret(token) }) : undefined;
}

/** Points HEAD at a branch that has no commit yet; the first commit creates it. */
async function startBranch(dir: string, branch: string) {
  await git.writeRef({ fs, dir, ref: "HEAD", value: `refs/heads/${branch}`, symbolic: true, force: true });
}

/** Fresh shallow checkout of the branch, or an empty repository when the branch does not exist yet. */
async function checkout(sync: { repoUrl: string; branch: string; token: string | null }) {
  const dir = await mkdtemp(path.join(tmpdir(), "outpost-git-"));
  try {
    await git.clone({
      fs,
      http,
      dir,
      url: sync.repoUrl,
      ref: sync.branch,
      singleBranch: true,
      depth: 1,
      onAuth: onAuth(sync.token),
    });
    // Cloning an empty repository succeeds without any branch: start the branch from scratch.
    const hasBranch = await git.resolveRef({ fs, dir, ref: "HEAD" }).then(
      () => true,
      () => false,
    );
    if (!hasBranch) await startBranch(dir, sync.branch);
    return { dir, isNew: !hasBranch };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== "NotFoundError" && code !== "MissingRefError" && !/could not find/i.test(String(error))) {
      await rm(dir, { recursive: true, force: true });
      throw new HttpError(502, `Git: ${(error as Error).message}`);
    }
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    await git.init({ fs, dir });
    await git.addRemote({ fs, dir, remote: "origin", url: sync.repoUrl });
    await startBranch(dir, sync.branch);
    return { dir, isNew: true };
  }
}

async function jsonFiles(dir: string) {
  try {
    return (await readdir(dir)).filter((name) => name.endsWith(".json"));
  } catch {
    return [];
  }
}

/** Writes every collection and environment (secrets left empty) and pushes a commit if anything changed. */
export async function pushToGit(actor: Actor, workspaceId: string) {
  const { workspace } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.EDITOR);
  const sync = await requireSync(workspaceId);
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: { name: true, email: true },
  });
  const [collections, environments] = await Promise.all([
    prisma.collection.findMany({ where: { workspaceId, deletedAt: null } }),
    prisma.environment.findMany({ where: { workspaceId } }),
  ]);

  const { dir } = await checkout(sync);
  try {
    const collectionsDir = path.join(dir, sync.directory, "collections");
    const environmentsDir = path.join(dir, sync.directory, "environments");
    await mkdir(collectionsDir, { recursive: true });
    await mkdir(environmentsDir, { recursive: true });

    const written = new Set<string>();
    const write = async (folder: string, name: string, data: unknown) => {
      const file = path.join(folder, `${name}.json`);
      written.add(file);
      await writeFile(file, JSON.stringify(data, null, 2) + "\n");
    };
    for (const collection of collections) {
      const content = collection.content as CollectionDocument;
      await write(collectionsDir, `${toSlug(collection.name)}-${collection.id.slice(-6)}`, {
        ...content,
        info: { ...content.info, outpostId: collection.id },
      });
    }
    for (const environment of environments) {
      const values = (environment.values as EnvValue[]).map((v) => (v.type === "secret" ? { ...v, value: "" } : v));
      await write(environmentsDir, `${toSlug(environment.name)}-${environment.id.slice(-6)}`, {
        outpostId: environment.id,
        name: environment.name,
        values,
      });
    }
    // Files of deleted collections and environments go away too.
    for (const folder of [collectionsDir, environmentsDir]) {
      for (const name of await jsonFiles(folder)) {
        const file = path.join(folder, name);
        if (!written.has(file)) await rm(file);
      }
    }

    const changes = (await git.statusMatrix({ fs, dir, filepaths: [sync.directory] })).filter(
      ([, head, workdir, stage]) => !(head === 1 && workdir === 1 && stage === 1),
    );
    if (changes.length === 0) return { changed: false, commit: sync.lastCommit };
    for (const [filepath, , workdir] of changes) {
      if (workdir === 0) await git.remove({ fs, dir, filepath });
      else await git.add({ fs, dir, filepath });
    }
    const commit = await git.commit({
      fs,
      dir,
      message: `Update ${workspace.name} from Outpost`,
      author: { name: user.name, email: user.email },
    });
    await git
      .push({ fs, http, dir, remote: "origin", ref: sync.branch, onAuth: onAuth(sync.token) })
      .catch((error: Error) => {
        throw new HttpError(502, `Git push failed: ${error.message}`);
      });

    await prisma.gitSync.update({ where: { workspaceId }, data: { lastCommit: commit, lastSyncedAt: new Date() } });
    await recordAudit({
      ...auditContext(actor),
      organizationId: workspace.organizationId,
      action: "git_sync.push",
      targetType: "workspace",
      targetId: workspaceId,
      metadata: { commit, files: changes.length },
    });
    return { changed: true, commit, files: changes.length };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Imports the repository's files: known collections get a new version when they differ, unknown
 * ones are created. Environments are updated by key; secret values stay as they are in Outpost.
 * Nothing is deleted on pull.
 */
export async function pullFromGit(actor: Actor, workspaceId: string) {
  const { workspace } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.EDITOR);
  const sync = await requireSync(workspaceId);
  const { dir, isNew } = await checkout(sync);
  const result = { created: 0, updated: 0, unchanged: 0, environments: 0 };
  try {
    if (isNew) return result;
    const collectionsDir = path.join(dir, sync.directory, "collections");
    for (const name of await jsonFiles(collectionsDir)) {
      const document = JSON.parse(await readFile(path.join(collectionsDir, name), "utf8")) as CollectionDocument & {
        info: { outpostId?: string };
      };
      if (!document?.info?.name || !Array.isArray(document.item)) continue;
      const { outpostId, ...info } = document.info;
      const content = { ...document, info } as CollectionDocument;
      const existing = outpostId
        ? await prisma.collection.findFirst({ where: { id: outpostId, workspaceId, deletedAt: null } })
        : null;
      if (!existing) {
        await createCollection(actor, workspaceId, { content });
        result.created++;
      } else if (JSON.stringify(existing.content) !== JSON.stringify(content)) {
        await updateCollection(actor, existing.id, { content, baseVersion: existing.version });
        result.updated++;
      } else {
        result.unchanged++;
      }
    }

    const environmentsDir = path.join(dir, sync.directory, "environments");
    for (const name of await jsonFiles(environmentsDir)) {
      const data = JSON.parse(await readFile(path.join(environmentsDir, name), "utf8")) as {
        outpostId?: string;
        name?: string;
        values?: EnvValue[];
      };
      const environment = data.outpostId
        ? await prisma.environment.findFirst({ where: { id: data.outpostId, workspaceId } })
        : null;
      if (!environment || !Array.isArray(data.values)) continue;
      const current = new Map((environment.values as EnvValue[]).map((v) => [v.key, v]));
      const values = data.values.map((v) => {
        const kept = current.get(v.key);
        return v.type === "secret" ? { ...v, value: kept?.type === "secret" ? kept.value : "" } : v;
      });
      await prisma.environment.update({
        where: { id: environment.id },
        data: { values, name: data.name ?? environment.name, version: { increment: 1 } },
      });
      result.environments++;
    }

    await prisma.gitSync.update({
      where: { workspaceId },
      data: { lastCommit: await git.resolveRef({ fs, dir, ref: "HEAD" }), lastSyncedAt: new Date() },
    });
    await recordAudit({
      ...auditContext(actor),
      organizationId: workspace.organizationId,
      action: "git_sync.pull",
      targetType: "workspace",
      targetId: workspaceId,
      metadata: result,
    });
    return result;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
