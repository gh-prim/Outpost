"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Checkbox, Input, Label } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export function CreateWorkspaceForm({ organizationId, slug }: { organizationId: string; slug: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const workspace = await apiFetch<{ slug: string }>("/workspaces", {
        method: "POST",
        body: { organizationId, name, visibility: isPrivate ? "PRIVATE" : "ORGANIZATION" },
      });
      router.push(`/orgs/${slug}/w/${workspace.slug}`);
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>New workspace</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Workspace name" required />
          <div className="flex items-center gap-2">
            <Checkbox id="private" checked={isPrivate} onCheckedChange={(v) => setIsPrivate(v === true)} />
            <Label htmlFor="private">Private: only invited members can see it</Label>
          </div>
          <Button type="submit" disabled={pending || !name.trim()}>
            Create workspace
          </Button>
          {error && <p className="text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
