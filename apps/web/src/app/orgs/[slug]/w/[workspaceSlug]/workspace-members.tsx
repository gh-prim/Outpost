"use client";

import { Badge, Button, Card, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@outpost/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

type Member = {
  id: string;
  role: string;
  user: { id: string; name: string; email: string } | null;
  team: { id: string; name: string } | null;
};
type Option = { value: string; label: string };

const ROLES = ["ADMIN", "EDITOR", "RUNNER", "VIEWER"];
const label = (role: string) => role.charAt(0) + role.slice(1).toLowerCase();

export function WorkspaceMembers(props: {
  workspaceId: string;
  canManage: boolean;
  members: Member[];
  /** Organization users and teams, as "user:<id>" and "team:<id>" values. */
  candidates: Option[];
}) {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [role, setRole] = useState("EDITOR");
  const [error, setError] = useState<string | null>(null);

  async function call(path: string, method: string, body?: unknown) {
    setError(null);
    try {
      await apiFetch(path, { method, body });
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function add() {
    const [kind, id] = target.split(":");
    void call(`/workspaces/${props.workspaceId}/members`, "POST", {
      [kind === "team" ? "teamId" : "userId"]: id,
      role,
    });
    setTarget("");
  }

  const taken = new Set(props.members.map((m) => (m.team ? `team:${m.team.id}` : `user:${m.user?.id}`)));
  const available = props.candidates.filter((c) => !taken.has(c.value));

  return (
    <div className="mt-8">
      <h2 className="font-medium">Members</h2>
      <Card className="mt-3 divide-y divide-border">
        {props.members.map((member) => (
          <div key={member.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="truncate">{member.team ? `Team ${member.team.name}` : member.user?.name}</span>
            <span className="flex items-center gap-1">
              {props.canManage ? (
                <Select
                  value={member.role}
                  onValueChange={(value) =>
                    call(`/workspaces/${props.workspaceId}/members`, "POST", {
                      [member.team ? "teamId" : "userId"]: member.team?.id ?? member.user?.id,
                      role: value,
                    })
                  }
                >
                  <SelectTrigger className="h-7 w-24" aria-label="Workspace role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {label(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant="secondary">{label(member.role)}</Badge>
              )}
              {props.canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="Remove"
                  onClick={() => call(`/workspaces/${props.workspaceId}/members/${member.id}`, "DELETE")}
                >
                  ×
                </Button>
              )}
            </span>
          </div>
        ))}
      </Card>
      {props.canManage && available.length > 0 && (
        <div className="mt-2 flex gap-1">
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger className="flex-1" aria-label="User or team">
              <SelectValue placeholder="Add a user or team…" />
            </SelectTrigger>
            <SelectContent>
              {available.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="w-24" aria-label="Role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {label(r)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={add} disabled={!target}>
            Add
          </Button>
        </div>
      )}
      {error && <p className="mt-2 text-destructive">{error}</p>}
    </div>
  );
}
