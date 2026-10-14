import { createCollection, listCollections } from "@/server/collections";
import { apiRoute } from "@/server/route";
import { createCollectionInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]/collections">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return { collections: await listCollections(actor, workspaceId) };
});

/** Body: `{ name }` for an empty collection, or `{ content }` to import a Collection Format v2.1 document. */
export const POST = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return createCollection(actor, workspaceId, createCollectionInput.parse(await request.json()));
});
