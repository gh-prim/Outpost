import { deleteMonitor, getMonitor, updateMonitor } from "@/server/monitors";
import { apiRoute } from "@/server/route";
import { updateMonitorInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/monitors/[monitorId]">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { monitorId } = await ctx.params;
  return getMonitor(actor, monitorId);
});

export const PATCH = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { monitorId } = await ctx.params;
  return updateMonitor(actor, monitorId, updateMonitorInput.parse(await request.json()));
});

export const DELETE = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { monitorId } = await ctx.params;
  await deleteMonitor(actor, monitorId);
});
