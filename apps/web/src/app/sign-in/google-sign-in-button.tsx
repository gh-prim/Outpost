"use client";

import { Button } from "@outpost/ui";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function GoogleSignInButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setPending(true);
    setError(null);
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/sign-in",
    });
    if (error) {
      setError(error.message ?? "Sign-in failed");
      setPending(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="lg" className="w-full" onClick={signIn} disabled={pending}>
        {pending ? "Redirecting…" : "Continue with Google"}
      </Button>
      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </>
  );
}
