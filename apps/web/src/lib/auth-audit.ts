import { prisma } from "@outpost/db";
import { createAuthMiddleware } from "better-auth/api";
import { recordAudit } from "@/server/audit";

/** Better Auth endpoints that change who can access what, and their audit action names. */
const auditedPaths: Record<string, string> = {
  "/organization/create": "organization.create",
  "/organization/update": "organization.update",
  "/organization/delete": "organization.delete",
  "/organization/invite-member": "organization.member.invite",
  "/organization/accept-invitation": "organization.member.join",
  "/organization/remove-member": "organization.member.remove",
  "/organization/update-member-role": "organization.member.role",
  "/organization/leave": "organization.member.leave",
  "/organization/create-team": "team.create",
  "/organization/update-team": "team.update",
  "/organization/remove-team": "team.delete",
  "/organization/add-team-member": "team.member.add",
  "/organization/remove-team-member": "team.member.remove",
  "/sso/register": "sso.provider.create",
  "/sso/update-provider": "sso.provider.update",
  "/sso/delete-provider": "sso.provider.delete",
  "/sso/verify-domain": "sso.domain.verify",
  "/sign-out": "auth.sign_out",
};

// Body fields worth keeping. Never secrets such as client secrets or certificates.
const keptBodyFields = ["organizationId", "memberId", "userId", "email", "role", "teamId", "name", "slug", "providerId", "domain"];

function pick(body: unknown) {
  if (!body || typeof body !== "object") return undefined;
  const entries = Object.entries(body).filter(([key]) => keptBodyFields.includes(key));
  return entries.length ? Object.fromEntries(entries) : undefined;
}

export const auditAfterHook = createAuthMiddleware(async (ctx) => {
  const action = ctx.path ? auditedPaths[ctx.path] : undefined;
  if (!action || ctx.context.returned instanceof Error) return;

  const session = ctx.context.session ?? ctx.context.newSession;
  const returned = ctx.context.returned as { id?: string } | undefined;
  const metadata = pick(ctx.body);
  const organizationId =
    (metadata?.organizationId as string | undefined) ??
    (action === "organization.create" ? returned?.id : undefined) ??
    session?.session.activeOrganizationId ??
    null;

  await recordAudit({
    action,
    organizationId,
    actorId: session?.user.id ?? null,
    ipAddress: session?.session.ipAddress ?? null,
    userAgent: session?.session.userAgent ?? null,
    metadata,
  });
});

/** Records the sign-in in the audit log of every organization the user belongs to. */
export async function auditSignIn(session: { userId: string; ipAddress?: string | null; userAgent?: string | null }) {
  const memberships = await prisma.member.findMany({
    where: { userId: session.userId },
    select: { organizationId: true },
  });
  const organizationIds = memberships.length ? memberships.map((m) => m.organizationId) : [null];
  for (const organizationId of organizationIds) {
    await recordAudit({
      action: "auth.sign_in",
      organizationId,
      actorId: session.userId,
      ipAddress: session.ipAddress ?? null,
      userAgent: session.userAgent ?? null,
    });
  }
}
