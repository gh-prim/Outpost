import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { prisma } from "@outpost/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createEnvironment, getEnvironment } from "@/server/environments";
import { environmentVariables } from "@/server/run";
import { createVault, listVaults, testVaultReference } from "@/server/vaults";
import { addWorkspaceMember, createWorkspace } from "@/server/workspaces";
import { createOrganization, createUser, resetDatabase } from "./fixtures";

// A fake HashiCorp Vault with one KV v2 secret.
const vault = createServer((req, res) => {
  res.setHeader("content-type", "application/json");
  if (req.headers["x-vault-token"] === "root" && req.url === "/v1/secret/data/payments") {
    return res.end(JSON.stringify({ data: { data: { apiKey: "from-vault" }, metadata: {} } }));
  }
  res.statusCode = 404;
  res.end("{}");
});
let address = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => vault.listen(0, "127.0.0.1", resolve));
  address = `http://127.0.0.1:${(vault.address() as AddressInfo).port}`;
});
afterAll(() => vault.close());

describe("vault references", () => {
  beforeEach(resetDatabase);

  it("resolves references at run time and never stores or lists credentials", async () => {
    const admin = await createUser("Admin");
    const runner = await createUser("Runner");
    const org = await createOrganization([
      { actor: admin, role: "owner" },
      { actor: runner, role: "member" },
    ]);
    await createVault(admin, org, { type: "hashicorp", name: "corp-vault", address, token: "root" });

    const stored = await prisma.vaultIntegration.findFirstOrThrow();
    expect(stored.credentials).not.toContain("root");
    expect(JSON.stringify(await listVaults(runner, org))).not.toContain("credentials");

    const workspace = await createWorkspace(admin, { organizationId: org, name: "Payments", visibility: "PRIVATE" });
    await addWorkspaceMember(admin, workspace.id, { userId: runner.userId, role: "RUNNER" });
    const environment = await createEnvironment(admin, workspace.id, {
      name: "Prod",
      values: [{ key: "apiKey", value: "corp-vault:secret/data/payments#apiKey", type: "vault", enabled: true }],
    });

    expect(await environmentVariables(workspace.id, environment.id)).toEqual([
      { key: "apiKey", value: "from-vault", enabled: true },
    ]);
    // The desktop app asks for resolved values; viewers and the editor UI see the reference.
    expect((await getEnvironment(runner, environment.id, { resolve: true })).values[0].value).toBe("from-vault");
    expect((await getEnvironment(runner, environment.id)).values[0].value).toBe(
      "corp-vault:secret/data/payments#apiKey",
    );
  });

  it("fails runs clearly when a reference cannot be read", async () => {
    const admin = await createUser("Admin");
    const org = await createOrganization([{ actor: admin, role: "owner" }]);
    await createVault(admin, org, { type: "hashicorp", name: "corp-vault", address, token: "root" });
    const workspace = await createWorkspace(admin, { organizationId: org, name: "Payments", visibility: "PRIVATE" });
    const environment = await createEnvironment(admin, workspace.id, {
      name: "Prod",
      values: [{ key: "apiKey", value: "corp-vault:secret/data/missing#apiKey", type: "vault", enabled: true }],
    });

    await expect(environmentVariables(workspace.id, environment.id)).rejects.toMatchObject({ status: 502 });
    expect(await testVaultReference(admin, org, "unknown:secret/x#y")).toEqual({
      ok: false,
      error: 'Unknown vault "unknown"',
    });
    expect(await testVaultReference(admin, org, "corp-vault:secret/data/payments#apiKey")).toEqual({
      ok: true,
      length: 10,
    });
  });
});
