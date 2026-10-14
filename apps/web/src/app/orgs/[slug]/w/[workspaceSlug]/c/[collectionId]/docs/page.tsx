import { prisma } from "@outpost/db";
import { Button } from "@outpost/ui";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DocsView } from "@/components/docs-view";
import type { CollectionDocument } from "@/lib/collection-items";
import { getCollection } from "@/server/collections";
import { docsVariables } from "@/server/docs";
import { listEnvironments } from "@/server/environments";
import { HttpError } from "@/server/errors";
import { getPageOrganization } from "@/server/page";
import { hasRole } from "@/server/policy";
import { getWorkspaceBySlug } from "@/server/workspaces";
import { PublishPanel } from "./publish-panel";

type Params = PageProps<"/orgs/[slug]/w/[workspaceSlug]/c/[collectionId]/docs">["params"];

async function DocsContent({ params }: { params: Params }) {
  const { slug, workspaceSlug, collectionId } = await params;
  const { actor, organization } = await getPageOrganization(slug);
  const loaded = await (async () => {
    const workspace = await getWorkspaceBySlug(actor, organization.id, workspaceSlug);
    const collection = await getCollection(actor, collectionId);
    if (collection.workspaceId !== workspace.id) throw new HttpError(404, "Collection not found");
    return { workspace, collection };
  })().catch((error) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });
  const { workspace, collection } = loaded;
  const [publication, environments] = await Promise.all([
    prisma.docsPublication.findUnique({ where: { collectionId } }),
    listEnvironments(actor, workspace.id),
  ]);
  const editorHref = `/orgs/${slug}/w/${workspaceSlug}/c/${collectionId}`;

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-3">
        <Button asChild variant="ghost" size="sm" className="-ml-2.5">
          <Link href={editorHref}>← Back to the editor</Link>
        </Button>
        {hasRole(workspace.role, "EDITOR") && (
          <PublishPanel
            collectionId={collectionId}
            defaultSlug={`${organization.slug}-${collection.name}`}
            baseURL={process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}
            environments={environments.map((e) => ({ id: e.id, name: e.name }))}
            publication={publication}
          />
        )}
      </div>
      <DocsView
        document={collection.content as CollectionDocument}
        variables={await docsVariables(publication?.environmentId)}
        branding={publication ?? {}}
      />
    </div>
  );
}

export default function CollectionDocsPage({ params }: { params: Params }) {
  return (
    <Suspense>
      <DocsContent params={params} />
    </Suspense>
  );
}
