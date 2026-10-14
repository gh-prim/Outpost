import { apiRoute } from "@/server/route";
import { removeWorkspaceMember } from "@/server/workspaces";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]/members/[memberId]">;

export const DELETE = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId, memberId } = await ctx.params;
  await removeWorkspaceMember(actor, workspaceId, memberId);
});
