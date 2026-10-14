import { prisma, type Prisma, WorkspaceRole } from "@outpost/db";
import type { z } from "zod";
import { auditContext, recordAudit } from "./audit";
import type { Actor } from "./context";
import { HttpError, notFound } from "./errors";
import { requireWorkspaceRole } from "./policy";
import type { collectionDocument, createCollectionInput, updateCollectionInput } from "./schemas";

const SCHEMA_V21 = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

type CollectionDocument = z.infer<typeof collectionDocument>;

function emptyDocument(name: string): CollectionDocument {
  return { info: { name, schema: SCHEMA_V21 }, item: [] };
}

/** Loads a live collection and checks the user's role on its workspace. */
async function requireCollection(actor: Actor, collectionId: string, required: WorkspaceRole) {
  const collection = await prisma.collection.findFirst({ where: { id: collectionId, deletedAt: null } });
  if (!collection) throw notFound("Collection");
  const { workspace } = await requireWorkspaceRole(actor.userId, collection.workspaceId, required);
  return { collection, workspace };
}

export async function listCollections(actor: Actor, workspaceId: string) {
  await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.VIEWER);
  return prisma.collection.findMany({
    where: { workspaceId, deletedAt: null },
    select: { id: true, name: true, version: true, createdAt: true, updatedAt: true },
    orderBy: { name: "asc" },
  });
}

export async function createCollection(
  actor: Actor,
  workspaceId: string,
  input: z.infer<typeof createCollectionInput>,
) {
  const { workspace } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.EDITOR);
  const content = "content" in input ? input.content : emptyDocument(input.name);
  const json = content as Prisma.InputJsonValue;

  return prisma.$transaction(async (tx) => {
    const collection = await tx.collection.create({
      data: {
        workspaceId,
        name: content.info.name,
        content: json,
        versions: { create: { version: 1, content: json, authorId: actor.userId } },
      },
    });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "content" in input ? "collection.import" : "collection.create",
        targetType: "collection",
        targetId: collection.id,
        metadata: { name: collection.name, workspaceId },
      },
      tx,
    );
    return collection;
  });
}

export async function getCollection(actor: Actor, collectionId: string) {
  return (await requireCollection(actor, collectionId, WorkspaceRole.VIEWER)).collection;
}

/** Saves a new version. Fails with 409 if someone saved since `baseVersion`. */
export async function updateCollection(
  actor: Actor,
  collectionId: string,
  input: z.infer<typeof updateCollectionInput>,
) {
  await requireCollection(actor, collectionId, WorkspaceRole.EDITOR);
  const json = input.content as Prisma.InputJsonValue;
  const version = input.baseVersion + 1;

  return prisma.$transaction(async (tx) => {
    const { count } = await tx.collection.updateMany({
      where: { id: collectionId, version: input.baseVersion, deletedAt: null },
      data: { content: json, name: input.content.info.name, version },
    });
    if (count === 0) throw new HttpError(409, "The collection was changed by someone else. Reload and try again.");
    await tx.collectionVersion.create({ data: { collectionId, version, content: json, authorId: actor.userId } });
    return tx.collection.findUniqueOrThrow({ where: { id: collectionId } });
  });
}

export async function deleteCollection(actor: Actor, collectionId: string) {
  const { collection, workspace } = await requireCollection(actor, collectionId, WorkspaceRole.EDITOR);
  await prisma.$transaction(async (tx) => {
    await tx.collection.update({ where: { id: collectionId }, data: { deletedAt: new Date() } });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "collection.delete",
        targetType: "collection",
        targetId: collectionId,
        metadata: { name: collection.name },
      },
      tx,
    );
  });
}

export async function listCollectionVersions(actor: Actor, collectionId: string) {
  await requireCollection(actor, collectionId, WorkspaceRole.VIEWER);
  return prisma.collectionVersion.findMany({
    where: { collectionId },
    select: { version: true, createdAt: true, author: { select: { id: true, name: true, email: true } } },
    orderBy: { version: "desc" },
  });
}

/** Restores an old version by saving its content as the newest version. */
export async function restoreCollectionVersion(actor: Actor, collectionId: string, version: number) {
  const { collection } = await requireCollection(actor, collectionId, WorkspaceRole.EDITOR);
  const snapshot = await prisma.collectionVersion.findUnique({
    where: { collectionId_version: { collectionId, version } },
  });
  if (!snapshot) throw notFound("Version");
  return updateCollection(actor, collectionId, {
    content: snapshot.content as CollectionDocument,
    baseVersion: collection.version,
  });
}
