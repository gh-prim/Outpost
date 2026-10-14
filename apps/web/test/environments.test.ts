import { prisma } from "@outpost/db";
import { beforeEach, describe, expect, it } from "vitest";
import { createEnvironment, getEnvironment } from "@/server/environments";
import { addWorkspaceMember, createWorkspace } from "@/server/workspaces";
import { createOrganization, createUser, resetDatabase } from "./fixtures";

describe("environment secrets", () => {
  beforeEach(resetDatabase);

  it("encrypts secrets at rest, shows them to runners and masks them for viewers", async () => {
    const alice = await createUser("Alice");
    const runner = await createUser("Runner");
    const viewer = await createUser("Viewer");
    const org = await createOrganization([
      { actor: alice, role: "member" },
      { actor: runner, role: "member" },
      { actor: viewer, role: "member" },
    ]);
    const workspace = await createWorkspace(alice, { organizationId: org, name: "Billing", visibility: "ORGANIZATION" });
    await addWorkspaceMember(alice, workspace.id, { userId: runner.userId, role: "RUNNER" });

    const environment = await createEnvironment(alice, workspace.id, {
      name: "Prod",
      values: [
        { key: "baseUrl", value: "https://api", type: "default", enabled: true },
        { key: "token", value: "s3cr3t", type: "secret", enabled: true },
      ],
    });

    const stored = await prisma.environment.findUniqueOrThrow({ where: { id: environment.id } });
    expect(JSON.stringify(stored.values)).not.toContain("s3cr3t");
    expect(JSON.stringify(stored.values)).toContain("enc:v1:");

    const secret = async (actor: typeof alice) =>
      (await getEnvironment(actor, environment.id)).values.find((v) => v.key === "token")?.value;
    expect(await secret(runner)).toBe("s3cr3t");
    expect(await secret(viewer)).toBe("••••••••");
  });
});
