import { createMonitor, listMonitors } from "@/server/monitors";
import { apiRoute } from "@/server/route";
import { createMonitorInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]/monitors">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return { monitors: await listMonitors(actor, workspaceId) };
});

export const POST = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return createMonitor(actor, workspaceId, createMonitorInput.parse(await request.json()));
});
