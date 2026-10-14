import { pullFromGit } from "@/server/git-sync";
import { apiRoute } from "@/server/route";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]/git/pull">;

export const POST = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return pullFromGit(actor, workspaceId);
});
