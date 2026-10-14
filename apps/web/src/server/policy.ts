import { prisma, type Workspace, WorkspaceRole } from "@outpost/db";
import { forbidden, notFound } from "./errors";

const roleRank: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  RUNNER: 2,
  EDITOR: 3,
  ADMIN: 4,
};

export function hasRole(role: WorkspaceRole | null, required: WorkspaceRole) {
  return role !== null && roleRank[role] >= roleRank[required];
}

function isOrgAdminRole(role: string) {
  return role.split(",").some((r) => r === "owner" || r === "admin");
}

export async function getOrgRole(userId: string, organizationId: string) {
  const member = await prisma.member.findFirst({ where: { userId, organizationId } });
  if (!member) return null;
  return isOrgAdminRole(member.role) ? "admin" : "member";
}

export async function requireOrgMember(userId: string, organizationId: string) {
  const role = await getOrgRole(userId, organizationId);
  if (!role) throw notFound("Organization");
  return role;
}

export async function requireOrgAdmin(userId: string, organizationId: string) {
  if ((await requireOrgMember(userId, organizationId)) !== "admin") throw forbidden();
}

/**
 * Effective role of a user in a workspace:
 * organization owners and admins are workspace admins, then the highest of the
 * direct and team memberships, then viewer for organization-visible workspaces.
 */
export async function getWorkspaceRole(userId: string, workspace: Workspace): Promise<WorkspaceRole | null> {
  const orgRole = await getOrgRole(userId, workspace.organizationId);
  if (!orgRole) return null;
  if (orgRole === "admin") return WorkspaceRole.ADMIN;

  const memberships = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: workspace.id,
      OR: [{ userId }, { team: { teammembers: { some: { userId } } } }],
    },
    select: { role: true },
  });
  const best = memberships.map((m) => m.role).sort((a, b) => roleRank[b] - roleRank[a])[0];
  if (best) return best;

  return workspace.visibility === "ORGANIZATION" ? WorkspaceRole.VIEWER : null;
}

/** Loads a workspace and checks the user has at least `required` on it. Hides workspaces the user cannot see. */
export async function requireWorkspaceRole(userId: string, workspaceId: string, required: WorkspaceRole) {
  const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!workspace || workspace.archivedAt) throw notFound("Workspace");
  const role = await getWorkspaceRole(userId, workspace);
  if (!role) throw notFound("Workspace");
  if (!hasRole(role, required)) throw forbidden();
  return { workspace, role };
}
