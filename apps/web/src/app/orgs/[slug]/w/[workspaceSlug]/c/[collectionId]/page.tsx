import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { CollectionDocument } from "@/lib/collection-items";
import { getCollection } from "@/server/collections";
import { listEnvironments } from "@/server/environments";
import { HttpError } from "@/server/errors";
import { getPageOrganization } from "@/server/page";
import { hasRole } from "@/server/policy";
import { getWorkspaceBySlug } from "@/server/workspaces";
import { CollectionEditor } from "./collection-editor";

type Params = PageProps<"/orgs/[slug]/w/[workspaceSlug]/c/[collectionId]">["params"];

async function EditorContent({ params }: { params: Params }) {
  const { slug, workspaceSlug, collectionId } = await params;
  const { actor, organization } = await getPageOrganization(slug);
  const load = async () => {
    const workspace = await getWorkspaceBySlug(actor, organization.id, workspaceSlug);
    const collection = await getCollection(actor, collectionId);
    if (collection.workspaceId !== workspace.id) throw new HttpError(404, "Collection not found");
    return { workspace, collection, environments: await listEnvironments(actor, workspace.id) };
  };
  const { workspace, collection, environments } = await load().catch((error) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });

  return (
    <CollectionEditor
      key={collection.id}
      workspaceId={workspace.id}
      workspaceHref={`/orgs/${slug}/w/${workspaceSlug}`}
      workspaceName={workspace.name}
      collectionId={collection.id}
      initialDocument={collection.content as CollectionDocument}
      initialVersion={collection.version}
      environments={environments.map((e) => ({ id: e.id, name: e.name }))}
      canEdit={hasRole(workspace.role, "EDITOR")}
      canRun={hasRole(workspace.role, "RUNNER")}
    />
  );
}

export default function CollectionEditorPage({ params }: { params: Params }) {
  return (
    <Suspense>
      <EditorContent params={params} />
    </Suspense>
  );
}
