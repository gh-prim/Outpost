import { Suspense } from "react";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
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
        <h1 className="text-xl font-semibold">Outpost</h1>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-neutral-500">{session.user.email}</span>
          <SignOutButton />
        </div>
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Organizations</h2>
        {organizations.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">You are not a member of any organization yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {organizations.map((org) => (
              <li key={org.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{org.name}</span>
                  <span className="ml-2 text-neutral-500">{org.slug}</span>
                </span>
                <Link href={`/orgs/${org.slug}/sso`} className="text-neutral-500 underline-offset-4 hover:underline">
                  SSO settings
                </Link>
              </li>
            ))}
          </ul>
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
