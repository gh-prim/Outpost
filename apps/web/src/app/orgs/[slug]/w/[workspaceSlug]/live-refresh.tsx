"use client";

import { useRouter } from "next/navigation";
import { useWorkspaceEvents } from "@/lib/use-workspace-events";

/** Re-renders the page when someone changes the workspace. */
export function LiveRefresh({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  useWorkspaceEvents(workspaceId, () => router.refresh());
  return null;
}
