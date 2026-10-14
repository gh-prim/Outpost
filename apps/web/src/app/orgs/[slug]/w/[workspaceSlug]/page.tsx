import { Badge, Card, MethodBadge } from "@outpost/ui";
import { prisma } from "@outpost/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { countRequests, toTree, type TreeNode } from "@/lib/collection-tree";
import { listEnvironments } from "@/server/environments";
import { HttpError } from "@/server/errors";
import { getPageOrganization } from "@/server/page";
import { hasRole } from "@/server/policy";
import { getWorkspaceBySlug, listWorkspaceMembers } from "@/server/workspaces";
import { CollectionActions } from "./collection-actions";
import { EnvironmentActions } from "./environment-actions";
import { LiveRefresh } from "./live-refresh";
import { WorkspaceMembers } from "./workspace-members";

function Tree({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="space-y-1 border-l pl-3">
      {nodes.map((node, i) =>
        node.kind === "folder" ? (
          <li key={i}>
            <span className="text-muted-foreground">{node.name}/</span>
            <Tree nodes={node.children} />
          </li>
        ) : (
          <li key={i} className="flex items-center gap-2">
            <MethodBadge method={node.method} short className="w-10" />
            {node.name}
          </li>
        ),
      )}
    </ul>
  );
}

async function WorkspaceContent({ params }: { params: PageProps<"/orgs/[slug]/w/[workspaceSlug]">["params"] }) {
  const { slug, workspaceSlug } = await params;
  const { actor, organization } = await getPageOrganization(slug);
  const workspace = await getWorkspaceBySlug(actor, organization.id, workspaceSlug).catch((error) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });

  const [collections, environments, members, orgMembers, teams] = await Promise.all([
    prisma.collection.findMany({
      where: { workspaceId: workspace.id, deletedAt: null },
      select: { id: true, name: true, version: true, content: true },
      orderBy: { name: "asc" },
    }),
    listEnvironments(actor, workspace.id),
    listWorkspaceMembers(actor, workspace.id),
    prisma.member.findMany({
      where: { organizationId: organization.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
    prisma.team.findMany({ where: { organizationId: organization.id }, select: { id: true, name: true } }),
  ]);
  const candidates = [
    ...teams.map((t) => ({ value: `team:${t.id}`, label: `Team ${t.name}` })),
    ...orgMembers.map((m) => ({ value: `user:${m.user.id}`, label: `${m.user.name} (${m.user.email})` })),
  ];
  const canEdit = hasRole(workspace.role, "EDITOR");

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-8 px-6 py-8 lg:grid-cols-[1fr_18rem]">
      <section>
        <LiveRefresh workspaceId={workspace.id} />
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{workspace.name}</h1>
          {workspace.visibility === "PRIVATE" && <Badge variant="outline">Private</Badge>}
        </div>
        {workspace.description && <p className="mt-1 text-muted-foreground">{workspace.description}</p>}

        <div className="mt-6 flex items-center justify-between">
          <h2 className="font-medium">Collections</h2>
          {canEdit && <CollectionActions workspaceId={workspace.id} />}
        </div>
        {collections.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No collection yet. Create one or import a v2.1 JSON file.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {collections.map((collection) => {
              const tree = toTree((collection.content as { item?: unknown }).item);
              return (
                <Card key={collection.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/orgs/${slug}/w/${workspaceSlug}/c/${collection.id}`}
                      className="font-medium hover:underline"
                    >
                      {collection.name}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {countRequests(tree)} requests · v{collection.version}
                    </span>
                  </div>
                  {tree.length > 0 && (
                    <div className="mt-3">
                      <Tree nodes={tree} />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <aside>
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Environments</h2>
          {canEdit && <EnvironmentActions workspaceId={workspace.id} />}
        </div>
        {environments.length === 0 ? (
          <p className="mt-2 text-muted-foreground">No environment.</p>
        ) : (
          <Card className="mt-3 divide-y divide-border">
            {environments.map((environment) => (
              <div key={environment.id} className="px-3 py-2">
                {environment.name}
              </div>
            ))}
          </Card>
        )}
        <WorkspaceMembers
          workspaceId={workspace.id}
          canManage={hasRole(workspace.role, "ADMIN")}
          members={members}
          candidates={candidates}
        />
      </aside>
    </div>
  );
}

export default function WorkspacePage({ params }: PageProps<"/orgs/[slug]/w/[workspaceSlug]">) {
  return (
    <Suspense>
      <WorkspaceContent params={params} />
    </Suspense>
  );
}
