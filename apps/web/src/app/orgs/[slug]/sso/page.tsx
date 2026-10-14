import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { ProviderList } from "./provider-list";
import { RegisterProviderForm } from "./register-provider-form";

async function SsoSettingsContent({ params }: { params: PageProps<"/orgs/[slug]/sso">["params"] }) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) redirect("/sign-in");

  const organization = await auth.api
    .getFullOrganization({ headers: requestHeaders, query: { organizationSlug: slug } })
    .catch(() => null);
  if (!organization) notFound();

  const member = organization.members.find((m) => m.userId === session.user.id);
  const isAdmin = member?.role.split(",").some((role) => role === "owner" || role === "admin");

  const { providers } = isAdmin
    ? await auth.api.listSSOProviders({ headers: requestHeaders })
    : { providers: [] };
  const orgProviders = providers.filter((provider) => provider.organizationId === organization.id);
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 p-6">
      <Link href="/" className="text-sm text-neutral-500 underline-offset-4 hover:underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-xl font-semibold">{organization.name}: single sign-on</h1>

      {!isAdmin ? (
        <p className="mt-4 text-sm text-neutral-500">Only organization owners and admins can manage SSO.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-neutral-500">
            Users whose email matches a verified domain are sent to your identity provider when they sign in. New
            users are added to this organization automatically.
          </p>
          <ProviderList providers={orgProviders} baseURL={baseURL} />
          <RegisterProviderForm organizationId={organization.id} baseURL={baseURL} />
        </>
      )}
    </main>
  );
}

export default function SsoSettingsPage({ params }: PageProps<"/orgs/[slug]/sso">) {
  return (
    <Suspense>
      <SsoSettingsContent params={params} />
    </Suspense>
  );
}
