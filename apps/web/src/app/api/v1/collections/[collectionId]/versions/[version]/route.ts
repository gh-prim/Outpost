import { z } from "zod";
import { restoreCollectionVersion } from "@/server/collections";
import { apiRoute } from "@/server/route";

type Ctx = RouteContext<"/api/v1/collections/[collectionId]/versions/[version]">;

/** Restores this version as the newest one. */
export const POST = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { collectionId, version } = await ctx.params;
  return restoreCollectionVersion(actor, collectionId, z.coerce.number().int().positive().parse(version));
});
