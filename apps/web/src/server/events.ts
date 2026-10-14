import { Client } from "pg";

/**
 * Workspace change notifications, fanned out through PostgreSQL LISTEN/NOTIFY so that
 * every Outpost instance behind a load balancer sees changes made on the others.
 */
export type WorkspaceEvent = {
  type:
    | "collection.created"
    | "collection.updated"
    | "collection.deleted"
    | "environment.changed"
    | "workspace.changed";
  workspaceId: string;
  id?: string;
  version?: number;
  actor?: { id: string; name: string };
};

const CHANNEL = "outpost_events";

type Listener = (event: WorkspaceEvent) => void;

type State = { listeners: Map<string, Set<Listener>>; client?: Promise<Client> };

// Kept on globalThis so hot reloads in development reuse one connection.
const globalForEvents = globalThis as unknown as { outpostEvents?: State };
const state: State = (globalForEvents.outpostEvents ??= { listeners: new Map() });

function listenClient() {
  state.client ??= (async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    client.on("notification", (message) => {
      if (message.channel !== CHANNEL || !message.payload) return;
      const event = JSON.parse(message.payload) as WorkspaceEvent;
      for (const listener of state.listeners.get(event.workspaceId) ?? []) listener(event);
    });
    // Reconnect on the next subscription if the connection drops.
    client.on("error", () => {
      state.client = undefined;
    });
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    return client;
  })();
  return state.client;
}

export async function subscribe(workspaceId: string, listener: Listener) {
  await listenClient();
  const listeners = state.listeners.get(workspaceId) ?? new Set();
  listeners.add(listener);
  state.listeners.set(workspaceId, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) state.listeners.delete(workspaceId);
  };
}

/** Best effort: a failed notification never fails the change that triggered it. */
export async function publish(event: WorkspaceEvent) {
  try {
    const client = await listenClient();
    await client.query("SELECT pg_notify($1, $2)", [CHANNEL, JSON.stringify(event)]);
  } catch (error) {
    console.error("Could not publish workspace event", error);
  }
}
