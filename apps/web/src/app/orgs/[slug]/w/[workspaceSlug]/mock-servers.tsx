"use client";

import {
  Badge,
  Button,
  Card,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Mock = {
  id: string;
  name: string;
  url: string;
  isPrivate: boolean;
  delayMs: number;
  collection: { name: string };
};
type Option = { id: string; name: string };

const NONE = "none";

export function MockServers(props: {
  workspaceId: string;
  canEdit: boolean;
  mocks: Mock[];
  collections: Option[];
  environments: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState(props.collections[0]?.id ?? "");
  const [environmentId, setEnvironmentId] = useState(NONE);
  const [isPrivate, setIsPrivate] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, method: string, body?: unknown) {
    setError(null);
    try {
      await apiFetch(path, { method, body });
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await call(`/workspaces/${props.workspaceId}/mocks`, "POST", {
      name: name.trim(),
      collectionId,
      environmentId: environmentId === NONE ? null : environmentId,
      isPrivate,
    });
    if (ok) {
      setOpen(false);
      setName("");
    }
  }

  return (
    <div>
      <div className="mt-10 flex items-center justify-between">
        <h2 className="font-medium">Mock servers</h2>
        {props.canEdit && !open && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={props.collections.length === 0}>
            New mock server
          </Button>
        )}
      </div>

      {open && (
        <Card className="mt-3 p-4">
          <form onSubmit={create} className="space-y-3">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mock server name" required />
            <div className="flex gap-2">
              <Select value={collectionId} onValueChange={setCollectionId}>
                <SelectTrigger className="flex-1" aria-label="Collection">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {props.collections.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={environmentId} onValueChange={setEnvironmentId}>
                <SelectTrigger className="flex-1" aria-label="Environment">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No environment</SelectItem>
                  {props.environments.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="mock-private" checked={isPrivate} onCheckedChange={(v) => setIsPrivate(v === true)} />
              <Label htmlFor="mock-private">Private: callers need an Outpost API key (x-api-key header)</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={!name.trim() || !collectionId}>
                Create mock server
              </Button>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {props.mocks.length === 0 && !open ? (
        <p className="mt-2 text-muted-foreground">
          No mock server. Save responses as examples in a collection, then serve them at a URL your frontend can call.
        </p>
      ) : (
        props.mocks.length > 0 && (
          <Card className="mt-3 divide-y divide-border">
            {props.mocks.map((mock) => (
              <div key={mock.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="font-medium">{mock.name}</span>
                  <span className="ml-2 text-muted-foreground">{mock.collection.name}</span>
                  <Badge variant={mock.isPrivate ? "outline" : "warning"} className="ml-2">
                    {mock.isPrivate ? "private" : "public"}
                  </Badge>
                  <code className="mt-1 block truncate font-mono text-xs text-muted-foreground">{mock.url}</code>
                </span>
                <span className="flex shrink-0 gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await navigator.clipboard.writeText(mock.url);
                      setCopied(mock.id);
                    }}
                  >
                    {copied === mock.id ? "Copied" : "Copy URL"}
                  </Button>
                  {props.canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => confirm(`Delete ${mock.name}?`) && call(`/mocks/${mock.id}`, "DELETE")}
                    >
                      Delete
                    </Button>
                  )}
                </span>
              </div>
            ))}
          </Card>
        )
      )}
      {error && <p className="mt-2 text-destructive">{error}</p>}
    </div>
  );
}
