import { Badge, Button, Card, MethodBadge, StatusBadge } from "@outpost/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HttpError } from "@/server/errors";
import { getMonitor } from "@/server/monitors";
import { getPageOrganization } from "@/server/page";
import { getWorkspaceRole, hasRole } from "@/server/policy";
import { prisma } from "@outpost/db";
import { MONITOR_INTERVAL_OPTIONS as INTERVALS } from "@/lib/monitor-intervals";
import { RunHistory, RunLegend } from "../../run-history";
import { MonitorControls } from "./monitor-controls";

type Params = PageProps<"/orgs/[slug]/w/[workspaceSlug]/m/[monitorId]">["params"];
type SummaryItem = {
  name: string;
  method: string;
  url: string;
  code?: number;
  timeMs?: number;
  error?: string;
  failedTests: string[];
};

const timeFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium" });
const statusVariant = { passed: "success", failed: "destructive", error: "warning" } as const;

async function MonitorContent({ params }: { params: Params }) {
  const { slug, workspaceSlug, monitorId } = await params;
  const { actor } = await getPageOrganization(slug);
  const monitor = await getMonitor(actor, monitorId).catch((error) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: monitor.workspaceId } });
  const role = await getWorkspaceRole(actor.userId, workspace);
  const latest = monitor.runs[0];
  const passed = monitor.runs.filter((r) => r.status === "passed").length;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2.5">
        <Link href={`/orgs/${slug}/w/${workspaceSlug}`}>← {workspace.name}</Link>
      </Button>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{monitor.name}</h1>
          <p className="text-muted-foreground">
            {monitor.collection.name} ·{" "}
            {INTERVALS.find((i) => i.value === monitor.intervalMinutes)?.label.toLowerCase()}
            {monitor.enabled ? ` · next run ${timeFormat.format(monitor.nextRunAt)}` : " · paused"}
          </p>
        </div>
        <MonitorControls
          monitorId={monitor.id}
          enabled={monitor.enabled}
          canEdit={hasRole(role, "EDITOR")}
          canRun={hasRole(role, "RUNNER")}
          backHref={`/orgs/${slug}/w/${workspaceSlug}`}
        />
      </div>

      <Card className="mt-6 space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="font-medium">Last {monitor.runs.length} runs</span>
          <span className="text-muted-foreground">
            {monitor.runs.length ? `${Math.round((passed / monitor.runs.length) * 100)}% passed` : ""}
          </span>
        </div>
        <RunHistory runs={monitor.runs} height={64} />
        <RunLegend />
      </Card>

      {latest && (
        <section className="mt-8">
          <h2 className="font-medium">
            Latest run <span className="font-normal text-muted-foreground">{timeFormat.format(latest.startedAt)}</span>
          </h2>
          {latest.error && <p className="mt-2 text-destructive">{latest.error}</p>}
          <Card className="mt-3 divide-y divide-border">
            {(latest.summary as SummaryItem[]).map((item, i) => (
              <div key={i} className="px-4 py-2">
                <div className="flex items-center gap-3">
                  <MethodBadge method={item.method} className="w-14" />
                  <span className="flex-1 truncate">{item.name}</span>
                  {item.code !== undefined && <StatusBadge code={item.code} />}
                  {item.timeMs !== undefined && <span className="text-muted-foreground">{item.timeMs} ms</span>}
                </div>
                {(item.error || item.failedTests.length > 0) && (
                  <div className="mt-1 pl-17 text-destructive">
                    {item.error ?? `Failed: ${item.failedTests.join(", ")}`}
                  </div>
                )}
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-medium">History</h2>
        <Card className="mt-3 overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Started</th>
                <th className="px-3 py-2 font-medium">Result</th>
                <th className="px-3 py-2 font-medium">Tests</th>
                <th className="px-3 py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {monitor.runs.map((run) => (
                <tr key={run.id}>
                  <td className="px-3 py-2 text-muted-foreground">{timeFormat.format(run.startedAt)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={statusVariant[run.status as keyof typeof statusVariant] ?? "secondary"}>
                      {run.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {run.totalTests - run.failedTests}/{run.totalTests} passed
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{run.durationMs} ms</td>
                </tr>
              ))}
            </tbody>
          </table>
          {monitor.runs.length === 0 && <p className="p-4 text-muted-foreground">No run yet.</p>}
        </Card>
      </section>
    </div>
  );
}

export default function MonitorPage({ params }: { params: Params }) {
  return (
    <Suspense>
      <MonitorContent params={params} />
    </Suspense>
  );
}
