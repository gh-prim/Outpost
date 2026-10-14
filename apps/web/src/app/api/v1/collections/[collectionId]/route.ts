import { deleteCollection, getCollection, updateCollection } from "@/server/collections";
import { apiRoute } from "@/server/route";
import { updateCollectionInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/collections/[collectionId]">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { collectionId } = await ctx.params;
  return getCollection(actor, collectionId);
});

export const PUT = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { collectionId } = await ctx.params;
  return updateCollection(actor, collectionId, updateCollectionInput.parse(await request.json()));
});

export const DELETE = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { collectionId } = await ctx.params;
  await deleteCollection(actor, collectionId);
});
