import { prisma, WorkspaceRole } from "@outpost/db";
import { runCollection, type Variable } from "@outpost/engine";
import { resolveEnvironmentValues } from "@outpost/vaults";
import type { z } from "zod";
import type { Actor } from "./context";
import { HttpError, notFound } from "./errors";
import { requireWorkspaceRole } from "./policy";
import type { runInput } from "./schemas";

/** Extra hosts the server must never call, on top of cloud metadata endpoints (always blocked). */
const blockedHosts = (process.env.OUTPOST_BLOCKED_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

/** Decrypted secrets and fetched vault references. Fails when a vault reference cannot be read. */
export async function environmentVariables(workspaceId: string, environmentId: string): Promise<Variable[]> {
  const environment = await prisma.environment.findFirst({
    where: { id: environmentId, workspaceId },
    include: { workspace: { select: { organizationId: true } } },
  });
  if (!environment) throw notFound("Environment");
  const { variables, errors } = await resolveEnvironmentValues(
    environment.workspace.organizationId,
    environment.values as { key: string; value: string; type: string; enabled: boolean }[],
  );
  if (errors.length) throw new HttpError(502, `Could not read vault secrets: ${errors.join("; ")}`);
  return variables;
}

/** Runs a collection, or one request of it, from the server. Needs at least the runner role. */
export async function runOnServer(actor: Actor, input: z.infer<typeof runInput>) {
  await requireWorkspaceRole(actor.userId, input.workspaceId, WorkspaceRole.RUNNER);
  const environment = input.environmentId ? await environmentVariables(input.workspaceId, input.environmentId) : [];
  return runCollection({
    collection: input.collection,
    itemId: input.itemId,
    environment,
    iterationData: input.iterationData,
    blockedHosts,
  });
}
