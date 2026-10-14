import { WorkspaceRole } from "@outpost/db";
import { connection, type NextRequest } from "next/server";
import { requireActor } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { subscribe } from "@/server/events";
import { requireWorkspaceRole } from "@/server/policy";

const HEARTBEAT_MS = 25_000;

/** Server-sent events stream of changes in a workspace. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/v1/workspaces/[workspaceId]/events">) {
  await connection();
  try {
    const actor = await requireActor(request.headers);
    const { workspaceId } = await ctx.params;
    await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.VIEWER);

    const encoder = new TextEncoder();
    let cleanup = () => {};
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: string) => controller.enqueue(encoder.encode(data));
        const unsubscribe = await subscribe(workspaceId, (event) => send(`data: ${JSON.stringify(event)}\n\n`));
        const heartbeat = setInterval(() => send(": heartbeat\n\n"), HEARTBEAT_MS);
        cleanup = () => {
          clearInterval(heartbeat);
          unsubscribe();
        };
        request.signal.addEventListener("abort", () => {
          cleanup();
          controller.close();
        });
        send(": connected\n\n");
      },
      cancel() {
        cleanup();
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive",
        "x-accel-buffering": "no",
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
