import { HttpError } from "@/server/errors";
import { apiRoute } from "@/server/route";
import { createWorkspaceInput } from "@/server/schemas";
import { createWorkspace, listWorkspaces } from "@/server/workspaces";

export const GET = apiRoute(async (request, actor) => {
  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) throw new HttpError(400, "organizationId is required");
  return { workspaces: await listWorkspaces(actor, organizationId) };
});

export const POST = apiRoute(async (request, actor) => {
  const input = createWorkspaceInput.parse(await request.json());
  return createWorkspace(actor, input);
});
