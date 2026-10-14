import { runMonitorNow } from "@/server/monitors";
import { apiRoute } from "@/server/route";

type Ctx = RouteContext<"/api/v1/monitors/[monitorId]/run">;

/** Queues an immediate run; the runner picks it up at its next poll. */
export const POST = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { monitorId } = await ctx.params;
  await runMonitorNow(actor, monitorId);
});
