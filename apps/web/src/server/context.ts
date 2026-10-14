import { prisma } from "@outpost/db";
import { auth } from "@/lib/auth";
import { HttpError } from "./errors";

export type Actor = {
  userId: string;
  name: string;
  ipAddress: string | null;
  userAgent: string | null;
};

/** API keys come as `Authorization: Bearer opk_...` or `x-api-key: opk_...`. */
function apiKeyFrom(headers: Headers) {
  const bearer = headers.get("authorization")?.match(/^Bearer\s+(opk_\S+)$/i)?.[1];
  return bearer ?? headers.get("x-api-key") ?? null;
}

async function userIdFromApiKey(key: string) {
  const result = await auth.api.verifyApiKey({ body: { key } });
  if (!result.valid || !result.key) throw new HttpError(401, "Invalid or expired API key");
  return result.key.referenceId;
}

/** The authenticated user, from a session cookie or a personal API key. */
export async function requireActor(headers: Headers): Promise<Actor> {
  const key = apiKeyFrom(headers);
  let user: { id: string; name: string };
  if (key) {
    user = await prisma.user.findUniqueOrThrow({
      where: { id: await userIdFromApiKey(key) },
      select: { id: true, name: true },
    });
  } else {
    const session = await auth.api.getSession({ headers });
    if (!session) throw new HttpError(401, "Authentication required");
    user = session.user;
  }
  return {
    userId: user.id,
    name: user.name,
    ipAddress: headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headers.get("user-agent"),
  };
}
