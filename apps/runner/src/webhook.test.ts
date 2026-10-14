import assert from "node:assert/strict";
import { test } from "node:test";
import type { RunSummary } from "./summary";
import { webhookPayload } from "./webhook";

const failed: RunSummary = {
  status: "failed",
  requests: 2,
  totalTests: 3,
  failedTests: 1,
  durationMs: 120,
  items: [
    { name: "List", method: "GET", url: "https://api/list", code: 200, timeMs: 50, failedTests: [] },
    { name: "Create", method: "POST", url: "https://api/create", code: 500, timeMs: 70, failedTests: ["status is 201"] },
  ],
};

test("failure message names the failing requests and links to the monitor", () => {
  const payload = webhookPayload({
    monitorName: "Billing",
    workspaceName: "Payments",
    url: "https://outpost/m/1",
    summary: failed,
    recovered: false,
  });
  assert.match(payload.text, /❌ Monitor "Billing" failed in Payments/);
  assert.match(payload.text, /• POST Create: status is 201/);
  assert.match(payload.text, /https:\/\/outpost\/m\/1$/);
  assert.equal(payload.status, "failed");
});

test("recovery message", () => {
  const payload = webhookPayload({
    monitorName: "Billing",
    workspaceName: "Payments",
    url: "u",
    summary: { ...failed, status: "passed", failedTests: 0, items: [] },
    recovered: true,
  });
  assert.match(payload.text, /✅ Monitor "Billing" recovered/);
});
