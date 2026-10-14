/** Minimal view of a Collection Format v2.1 item tree, enough to list folders and requests. */
export type TreeNode =
  | { kind: "folder"; name: string; children: TreeNode[] }
  | { kind: "request"; name: string; method: string };

type RawItem = { name?: unknown; item?: unknown; request?: unknown };

export function toTree(items: unknown): TreeNode[] {
  if (!Array.isArray(items)) return [];
  return items.map((raw: RawItem) => {
    const name = typeof raw?.name === "string" ? raw.name : "Untitled";
    if (Array.isArray(raw?.item)) return { kind: "folder", name, children: toTree(raw.item) };
    const request = raw?.request as { method?: unknown } | string | undefined;
    const method = typeof request === "object" && typeof request?.method === "string" ? request.method : "GET";
    return { kind: "request", name, method };
  });
}

export function countRequests(nodes: TreeNode[]): number {
  return nodes.reduce((n, node) => n + (node.kind === "request" ? 1 : countRequests(node.children)), 0);
}
