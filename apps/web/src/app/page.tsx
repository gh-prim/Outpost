import { Button, Card } from "@outpost/ui";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { CreateOrganizationForm } from "./create-organization-form";
import { SignOutButton } from "./sign-out-button";

async function HomePageContent() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect("/sign-in");

  const organizations = await auth.api.listOrganizations({ headers: requestHeaders });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Outpost</h1>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-base font-medium">Organizations</h2>
        {organizations.length === 0 ? (
          <p className="mt-2 text-muted-foreground">You are not a member of any organization yet.</p>
        ) : (
          <Card className="mt-3 divide-y divide-border">
            {organizations.map((org) => (
              <div key={org.id} className="flex items-center justify-between px-4 py-3">
                <span>
                  <span className="font-medium">{org.name}</span>
                  <span className="ml-2 text-muted-foreground">{org.slug}</span>
                </span>
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/orgs/${org.slug}/sso`}>SSO settings</Link>
                </Button>
              </div>
            ))}
          </Card>
        )}
        <CreateOrganizationForm />
      </section>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}
