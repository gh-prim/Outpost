import type { RunSummary } from "./summary";

type Notification = { monitorName: string; workspaceName: string; url: string; summary: RunSummary; recovered: boolean };

/** Slack and Microsoft Teams incoming webhooks both render `text`; other receivers get the structured fields. */
export function webhookPayload({ monitorName, workspaceName, url, summary, recovered }: Notification) {
  const headline = recovered
    ? `✅ Monitor "${monitorName}" recovered`
    : `❌ Monitor "${monitorName}" ${summary.status === "error" ? "could not run" : "failed"}`;
  const failures = summary.items
    .filter((i) => i.error || i.failedTests.length)
    .slice(0, 5)
    .map((i) => `• ${i.method} ${i.name}: ${i.error ?? i.failedTests.join(", ")}`);
  const text = [
    `${headline} in ${workspaceName}`,
    `${summary.requests} requests, ${summary.failedTests}/${summary.totalTests} tests failed`,
    ...failures,
    url,
  ].join("\n");
  return { text, monitor: monitorName, workspace: workspaceName, status: summary.status, recovered, summary, url };
}

export async function sendWebhook(webhookUrl: string, notification: Notification) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "content-type": "application/json", "user-agent": "Outpost" },
    body: JSON.stringify(webhookPayload(notification)),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Webhook answered ${response.status}`);
}
