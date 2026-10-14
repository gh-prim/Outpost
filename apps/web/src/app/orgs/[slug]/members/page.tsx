import { prisma } from "@outpost/db";
import { Suspense } from "react";
import { getPageOrganization } from "@/server/page";
import { MembersPanel } from "./members-panel";
import { TeamsPanel } from "./teams-panel";

async function MembersContent({ params }: { params: PageProps<"/orgs/[slug]/members">["params"] }) {
  const { slug } = await params;
  const { actor, organization, role } = await getPageOrganization(slug);
  if (role !== "admin") {
    return (
      <p className="mx-auto w-full max-w-5xl px-6 py-8 text-muted-foreground">
        Only organization owners and admins can manage members.
      </p>
    );
  }

  const [members, invitations, teams] = await Promise.all([
    prisma.member.findMany({
      where: { organizationId: organization.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: { organizationId: organization.id, status: "pending", expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.team.findMany({
      where: { organizationId: organization.id },
      include: { teammembers: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { name: "asc" },
    }),
  ]);
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-10 px-6 py-8">
      <MembersPanel
        organizationId={organization.id}
        currentUserId={actor.userId}
        baseURL={baseURL}
        members={members.map((m) => ({ id: m.id, role: m.role, user: m.user }))}
        invitations={invitations.map((i) => ({ id: i.id, email: i.email, role: i.role ?? "member" }))}
      />
      <TeamsPanel
        organizationId={organization.id}
        members={members.map((m) => m.user)}
        teams={teams.map((t) => ({ id: t.id, name: t.name, members: t.teammembers.map((tm) => tm.user) }))}
      />
    </div>
  );
}

export default function MembersPage({ params }: PageProps<"/orgs/[slug]/members">) {
  return (
    <Suspense>
      <MembersContent params={params} />
    </Suspense>
  );
}
