import { deleteMock, updateMock } from "@/server/mocks";
import { apiRoute } from "@/server/route";
import { updateMockInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/mocks/[mockId]">;

export const PATCH = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { mockId } = await ctx.params;
  return updateMock(actor, mockId, updateMockInput.parse(await request.json()));
});

export const DELETE = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { mockId } = await ctx.params;
  await deleteMock(actor, mockId);
});
