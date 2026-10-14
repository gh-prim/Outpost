import { encryptSecret, prisma } from "@outpost/db";
import { resolveEnvironmentValues } from "@outpost/vaults";
import type { z } from "zod";
import { auditContext, recordAudit } from "./audit";
import type { Actor } from "./context";
import { HttpError, notFound } from "./errors";
import { requireOrgAdmin, requireOrgMember } from "./policy";
import type { vaultIntegrationInput } from "./schemas";

/** Integrations without their credentials. Every member can list them to write references. */
export async function listVaults(actor: Actor, organizationId: string) {
  await requireOrgMember(actor.userId, organizationId);
  return prisma.vaultIntegration.findMany({
    where: { organizationId },
    select: { id: true, name: true, type: true, config: true, createdAt: true },
    orderBy: { name: "asc" },
  });
}

export async function createVault(actor: Actor, organizationId: string, input: z.infer<typeof vaultIntegrationInput>) {
  await requireOrgAdmin(actor.userId, organizationId);
  const [config, credentials] =
    input.type === "hashicorp"
      ? [{ address: input.address, namespace: input.namespace || undefined }, { token: input.token }]
      : [{ region: input.region }, { accessKeyId: input.accessKeyId, secretAccessKey: input.secretAccessKey }];
  const exists = await prisma.vaultIntegration.findUnique({
    where: { organizationId_name: { organizationId, name: input.name } },
  });
  if (exists) throw new HttpError(409, `A vault named ${input.name} already exists`);
  const vault = await prisma.vaultIntegration.create({
    data: {
      organizationId,
      name: input.name,
      type: input.type,
      config,
      credentials: encryptSecret(JSON.stringify(credentials)),
    },
    select: { id: true, name: true, type: true, config: true, createdAt: true },
  });
  await recordAudit({
    ...auditContext(actor),
    organizationId,
    action: "vault.create",
    targetType: "vaultIntegration",
    targetId: vault.id,
    metadata: { name: vault.name, type: vault.type },
  });
  return vault;
}

export async function deleteVault(actor: Actor, organizationId: string, vaultId: string) {
  await requireOrgAdmin(actor.userId, organizationId);
  const vault = await prisma.vaultIntegration.findFirst({ where: { id: vaultId, organizationId } });
  if (!vault) throw notFound("Vault");
  await prisma.vaultIntegration.delete({ where: { id: vaultId } });
  await recordAudit({
    ...auditContext(actor),
    organizationId,
    action: "vault.delete",
    targetType: "vaultIntegration",
    targetId: vaultId,
    metadata: { name: vault.name },
  });
}

/** Admins can check a reference works. Only success or the error is returned, never the secret. */
export async function testVaultReference(actor: Actor, organizationId: string, reference: string) {
  await requireOrgAdmin(actor.userId, organizationId);
  const { variables, errors } = await resolveEnvironmentValues(organizationId, [
    { key: "test", value: reference, type: "vault", enabled: true },
  ]);
  return errors.length
    ? { ok: false, error: errors[0].replace(/^test: /, "") }
    : { ok: true, length: variables[0].value.length };
}
