import { apiRoute } from "@/server/route";
import { revokeScimCredential } from "@/server/scim";

type Ctx = RouteContext<"/api/v1/organizations/[organizationId]/scim/credentials/[credentialId]">;

export const DELETE = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { organizationId, credentialId } = await ctx.params;
  await revokeScimCredential(actor, organizationId, credentialId);
});
