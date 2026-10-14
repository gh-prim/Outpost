"use client";

import { Button } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.push("/sign-in");
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={signOut}>
      Sign out
    </Button>
  );
}
