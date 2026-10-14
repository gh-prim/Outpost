import { prisma, WorkspaceRole } from "@outpost/db";
import { matchExample } from "@outpost/engine";
import { connection, NextResponse, type NextRequest } from "next/server";
import { requireActor } from "@/server/context";
import { HttpError, toErrorResponse } from "@/server/errors";
import { requireWorkspaceRole } from "@/server/policy";
import { environmentVariables } from "@/server/run";

type Ctx = RouteContext<"/mock/[mockId]/[[...path]]">;

const json = (status: number, error: string) => NextResponse.json({ error }, { status });

/** Answers any method and path with the best matching saved example. */
async function handle(request: NextRequest, ctx: Ctx) {
  await connection();
  try {
    const { mockId, path = [] } = await ctx.params;
    const mock = await prisma.mockServer.findUnique({
      where: { id: mockId },
      include: { collection: { select: { content: true, deletedAt: true } } },
    });
    if (!mock || mock.collection.deletedAt) return json(404, "Mock server not found");

    if (mock.isPrivate) {
      // Needs an API key (x-api-key or Bearer) of someone who can view the workspace.
      const actor = await requireActor(request.headers);
      await requireWorkspaceRole(actor.userId, mock.workspaceId, WorkspaceRole.VIEWER);
    }

    // Vault references that fail to resolve are left empty rather than failing the mock.
    const variables = mock.environmentId
      ? await environmentVariables(mock.workspaceId, mock.environmentId).catch(() => [])
      : [];

    const example = matchExample(mock.collection.content, variables, {
      method: request.method,
      path: "/" + path.map(encodeURIComponent).join("/"),
      headers: Object.fromEntries(request.headers),
    });
    if (!example) {
      return json(404, `No example matches ${request.method} /${path.join("/")}. Save a response as an example first.`);
    }

    if (mock.delayMs) await new Promise((resolve) => setTimeout(resolve, mock.delayMs));
    const headers = new Headers();
    for (const h of example.headers) {
      if (!["content-length", "transfer-encoding", "content-encoding"].includes(h.key.toLowerCase())) {
        headers.append(h.key, h.value);
      }
    }
    headers.set("x-outpost-mock-example", encodeURIComponent(example.name));
    const noBody = request.method === "HEAD" || example.code === 204 || example.code === 304;
    return new Response(noBody ? null : example.body, { status: example.code, headers });
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return json(404, "Mock server not found");
    return toErrorResponse(error);
  }
}

export {
  handle as GET,
  handle as POST,
  handle as PUT,
  handle as PATCH,
  handle as DELETE,
  handle as HEAD,
  handle as OPTIONS,
};
