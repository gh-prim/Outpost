import type { Variable } from "./types";

/** Saved example (Collection Format v2.1 `response` entry) chosen to answer a mock call. */
export type MockResponse = { name: string; code: number; headers: { key: string; value: string }[]; body: string };

export type MockRequest = { method: string; path: string; headers?: Record<string, string | undefined> };

type RawUrl = string | { raw?: string } | undefined;
type RawRequest = { method?: string; url?: RawUrl } | string | undefined;
type RawExample = { name?: string; code?: number; header?: { key: string; value: string }[]; body?: string; originalRequest?: RawRequest };
type RawItem = { item?: RawItem[]; request?: RawRequest; response?: RawExample[] };

const VARIABLE = /\{\{\s*([^}]+?)\s*\}\}/g;

function rawUrl(request: RawRequest) {
  if (!request) return "";
  if (typeof request === "string") return request;
  return typeof request.url === "string" ? request.url : (request.url?.raw ?? "");
}

function methodOf(request: RawRequest) {
  return (typeof request === "object" && request?.method ? request.method : "GET").toUpperCase();
}

/** Path segments of a request URL, after resolving variables. Unresolved segments match anything. */
export function templateSegments(url: string, variables: Map<string, string>) {
  let resolved = url.replace(VARIABLE, (match, name: string) => variables.get(name) ?? match);
  // A leading unresolved variable stands for scheme and host ({{baseUrl}}/users).
  resolved = resolved.replace(/^\{\{[^}]+\}\}/, "");
  resolved = resolved.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, "");
  // A resolved base URL may still carry a path prefix that clients will not send: callers handle it with the mock's base path.
  const path = resolved.split(/[?#]/)[0];
  return path.split("/").filter(Boolean);
}

function isWildcard(segment: string) {
  return segment.startsWith(":") || /^\{\{[^}]+\}\}$/.test(segment) || /^\{[^}]+\}$/.test(segment);
}

/** Exact segments score higher than wildcards; null when the path does not match. */
function score(template: string[], path: string[]) {
  if (template.length !== path.length) return null;
  let total = 0;
  for (let i = 0; i < template.length; i++) {
    if (template[i] === path[i]) total += 2;
    else if (isWildcard(template[i])) total += 1;
    else return null;
  }
  return total;
}

function* examples(items: RawItem[] | undefined): Generator<{ request: RawRequest; example: RawExample }> {
  for (const item of items ?? []) {
    if (item.item) yield* examples(item.item);
    for (const example of item.response ?? []) yield { request: item.request, example };
  }
}

/**
 * Finds the saved example that answers a call. Clients can pick among several examples of the
 * same request with the `x-mock-response-name` or `x-mock-response-code` headers; otherwise a
 * 2xx example wins.
 */
export function matchExample(collection: unknown, environment: Variable[], call: MockRequest): MockResponse | null {
  const variables = new Map(environment.filter((v) => v.enabled !== false).map((v) => [v.key, v.value]));
  const path = call.path.split(/[?#]/)[0].split("/").filter(Boolean).map(decodeURIComponent);
  const wantedName = call.headers?.["x-mock-response-name"];
  const wantedCode = Number(call.headers?.["x-mock-response-code"]) || undefined;

  let best: { example: RawExample; rank: number } | null = null;
  for (const { request, example } of examples((collection as RawItem).item)) {
    const source = example.originalRequest ?? request;
    if (methodOf(source) !== call.method.toUpperCase()) continue;
    const matched = score(templateSegments(rawUrl(source), variables), path);
    if (matched === null) continue;
    if (wantedName && example.name !== wantedName) continue;
    if (wantedCode && example.code !== wantedCode) continue;
    const code = example.code ?? 200;
    const rank = matched * 10 + (code >= 200 && code < 300 ? 1 : 0);
    if (!best || rank > best.rank) best = { example, rank };
  }
  if (!best) return null;
  return {
    name: best.example.name ?? "",
    code: best.example.code ?? 200,
    headers: best.example.header ?? [],
    body: best.example.body ?? "",
  };
}
