import { prisma, WorkspaceRole } from "@outpost/db";
import type { z } from "zod";
import { auditContext, recordAudit } from "./audit";
import type { Actor } from "./context";
import { HttpError, notFound } from "./errors";
import { requireWorkspaceRole } from "./policy";
import type { createMonitorInput, updateMonitorInput } from "./schemas";

async function requireMonitor(actor: Actor, monitorId: string, required: WorkspaceRole) {
  const monitor = await prisma.monitor.findUnique({ where: { id: monitorId } });
  if (!monitor) throw notFound("Monitor");
  const { workspace } = await requireWorkspaceRole(actor.userId, monitor.workspaceId, required);
  return { monitor, workspace };
}

/** Collection and environment must belong to the monitor's workspace. */
async function checkTargets(workspaceId: string, collectionId?: string, environmentId?: string | null) {
  if (collectionId) {
    const collection = await prisma.collection.findFirst({ where: { id: collectionId, workspaceId, deletedAt: null } });
    if (!collection) throw new HttpError(400, "Unknown collection in this workspace");
  }
  if (environmentId) {
    const environment = await prisma.environment.findFirst({ where: { id: environmentId, workspaceId } });
    if (!environment) throw new HttpError(400, "Unknown environment in this workspace");
  }
}

const recentRuns = {
  runs: {
    orderBy: { startedAt: "desc" as const },
    take: 30,
    select: { id: true, status: true, durationMs: true, startedAt: true, failedTests: true, totalTests: true },
  },
};

export async function listMonitors(actor: Actor, workspaceId: string) {
  await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.VIEWER);
  return prisma.monitor.findMany({
    where: { workspaceId },
    include: { collection: { select: { name: true } }, ...recentRuns },
    orderBy: { name: "asc" },
  });
}

export async function createMonitor(actor: Actor, workspaceId: string, input: z.infer<typeof createMonitorInput>) {
  const { workspace } = await requireWorkspaceRole(actor.userId, workspaceId, WorkspaceRole.EDITOR);
  await checkTargets(workspaceId, input.collectionId, input.environmentId);
  return prisma.$transaction(async (tx) => {
    const monitor = await tx.monitor.create({ data: { ...input, workspaceId } });
    await recordAudit(
      {
        ...auditContext(actor),
        organizationId: workspace.organizationId,
        action: "monitor.create",
        targetType: "monitor",
        targetId: monitor.id,
        metadata: { name: monitor.name, intervalMinutes: monitor.intervalMinutes },
      },
      tx,
    );
    return monitor;
  });
}

export async function getMonitor(actor: Actor, monitorId: string) {
  await requireMonitor(actor, monitorId, WorkspaceRole.VIEWER);
  return prisma.monitor.findUniqueOrThrow({
    where: { id: monitorId },
    include: {
      collection: { select: { id: true, name: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 100 },
    },
  });
}

export async function updateMonitor(actor: Actor, monitorId: string, input: z.infer<typeof updateMonitorInput>) {
  const { monitor, workspace } = await requireMonitor(actor, monitorId, WorkspaceRole.EDITOR);
  await checkTargets(monitor.workspaceId, undefined, input.environmentId);
  // Re-enabling or changing the interval schedules the next run from now.
  const reschedule = (input.enabled && !monitor.enabled) || input.intervalMinutes !== undefined;
  const updated = await prisma.monitor.update({
    where: { id: monitorId },
    data: { ...input, ...(reschedule ? { nextRunAt: new Date() } : {}) },
  });
  await recordAudit({
    ...auditContext(actor),
    organizationId: workspace.organizationId,
    action: "monitor.update",
    targetType: "monitor",
    targetId: monitorId,
    metadata: { ...input, webhookUrl: input.webhookUrl ? "set" : input.webhookUrl },
  });
  return updated;
}

export async function deleteMonitor(actor: Actor, monitorId: string) {
  const { monitor, workspace } = await requireMonitor(actor, monitorId, WorkspaceRole.EDITOR);
  await prisma.monitor.delete({ where: { id: monitorId } });
  await recordAudit({
    ...auditContext(actor),
    organizationId: workspace.organizationId,
    action: "monitor.delete",
    targetType: "monitor",
    targetId: monitorId,
    metadata: { name: monitor.name },
  });
}

/** Asks the runner to run the monitor at its next poll. */
export async function runMonitorNow(actor: Actor, monitorId: string) {
  await requireMonitor(actor, monitorId, WorkspaceRole.RUNNER);
  await prisma.monitor.update({ where: { id: monitorId }, data: { nextRunAt: new Date() } });
}
