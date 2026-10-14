import { Suspense } from "react";
import { getPageOrganization } from "@/server/page";
import { OrgNav } from "./org-nav";

async function OrgHeader({ params }: { params: LayoutProps<"/orgs/[slug]">["params"] }) {
  const { slug } = await params;
  const { organization, role } = await getPageOrganization(slug);
  return <OrgNav slug={organization.slug} name={organization.name} isAdmin={role === "admin"} />;
}

export default function OrgLayout({ children, params }: LayoutProps<"/orgs/[slug]">) {
  return (
    <>
      <Suspense fallback={<div className="h-12 border-b" />}>
        <OrgHeader params={params} />
      </Suspense>
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
