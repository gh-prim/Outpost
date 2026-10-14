import { NextResponse, type NextRequest } from "next/server";
import { requireActor, type Actor } from "./context";
import { toErrorResponse } from "./errors";

/** Wraps an authenticated API route handler with error handling. */
export function apiRoute<Ctx>(handler: (request: NextRequest, actor: Actor, ctx: Ctx) => Promise<unknown>) {
  return async (request: NextRequest, ctx: Ctx) => {
    try {
      const actor = await requireActor(request.headers);
      const result = await handler(request, actor, ctx);
      if (result instanceof Response) return result;
      if (result === undefined) return new NextResponse(null, { status: 204 });
      return NextResponse.json(result);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}
