import { deleteEnvironment, getEnvironment, updateEnvironment } from "@/server/environments";
import { apiRoute } from "@/server/route";
import { updateEnvironmentInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/environments/[environmentId]">;

/** `?resolve=1` returns run-ready values (secrets and vault references resolved), for runners and above. */
export const GET = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { environmentId } = await ctx.params;
  return getEnvironment(actor, environmentId, { resolve: request.nextUrl.searchParams.get("resolve") === "1" });
});

export const PUT = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { environmentId } = await ctx.params;
  return updateEnvironment(actor, environmentId, updateEnvironmentInput.parse(await request.json()));
});

export const DELETE = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { environmentId } = await ctx.params;
  await deleteEnvironment(actor, environmentId);
});
