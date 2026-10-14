import { Suspense } from "react";
import { getPageOrganization } from "@/server/page";
import { listVaults } from "@/server/vaults";
import { VaultsPanel } from "./vaults-panel";

async function VaultsContent({ params }: { params: PageProps<"/orgs/[slug]/vaults">["params"] }) {
  const { slug } = await params;
  const { actor, organization, role } = await getPageOrganization(slug);
  if (role !== "admin") {
    return (
      <p className="mx-auto w-full max-w-5xl px-6 py-8 text-muted-foreground">
        Only organization owners and admins can manage vaults.
      </p>
    );
  }
  const vaults = await listVaults(actor, organization.id);
  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <h1 className="text-lg font-semibold">Secret vaults</h1>
      <p className="mt-1 text-muted-foreground">
        Keep secrets in HashiCorp Vault or AWS Secrets Manager. In an environment, set a variable to type Vault and
        write a reference like <code className="font-mono text-xs">corp-vault:secret/data/payments#apiKey</code>. It is
        read when a request runs and cached for one minute.
      </p>
      <VaultsPanel organizationId={organization.id} vaults={JSON.parse(JSON.stringify(vaults))} />
    </div>
  );
}

export default function VaultsPage({ params }: PageProps<"/orgs/[slug]/vaults">) {
  return (
    <Suspense>
      <VaultsContent params={params} />
    </Suspense>
  );
}
