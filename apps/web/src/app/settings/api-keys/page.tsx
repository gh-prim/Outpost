import { Button } from "@outpost/ui";
import Link from "next/link";
import { Suspense } from "react";
import { getPageActor } from "@/server/page";
import { ApiKeys } from "./api-keys";

async function ApiKeysContent() {
  await getPageActor();
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return <ApiKeys baseURL={baseURL} />;
}

export default function ApiKeysPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
      <Button asChild variant="ghost" size="sm" className="-ml-2.5">
        <Link href="/">← Back</Link>
      </Button>
      <h1 className="mt-4 text-lg font-semibold">API keys</h1>
      <p className="mt-1 text-muted-foreground">
        Personal keys for the Outpost CLI and the REST API. A key acts with your permissions.
      </p>
      <Suspense>
        <ApiKeysContent />
      </Suspense>
    </main>
  );
}
