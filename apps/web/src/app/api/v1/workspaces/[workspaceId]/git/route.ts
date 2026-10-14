import { configureGitSync, getGitSync } from "@/server/git-sync";
import { apiRoute } from "@/server/route";
import { gitSyncInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]/git">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return { gitSync: await getGitSync(actor, workspaceId) };
});

/** Workspace admins only. The token is stored encrypted and never returned. */
export const PUT = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return { gitSync: await configureGitSync(actor, workspaceId, gitSyncInput.parse(await request.json())) };
});
