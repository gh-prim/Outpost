import { prisma, type Prisma } from "@outpost/db";
import type { Actor } from "./context";

export type AuditEntry = {
  action: string;
  organizationId?: string | null;
  actorId?: string | null;
  targetType?: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function recordAudit(entry: AuditEntry, db: Prisma.TransactionClient = prisma) {
  await db.auditLog.create({ data: entry });
}

/** Who did it and from where, for entries recorded by API calls. */
export function auditContext(actor: Actor) {
  return { actorId: actor.userId, ipAddress: actor.ipAddress, userAgent: actor.userAgent };
}

export async function listAuditLogs(organizationId: string, options: { cursor?: string; limit?: number } = {}) {
  const limit = Math.min(options.limit ?? 50, 500);
  const entries = await prisma.auditLog.findMany({
    where: { organizationId },
    include: { actor: { select: { id: true, name: true, email: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
  });
  const hasMore = entries.length > limit;
  const page = hasMore ? entries.slice(0, limit) : entries;
  return { entries: page, nextCursor: hasMore ? page[page.length - 1].id : null };
}

const csvColumns = ["createdAt", "action", "actorEmail", "targetType", "targetId", "ipAddress", "metadata"] as const;

function csvCell(value: unknown) {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function exportAuditLogsCsv(organizationId: string) {
  const entries = await prisma.auditLog.findMany({
    where: { organizationId },
    include: { actor: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
  });
  const rows = entries.map((e) =>
    [e.createdAt.toISOString(), e.action, e.actor?.email, e.targetType, e.targetId, e.ipAddress, e.metadata]
      .map(csvCell)
      .join(","),
  );
  return [csvColumns.join(","), ...rows].join("\n") + "\n";
}
