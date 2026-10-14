import { listCollectionVersions } from "@/server/collections";
import { apiRoute } from "@/server/route";

type Ctx = RouteContext<"/api/v1/collections/[collectionId]/versions">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { collectionId } = await ctx.params;
  return { versions: await listCollectionVersions(actor, collectionId) };
});
