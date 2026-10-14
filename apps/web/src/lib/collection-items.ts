/** Helpers to read and edit Collection Format v2.1 items in the editor. */

export type Header = { key: string; value: string; disabled?: boolean };

export type RequestDefinition = {
  method?: string;
  url?: string | { raw?: string };
  header?: Header[];
  body?: { mode?: string; raw?: string; options?: { raw?: { language?: string } } };
  [key: string]: unknown;
};

export type ScriptEvent = { listen: "prerequest" | "test"; script: { exec?: string[] | string; type?: string } };

export type Item = {
  id: string;
  name: string;
  item?: Item[];
  request?: RequestDefinition | string;
  event?: ScriptEvent[];
  [key: string]: unknown;
};

export type CollectionDocument = {
  info: { name: string; [key: string]: unknown };
  item: Item[];
  [key: string]: unknown;
};

export function findItem(items: Item[], id: string): Item | undefined {
  for (const item of items) {
    if (item.id === id) return item;
    const found = item.item && findItem(item.item, id);
    if (found) return found;
  }
}

export function updateItem(items: Item[], id: string, update: (item: Item) => Item): Item[] {
  return items.map((item) => {
    if (item.id === id) return update(item);
    return item.item ? { ...item, item: updateItem(item.item, id, update) } : item;
  });
}

export function firstRequest(items: Item[]): Item | undefined {
  for (const item of items) {
    if (!item.item) return item;
    const found = firstRequest(item.item);
    if (found) return found;
  }
}

export function requestOf(item: Item): RequestDefinition {
  if (typeof item.request === "string") return { method: "GET", url: item.request };
  return item.request ?? { method: "GET", url: "" };
}

export function urlOf(request: RequestDefinition) {
  return typeof request.url === "string" ? request.url : (request.url?.raw ?? "");
}

export function scriptOf(item: Item, listen: ScriptEvent["listen"]) {
  const exec = item.event?.find((e) => e.listen === listen)?.script.exec;
  return Array.isArray(exec) ? exec.join("\n") : (exec ?? "");
}

export function withScript(item: Item, listen: ScriptEvent["listen"], code: string): Item {
  const others = (item.event ?? []).filter((e) => e.listen !== listen);
  const event: ScriptEvent[] = code.trim()
    ? [...others, { listen, script: { type: "text/javascript", exec: code.split("\n") } }]
    : others;
  return { ...item, event };
}
