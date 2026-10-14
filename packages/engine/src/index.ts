/// <reference path="./runtime.d.ts" />
import * as sdkModule from "postman-collection";
import type { Response, VariableScope } from "postman-collection";
import * as runtimeModule from "postman-runtime";
import { guardedAgents } from "./guard";
import type { ConsoleEntry, ExecutedRequest, RunInput, RunResult, Variable } from "./types";

export type * from "./types";
export { matchExample, type MockRequest, type MockResponse } from "./mock";

// Both packages are CommonJS: Node exposes them as `default`, bundlers as named exports.
const sdk = ((sdkModule as { default?: typeof sdkModule }).default ?? sdkModule) as typeof sdkModule;
const runtime = ((runtimeModule as { default?: typeof runtimeModule }).default ?? runtimeModule) as typeof runtimeModule;

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

/** Cloud metadata endpoints are never reachable from a run, whatever the configuration. */
const ALWAYS_BLOCKED = ["169.254.169.254", "metadata.google.internal", "100.100.100.200", "fd00:ec2::254"];

const TEXT_CONTENT_TYPE = /^(text\/|application\/(json|xml|javascript|x-www-form-urlencoded|graphql)|[^;]*\+(json|xml))/i;

function toScope(variables: Variable[] = []) {
  return new sdk.VariableScope({
    values: variables.map((v) => ({ key: v.key, value: v.value, disabled: v.enabled === false })),
  } as never);
}

function fromScope(scope: VariableScope | undefined): Variable[] {
  const json = scope?.toJSON() as { values?: { key: string; value: unknown; disabled?: boolean }[] } | undefined;
  return (json?.values ?? []).map((v) => ({ key: v.key, value: String(v.value ?? ""), enabled: !v.disabled }));
}

function headerList(headers: { key: string; value: string }[] | undefined) {
  return (headers ?? []).map((h) => ({ key: h.key, value: String(h.value) }));
}

function serializeResponse(response: Response) {
  const json = response.toJSON() as { header?: { key: string; value: string }[] };
  const headers = headerList(json.header);
  const contentType = headers.find((h) => h.key.toLowerCase() === "content-type")?.value ?? "";
  const stream = (response as Response & { stream?: Buffer }).stream;
  const isText = !contentType || TEXT_CONTENT_TYPE.test(contentType);
  return {
    code: response.code,
    status: response.reason?.() ?? response.status ?? "",
    headers,
    body: isText ? (response.text() ?? "") : "",
    bodyBase64: !isText && stream ? Buffer.from(stream).toString("base64") : undefined,
    sizeBytes: response.size?.()?.total ?? stream?.length ?? 0,
    timeMs: response.responseTime ?? 0,
  };
}

function stringify(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/** Runs a collection (or one of its items) with the open source collection runtime. */
export function runCollection(input: RunInput, onRequest?: (request: ExecutedRequest) => void): Promise<RunResult> {
  const collection = new sdk.Collection(input.collection as never);
  const environment = toScope(input.environment);
  const globals = toScope(input.globals);
  const blockedHosts = [...ALWAYS_BLOCKED, ...(input.blockedHosts ?? [])];
  const startedAt = Date.now();

  return new Promise((resolve) => {
    const requests: ExecutedRequest[] = [];
    // Keyed by cursor.ref, which identifies one item execution within the run.
    const pending = new Map<string, ExecutedRequest>();
    let finalEnvironment = environment;
    let finalGlobals = globals;

    const current = (cursor: { ref: string; iteration: number }, item: { id: string; name: string }) => {
      let entry = pending.get(cursor.ref);
      if (!entry) {
        entry = {
          itemId: item.id,
          name: item.name,
          iteration: cursor.iteration,
          request: { method: "GET", url: "", headers: [] },
          tests: [],
          console: [],
        };
        pending.set(cursor.ref, entry);
      }
      return entry;
    };

    const updateScopes = (results: { result?: { environment?: VariableScope; globals?: VariableScope } }[]) => {
      for (const r of results ?? []) {
        if (r.result?.environment) finalEnvironment = r.result.environment;
        if (r.result?.globals) finalGlobals = r.result.globals;
      }
    };

    new runtime.Runner().run(
      collection,
      {
        environment,
        globals,
        data: input.iterationData ?? [],
        iterationCount: input.iterationCount ?? Math.max(1, input.iterationData?.length ?? 1),
        timeout: { request: input.timeoutMs ?? DEFAULT_TIMEOUT_MS, script: 5_000 },
        entrypoint: input.itemId ? { execute: input.itemId, lookupStrategy: "idOrName" } : undefined,
        requester: {
          followRedirects: true,
          maxResponseSize: input.maxResponseSize ?? DEFAULT_MAX_RESPONSE_SIZE,
          strictSSL: true,
          timings: true,
          implicitTraceHeader: false,
          systemHeaders: { "User-Agent": "Outpost" },
          network: { restrictedAddresses: Object.fromEntries(blockedHosts.map((h) => [h, true])) },
          agents: guardedAgents(blockedHosts),
        },
      },
      (err, run) => {
        if (err) {
          resolve({ requests, environment: input.environment ?? [], globals: input.globals ?? [], durationMs: 0, error: err.message });
          return;
        }
        run.start({
          console(cursor: { ref: string; iteration: number }, level: string, ...messages: unknown[]) {
            const entry = pending.get(cursor.ref);
            const log: ConsoleEntry = { level, messages: messages.map(stringify) };
            entry?.console.push(log);
          },
          prerequest(_err: Error | null, _cursor: unknown, results: never[]) {
            updateScopes(results);
          },
          beforeItem(_err: Error | null, cursor: { ref: string; iteration: number }, item: { id: string; name: string }) {
            current(cursor, item);
          },
          request(
            error: Error | null,
            cursor: { ref: string; iteration: number },
            response: Response | undefined,
            request: { method: string; url: { toString(): string }; headers: { toJSON(): { key: string; value: string }[] }; body?: { toString(): string } },
            item: { id: string; name: string },
          ) {
            const entry = current(cursor, item);
            entry.request = {
              method: request.method,
              url: request.url.toString(),
              headers: headerList(request.headers.toJSON()),
              body: request.body?.toString() || undefined,
            };
            if (error) entry.error = error.message;
            if (response) entry.response = serializeResponse(response);
          },
          assertion(
            cursor: { ref: string },
            assertions: { name: string; passed: boolean; skipped: boolean; error?: Error }[],
          ) {
            const entry = pending.get(cursor.ref);
            for (const a of assertions) {
              entry?.tests.push({ name: a.name, passed: a.passed, skipped: a.skipped, error: a.error?.message });
            }
          },
          test(_err: Error | null, _cursor: unknown, results: never[]) {
            updateScopes(results);
          },
          exception(cursor: { ref: string }, error: Error) {
            const entry = pending.get(cursor.ref);
            if (entry && !entry.error) entry.error = error.message;
          },
          item(error: Error | null, cursor: { ref: string }) {
            const entry = pending.get(cursor.ref);
            if (!entry) return;
            if (error && !entry.error) entry.error = error.message;
            pending.delete(cursor.ref);
            requests.push(entry);
            onRequest?.(entry);
          },
          done(error: Error | null) {
            resolve({
              requests,
              environment: fromScope(finalEnvironment),
              globals: fromScope(finalGlobals),
              durationMs: Date.now() - startedAt,
              error: error?.message,
            });
          },
        });
      },
    );
  });
}
