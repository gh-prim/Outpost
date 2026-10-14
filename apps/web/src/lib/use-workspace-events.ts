"use client";

import { useEffect, useRef } from "react";

export type WorkspaceEvent = {
  type: string;
  workspaceId: string;
  id?: string;
  version?: number;
  actor?: { id: string; name: string };
};

/** Calls `onEvent` for every change in the workspace. EventSource reconnects on its own. */
export function useWorkspaceEvents(workspaceId: string, onEvent: (event: WorkspaceEvent) => void) {
  const handler = useRef(onEvent);
  useEffect(() => {
    handler.current = onEvent;
  });

  useEffect(() => {
    const source = new EventSource(`/api/v1/workspaces/${workspaceId}/events`);
    source.onmessage = (message) => handler.current(JSON.parse(message.data));
    return () => source.close();
  }, [workspaceId]);
}
