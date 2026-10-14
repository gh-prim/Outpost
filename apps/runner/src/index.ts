import path from "node:path";
import { config } from "dotenv";

// Same .env as the web app in development; real environment variables win.
config({ path: path.resolve(import.meta.dirname, "../../../.env"), quiet: true });

const { decryptSecret, prisma } = await import("@outpost/db");
const { runCollection } = await import("@outpost/engine");
const { summarize } = await import("./summary");
const { sendWebhook } = await import("./webhook");

const POLL_MS = Number(process.env.RUNNER_POLL_SECONDS ?? 10) * 1000;
const CONCURRENCY = Number(process.env.RUNNER_CONCURRENCY ?? 4);
const RETENTION_DAYS = Number(process.env.MONITOR_RUN_RETENTION_DAYS ?? 90);
const BASE_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const blockedHosts = (process.env.OUTPOST_BLOCKED_HOSTS ?? "")
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

let stopping = false;
const running = new Set<Promise<void>>();

/** Atomically takes due monitors and schedules their next run, so no two workers run the same one. */
async function claimDueMonitors(limit: number) {
  if (limit <= 0) return [];
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE "monitor" SET "nextRunAt" = now() + make_interval(mins => "intervalMinutes")
    WHERE id IN (
      SELECT id FROM "monitor"
      WHERE enabled AND "nextRunAt" <= now()
      ORDER BY "nextRunAt"
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    RETURNING id`;
  return rows.map((r) => r.id);
}

async function environmentValues(environmentId: string | null, workspaceId: string) {
  if (!environmentId) return [];
  const environment = await prisma.environment.findFirst({ where: { id: environmentId, workspaceId } });
  if (!environment) return [];
  return (environment.values as { key: string; value: string; type: string; enabled: boolean }[]).map((v) => ({
    key: v.key,
    value: v.type === "secret" ? decryptSecret(v.value) : v.value,
    enabled: v.enabled,
  }));
}

async function runMonitor(id: string) {
  const monitor = await prisma.monitor.findUnique({
    where: { id },
    include: {
      collection: { select: { content: true, deletedAt: true } },
      workspace: { select: { name: true, slug: true, organization: { select: { slug: true } } } },
    },
  });
  if (!monitor) return;

  const startedAt = new Date();
  const summary =
    monitor.collection.deletedAt === null
      ? summarize(
          await runCollection({
            collection: monitor.collection.content,
            environment: await environmentValues(monitor.environmentId, monitor.workspaceId),
            blockedHosts,
          }),
        )
      : summarize({ requests: [], environment: [], globals: [], durationMs: 0, error: "The collection was deleted" });

  await prisma.$transaction([
    prisma.monitorRun.create({
      data: {
        monitorId: id,
        status: summary.status,
        requests: summary.requests,
        totalTests: summary.totalTests,
        failedTests: summary.failedTests,
        durationMs: summary.durationMs,
        summary: summary.items,
        error: summary.error,
        startedAt,
      },
    }),
    prisma.monitor.update({ where: { id }, data: { lastStatus: summary.status } }),
  ]);
  console.log(`[runner] ${monitor.name}: ${summary.status} (${summary.requests} requests, ${summary.durationMs} ms)`);

  // Notify on every failure, and once when it recovers.
  const recovered = summary.status === "passed" && monitor.lastStatus !== null && monitor.lastStatus !== "passed";
  if (monitor.webhookUrl && (summary.status !== "passed" || recovered)) {
    const url = `${BASE_URL}/orgs/${monitor.workspace.organization.slug}/w/${monitor.workspace.slug}/m/${monitor.id}`;
    await sendWebhook(monitor.webhookUrl, {
      monitorName: monitor.name,
      workspaceName: monitor.workspace.name,
      url,
      summary,
      recovered,
    }).catch((error: Error) => console.error(`[runner] webhook for ${monitor.name} failed: ${error.message}`));
  }
}

async function tick() {
  const ids = await claimDueMonitors(CONCURRENCY - running.size);
  for (const id of ids) {
    const job = runMonitor(id)
      .catch((error: Error) => console.error(`[runner] monitor ${id} crashed: ${error.message}`))
      .finally(() => running.delete(job));
    running.add(job);
  }
}

async function pruneOldRuns() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.monitorRun.deleteMany({ where: { startedAt: { lt: cutoff } } });
  if (count) console.log(`[runner] removed ${count} runs older than ${RETENTION_DAYS} days`);
}

async function main() {
  console.log(`[runner] started, polling every ${POLL_MS / 1000}s, ${CONCURRENCY} parallel runs`);
  let lastPrune = 0;
  while (!stopping) {
    try {
      await tick();
      if (Date.now() - lastPrune > 60 * 60 * 1000) {
        lastPrune = Date.now();
        await pruneOldRuns();
      }
    } catch (error) {
      console.error("[runner] tick failed", error);
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  await Promise.allSettled(running);
  await prisma.$disconnect();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    console.log(`[runner] ${signal} received, finishing ${running.size} running monitors`);
    stopping = true;
  });
}

await main();
