import { beforeEach, describe, expect, it } from "vitest";
import { addWorkspaceMember, archiveWorkspace, createWorkspace, getWorkspace, listWorkspaces } from "@/server/workspaces";
import { createOrganization, createTeam, createUser, resetDatabase } from "./fixtures";

describe("workspace access", () => {
  beforeEach(resetDatabase);

  async function setup() {
    const owner = await createUser("Owner");
    const alice = await createUser("Alice");
    const bob = await createUser("Bob");
    const outsider = await createUser("Outsider");
    const org = await createOrganization([
      { actor: owner, role: "owner" },
      { actor: alice, role: "member" },
      { actor: bob, role: "member" },
    ]);
    await createOrganization([{ actor: outsider, role: "owner" }]);
    return { owner, alice, bob, outsider, org };
  }

  it("makes the creator admin and lets organization members view organization-wide workspaces", async () => {
    const { alice, bob, org } = await setup();
    const workspace = await createWorkspace(alice, { organizationId: org, name: "Billing", visibility: "ORGANIZATION" });
    expect((await getWorkspace(alice, workspace.id)).role).toBe("ADMIN");
    expect((await getWorkspace(bob, workspace.id)).role).toBe("VIEWER");
  });

  it("hides private workspaces from non-members but not from organization admins", async () => {
    const { owner, alice, bob, outsider, org } = await setup();
    const workspace = await createWorkspace(alice, { organizationId: org, name: "Secret", visibility: "PRIVATE" });

    await expect(getWorkspace(bob, workspace.id)).rejects.toMatchObject({ status: 404 });
    await expect(getWorkspace(outsider, workspace.id)).rejects.toMatchObject({ status: 404 });
    expect(await listWorkspaces(bob, org)).toEqual([]);
    expect((await getWorkspace(owner, workspace.id)).role).toBe("ADMIN");
  });

  it("grants access through teams and keeps the highest role", async () => {
    const { alice, bob, org } = await setup();
    const workspace = await createWorkspace(alice, { organizationId: org, name: "Secret", visibility: "PRIVATE" });
    const team = await createTeam(org, [bob]);

    await addWorkspaceMember(alice, workspace.id, { teamId: team, role: "RUNNER" });
    expect((await getWorkspace(bob, workspace.id)).role).toBe("RUNNER");

    await addWorkspaceMember(alice, workspace.id, { userId: bob.userId, role: "EDITOR" });
    expect((await getWorkspace(bob, workspace.id)).role).toBe("EDITOR");
  });

  it("refuses members from another organization and member management by non-admins", async () => {
    const { alice, bob, outsider, org } = await setup();
    const workspace = await createWorkspace(alice, { organizationId: org, name: "Billing", visibility: "ORGANIZATION" });

    await expect(addWorkspaceMember(alice, workspace.id, { userId: outsider.userId, role: "VIEWER" })).rejects.toMatchObject({
      status: 400,
    });
    await expect(addWorkspaceMember(bob, workspace.id, { userId: bob.userId, role: "ADMIN" })).rejects.toMatchObject({
      status: 403,
    });
  });

  it("hides archived workspaces", async () => {
    const { alice, org } = await setup();
    const workspace = await createWorkspace(alice, { organizationId: org, name: "Old", visibility: "ORGANIZATION" });
    await archiveWorkspace(alice, workspace.id);
    await expect(getWorkspace(alice, workspace.id)).rejects.toMatchObject({ status: 404 });
    expect(await listWorkspaces(alice, org)).toEqual([]);
  });
});
