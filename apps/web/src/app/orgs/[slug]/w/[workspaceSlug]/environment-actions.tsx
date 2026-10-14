"use client";

import { Button } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export function EnvironmentActions({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();

  async function create() {
    const name = prompt("Environment name");
    if (!name?.trim()) return;
    try {
      await apiFetch(`/workspaces/${workspaceId}/environments`, { method: "POST", body: { name: name.trim() } });
      router.refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  return (
    <Button variant="ghost" size="sm" onClick={create}>
      New
    </Button>
  );
}
