import { apiRoute } from "@/server/route";
import { getScimConnection, issueScimToken } from "@/server/scim";

type Ctx = RouteContext<"/api/v1/organizations/[organizationId]/scim">;

/** Organization admins only: the SCIM endpoint and its tokens (metadata, never the secret). */
export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { organizationId } = await ctx.params;
  return getScimConnection(actor, organizationId);
});

/** Creates the SCIM connection or issues a new token. The token is only returned here. */
export const POST = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { organizationId } = await ctx.params;
  return issueScimToken(actor, organizationId);
});
