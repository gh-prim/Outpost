"use client";

import { Button } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function AcceptInvitation({ invitationId, slug }: { invitationId: string; slug: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    const { error } = await authClient.organization.acceptInvitation({ invitationId });
    if (error) setError(error.message ?? "Could not accept the invitation");
    else router.push(`/orgs/${slug}`);
  }

  return (
    <>
      <Button className="w-full" onClick={accept}>
        Accept invitation
      </Button>
      {error && <p className="mt-2 text-destructive">{error}</p>}
    </>
  );
}
