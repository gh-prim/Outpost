import { createEnvironment, listEnvironments } from "@/server/environments";
import { apiRoute } from "@/server/route";
import { createEnvironmentInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]/environments">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return { environments: await listEnvironments(actor, workspaceId) };
});

export const POST = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return createEnvironment(actor, workspaceId, createEnvironmentInput.parse(await request.json()));
});
