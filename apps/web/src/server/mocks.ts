import { prisma, WorkspaceRole } from "@outpost/db";
import type { z } from "zod";
import { auditContext, recordAudit } from "./audit";
import type { Actor } from "./context";
import { HttpError, notFound } from "./errors";
import { requireWorkspaceRole } from "./policy";
import type { createMockInput, updateMockInput } from "./schemas";

export function mockUrl(mockId: string) {
  return `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/mock/${mockId}`;
}

async function requireMock(actor: Actor, mockId: string, required: WorkspaceRole) {
  const mock = await prisma.mockServer.findUnique({ where: { id: mockId } });
  if (!mock) throw notFound("Mock server");
  const { workspace } = await requireWorkspaceRole(actor.userId, mock.workspaceId, required);
  return { mock, workspace };
}

export async function listMocks(actor: Actor, workspaceId: string) {
  await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.VIEWER);
  const mocks = await prisma.mockServer.findMany({
    where: { workspaceId },
    include: { collection: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return mocks.map((m) => ({ ...m, url: mockUrl(m.id) }));
}

export async function createMock(actor: Actor, workspaceId: string, input: z.infer<typeof createMockInput>) {
  const { workspace } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.EDITOR);
  const collection = await prisma.collection.findFirst({
    where: { id: input.collectionId, workspaceId, deletedAt: null },
  });
  if (!collection) throw new HttpError(400, "Unknown collection in this workspace");
  if (input.environmentId) {
    const environment = await prisma.environment.findFirst({ where: { id: input.environmentId, workspaceId } });
    if (!environment) throw new HttpError(400, "Unknown environment in this workspace");
  }
  const mock = await prisma.mockServer.create({ data: { ...input, workspaceId } });
  await recordAudit({
    ...auditContext(actor),
    organizationId: workspace.organizationId,
    action: "mock.create",
    targetType: "mockServer",
    targetId: mock.id,
    metadata: { name: mock.name, isPrivate: mock.isPrivate },
  });
  return { ...mock, url: mockUrl(mock.id) };
}

export async function updateMock(actor: Actor, mockId: string, input: z.infer<typeof updateMockInput>) {
  const { workspace } = await requireMock(actor, mockId, WorkspaceRole.EDITOR);
  const mock = await prisma.mockServer.update({ where: { id: mockId }, data: input });
  await recordAudit({
    ...auditContext(actor),
    organizationId: workspace.organizationId,
    action: "mock.update",
    targetType: "mockServer",
    targetId: mockId,
    metadata: input,
  });
  return { ...mock, url: mockUrl(mock.id) };
}

export async function deleteMock(actor: Actor, mockId: string) {
  const { mock, workspace } = await requireMock(actor, mockId, WorkspaceRole.EDITOR);
  await prisma.mockServer.delete({ where: { id: mockId } });
  await recordAudit({
    ...auditContext(actor),
    organizationId: workspace.organizationId,
    action: "mock.delete",
    targetType: "mockServer",
    targetId: mockId,
    metadata: { name: mock.name },
  });
}
