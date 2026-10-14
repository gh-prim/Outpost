import { auth } from "@/lib/auth";
import { HttpError } from "./errors";

export type Actor = {
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export async function requireActor(headers: Headers): Promise<Actor> {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new HttpError(401, "Authentication required");
  return {
    userId: session.user.id,
    ipAddress: headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: headers.get("user-agent"),
  };
}
