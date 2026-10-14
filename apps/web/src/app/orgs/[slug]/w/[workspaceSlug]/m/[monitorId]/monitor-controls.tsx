"use client";

import { Button } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export function MonitorControls(props: {
  monitorId: string;
  enabled: boolean;
  canEdit: boolean;
  canRun: boolean;
  backHref: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  async function call(path: string, method: string, body?: unknown) {
    setMessage(null);
    try {
      await apiFetch(path, { method, body });
      return true;
    } catch (e) {
      setMessage((e as Error).message);
      return false;
    }
  }

  async function runNow() {
    if (await call(`/monitors/${props.monitorId}/run`, "POST")) {
      setMessage("Queued. Results appear within a few seconds.");
      // The runner polls every few seconds; refresh once it had time to finish.
      setTimeout(() => router.refresh(), 8000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {message && <span className="text-muted-foreground">{message}</span>}
      {props.canRun && (
        <Button variant="outline" onClick={runNow}>
          Run now
        </Button>
      )}
      {props.canEdit && (
        <>
          <Button
            variant="outline"
            onClick={async () => {
              if (await call(`/monitors/${props.monitorId}`, "PATCH", { enabled: !props.enabled })) router.refresh();
            }}
          >
            {props.enabled ? "Pause" : "Resume"}
          </Button>
          <Button
            variant="ghost"
            className="text-destructive"
            onClick={async () => {
              if (
                confirm("Delete this monitor and its history?") &&
                (await call(`/monitors/${props.monitorId}`, "DELETE"))
              ) {
                router.push(props.backHref);
              }
            }}
          >
            Delete
          </Button>
        </>
      )}
    </div>
  );
}
