import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { auditContext, recordAudit } from "./audit";
import type { Actor } from "./context";
import { requireOrgAdmin } from "./policy";

const SCOPES = ["scim.users.read", "scim.users.write", "scim.groups.read", "scim.groups.write"] as const;
const TOKEN_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000;

export function scimBaseUrl() {
  return `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/auth/scim/v2`;
}

/** The organization's active SCIM connection and its credentials, if any. */
export async function getScimConnection(actor: Actor, organizationId: string) {
  await requireOrgAdmin(actor.userId, organizationId);
  const { connections } = await auth.api.listSCIMManagedConnections({ body: { provisioningDomainId: organizationId } });
  const active = connections.find((c) => c.status === "active");
  if (!active) return { baseUrl: scimBaseUrl(), connection: null, credentials: [] };
  const { credentials } = await auth.api.getSCIMManagedConnection({
    body: { connectionId: active.connectionId, provisioningDomainId: organizationId },
  });
  return { baseUrl: scimBaseUrl(), connection: active, credentials };
}

/**
 * Creates the organization's SCIM connection, or a new token for the existing one.
 * The token is returned once; only its digest is stored.
 */
export async function issueScimToken(actor: Actor, organizationId: string) {
  const { connection } = await getScimConnection(actor, organizationId);
  const common = {
    scopes: [...SCOPES],
    expiresAt: new Date(Date.now() + TOKEN_LIFETIME_MS),
    provisioningDomainId: organizationId,
    actorId: actor.userId,
  };
  const result = connection
    ? await auth.api.rotateSCIMManagedCredential({ body: { ...common, connectionId: connection.connectionId } })
    : await auth.api.createSCIMManagedConnection({ body: { ...common, creationRequestId: randomUUID() } });

  await recordAudit({
    ...auditContext(actor),
    organizationId,
    action: connection ? "scim.token.rotate" : "scim.connection.create",
    targetType: "scimConnection",
    targetId: result.connection.connectionId,
  });
  return { baseUrl: scimBaseUrl(), token: result.token, expiresAt: result.credential.expiresAt };
}

export async function revokeScimCredential(actor: Actor, organizationId: string, credentialId: string) {
  const { connection } = await getScimConnection(actor, organizationId);
  if (!connection) return;
  await auth.api.revokeSCIMManagedCredential({
    body: { connectionId: connection.connectionId, provisioningDomainId: organizationId, credentialId, actorId: actor.userId },
  });
  await recordAudit({
    ...auditContext(actor),
    organizationId,
    action: "scim.token.revoke",
    targetType: "scimConnection",
    targetId: connection.connectionId,
    metadata: { credentialId },
  });
}
