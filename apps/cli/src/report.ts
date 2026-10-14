import type { RunResult } from "@outpost/engine";

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: number) => (text: string) => (color ? `\x1b[${code}m${text}\x1b[0m` : text);
const green = paint(32);
const red = paint(31);
const dim = paint(2);
const bold = paint(1);

export function summarize(result: RunResult) {
  const tests = result.requests.flatMap((r) => r.tests);
  return {
    requests: result.requests.length,
    failedRequests: result.requests.filter((r) => r.error).length,
    tests: tests.filter((t) => !t.skipped).length,
    failedTests: tests.filter((t) => !t.skipped && !t.passed).length,
  };
}

export function printReport(result: RunResult, collectionName: string) {
  console.log(bold(collectionName));
  let iteration = -1;
  for (const request of result.requests) {
    if (request.iteration !== iteration && result.requests.some((r) => r.iteration > 0)) {
      iteration = request.iteration;
      console.log(dim(`\nIteration ${iteration + 1}`));
    }
    const response = request.response;
    const status = request.error
      ? red(`ERROR ${request.error}`)
      : `${response!.code} ${response!.status} ${dim(`${response!.timeMs} ms, ${response!.sizeBytes} B`)}`;
    console.log(`\n→ ${request.name}\n  ${request.request.method} ${request.request.url} ${status}`);
    for (const test of request.tests) {
      if (test.skipped) console.log(dim(`  - ${test.name} (skipped)`));
      else if (test.passed) console.log(green(`  ✓ ${test.name}`));
      else console.log(red(`  ✗ ${test.name}${test.error ? `: ${test.error}` : ""}`));
    }
  }

  const s = summarize(result);
  const line = `${s.requests} requests, ${s.failedRequests} failed · ${s.tests} tests, ${s.failedTests} failed · ${result.durationMs} ms`;
  console.log("\n" + (s.failedRequests || s.failedTests ? red(line) : green(line)));
  if (result.error) console.log(red(`Run error: ${result.error}`));
}
