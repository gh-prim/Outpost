import { decryptSecret, encryptSecret, prisma, type Prisma, WorkspaceRole } from "@outpost/db";
import type { z } from "zod";
import { auditContext, recordAudit } from "./audit";
import type { Actor } from "./context";
import { HttpError, notFound } from "./errors";
import { publish } from "./events";
import { environmentVariables } from "./run";
import { hasRole, requireWorkspaceRole } from "./policy";
import type { createEnvironmentInput, environmentValue, updateEnvironmentInput } from "./schemas";

type EnvironmentValue = z.infer<typeof environmentValue>;

const MASK = "••••••••";

function notifyChange(actor: Actor, workspaceId: string, id: string) {
  return publish({ type: "environment.changed", workspaceId, id, actor: { id: actor.userId, name: actor.name } });
}

function encryptValues(values: EnvironmentValue[]) {
  return values.map((v) => (v.type === "secret" ? { ...v, value: encryptSecret(v.value) } : v));
}

/** Secrets are readable by runners and above; viewers only see that a secret exists. */
function revealValues(values: Prisma.JsonValue, role: WorkspaceRole) {
  const canReadSecrets = hasRole(role, WorkspaceRole.RUNNER);
  return (values as EnvironmentValue[]).map((v) =>
    v.type === "secret" ? { ...v, value: canReadSecrets ? decryptSecret(v.value) : MASK } : v,
  );
}

async function requireEnvironment(actor: Actor, environmentId: string, required: WorkspaceRole) {
  const environment = await prisma.environment.findUnique({ where: { id: environmentId } });
  if (!environment) throw notFound("Environment");
  const { workspace, role } = await requireWorkspaceRole(actor.userId, environment.workspaceId, required);
  return { environment, workspace, role };
}

export async function listEnvironments(actor: Actor, workspaceId: string) {
  await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.VIEWER);
  return prisma.environment.findMany({
    where: { workspaceId },
    select: { id: true, name: true, version: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
}

export async function createEnvironment(
  actor: Actor,
  workspaceId: string,
  input: z.infer<typeof createEnvironmentInput>,
) {
  const { workspace, role } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.EDITOR);
  const created = await prisma.$transaction(async (tx) => {
    const environment = await tx.environment.create({
      data: { workspaceId, name: input.name, values: encryptValues(input.values) },
    });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "environment.create",
        targetType: "environment",
        targetId: environment.id,
        metadata: { name: environment.name, workspaceId },
      },
      tx,
    );
    return { ...environment, values: revealValues(environment.values, role) };
  });
  await notifyChange(actor, workspaceId, created.id);
  return created;
}

/**
 * With `resolve`, returns the values a run would use (secrets decrypted, vault references fetched),
 * which is what the desktop app needs to run requests locally. Runners and above only.
 */
export async function getEnvironment(actor: Actor, environmentId: string, options: { resolve?: boolean } = {}) {
  const required = options.resolve ? WorkspaceRole.RUNNER : WorkspaceRole.VIEWER;
  const { environment, role } = await requireEnvironment(actor, environmentId, required);
  if (options.resolve) {
    return { ...environment, values: await environmentVariables(environment.workspaceId, environment.id) };
  }
  return { ...environment, values: revealValues(environment.values, role) };
}

export async function updateEnvironment(
  actor: Actor,
  environmentId: string,
  input: z.infer<typeof updateEnvironmentInput>,
) {
  const { role, workspace } = await requireEnvironment(actor, environmentId, WorkspaceRole.EDITOR);
  const { count } = await prisma.environment.updateMany({
    where: { id: environmentId, version: input.baseVersion },
    data: {
      name: input.name,
      values: input.values ? encryptValues(input.values) : undefined,
      version: input.baseVersion + 1,
    },
  });
  if (count === 0) throw new HttpError(409, "The environment was changed by someone else. Reload and try again.");
  const environment = await prisma.environment.findUniqueOrThrow({ where: { id: environmentId } });
  await notifyChange(actor, workspace.id, environmentId);
  return { ...environment, values: revealValues(environment.values, role) };
}

export async function deleteEnvironment(actor: Actor, environmentId: string) {
  const { environment, workspace } = await requireEnvironment(actor, environmentId, WorkspaceRole.EDITOR);
  await prisma.$transaction(async (tx) => {
    await tx.environment.delete({ where: { id: environmentId } });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "environment.delete",
        targetType: "environment",
        targetId: environmentId,
        metadata: { name: environment.name },
      },
      tx,
    );
  });
  await notifyChange(actor, workspace.id, environmentId);
}
