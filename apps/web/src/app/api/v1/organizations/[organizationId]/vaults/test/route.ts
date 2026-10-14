import { apiRoute } from "@/server/route";
import { vaultTestInput } from "@/server/schemas";
import { testVaultReference } from "@/server/vaults";

type Ctx = RouteContext<"/api/v1/organizations/[organizationId]/vaults/test">;

export const POST = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { organizationId } = await ctx.params;
  return testVaultReference(actor, organizationId, vaultTestInput.parse(await request.json()).reference);
});
