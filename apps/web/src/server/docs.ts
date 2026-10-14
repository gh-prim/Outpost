import { prisma, WorkspaceRole } from "@outpost/db";
import type { z } from "zod";
import { auditContext, recordAudit } from "./audit";
import type { Actor } from "./context";
import { HttpError, notFound } from "./errors";
import { requireWorkspaceRole } from "./policy";
import type { publishDocsInput } from "./schemas";

/** Values shown in documentation. Secrets never leave the server. */
export async function docsVariables(environmentId: string | null | undefined) {
  if (!environmentId) return new Map<string, string>();
  const environment = await prisma.environment.findUnique({ where: { id: environmentId } });
  const values = (environment?.values ?? []) as { key: string; value: string; type: string; enabled: boolean }[];
  // Only plain values: secrets and vault references stay as {{variables}}.
  return new Map(values.filter((v) => v.enabled && v.type === "default").map((v) => [v.key, v.value]));
}

export async function getPublishedDocs(slug: string) {
  const publication = await prisma.docsPublication.findUnique({
    where: { slug },
    include: {
      collection: { select: { content: true, deletedAt: true, workspace: { select: { archivedAt: true } } } },
    },
  });
  if (!publication || publication.collection.deletedAt || publication.collection.workspace.archivedAt) return null;
  return publication;
}

async function requireCollectionForDocs(actor: Actor, collectionId: string) {
  const collection = await prisma.collection.findFirst({ where: { id: collectionId, deletedAt: null } });
  if (!collection) throw notFound("Collection");
  const { workspace } = await requireWorkspaceRole(actor.userId, collection.workspaceId, WorkspaceRole.EDITOR);
  return { collection, workspace };
}

export async function publishDocs(actor: Actor, collectionId: string, input: z.infer<typeof publishDocsInput>) {
  const { collection, workspace } = await requireCollectionForDocs(actor, collectionId);
  if (input.environmentId) {
    const environment = await prisma.environment.findFirst({
      where: { id: input.environmentId, workspaceId: collection.workspaceId },
    });
    if (!environment) throw new HttpError(400, "Unknown environment in this workspace");
  }
  const taken = await prisma.docsPublication.findUnique({ where: { slug: input.slug } });
  if (taken && taken.collectionId !== collectionId) throw new HttpError(409, "This address is already used");

  const publication = await prisma.docsPublication.upsert({
    where: { collectionId },
    create: { ...input, collectionId },
    update: input,
  });
  await recordAudit({
    ...auditContext(actor),
    organizationId: workspace.organizationId,
    action: "docs.publish",
    targetType: "collection",
    targetId: collectionId,
    metadata: { slug: publication.slug },
  });
  return publication;
}

export async function unpublishDocs(actor: Actor, collectionId: string) {
  const { workspace } = await requireCollectionForDocs(actor, collectionId);
  await prisma.docsPublication.deleteMany({ where: { collectionId } });
  await recordAudit({
    ...auditContext(actor),
    organizationId: workspace.organizationId,
    action: "docs.unpublish",
    targetType: "collection",
    targetId: collectionId,
  });
}
