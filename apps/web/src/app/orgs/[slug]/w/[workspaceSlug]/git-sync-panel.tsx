"use client";

import { Button, Card, Input, Label } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type GitSync = {
  repoUrl: string;
  branch: string;
  directory: string;
  hasToken: boolean;
  lastCommit: string | null;
  lastSyncedAt: string | Date | null;
};

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });

export function GitSyncPanel(props: {
  workspaceId: string;
  gitSync: GitSync | null;
  canEdit: boolean;
  canAdmin: boolean;
}) {
  const router = useRouter();
  const sync = props.gitSync;
  const [editing, setEditing] = useState(false);
  const [repoUrl, setRepoUrl] = useState(sync?.repoUrl ?? "");
  const [branch, setBranch] = useState(sync?.branch ?? "main");
  const [directory, setDirectory] = useState(sync?.directory ?? "outpost");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState<"push" | "pull" | "save" | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  async function call<T>(kind: "push" | "pull" | "save", path: string, method: string, body?: unknown) {
    setBusy(kind);
    setMessage(null);
    try {
      return await apiFetch<T>(path, { method, body });
    } catch (e) {
      setMessage({ text: (e as Error).message, error: true });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await call("save", `/workspaces/${props.workspaceId}/git`, "PUT", {
      repoUrl,
      branch,
      directory,
      ...(token ? { token } : {}),
    });
    if (saved) {
      setEditing(false);
      setToken("");
      router.refresh();
    }
  }

  async function push() {
    const result = await call<{ changed: boolean; files?: number }>(
      "push",
      `/workspaces/${props.workspaceId}/git/push`,
      "POST",
    );
    if (result) {
      setMessage({
        text: result.changed ? `Pushed ${result.files} changed files.` : "Nothing to push, Git is up to date.",
      });
      router.refresh();
    }
  }

  async function pull() {
    const result = await call<{ created: number; updated: number; environments: number }>(
      "pull",
      `/workspaces/${props.workspaceId}/git/pull`,
      "POST",
    );
    if (result) {
      setMessage({
        text: `${result.created} collections added, ${result.updated} updated, ${result.environments} environments refreshed.`,
      });
      router.refresh();
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Git sync</h2>
        {props.canAdmin && !editing && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            {sync ? "Settings" : "Connect"}
          </Button>
        )}
      </div>

      {editing ? (
        <Card className="mt-3 p-3">
          <form onSubmit={save} className="space-y-2">
            <Input
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/acme/apis.git"
              type="url"
              required
            />
            <div className="flex gap-2">
              <Input
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="Branch"
                aria-label="Branch"
              />
              <Input
                value={directory}
                onChange={(e) => setDirectory(e.target.value)}
                placeholder="Folder"
                aria-label="Folder"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="git-token">Access token {sync?.hasToken && "(saved, leave empty to keep it)"}</Label>
              <Input
                id="git-token"
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Personal access token with write access"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={busy !== null}>
                Save
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      ) : sync ? (
        <Card className="mt-3 space-y-2 p-3">
          <div className="truncate font-mono text-xs" title={sync.repoUrl}>
            {sync.repoUrl.replace(/^https?:\/\//, "")}
          </div>
          <div className="text-xs text-muted-foreground">
            {sync.branch} · {sync.directory}/
            {sync.lastSyncedAt && ` · synced ${dateFormat.format(new Date(sync.lastSyncedAt))}`}
            {sync.lastCommit && ` · ${sync.lastCommit.slice(0, 7)}`}
          </div>
          {props.canEdit && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={pull} disabled={busy !== null}>
                {busy === "pull" ? "Pulling…" : "Pull"}
              </Button>
              <Button size="sm" onClick={push} disabled={busy !== null}>
                {busy === "push" ? "Pushing…" : "Push"}
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <p className="mt-2 text-muted-foreground">
          Keep collections and environments in a Git repository, one JSON file each.
        </p>
      )}
      {message && (
        <p className={message.error ? "mt-2 text-destructive" : "mt-2 text-muted-foreground"}>{message.text}</p>
      )}
    </div>
  );
}
