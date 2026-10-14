import { apiRoute } from "@/server/route";
import { updateWorkspaceInput } from "@/server/schemas";
import { archiveWorkspace, getWorkspace, updateWorkspace } from "@/server/workspaces";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return getWorkspace(actor, workspaceId);
});

export const PATCH = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return updateWorkspace(actor, workspaceId, updateWorkspaceInput.parse(await request.json()));
});

export const DELETE = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  await archiveWorkspace(actor, workspaceId);
});
