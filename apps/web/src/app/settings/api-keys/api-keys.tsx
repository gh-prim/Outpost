"use client";

import { Button, Card, Input } from "@outpost/ui";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Key = { id: string; name: string | null; start: string | null; createdAt: Date; expiresAt: Date | null };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function ApiKeys({ baseURL }: { baseURL: string }) {
  const [keys, setKeys] = useState<Key[]>([]);
  const [name, setName] = useState("");
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Bumped after every change to reload the list.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    authClient.apiKey.list().then(({ data }) => {
      if (!active || !data) return;
      setKeys(Array.isArray(data) ? data : ((data as { apiKeys?: Key[] }).apiKeys ?? []));
    });
    return () => {
      active = false;
    };
  }, [revision]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const { data, error } = await authClient.apiKey.create({ name: name.trim() });
    if (error) return setError(error.message ?? "Could not create the key");
    setCreated(data.key);
    setName("");
    setRevision((r) => r + 1);
  }

  async function remove(keyId: string) {
    if (!confirm("Delete this key? Scripts using it will stop working.")) return;
    await authClient.apiKey.delete({ keyId });
    setRevision((r) => r + 1);
  }

  return (
    <div className="mt-6 space-y-6">
      {created && (
        <Card className="space-y-2 p-4">
          <p>Copy this key now, it will not be shown again.</p>
          <code className="block rounded-md bg-muted p-2 font-mono text-xs break-all">{created}</code>
          <p className="text-muted-foreground">
            CLI:{" "}
            <code className="font-mono text-xs">
              outpost login --server {baseURL} --key {created.slice(0, 8)}…
            </code>
          </p>
        </Card>
      )}

      <form onSubmit={create} className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name, e.g. CI pipeline"
          required
        />
        <Button type="submit" disabled={!name.trim()}>
          Create key
        </Button>
      </form>
      {error && <p className="text-destructive">{error}</p>}

      {keys.length > 0 && (
        <Card className="divide-y divide-border">
          {keys.map((key) => (
            <div key={key.id} className="flex items-center justify-between px-4 py-3">
              <span>
                <span className="font-medium">{key.name}</span>
                <span className="ml-2 font-mono text-xs text-muted-foreground">{key.start}…</span>
              </span>
              <span className="flex items-center gap-3 text-muted-foreground">
                created {dateFormat.format(new Date(key.createdAt))}
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(key.id)}>
                  Delete
                </Button>
              </span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
