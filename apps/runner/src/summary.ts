import type { RunResult } from "@outpost/engine";

export type RunSummary = {
  status: "passed" | "failed" | "error";
  requests: number;
  totalTests: number;
  failedTests: number;
  durationMs: number;
  error?: string;
  items: {
    name: string;
    method: string;
    url: string;
    code?: number;
    timeMs?: number;
    error?: string;
    failedTests: string[];
  }[];
};

/** Keeps what a monitor history needs, never response bodies or headers (they may hold secrets). */
export function summarize(result: RunResult): RunSummary {
  const items = result.requests.map((r) => ({
    name: r.name,
    method: r.request.method,
    url: r.request.url,
    code: r.response?.code,
    timeMs: r.response?.timeMs,
    error: r.error,
    failedTests: r.tests.filter((t) => !t.passed && !t.skipped).map((t) => t.name),
  }));
  const tests = result.requests.flatMap((r) => r.tests).filter((t) => !t.skipped);
  const failedTests = tests.filter((t) => !t.passed).length;
  const failedRequests = items.filter((i) => i.error).length;
  return {
    status: result.error ? "error" : failedTests || failedRequests ? "failed" : "passed",
    requests: items.length,
    totalTests: tests.length,
    failedTests,
    durationMs: result.durationMs,
    error: result.error,
    items,
  };
}
