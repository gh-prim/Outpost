import { apiRoute } from "@/server/route";
import { deleteVault } from "@/server/vaults";

type Ctx = RouteContext<"/api/v1/organizations/[organizationId]/vaults/[vaultId]">;

export const DELETE = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { organizationId, vaultId } = await ctx.params;
  await deleteVault(actor, organizationId, vaultId);
});
