import { apiRoute } from "@/server/route";
import { vaultIntegrationInput } from "@/server/schemas";
import { createVault, listVaults } from "@/server/vaults";

type Ctx = RouteContext<"/api/v1/organizations/[organizationId]/vaults">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { organizationId } = await ctx.params;
  return { vaults: await listVaults(actor, organizationId) };
});

/** Organization admins only. Credentials are encrypted and never returned. */
export const POST = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { organizationId } = await ctx.params;
  return createVault(actor, organizationId, vaultIntegrationInput.parse(await request.json()));
});
