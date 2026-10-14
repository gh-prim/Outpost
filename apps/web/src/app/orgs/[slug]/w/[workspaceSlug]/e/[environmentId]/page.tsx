import { prisma } from "@outpost/db";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getEnvironment } from "@/server/environments";
import { HttpError } from "@/server/errors";
import { getPageOrganization } from "@/server/page";
import { getWorkspaceRole, hasRole } from "@/server/policy";
import { EnvironmentEditor, type Value } from "./environment-editor";

type Params = PageProps<"/orgs/[slug]/w/[workspaceSlug]/e/[environmentId]">["params"];

async function EnvironmentContent({ params }: { params: Params }) {
  const { slug, workspaceSlug, environmentId } = await params;
  const { actor } = await getPageOrganization(slug);
  const environment = await getEnvironment(actor, environmentId).catch((error) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: environment.workspaceId } });
  if (workspace.slug !== workspaceSlug) notFound();
  const role = await getWorkspaceRole(actor.userId, workspace);

  return (
    <EnvironmentEditor
      key={`${environment.id}-${environment.version}`}
      environmentId={environment.id}
      workspaceHref={`/orgs/${slug}/w/${workspaceSlug}`}
      workspaceName={workspace.name}
      initial={{ name: environment.name, values: environment.values as Value[], version: environment.version }}
      canEdit={hasRole(role, "EDITOR")}
    />
  );
}

export default function EnvironmentPage({ params }: { params: Params }) {
  return (
    <Suspense>
      <EnvironmentContent params={params} />
    </Suspense>
  );
}
