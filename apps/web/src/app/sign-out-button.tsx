"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <button type="button" onClick={signOut} className="underline-offset-4 hover:underline">
      Sign out
    </button>
  );
}
