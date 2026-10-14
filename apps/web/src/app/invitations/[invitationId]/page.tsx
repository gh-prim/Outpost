import { prisma } from "@outpost/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@outpost/ui";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { AcceptInvitation } from "./accept-invitation";

async function InvitationContent({ params }: { params: PageProps<"/invitations/[invitationId]">["params"] }) {
  const { invitationId } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/sign-in");

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { organization: { select: { name: true, slug: true } } },
  });
  const valid =
    invitation &&
    invitation.status === "pending" &&
    invitation.expiresAt > new Date() &&
    invitation.email.toLowerCase() === session.user.email.toLowerCase();

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{valid ? `Join ${invitation.organization.name}` : "Invitation unavailable"}</CardTitle>
          <CardDescription>
            {valid
              ? `You were invited as ${invitation.role ?? "member"}.`
              : `This invitation expired, was cancelled, or was sent to another address than ${session.user.email}.`}
          </CardDescription>
        </CardHeader>
        {valid && (
          <CardContent>
            <AcceptInvitation invitationId={invitation.id} slug={invitation.organization.slug} />
          </CardContent>
        )}
      </Card>
    </main>
  );
}

export default function InvitationPage({ params }: PageProps<"/invitations/[invitationId]">) {
  return (
    <Suspense>
      <InvitationContent params={params} />
    </Suspense>
  );
}
