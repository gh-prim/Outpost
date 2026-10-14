import { publishDocs, unpublishDocs } from "@/server/docs";
import { apiRoute } from "@/server/route";
import { publishDocsInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/collections/[collectionId]/docs">;

/** Publishes (or updates) the public documentation of a collection at /docs/<slug>. */
export const PUT = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { collectionId } = await ctx.params;
  return publishDocs(actor, collectionId, publishDocsInput.parse(await request.json()));
});

export const DELETE = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { collectionId } = await ctx.params;
  await unpublishDocs(actor, collectionId);
});
