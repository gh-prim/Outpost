import { headers } from "next/headers";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { getPageOrganization } from "@/server/page";
import { readOrgMetadata } from "@/lib/sso-enforcement";
import { EnforceSso } from "./enforce-sso";
import { ProviderList } from "./provider-list";
import { RegisterProviderForm } from "./register-provider-form";
import { ScimPanel } from "./scim-panel";

async function SsoSettingsContent({ params }: { params: PageProps<"/orgs/[slug]/sso">["params"] }) {
  const { slug } = await params;
  const { organization, role } = await getPageOrganization(slug);

  if (role !== "admin") {
    return (
      <p className="mx-auto w-full max-w-5xl px-6 py-8 text-muted-foreground">
        Only organization owners and admins can manage SSO.
      </p>
    );
  }

  const { providers } = await auth.api.listSSOProviders({ headers: await headers() });
  const orgProviders = providers.filter((provider) => provider.organizationId === organization.id);
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="max-w-3xl">
        <h1 className="text-lg font-semibold">Single sign-on and provisioning</h1>
        <p className="mt-2 text-muted-foreground">
          Users whose email matches a verified domain are sent to your identity provider when they sign in. New users
          are added to this organization automatically.
        </p>
        <ProviderList providers={orgProviders} baseURL={baseURL} />
        <EnforceSso
          organizationId={organization.id}
          initial={readOrgMetadata(organization.metadata).enforceSso === true}
          canEnable={orgProviders.some((p) => p.domainVerified)}
        />
        <RegisterProviderForm organizationId={organization.id} baseURL={baseURL} />
        <ScimPanel organizationId={organization.id} />
      </div>
    </div>
  );
}

export default function SsoSettingsPage({ params }: PageProps<"/orgs/[slug]/sso">) {
  return (
    <Suspense>
      <SsoSettingsContent params={params} />
    </Suspense>
  );
}
