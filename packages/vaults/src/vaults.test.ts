import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { parseReference } from "./index";
import { readSecret } from "./providers";

let address = "";
const server = createServer((req, res) => {
  if (req.headers["x-vault-token"] !== "root") {
    res.statusCode = 403;
    return res.end("{}");
  }
  res.setHeader("content-type", "application/json");
  if (req.url === "/v1/secret/data/payments") {
    return res.end(JSON.stringify({ data: { data: { apiKey: "kv2-key", port: 443 }, metadata: { version: 3 } } }));
  }
  if (req.url === "/v1/kv1/payments") return res.end(JSON.stringify({ data: { apiKey: "kv1-key" } }));
  res.statusCode = 404;
  res.end("{}");
});

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  address = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const vault = () => ({ type: "hashicorp" as const, config: { address }, credentials: { token: "root" } });

test("parses references", () => {
  assert.deepEqual(parseReference("corp-vault:secret/data/payments#apiKey"), {
    integration: "corp-vault",
    path: "secret/data/payments",
    key: "apiKey",
  });
  assert.deepEqual(parseReference("aws-prod:prod/db"), { integration: "aws-prod", path: "prod/db", key: undefined });
  assert.equal(parseReference("no reference here"), null);
});

test("reads KV v2 and KV v1 secrets from HashiCorp Vault", async () => {
  assert.equal(await readSecret(vault(), "secret/data/payments", "apiKey"), "kv2-key");
  assert.equal(await readSecret(vault(), "secret/data/payments", "port"), "443");
  assert.equal(await readSecret(vault(), "kv1/payments", "apiKey"), "kv1-key");
});

test("reports missing keys, paths and bad tokens", async () => {
  await assert.rejects(readSecret(vault(), "secret/data/payments", "nope"), /Key "nope" not found/);
  await assert.rejects(readSecret(vault(), "secret/data/missing", "x"), /answered 404/);
  await assert.rejects(
    readSecret({ ...vault(), credentials: { token: "bad" } }, "secret/data/payments", "apiKey"),
    /answered 403/,
  );
});
