"use client";

import type { RunResult } from "@outpost/engine";
import { parseCsv } from "@outpost/engine/csv";
import {
  Badge,
  Button,
  Card,
  Input,
  Label,
  MethodBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  StatusBadge,
} from "@outpost/ui";
import Link from "next/link";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import type { CollectionDocument } from "@/lib/collection-items";

const NONE = "none";

export function CollectionRunner(props: {
  workspaceId: string;
  editorHref: string;
  document: CollectionDocument;
  environments: { id: string; name: string }[];
  canRun: boolean;
}) {
  const [environmentId, setEnvironmentId] = useState(NONE);
  const [iterations, setIterations] = useState(1);
  const [data, setData] = useState<{ name: string; rows: Record<string, unknown>[] } | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadData(file: File) {
    setError(null);
    try {
      const text = await file.text();
      const rows = file.name.toLowerCase().endsWith(".csv") ? parseCsv(text) : JSON.parse(text);
      if (!Array.isArray(rows)) throw new Error("A JSON data file must contain an array of objects");
      setData({ name: file.name, rows });
      setIterations(rows.length);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const rows = data?.rows ?? [];
      setResult(
        await apiFetch<RunResult>("/run", {
          method: "POST",
          body: {
            workspaceId: props.workspaceId,
            collection: props.document,
            environmentId: environmentId === NONE ? undefined : environmentId,
            // Without a data file, empty rows still set the number of iterations.
            iterationData: rows.length ? rows : Array.from({ length: iterations }, () => ({})),
          },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  function download() {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${props.document.info.name}-run.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const tests = result?.requests.flatMap((r) => r.tests).filter((t) => !t.skipped) ?? [];
  const failed = tests.filter((t) => !t.passed).length;
  const failedRequests = result?.requests.filter((r) => r.error).length ?? 0;
  const iterationsRun = result ? new Set(result.requests.map((r) => r.iteration)).size : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2.5">
        <Link href={props.editorHref}>← Back to the editor</Link>
      </Button>
      <h1 className="mt-4 text-lg font-semibold">Run {props.document.info.name}</h1>

      <Card className="mt-4 flex flex-wrap items-end gap-4 p-4">
        <div className="space-y-1.5">
          <Label>Environment</Label>
          <Select value={environmentId} onValueChange={setEnvironmentId}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>No environment</SelectItem>
              {props.environments.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="iterations">Iterations</Label>
          <Input
            id="iterations"
            type="number"
            min={1}
            max={1000}
            value={iterations}
            disabled={Boolean(data)}
            onChange={(e) => setIterations(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
            className="w-24"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="data-file">Data file (CSV or JSON)</Label>
          <div className="flex items-center gap-2">
            <Input
              id="data-file"
              type="file"
              accept=".csv,.json,text/csv,application/json"
              className="w-64"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void loadData(file);
              }}
            />
            {data && (
              <Button variant="ghost" size="sm" onClick={() => setData(null)}>
                Clear ({data.rows.length} rows)
              </Button>
            )}
          </div>
        </div>
        <Button onClick={run} disabled={running || !props.canRun} className="ml-auto">
          {running ? <Spinner /> : "Run collection"}
        </Button>
      </Card>
      {error && <p className="mt-3 text-destructive">{error}</p>}

      {result && (
        <section className="mt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={failed || failedRequests || result.error ? "destructive" : "success"}>
              {failed || failedRequests || result.error ? "Failed" : "Passed"}
            </Badge>
            <span className="text-muted-foreground">
              {iterationsRun} iterations · {result.requests.length} requests · {tests.length - failed}/{tests.length}{" "}
              tests passed · {result.durationMs} ms
            </span>
            <Button variant="outline" size="sm" className="ml-auto" onClick={download}>
              Export JSON
            </Button>
          </div>
          {result.error && <p className="mt-2 text-destructive">{result.error}</p>}
          <Card className="mt-3 divide-y divide-border">
            {result.requests.map((request, i) => (
              <div key={i} className="px-4 py-2">
                <div className="flex items-center gap-3">
                  {iterationsRun > 1 && (
                    <span className="w-8 text-xs text-muted-foreground">#{request.iteration + 1}</span>
                  )}
                  <MethodBadge method={request.request.method} className="w-14" />
                  <span className="flex-1 truncate">{request.name}</span>
                  {request.response && <StatusBadge code={request.response.code} text={request.response.status} />}
                  {request.response && (
                    <span className="w-16 text-right text-muted-foreground">{request.response.timeMs} ms</span>
                  )}
                </div>
                {request.error && <p className="mt-1 text-destructive">{request.error}</p>}
                {request.tests.length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-11">
                    {request.tests.map((test, j) => (
                      <li key={j} className={test.passed ? "text-muted-foreground" : "text-destructive"}>
                        {test.skipped ? "–" : test.passed ? "✓" : "✗"} {test.name}
                        {test.error && `: ${test.error}`}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
