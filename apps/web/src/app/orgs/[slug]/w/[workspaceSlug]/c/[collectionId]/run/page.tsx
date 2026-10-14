import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { CollectionDocument } from "@/lib/collection-items";
import { getCollection } from "@/server/collections";
import { listEnvironments } from "@/server/environments";
import { HttpError } from "@/server/errors";
import { getPageOrganization } from "@/server/page";
import { hasRole } from "@/server/policy";
import { getWorkspaceBySlug } from "@/server/workspaces";
import { CollectionRunner } from "./collection-runner";

type Params = PageProps<"/orgs/[slug]/w/[workspaceSlug]/c/[collectionId]/run">["params"];

async function RunnerContent({ params }: { params: Params }) {
  const { slug, workspaceSlug, collectionId } = await params;
  const { actor, organization } = await getPageOrganization(slug);
  const { workspace, collection, environments } = await (async () => {
    const workspace = await getWorkspaceBySlug(actor, organization.id, workspaceSlug);
    const collection = await getCollection(actor, collectionId);
    if (collection.workspaceId !== workspace.id) throw new HttpError(404, "Collection not found");
    return { workspace, collection, environments: await listEnvironments(actor, workspace.id) };
  })().catch((error) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });

  return (
    <CollectionRunner
      workspaceId={workspace.id}
      editorHref={`/orgs/${slug}/w/${workspaceSlug}/c/${collectionId}`}
      document={collection.content as CollectionDocument}
      environments={environments.map((e) => ({ id: e.id, name: e.name }))}
      canRun={hasRole(workspace.role, "RUNNER")}
    />
  );
}

export default function CollectionRunnerPage({ params }: { params: Params }) {
  return (
    <Suspense>
      <RunnerContent params={params} />
    </Suspense>
  );
}
