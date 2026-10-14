import { beforeEach, describe, expect, it } from "vitest";
import { exportAuditLogsCsv, listAuditLogs, recordAudit } from "@/server/audit";
import { createOrganization, createUser, resetDatabase } from "./fixtures";

describe("audit log", () => {
  beforeEach(resetDatabase);

  it("pages entries newest first and escapes CSV", async () => {
    const alice = await createUser("Alice");
    const org = await createOrganization([{ actor: alice, role: "owner" }]);
    for (let i = 0; i < 3; i++) {
      await recordAudit({
        action: `test.${i}`,
        organizationId: org,
        actorId: alice.userId,
        metadata: { note: 'a "quoted", value' },
      });
    }

    const first = await listAuditLogs(org, { limit: 2 });
    expect(first.entries.map((e) => e.action)).toEqual(["test.2", "test.1"]);
    const second = await listAuditLogs(org, { limit: 2, cursor: first.nextCursor! });
    expect(second.entries.map((e) => e.action)).toEqual(["test.0"]);
    expect(second.nextCursor).toBeNull();

    const csv = await exportAuditLogsCsv(org);
    expect(csv.split("\n")[0]).toBe("createdAt,action,actorEmail,targetType,targetId,ipAddress,metadata");
    expect(csv).toContain('"{""note"":""a \\""quoted\\"", value""}"');
  });
});
