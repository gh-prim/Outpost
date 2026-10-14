import type { RunInput, RunResult } from "@outpost/engine";
import { apiFetch } from "./api";

type DesktopBridge = { run: (input: RunInput) => Promise<RunResult> };

/** Set by the Outpost desktop app, which runs requests on the user's computer. */
export function desktopBridge(): DesktopBridge | undefined {
  return typeof window === "undefined" ? undefined : (window as { outpostDesktop?: DesktopBridge }).outpostDesktop;
}

export type ExecuteInput = {
  workspaceId: string;
  collection: unknown;
  itemId?: string;
  environmentId?: string;
  iterationData?: Record<string, unknown>[];
};

/**
 * Runs a collection or a request: on this computer in the desktop app (reaches localhost and
 * the internal network), otherwise from the Outpost server.
 */
export async function execute(input: ExecuteInput): Promise<RunResult> {
  const desktop = desktopBridge();
  if (!desktop) return apiFetch<RunResult>("/run", { method: "POST", body: input });

  const environment = input.environmentId
    ? (
        await apiFetch<{ values: { key: string; value: string; enabled: boolean }[] }>(
          `/environments/${input.environmentId}`,
        )
      ).values
    : [];
  return desktop.run({
    collection: input.collection,
    itemId: input.itemId,
    environment,
    iterationData: input.iterationData,
  });
}
