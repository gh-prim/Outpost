"use client";

import type { RunResult } from "@outpost/engine";
import { Badge, Spinner, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger } from "@outpost/ui";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function prettyBody(body: string, headers: { key: string; value: string }[]) {
  const type = headers.find((h) => h.key.toLowerCase() === "content-type")?.value ?? "";
  if (!type.includes("json")) return body;
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

export function ResponsePanel({ result, running }: { result: RunResult | null; running: boolean }) {
  if (running) {
    return (
      <div className="flex items-center justify-center gap-2 text-muted-foreground">
        <Spinner /> Sending…
      </div>
    );
  }
  const executed = result?.requests.at(-1);
  if (!result || !executed) {
    return (
      <div className="flex items-center justify-center text-muted-foreground">Send a request to see the response.</div>
    );
  }

  const { response, tests } = executed;
  const passed = tests.filter((t) => t.passed).length;

  return (
    <Tabs defaultValue="body" className="min-h-0 overflow-hidden px-4 pt-2">
      <div className="flex items-center gap-4">
        <TabsList>
          <TabsTrigger value="body">Body</TabsTrigger>
          <TabsTrigger value="headers">Headers</TabsTrigger>
          <TabsTrigger value="tests">
            Tests{" "}
            {tests.length > 0 && (
              <Badge variant={passed === tests.length ? "success" : "destructive"}>
                {passed}/{tests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="console">Console</TabsTrigger>
        </TabsList>
        {response && (
          <div className="ml-auto flex items-center gap-3 text-muted-foreground">
            <StatusBadge code={response.code} text={response.status} />
            <span>{response.timeMs} ms</span>
            <span>{formatSize(response.sizeBytes)}</span>
          </div>
        )}
      </div>

      <TabsContent value="body" className="min-h-0 overflow-auto pb-4">
        {executed.error ? (
          <p className="text-destructive">{executed.error}</p>
        ) : response?.bodyBase64 ? (
          <p className="text-muted-foreground">Binary response ({formatSize(response.sizeBytes)}).</p>
        ) : (
          <pre className="font-mono text-xs whitespace-pre-wrap">
            {response && prettyBody(response.body, response.headers)}
          </pre>
        )}
      </TabsContent>
      <TabsContent value="headers" className="min-h-0 overflow-auto pb-4">
        <table className="font-mono text-xs">
          <tbody>
            {response?.headers.map((h, i) => (
              <tr key={i}>
                <td className="pr-4 align-top text-muted-foreground">{h.key}</td>
                <td className="break-all">{h.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TabsContent>
      <TabsContent value="tests" className="min-h-0 overflow-auto pb-4">
        {tests.length === 0 ? (
          <p className="text-muted-foreground">No tests for this request.</p>
        ) : (
          <ul className="space-y-1">
            {tests.map((test, i) => (
              <li key={i} className="flex items-center gap-2">
                <Badge variant={test.skipped ? "secondary" : test.passed ? "success" : "destructive"}>
                  {test.skipped ? "SKIP" : test.passed ? "PASS" : "FAIL"}
                </Badge>
                {test.name}
                {test.error && <span className="text-muted-foreground">{test.error}</span>}
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
      <TabsContent value="console" className="min-h-0 overflow-auto pb-4 font-mono text-xs">
        {executed.console.length === 0 ? (
          <p className="font-sans text-muted-foreground">Nothing logged.</p>
        ) : (
          executed.console.map((entry, i) => (
            <div key={i} className={entry.level === "error" ? "text-destructive" : undefined}>
              {entry.messages.join(" ")}
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}
