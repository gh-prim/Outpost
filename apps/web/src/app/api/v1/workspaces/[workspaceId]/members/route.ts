import { apiRoute } from "@/server/route";
import { addWorkspaceMemberInput } from "@/server/schemas";
import { addWorkspaceMember, listWorkspaceMembers } from "@/server/workspaces";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]/members">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return { members: await listWorkspaceMembers(actor, workspaceId) };
});

export const POST = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return addWorkspaceMember(actor, workspaceId, addWorkspaceMemberInput.parse(await request.json()));
});
