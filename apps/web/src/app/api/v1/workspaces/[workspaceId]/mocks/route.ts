import { createMock, listMocks } from "@/server/mocks";
import { apiRoute } from "@/server/route";
import { createMockInput } from "@/server/schemas";

type Ctx = RouteContext<"/api/v1/workspaces/[workspaceId]/mocks">;

export const GET = apiRoute<Ctx>(async (_request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return { mocks: await listMocks(actor, workspaceId) };
});

export const POST = apiRoute<Ctx>(async (request, actor, ctx) => {
  const { workspaceId } = await ctx.params;
  return createMock(actor, workspaceId, createMockInput.parse(await request.json()));
});
