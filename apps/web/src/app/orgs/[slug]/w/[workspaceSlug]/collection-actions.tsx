"use client";

import { Button } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { isOpenApi, openApiToCollection, parseApiDocument } from "@outpost/engine/openapi";
import { apiFetch } from "@/lib/api";

export function CollectionActions({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(body: unknown) {
    setError(null);
    try {
      await apiFetch(`/workspaces/${workspaceId}/collections`, { method: "POST", body });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  /** Accepts collections (v2.1 JSON) and OpenAPI 3 specs (JSON or YAML). */
  async function importFile(file: File) {
    let document: unknown;
    try {
      document = parseApiDocument(await file.text());
    } catch {
      setError("This file is neither valid JSON nor YAML");
      return;
    }
    await create({ content: isOpenApi(document) ? openApiToCollection(document) : document });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-destructive">{error}</span>}
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json,.yaml,.yml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void importFile(file);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
        Import
      </Button>
      <Button
        size="sm"
        onClick={() => {
          const name = prompt("Collection name");
          if (name?.trim()) void create({ name: name.trim() });
        }}
      >
        New collection
      </Button>
    </div>
  );
}
