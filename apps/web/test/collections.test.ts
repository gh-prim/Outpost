import { prisma } from "@outpost/db";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createCollection,
  deleteCollection,
  getCollection,
  listCollectionVersions,
  restoreCollectionVersion,
  updateCollection,
} from "@/server/collections";
import { createWorkspace } from "@/server/workspaces";
import { createOrganization, createUser, resetDatabase } from "./fixtures";

describe("collections", () => {
  beforeEach(resetDatabase);

  async function setup() {
    const alice = await createUser("Alice");
    const bob = await createUser("Bob");
    const org = await createOrganization([
      { actor: alice, role: "member" },
      { actor: bob, role: "member" },
    ]);
    const workspace = await createWorkspace(alice, { organizationId: org, name: "Billing", visibility: "ORGANIZATION" });
    return { alice, bob, workspace };
  }

  const document = (name: string) => ({
    info: { name },
    item: [{ name: "Folder", item: [{ name: "Ping", request: { method: "GET", url: "https://example.com" } }] }],
  });

  it("gives every imported item an id", async () => {
    const { alice, workspace } = await setup();
    const collection = await createCollection(alice, workspace.id, { content: document("API") });
    const content = collection.content as { item: { id: string; item: { id: string }[] }[] };
    expect(content.item[0].id).toBeTruthy();
    expect(content.item[0].item[0].id).toBeTruthy();
  });

  it("rejects edits from viewers and saves based on an old version", async () => {
    const { alice, bob, workspace } = await setup();
    const collection = await createCollection(alice, workspace.id, { name: "API" });

    await expect(updateCollection(bob, collection.id, { content: document("Hacked"), baseVersion: 1 })).rejects.toMatchObject({
      status: 403,
    });
    const saved = await updateCollection(alice, collection.id, { content: document("v2"), baseVersion: 1 });
    expect(saved.version).toBe(2);
    await expect(updateCollection(alice, collection.id, { content: document("stale"), baseVersion: 1 })).rejects.toMatchObject({
      status: 409,
    });
  });

  it("keeps every version and restores an old one as the newest", async () => {
    const { alice, workspace } = await setup();
    const collection = await createCollection(alice, workspace.id, { content: document("v1") });
    await updateCollection(alice, collection.id, { content: document("v2"), baseVersion: 1 });

    const restored = await restoreCollectionVersion(alice, collection.id, 1);
    expect(restored.version).toBe(3);
    expect(restored.name).toBe("v1");
    expect((await listCollectionVersions(alice, collection.id)).map((v) => v.version)).toEqual([3, 2, 1]);
  });

  it("soft deletes and writes the audit log", async () => {
    const { alice, workspace } = await setup();
    const collection = await createCollection(alice, workspace.id, { name: "API" });
    await deleteCollection(alice, collection.id);
    await expect(getCollection(alice, collection.id)).rejects.toMatchObject({ status: 404 });

    const actions = (await prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } })).map((e) => e.action);
    expect(actions).toEqual(["workspace.create", "collection.create", "collection.delete"]);
  });
});
