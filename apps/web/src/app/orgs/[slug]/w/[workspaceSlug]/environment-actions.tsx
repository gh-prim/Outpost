"use client";

import { Button } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { apiFetch } from "@/lib/api";

export function EnvironmentActions({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  /** Accepts environment exports: { name, values: [{ key, value, enabled, type }] }. */
  async function importFile(file: File) {
    try {
      const data = JSON.parse(await file.text());
      const values = (data.values ?? []).map(
        (v: { key: string; value?: unknown; enabled?: boolean; type?: string }) => ({
          key: String(v.key),
          value: String(v.value ?? ""),
          enabled: v.enabled !== false,
          type: v.type === "secret" ? "secret" : "default",
        }),
      );
      await apiFetch(`/workspaces/${workspaceId}/environments`, {
        method: "POST",
        body: { name: String(data.name || file.name.replace(/\.json$/, "")), values },
      });
      router.refresh();
    } catch (e) {
      alert(`Could not import this file: ${(e as Error).message}`);
    }
  }

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
    <div className="flex gap-1">
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = "";
        }}
      />
      <Button variant="ghost" size="sm" onClick={() => fileInput.current?.click()}>
        Import
      </Button>
      <Button variant="ghost" size="sm" onClick={create}>
        New
      </Button>
    </div>
  );
}
