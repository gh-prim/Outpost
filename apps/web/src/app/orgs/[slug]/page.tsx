import { Badge, Card } from "@outpost/ui";
import Link from "next/link";
import { Suspense } from "react";
import { getPageOrganization } from "@/server/page";
import { listWorkspaces } from "@/server/workspaces";
import { CreateWorkspaceForm } from "./create-workspace-form";

const roleLabel = { ADMIN: "Admin", EDITOR: "Editor", RUNNER: "Runner", VIEWER: "Viewer" } as const;

async function WorkspacesContent({ params }: { params: PageProps<"/orgs/[slug]">["params"] }) {
  const { slug } = await params;
  const { actor, organization } = await getPageOrganization(slug);
  const workspaces = await listWorkspaces(actor, organization.id);

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="max-w-3xl">
        <h1 className="text-lg font-semibold">Workspaces</h1>
        {workspaces.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No workspace yet. Create the first one below.</p>
        ) : (
          <Card className="mt-4 divide-y divide-border">
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/orgs/${slug}/w/${workspace.slug}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{workspace.name}</span>
                  {workspace.description && <span className="ml-2 text-muted-foreground">{workspace.description}</span>}
                </span>
                <span className="flex gap-2">
                  {workspace.visibility === "PRIVATE" && <Badge variant="outline">Private</Badge>}
                  {workspace.role && <Badge variant="secondary">{roleLabel[workspace.role]}</Badge>}
                </span>
              </Link>
            ))}
          </Card>
        )}
        <CreateWorkspaceForm organizationId={organization.id} slug={slug} />
      </div>
    </div>
  );
}

export default function WorkspacesPage({ params }: PageProps<"/orgs/[slug]">) {
  return (
    <Suspense>
      <WorkspacesContent params={params} />
    </Suspense>
  );
}
