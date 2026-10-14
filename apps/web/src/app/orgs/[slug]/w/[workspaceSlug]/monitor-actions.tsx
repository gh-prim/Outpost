"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { MONITOR_INTERVAL_OPTIONS as INTERVALS } from "@/lib/monitor-intervals";

const NONE = "none";

export function NewMonitorForm(props: {
  workspaceId: string;
  collections: { id: string; name: string }[];
  environments: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [collectionId, setCollectionId] = useState(props.collections[0]?.id ?? "");
  const [environmentId, setEnvironmentId] = useState(NONE);
  const [interval, setInterval] = useState("60");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={props.collections.length === 0}>
        New monitor
      </Button>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await apiFetch(`/workspaces/${props.workspaceId}/monitors`, {
        method: "POST",
        body: {
          name: name.trim(),
          collectionId,
          environmentId: environmentId === NONE ? null : environmentId,
          intervalMinutes: Number(interval),
          webhookUrl: webhookUrl.trim(),
        },
      });
      setOpen(false);
      setName("");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle>New monitor</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Monitor name" required />
          <Select value={collectionId} onValueChange={setCollectionId}>
            <SelectTrigger className="w-full" aria-label="Collection">
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
          <div className="flex gap-2">
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
            <Select value={interval} onValueChange={setInterval}>
              <SelectTrigger className="flex-1" aria-label="Frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVALS.map((i) => (
                  <SelectItem key={i.value} value={String(i.value)}>
                    {i.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="Alert webhook (Slack, Teams or any URL), optional"
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={!name.trim() || !collectionId}>
              Create monitor
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          {error && <p className="text-destructive">{error}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
