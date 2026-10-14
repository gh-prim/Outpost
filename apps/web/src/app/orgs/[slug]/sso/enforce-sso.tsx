"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, Switch } from "@outpost/ui";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export function EnforceSso({
  organizationId,
  initial,
  canEnable,
}: {
  organizationId: string;
  initial: boolean;
  canEnable: boolean;
}) {
  const [enabled, setEnabled] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function toggle(value: boolean) {
    setError(null);
    try {
      await apiFetch(`/organizations/${organizationId}/settings`, { method: "PATCH", body: { enforceSso: value } });
      setEnabled(value);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle>Require SSO</CardTitle>
          <Switch
            checked={enabled}
            disabled={!enabled && !canEnable}
            onCheckedChange={toggle}
            aria-label="Require SSO"
          />
        </div>
        <CardDescription>
          People whose email belongs to a verified domain must sign in through your identity provider. Google and other
          methods are refused for them. {!canEnable && "Verify a domain first."}
        </CardDescription>
      </CardHeader>
      {error && (
        <CardContent>
          <p className="text-destructive">{error}</p>
        </CardContent>
      )}
    </Card>
  );
}
