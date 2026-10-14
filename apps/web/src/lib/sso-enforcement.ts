import { prisma } from "@outpost/db";

export function readOrgMetadata(metadata: string | null): { enforceSso?: boolean } {
  try {
    return metadata ? JSON.parse(metadata) : {};
  } catch {
    return {};
  }
}

/**
 * True when the email belongs to a domain verified by an organization that requires SSO.
 * Such users can only sign in through their identity provider (SAML or OIDC).
 */
export async function ssoRequiredFor(email: string) {
  const domain = email.split("@").pop()?.toLowerCase();
  if (!domain) return false;
  const providers = await prisma.ssoProvider.findMany({
    where: { domainVerified: true, organizationId: { not: null } },
    select: { domain: true, organizationId: true },
  });
  const organizationIds = providers
    .filter((p) =>
      p.domain
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .includes(domain),
    )
    .map((p) => p.organizationId!);
  if (organizationIds.length === 0) return false;
  const organizations = await prisma.organization.findMany({
    where: { id: { in: organizationIds } },
    select: { metadata: true },
  });
  return organizations.some((o) => readOrgMetadata(o.metadata).enforceSso === true);
}

/** Paths of the SSO sign-in flows, the only ones allowed when SSO is enforced. */
export function isSsoPath(path: string | undefined) {
  return Boolean(path?.startsWith("/sso/"));
}
