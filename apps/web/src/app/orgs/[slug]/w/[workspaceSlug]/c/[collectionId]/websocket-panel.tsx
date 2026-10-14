"use client";

import { Badge, Button, Input, Textarea, cn } from "@outpost/ui";
import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { resolveVariables } from "@/lib/curl";
import type { Item, WebSocketMessage } from "@/lib/collection-items";

type LogEntry = { direction: "in" | "out" | "info" | "error"; text: string; at: Date };

const timeFormat = new Intl.DateTimeFormat("en", { timeStyle: "medium" });

/**
 * WebSocket requests run from the browser (or the desktop app window), so they reach whatever the
 * user's machine can reach. Browsers cannot set custom headers on WebSockets: use query parameters
 * or subprotocols for authentication.
 */
export function WebSocketPanel({
  item,
  environmentId,
  readOnly,
  onChange,
}: {
  item: Item;
  environmentId?: string;
  readOnly: boolean;
  onChange: (item: Item) => void;
}) {
  const url = typeof item.request === "string" ? item.request : ((item.request?.url as string | undefined) ?? "");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [state, setState] = useState<"closed" | "connecting" | "open">("closed");
  const [log, setLog] = useState<LogEntry[]>([]);
  const [draft, setDraft] = useState("");
  const logEnd = useRef<HTMLDivElement>(null);

  const append = (entry: Omit<LogEntry, "at">) => setLog((current) => [...current, { ...entry, at: new Date() }]);

  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "end" });
  }, [log]);

  // Close the connection when leaving the request.
  useEffect(() => {
    return () => socket?.close();
  }, [socket]);

  async function connect() {
    let target = url;
    if (environmentId) {
      const env = await apiFetch<{ values: { key: string; value: string; enabled: boolean }[] }>(
        `/environments/${environmentId}`,
      );
      target = resolveVariables(url, new Map(env.values.filter((v) => v.enabled).map((v) => [v.key, v.value])));
    }
    try {
      const ws = new WebSocket(target);
      setState("connecting");
      append({ direction: "info", text: `Connecting to ${target}` });
      ws.onopen = () => {
        setState("open");
        append({ direction: "info", text: "Connected" });
      };
      ws.onmessage = (event) =>
        append({ direction: "in", text: typeof event.data === "string" ? event.data : "[binary message]" });
      ws.onerror = () => append({ direction: "error", text: "Connection error" });
      ws.onclose = (event) => {
        setState("closed");
        append({ direction: "info", text: `Disconnected (${event.code}${event.reason ? `, ${event.reason}` : ""})` });
      };
      setSocket(ws);
    } catch (e) {
      append({ direction: "error", text: (e as Error).message });
    }
  }

  function send(text: string) {
    if (!socket || state !== "open" || !text) return;
    socket.send(text);
    append({ direction: "out", text });
  }

  function saveMessage() {
    const name = prompt("Message name", "Message")?.trim();
    if (!name) return;
    const messages: WebSocketMessage[] = [...(item.messages ?? []), { name, body: draft }];
    onChange({ ...item, messages });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_auto_1fr]">
      <div className="flex gap-2 px-4 py-3">
        <Badge variant="secondary" className="h-8 px-3">
          WS
        </Badge>
        <Input
          value={url}
          readOnly={readOnly}
          onChange={(e) => onChange({ ...item, request: { url: e.target.value } })}
          placeholder="wss://echo.example.com/socket or {{wsUrl}}"
          className="font-mono"
          aria-label="WebSocket URL"
        />
        {state === "closed" ? (
          <Button onClick={connect} disabled={!url}>
            Connect
          </Button>
        ) : (
          <Button variant="outline" onClick={() => socket?.close()}>
            Disconnect
          </Button>
        )}
      </div>

      <div className="border-b px-4 pb-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder='{ "type": "subscribe", "channel": "orders" }'
          rows={4}
          className="font-mono"
          aria-label="Message"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(draft);
          }}
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => send(draft)} disabled={state !== "open" || !draft}>
            Send
          </Button>
          {!readOnly && (
            <Button size="sm" variant="ghost" onClick={saveMessage} disabled={!draft}>
              Save message
            </Button>
          )}
          {(item.messages ?? []).map((message, i) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              onClick={() => setDraft(message.body)}
              title="Load into the composer"
            >
              {message.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="min-h-0 overflow-y-auto px-4 py-2 font-mono text-xs">
        {log.length === 0 && <p className="font-sans text-muted-foreground">Connect to see messages here.</p>}
        {log.map((entry, i) => (
          <div key={i} className="flex gap-3 py-0.5">
            <span className="shrink-0 text-muted-foreground">{timeFormat.format(entry.at)}</span>
            <span
              className={cn(
                "w-4 shrink-0",
                entry.direction === "in" && "text-success",
                entry.direction === "out" && "text-primary",
                entry.direction === "error" && "text-destructive",
              )}
            >
              {entry.direction === "in" ? "↓" : entry.direction === "out" ? "↑" : "•"}
            </span>
            <span
              className={cn("break-all whitespace-pre-wrap", entry.direction === "info" && "text-muted-foreground")}
            >
              {entry.text}
            </span>
          </div>
        ))}
        <div ref={logEnd} />
      </div>
    </div>
  );
}
