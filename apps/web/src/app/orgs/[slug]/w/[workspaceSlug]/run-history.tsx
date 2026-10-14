import { cn } from "@outpost/ui";

export type RunPoint = {
  id: string;
  status: string;
  durationMs: number;
  startedAt: Date;
  failedTests: number;
  totalTests: number;
};

const statusClass: Record<string, string> = {
  passed: "bg-success",
  failed: "bg-destructive",
  error: "bg-warning",
};

const timeFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

/** Oldest to newest run, bar height is the run duration, color is the outcome. */
export function RunHistory({ runs, height = 40 }: { runs: RunPoint[]; height?: number }) {
  if (runs.length === 0) return <p className="text-xs text-muted-foreground">No run yet.</p>;
  const ordered = [...runs].reverse();
  const max = Math.max(...ordered.map((r) => r.durationMs), 1);
  return (
    <div className="flex items-end gap-0.5" style={{ height }} role="img" aria-label={`Last ${runs.length} runs`}>
      {ordered.map((run) => (
        <div key={run.id} className="group relative flex h-full w-2 items-end">
          <div
            className={cn("w-full rounded-t-sm", statusClass[run.status] ?? "bg-muted")}
            style={{ height: `${Math.max(12, (run.durationMs / max) * 100)}%` }}
          />
          <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-md border bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow group-hover:block">
            {timeFormat.format(new Date(run.startedAt))} · {run.status} · {run.durationMs} ms ·{" "}
            {run.totalTests - run.failedTests}/{run.totalTests} tests
          </div>
        </div>
      ))}
    </div>
  );
}

export function RunLegend() {
  return (
    <div className="flex gap-3 text-xs text-muted-foreground">
      {Object.entries(statusClass).map(([status, cls]) => (
        <span key={status} className="flex items-center gap-1">
          <span className={cn("size-2 rounded-sm", cls)} /> {status}
        </span>
      ))}
      <span>· bar height: duration</span>
    </div>
  );
}
