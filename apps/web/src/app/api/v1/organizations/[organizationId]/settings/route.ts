import { prisma } from "@outpost/db";
import { readOrgMetadata } from "@/lib/sso-enforcement";
import { auditContext, recordAudit } from "@/server/audit";
import { HttpError } from "@/server/errors";
import { requireOrgAdmin } from "@/server/policy";
import { apiRoute } from "@/server/route";
import { organizationSettingsInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/organizations/[organizationId]/settings">;

/** Organization admins only. Requiring SSO needs at least one verified provider, so nobody gets locked out. */
export const PATCH = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { organizationId } = await ctx.params;
  await requireOrgAdmin(actor.userId, organizationId);
  const input = organizationSettingsInput.parse(await request.json());

  if (input.enforceSso) {
    const verified = await prisma.ssoProvider.count({ where: { organizationId, domainVerified: true } });
    if (verified === 0) throw new HttpError(400, "Verify the domain of at least one SSO provider first");
  }
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  const metadata = { ...readOrgMetadata(organization.metadata), ...input };
  await prisma.organization.update({ where: { id: organizationId }, data: { metadata: JSON.stringify(metadata) } });
  await recordAudit({
    ...auditContext(actor),
    organizationId,
    action: "organization.settings.update",
    targetType: "organization",
    targetId: organizationId,
    metadata: input,
  });
  return metadata;
});
