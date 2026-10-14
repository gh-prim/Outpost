import { apiRoute } from "@/server/route";
import { runOnServer } from "@/server/run";
import { runInput } from "@/server/schemas";

/** Executes a collection or a single request server side and returns responses, tests and console logs. */
export const POST = apiRoute(async (request, actor) => {
  return runOnServer(actor, runInput.parse(await request.json()));
});
