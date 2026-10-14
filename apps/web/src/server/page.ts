import { prisma } from "@outpost/db";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireActor } from "./context";
import { HttpError } from "./errors";
import { getOrgRole } from "./policy";

/** For server components: the signed-in actor, or a redirect to the sign-in page. */
export async function getPageActor() {
  try {
    return await requireActor(await headers());
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/sign-in");
    throw error;
  }
}

/** For server components: the organization by slug and the actor's role in it, or a 404. */
export async function getPageOrganization(slug: string) {
  const actor = await getPageActor();
  const organization = await prisma.organization.findUnique({ where: { slug } });
  const role = organization ? await getOrgRole(actor.userId, organization.id) : null;
  if (!organization || !role) notFound();
  return { actor, organization, role };
}
