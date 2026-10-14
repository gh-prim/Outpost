import { prisma, WorkspaceRole } from "@outpost/db";
import type { z } from "zod";
import { auditContext, recordAudit } from "./audit";
import type { Actor } from "./context";
import { HttpError, notFound } from "./errors";
import { getWorkspaceRole, requireOrgMember, requireWorkspaceRole } from "./policy";
import type { addWorkspaceMemberInput, createWorkspaceInput, updateWorkspaceInput } from "./schemas";
import { toSlug } from "./slug";

export async function listWorkspaces(actor: Actor, organizationId: string) {
  await requireOrgMember(actor.userId, organizationId);
  const workspaces = await prisma.workspace.findMany({
    where: { organizationId, archivedAt: null },
    orderBy: { name: "asc" },
  });
  const withRoles = await Promise.all(
    workspaces.map(async (workspace) => ({ ...workspace, role: await getWorkspaceRole(actor.userId, workspace) })),
  );
  return withRoles.filter((workspace) => workspace.role !== null);
}

async function uniqueSlug(organizationId: string, name: string) {
  const base = toSlug(name);
  const taken = new Set(
    (
      await prisma.workspace.findMany({
        where: { organizationId, slug: { startsWith: base } },
        select: { slug: true },
      })
    ).map((w) => w.slug),
  );
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

export async function createWorkspace(actor: Actor, input: z.infer<typeof createWorkspaceInput>) {
  await requireOrgMember(actor.userId, input.organizationId);
  const slug = await uniqueSlug(input.organizationId, input.name);

  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: {
        ...input,
        slug,
        createdById: actor.userId,
        members: { create: { userId: actor.userId, role: WorkspaceRole.ADMIN } },
      },
    });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "workspace.create",
        targetType: "workspace",
        targetId: workspace.id,
        metadata: { name: workspace.name, visibility: workspace.visibility },
      },
      tx,
    );
    return workspace;
  });
}

export async function getWorkspace(actor: Actor, workspaceId: string) {
  const { workspace, role } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.VIEWER);
  return { ...workspace, role };
}

export async function updateWorkspace(
  actor: Actor,
  workspaceId: string,
  input: z.infer<typeof updateWorkspaceInput>,
) {
  await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.ADMIN);
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.update({ where: { id: workspaceId }, data: input });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "workspace.update",
        targetType: "workspace",
        targetId: workspace.id,
        metadata: input,
      },
      tx,
    );
    return workspace;
  });
}

export async function archiveWorkspace(actor: Actor, workspaceId: string) {
  const { workspace } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.ADMIN);
  await prisma.$transaction(async (tx) => {
    await tx.workspace.update({ where: { id: workspaceId }, data: { archivedAt: new Date() } });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "workspace.archive",
        targetType: "workspace",
        targetId: workspaceId,
      },
      tx,
    );
  });
}

export async function listWorkspaceMembers(actor: Actor, workspaceId: string) {
  await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.VIEWER);
  return prisma.workspaceMember.findMany({
    where: { workspaceId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function addWorkspaceMember(
  actor: Actor,
  workspaceId: string,
  input: z.infer<typeof addWorkspaceMemberInput>,
) {
  const { workspace } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.ADMIN);

  // Members must belong to the workspace's organization.
  if (input.userId) {
    const isMember = await prisma.member.findFirst({
      where: { userId: input.userId, organizationId: workspace.organizationId },
    });
    if (!isMember) throw new HttpError(400, "This user is not a member of the organization");
  } else {
    const team = await prisma.team.findFirst({
      where: { id: input.teamId, organizationId: workspace.organizationId },
    });
    if (!team) throw new HttpError(400, "This team does not belong to the organization");
  }

  const where = input.userId
    ? { workspaceId_userId: { workspaceId, userId: input.userId } }
    : { workspaceId_teamId: { workspaceId, teamId: input.teamId! } };

  return prisma.$transaction(async (tx) => {
    const member = await tx.workspaceMember.upsert({
      where,
      create: { workspaceId, userId: input.userId, teamId: input.teamId, role: input.role },
      update: { role: input.role },
    });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "workspace.member.set",
        targetType: "workspace",
        targetId: workspaceId,
        metadata: { userId: input.userId, teamId: input.teamId, role: input.role },
      },
      tx,
    );
    return member;
  });
}

export async function removeWorkspaceMember(actor: Actor, workspaceId: string, memberId: string) {
  const { workspace } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.ADMIN);
  const member = await prisma.workspaceMember.findFirst({ where: { id: memberId, workspaceId } });
  if (!member) throw notFound("Member");
  await prisma.$transaction(async (tx) => {
    await tx.workspaceMember.delete({ where: { id: memberId } });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "workspace.member.remove",
        targetType: "workspace",
        targetId: workspaceId,
        metadata: { userId: member.userId, teamId: member.teamId },
      },
      tx,
    );
  });
}
