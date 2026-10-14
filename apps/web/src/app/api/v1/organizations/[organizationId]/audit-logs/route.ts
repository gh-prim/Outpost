import { exportAuditLogsCsv, listAuditLogs } from "@/server/audit";
import { requireOrgAdmin } from "@/server/policy";
import { apiRoute } from "@/server/route";

type Ctx = RouteContext<"/api/v1/organizations/[organizationId]/audit-logs">;

/** Organization admins only. `?format=csv` downloads the full log. */
export const GET = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { organizationId } = await ctx.params;
  await requireOrgAdmin(actor.userId, organizationId);

  const params = request.nextUrl.searchParams;
  if (params.get("format") === "csv") {
    return new Response(await exportAuditLogsCsv(organizationId), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="audit-log-${organizationId}.csv"`,
      },
    });
  }
  return listAuditLogs(organizationId, {
    cursor: params.get("cursor") ?? undefined,
    limit: Number(params.get("limit")) || undefined,
  });
});
