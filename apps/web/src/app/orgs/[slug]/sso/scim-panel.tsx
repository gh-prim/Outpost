"use client";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@outpost/ui";
import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Credential = { credentialId: string; status: string; expiresAt: string; lastUsedAt: string | null };
type ScimState = { baseUrl: string; connection: { connectionId: string } | null; credentials: Credential[] };

const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

export function ScimPanel({ organizationId }: { organizationId: string }) {
  const [state, setState] = useState<ScimState | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped after every change to reload the state.
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    apiFetch<ScimState>(`/organizations/${organizationId}/scim`).then(
      (data) => active && setState(data),
      (e: Error) => active && setError(e.message),
    );
    return () => {
      active = false;
    };
  }, [organizationId, revision]);

  async function issue() {
    setError(null);
    try {
      const result = await apiFetch<{ token: string }>(`/organizations/${organizationId}/scim`, { method: "POST" });
      setToken(result.token);
      setRevision((r) => r + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function revoke(credentialId: string) {
    if (!confirm("Revoke this token? Your identity provider will stop syncing until it gets a new one.")) return;
    await apiFetch(`/organizations/${organizationId}/scim/credentials/${credentialId}`, { method: "DELETE" });
    setRevision((r) => r + 1);
  }

  const activeCredentials = state?.credentials.filter((c) => c.status === "active") ?? [];

  return (
    <Card className="mt-10">
      <CardHeader>
        <CardTitle>User provisioning (SCIM 2.0)</CardTitle>
        <CardDescription>
          Let your identity provider (Okta, Entra ID, OneLogin, JumpCloud...) add and remove members automatically.
          Users removed from the app in your IdP lose access to this organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {state && (
          <div>
            <div className="text-muted-foreground">SCIM base URL</div>
            <code className="font-mono text-xs break-all">{state.baseUrl}</code>
          </div>
        )}
        {token && (
          <div className="space-y-1 rounded-md bg-muted p-3">
            <div>Bearer token, shown only once:</div>
            <code className="block font-mono text-xs break-all">{token}</code>
          </div>
        )}
        {activeCredentials.length > 0 && (
          <ul className="divide-y divide-border rounded-md border">
            {activeCredentials.map((c) => (
              <li key={c.credentialId} className="flex items-center justify-between px-3 py-2">
                <span className="flex items-center gap-2">
                  <Badge variant="success">active</Badge>
                  <span className="text-muted-foreground">
                    expires {dateFormat.format(new Date(c.expiresAt))}
                    {c.lastUsedAt && ` · last used ${dateFormat.format(new Date(c.lastUsedAt))}`}
                  </span>
                </span>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => revoke(c.credentialId)}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button variant={state?.connection ? "outline" : "default"} onClick={issue}>
          {state?.connection ? "Generate a new token" : "Enable SCIM"}
        </Button>
        {error && <p className="text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
