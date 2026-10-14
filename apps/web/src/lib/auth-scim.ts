import { createHash } from "node:crypto";
import { scim } from "@better-auth/scim";

/**
 * SCIM 2.0 provisioning. Each organization gets its own managed connection whose
 * provisioning domain is the organization id, so an identity provider can only
 * add or remove members of that organization.
 */

function credentialHashSecret() {
  if (process.env.SCIM_CREDENTIAL_SECRET) return process.env.SCIM_CREDENTIAL_SECRET;
  // Derived, so a deployment only has to manage BETTER_AUTH_SECRET.
  return createHash("sha256")
    .update(`outpost-scim:${process.env.BETTER_AUTH_SECRET ?? ""}`)
    .digest("hex");
}

type Row = Record<string, unknown>;

export const scimPlugin = scim({
  connections: [],
  managedConnections: { credentialHashSecret: credentialHashSecret() },
  identity: {
    /**
     * Links an incoming user to an existing account only when the organization proved it owns the
     * email domain (verified SSO provider). Otherwise SCIM creates a new user.
     */
    async resolveUser({ provisioningDomainId, resource }, { database }) {
      const email = resource.primaryEmail.toLowerCase();
      const domain = email.split("@")[1];
      const providers = (await database.findMany({
        model: "ssoProvider",
        where: [{ field: "organizationId", value: provisioningDomainId }],
      })) as Row[];
      const ownsDomain = providers.some(
        (p) =>
          p.domainVerified === true &&
          String(p.domain)
            .split(",")
            .map((d) => d.trim().toLowerCase())
            .includes(domain),
      );
      if (!ownsDomain) return { action: "create" };
      const user = (await database.findOne({ model: "user", where: [{ field: "email", value: email }] })) as Row | null;
      return user ? { action: "link", userId: String(user.id), profile: "manage" } : { action: "create" };
    },
  },
  projection: {
    /** Active users are members of the organization, deactivated or deleted users are removed. */
    async reconcileUser({ provisioningDomainId: organizationId, userId, active }, { database }) {
      const where = [
        { field: "organizationId", value: organizationId },
        { field: "userId", value: userId },
      ];
      const member = (await database.findOne({ model: "member", where })) as Row | null;
      if (active && !member) {
        await database.create({
          model: "member",
          data: { organizationId, userId, role: "member", createdAt: new Date() },
        });
      } else if (!active && member && !String(member.role).split(",").includes("owner")) {
        await database.deleteMany({ model: "member", where });
      }
    },
  },
  compatibility: { microsoftEntra: { acceptLegacyGroupSchema: true } },
});
