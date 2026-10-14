"use client";

import { Badge, Button, Card, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type User = { id: string; name: string; email: string };
type Member = { id: string; role: string; user: User };
type Invitation = { id: string; email: string; role: string };
type Role = "member" | "admin" | "owner";

const ROLES: { value: Role; label: string }[] = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

export function MembersPanel(props: {
  organizationId: string;
  currentUserId: string;
  baseURL: string;
  members: Member[];
  invitations: Invitation[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("member");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function run(action: () => Promise<{ error: { message?: string } | null }>) {
    setError(null);
    const { error } = await action();
    if (error) setError(error.message ?? "Something went wrong");
    else router.refresh();
    return !error;
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await run(() =>
      authClient.organization.inviteMember({ email: email.trim(), role, organizationId: props.organizationId }),
    );
    if (ok) setEmail("");
  }

  async function copyLink(id: string) {
    await navigator.clipboard.writeText(`${props.baseURL}/invitations/${id}`);
    setCopied(id);
  }

  return (
    <section>
      <h1 className="text-lg font-semibold">Members</h1>
      <p className="mt-1 text-muted-foreground">
        People who sign in with a verified SSO domain or through SCIM join automatically. Invite anyone else here and
        share the link.
      </p>

      <form onSubmit={invite} className="mt-4 flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          required
        />
        <Select value={role} onValueChange={(v) => setRole(v as Role)}>
          <SelectTrigger className="w-32" aria-label="Role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit">Invite</Button>
      </form>
      {error && <p className="mt-2 text-destructive">{error}</p>}

      {props.invitations.length > 0 && (
        <Card className="mt-4 divide-y divide-border">
          {props.invitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between px-4 py-2">
              <span className="flex items-center gap-2">
                <Badge variant="warning">pending</Badge>
                {invitation.email}
                <span className="text-muted-foreground">{invitation.role}</span>
              </span>
              <span className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => copyLink(invitation.id)}>
                  {copied === invitation.id ? "Copied" : "Copy link"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => run(() => authClient.organization.cancelInvitation({ invitationId: invitation.id }))}
                >
                  Cancel
                </Button>
              </span>
            </div>
          ))}
        </Card>
      )}

      <Card className="mt-4 divide-y divide-border">
        {props.members.map((member) => (
          <div key={member.id} className="flex items-center justify-between px-4 py-2">
            <span>
              <span className="font-medium">{member.user.name}</span>
              <span className="ml-2 text-muted-foreground">{member.user.email}</span>
            </span>
            <span className="flex items-center gap-2">
              <Select
                value={member.role.split(",")[0]}
                disabled={member.user.id === props.currentUserId}
                onValueChange={(value) =>
                  run(() =>
                    authClient.organization.updateMemberRole({
                      memberId: member.id,
                      role: value as Role,
                      organizationId: props.organizationId,
                    }),
                  )
                }
              >
                <SelectTrigger className="w-28" aria-label={`Role of ${member.user.email}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {member.user.id !== props.currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Remove ${member.user.email} from the organization?`)) {
                      void run(() =>
                        authClient.organization.removeMember({
                          memberIdOrEmail: member.id,
                          organizationId: props.organizationId,
                        }),
                      );
                    }
                  }}
                >
                  Remove
                </Button>
              )}
            </span>
          </div>
        ))}
      </Card>
    </section>
  );
}
