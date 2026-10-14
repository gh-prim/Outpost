"use client";

import { Button, Input, Label } from "@outpost/ui";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function SsoSignInForm() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.sso({
      email,
      callbackURL: "/",
      errorCallbackURL: "/sign-in",
    });
    if (error) {
      setError(error.message ?? "No SSO provider found for this email");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="sso-email">Work email</Label>
        <Input
          id="sso-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          required
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Redirecting…" : "Continue with SSO"}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </form>
  );
}
