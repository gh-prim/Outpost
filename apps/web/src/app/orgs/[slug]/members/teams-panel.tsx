"use client";

import { Button, Card, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type User = { id: string; name: string; email: string };
type Team = { id: string; name: string; members: User[] };

export function TeamsPanel({
  organizationId,
  members,
  teams,
}: {
  organizationId: string;
  members: User[];
  teams: Team[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<{ error: { message?: string } | null }>) {
    setError(null);
    const { error } = await action();
    if (error) setError(error.message ?? "Something went wrong");
    else router.refresh();
    return !error;
  }

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await run(() => authClient.organization.createTeam({ name: name.trim(), organizationId }))) setName("");
  }

  return (
    <section>
      <h2 className="text-lg font-semibold">Teams</h2>
      <p className="mt-1 text-muted-foreground">Give a whole team access to a workspace at once.</p>
      <form onSubmit={create} className="mt-4 flex gap-2">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name, e.g. Backend" required />
        <Button type="submit" disabled={!name.trim()}>
          Create team
        </Button>
      </form>
      {error && <p className="mt-2 text-destructive">{error}</p>}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {teams.map((team) => {
          const candidates = members.filter((m) => !team.members.some((tm) => tm.id === m.id));
          return (
            <Card key={team.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{team.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => {
                    if (confirm(`Delete the team ${team.name}?`)) {
                      void run(() => authClient.organization.removeTeam({ teamId: team.id, organizationId }));
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
              <ul className="mt-2 space-y-1">
                {team.members.map((user) => (
                  <li key={user.id} className="flex items-center justify-between">
                    <span>
                      {user.name} <span className="text-muted-foreground">{user.email}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        run(() => authClient.organization.removeTeamMember({ teamId: team.id, userId: user.id }))
                      }
                    >
                      ×
                    </Button>
                  </li>
                ))}
              </ul>
              {candidates.length > 0 && (
                <Select
                  value=""
                  onValueChange={(userId) =>
                    run(() => authClient.organization.addTeamMember({ teamId: team.id, userId }))
                  }
                >
                  <SelectTrigger className="mt-3 w-full" aria-label={`Add a member to ${team.name}`}>
                    <SelectValue placeholder="Add a member…" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
