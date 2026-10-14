import { pushToGit } from "@/server/git-sync";
import { apiRoute } from "@/server/route";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]/git/push">;

export const POST = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return pushToGit(actor, workspaceId);
});
