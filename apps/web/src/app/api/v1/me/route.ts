import { prisma } from "@outpost/db";
import { apiRoute } from "@/server/route";

/** The authenticated user and the organizations they belong to. */
export const GET = apiRoute(async (_request, actor) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: actor.userId },
    select: {
      id: true,
      name: true,
      email: true,
      members: { select: { role: true, organization: { select: { id: true, name: true, slug: true } } } },
    },
  });
  const { members, ...profile } = user;
  return { ...profile, organizations: members.map((m) => ({ ...m.organization, role: m.role })) };
});
