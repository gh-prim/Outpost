"use client";

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
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        required
        className="w-full rounded-lg border border-neutral-300 bg-transparent px-3 py-2.5 text-sm dark:border-neutral-700"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-neutral-900"
      >
        {pending ? "Redirecting…" : "Continue with SSO"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
