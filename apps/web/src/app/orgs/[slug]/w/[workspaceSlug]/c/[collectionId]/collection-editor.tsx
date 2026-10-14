"use client";

import type { RunResult } from "@outpost/engine";
import {
  Button,
  Input,
  MethodBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  cn,
} from "@outpost/ui";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useWorkspaceEvents } from "@/lib/use-workspace-events";
import {
  type CollectionDocument,
  type Header,
  type Item,
  findItem,
  firstRequest,
  requestOf,
  scriptOf,
  updateItem,
  urlOf,
  withScript,
} from "@/lib/collection-items";
import { HeadersEditor } from "./headers-editor";
import { ResponsePanel } from "./response-panel";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const NO_ENVIRONMENT = "none";

type Props = {
  workspaceId: string;
  workspaceHref: string;
  workspaceName: string;
  collectionId: string;
  initialDocument: CollectionDocument;
  initialVersion: number;
  environments: { id: string; name: string }[];
  canEdit: boolean;
  canRun: boolean;
};

export function CollectionEditor(props: Props) {
  const [document, setDocument] = useState(props.initialDocument);
  const [version, setVersion] = useState(props.initialVersion);
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState(firstRequest(props.initialDocument.item)?.id);
  const [environmentId, setEnvironmentId] = useState(NO_ENVIRONMENT);
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Set when someone else saved while this tab has unsaved changes.
  const [newerVersion, setNewerVersion] = useState<{ version: number; by: string } | null>(null);

  const reload = useCallback(async () => {
    const latest = await apiFetch<{ content: CollectionDocument; version: number }>(
      `/collections/${props.collectionId}`,
    );
    setDocument(latest.content);
    setVersion(latest.version);
    setDirty(false);
    setNewerVersion(null);
  }, [props.collectionId]);

  useWorkspaceEvents(props.workspaceId, (event) => {
    if (event.id !== props.collectionId || event.type !== "collection.updated") return;
    if (!event.version || event.version <= version) return;
    if (dirty) setNewerVersion({ version: event.version, by: event.actor?.name ?? "Someone" });
    else void reload();
  });

  const selected = selectedId ? findItem(document.item, selectedId) : undefined;
  const request = selected ? requestOf(selected) : undefined;

  function edit(update: (item: Item) => Item) {
    if (!selectedId) return;
    setDocument((doc) => ({ ...doc, item: updateItem(doc.item, selectedId, update) }));
    setDirty(true);
  }

  function editRequest(changes: Partial<ReturnType<typeof requestOf>>) {
    edit((item) => ({ ...item, request: { ...requestOf(item), ...changes } }));
  }

  function addRequest() {
    const item: Item = { id: crypto.randomUUID(), name: "New request", request: { method: "GET", url: "" } };
    setDocument((doc) => ({ ...doc, item: [...doc.item, item] }));
    setSelectedId(item.id);
    setDirty(true);
  }

  const send = useCallback(async () => {
    if (!selectedId) return;
    setRunning(true);
    setError(null);
    try {
      setResult(
        await apiFetch<RunResult>("/run", {
          method: "POST",
          body: {
            workspaceId: props.workspaceId,
            collection: document,
            itemId: selectedId,
            environmentId: environmentId === NO_ENVIRONMENT ? undefined : environmentId,
          },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }, [document, environmentId, props.workspaceId, selectedId]);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await apiFetch<{ content: CollectionDocument; version: number }>(
        `/collections/${props.collectionId}`,
        { method: "PUT", body: { content: document, baseVersion: version } },
      );
      setDocument(saved.content);
      setVersion(saved.version);
      setDirty(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }, [document, props.collectionId, version]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key === "Enter" && props.canRun) {
        event.preventDefault();
        void send();
      } else if (event.key === "s" && props.canEdit) {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [props.canEdit, props.canRun, save, send]);

  return (
    <div className="grid h-[calc(100vh-3rem)] grid-cols-[16rem_1fr] overflow-hidden">
      <aside className="flex flex-col overflow-y-auto border-r bg-sidebar">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <Link href={props.workspaceHref} className="truncate text-muted-foreground hover:text-foreground">
            {props.workspaceName}
          </Link>
          {props.canEdit && (
            <Button variant="ghost" size="sm" onClick={addRequest} aria-label="Add a request">
              +
            </Button>
          )}
        </div>
        <div className="px-3 py-2 font-medium">{document.info.name}</div>
        <ItemTree items={document.item} selectedId={selectedId} onSelect={setSelectedId} />
      </aside>

      <section className="flex min-w-0 flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b px-4 py-2">
          <Input
            value={selected?.name ?? ""}
            disabled={!selected || !props.canEdit}
            onChange={(e) => edit((item) => ({ ...item, name: e.target.value }))}
            className="h-7 max-w-80 border-transparent bg-transparent px-1 font-medium hover:border-input"
            aria-label="Request name"
          />
          <div className="ml-auto flex items-center gap-2">
            {error && <span className="text-destructive">{error}</span>}
            <Select value={environmentId} onValueChange={setEnvironmentId}>
              <SelectTrigger className="w-44" aria-label="Environment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ENVIRONMENT}>No environment</SelectItem>
                {props.environments.map((env) => (
                  <SelectItem key={env.id} value={env.id}>
                    {env.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {props.canEdit && (
              <Button variant="outline" onClick={save} disabled={!dirty || saving}>
                {saving ? "Saving…" : dirty ? "Save" : "Saved"}
              </Button>
            )}
          </div>
        </div>

        {newerVersion && (
          <div className="flex items-center gap-3 border-b bg-warning/10 px-4 py-2">
            <span>
              {newerVersion.by} saved a newer version (v{newerVersion.version}). Saving now would fail.
            </span>
            <Button variant="outline" size="sm" onClick={() => void reload()}>
              Load it and drop my changes
            </Button>
          </div>
        )}
        {!selected || !request ? (
          <p className="p-6 text-muted-foreground">Select a request, or add one with +.</p>
        ) : (
          <div className="grid min-h-0 flex-1 grid-rows-[auto_1fr_1fr]">
            <div className="flex gap-2 px-4 py-3">
              <Select
                value={(request.method ?? "GET").toUpperCase()}
                onValueChange={(method) => editRequest({ method })}
                disabled={!props.canEdit}
              >
                <SelectTrigger className="w-28" aria-label="Method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      <MethodBadge method={method} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={urlOf(request)}
                onChange={(e) => editRequest({ url: e.target.value })}
                readOnly={!props.canEdit}
                placeholder="https://api.example.com/resource or {{baseUrl}}/resource"
                className="font-mono"
                aria-label="URL"
              />
              <Button onClick={send} disabled={running || !props.canRun}>
                {running ? <Spinner /> : "Send"}
              </Button>
            </div>

            <Tabs defaultValue="headers" className="min-h-0 overflow-y-auto border-b px-4">
              <TabsList>
                <TabsTrigger value="headers">Headers</TabsTrigger>
                <TabsTrigger value="body">Body</TabsTrigger>
                <TabsTrigger value="prerequest">Pre-request script</TabsTrigger>
                <TabsTrigger value="test">Tests</TabsTrigger>
              </TabsList>
              <TabsContent value="headers" className="py-2">
                <HeadersEditor
                  headers={request.header ?? []}
                  readOnly={!props.canEdit}
                  onChange={(header: Header[]) => editRequest({ header })}
                />
              </TabsContent>
              <TabsContent value="body" className="py-2">
                <Textarea
                  value={request.body?.raw ?? ""}
                  readOnly={!props.canEdit}
                  onChange={(e) =>
                    editRequest({
                      body: e.target.value
                        ? {
                            mode: "raw",
                            raw: e.target.value,
                            options: request.body?.options ?? { raw: { language: "json" } },
                          }
                        : undefined,
                    })
                  }
                  placeholder='{ "hello": "world" }'
                  rows={8}
                  className="font-mono"
                  aria-label="Body"
                />
              </TabsContent>
              {(["prerequest", "test"] as const).map((listen) => (
                <TabsContent key={listen} value={listen} className="py-2">
                  <Textarea
                    value={scriptOf(selected, listen)}
                    readOnly={!props.canEdit}
                    onChange={(e) => edit((item) => withScript(item, listen, e.target.value))}
                    placeholder={
                      listen === "test"
                        ? 'pm.test("status is 200", () => pm.response.to.have.status(200));'
                        : 'pm.environment.set("timestamp", Date.now());'
                    }
                    rows={8}
                    className="font-mono"
                    aria-label={listen === "test" ? "Tests" : "Pre-request script"}
                  />
                </TabsContent>
              ))}
            </Tabs>

            <ResponsePanel result={result} running={running} />
          </div>
        )}
      </section>
    </div>
  );
}

function ItemTree({
  items,
  selectedId,
  onSelect,
  depth = 0,
}: {
  items: Item[];
  selectedId?: string;
  onSelect: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul>
      {items.map((item) =>
        item.item ? (
          <li key={item.id}>
            <div className="truncate py-1 text-muted-foreground" style={{ paddingLeft: 12 + depth * 12 }}>
              {item.name}
            </div>
            <ItemTree items={item.item} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
          </li>
        ) : (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item.id)}
              className={cn(
                "flex w-full items-center gap-2 py-1 pr-3 text-left hover:bg-muted",
                item.id === selectedId && "bg-muted",
              )}
              style={{ paddingLeft: 12 + depth * 12 }}
            >
              <MethodBadge method={requestOf(item).method ?? "GET"} short className="w-10 shrink-0" />
              <span className="truncate">{item.name}</span>
            </button>
          </li>
        ),
      )}
    </ul>
  );
}
