import type { RequestDefinition } from "./collection-items";
import { urlOf } from "./collection-items";

const quote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`;

export function resolveVariables(text: string, variables: Map<string, string>) {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, name: string) => variables.get(name) ?? match);
}

/** A copy-pastable curl command for a request, with variables resolved when known. */
export function toCurl(request: RequestDefinition, variables: Map<string, string>) {
  const method = (request.method ?? "GET").toUpperCase();
  const parts = [`curl -X ${method} ${quote(resolveVariables(urlOf(request), variables))}`];
  for (const header of request.header ?? []) {
    if (!header.disabled) parts.push(`-H ${quote(`${header.key}: ${resolveVariables(header.value, variables)}`)}`);
  }
  if (request.body?.mode === "raw" && request.body.raw)
    parts.push(`--data-raw ${quote(resolveVariables(request.body.raw, variables))}`);
  return parts.join(" \\\n  ");
}
