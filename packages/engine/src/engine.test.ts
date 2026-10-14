import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { runCollection } from "./index";

let baseUrl = "";
const server = createServer((req, res) => {
  if (req.url === "/json") {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ id: 42, auth: req.headers.authorization ?? null }));
    return;
  }
  if (req.url === "/redirect") {
    res.writeHead(302, { location: "http://169.254.169.254/latest/meta-data" });
    res.end();
    return;
  }
  res.statusCode = 404;
  res.end("not found");
});

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
after(() => server.close());

const collection = {
  info: { name: "Engine test", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
  item: [
    {
      id: "get-json",
      name: "Get JSON",
      request: { method: "GET", url: "{{baseUrl}}/json", header: [{ key: "Authorization", value: "Bearer {{token}}" }] },
      event: [
        {
          listen: "test",
          script: {
            exec: [
              "pm.test('status is 200', () => pm.response.to.have.status(200));",
              "pm.test('id is 42', () => pm.expect(pm.response.json().id).to.eql(42));",
              "pm.environment.set('lastId', String(pm.response.json().id));",
              "console.log('done', pm.response.json().auth);",
            ],
          },
        },
      ],
    },
    {
      id: "missing",
      name: "Missing",
      request: { method: "GET", url: "{{baseUrl}}/missing" },
      event: [{ listen: "test", script: { exec: ["pm.test('should fail', () => pm.response.to.have.status(200));"] } }],
    },
  ],
};

const environment = () => [
  { key: "baseUrl", value: baseUrl },
  { key: "token", value: "abc" },
];

test("runs every request with environment variables, tests and console", async () => {
  const result = await runCollection({ collection, environment: environment() });
  assert.equal(result.error, undefined);
  assert.equal(result.requests.length, 2);

  const [first, second] = result.requests;
  assert.equal(first.request.url, `${baseUrl}/json`);
  assert.equal(first.response?.code, 200);
  assert.deepEqual(JSON.parse(first.response!.body), { id: 42, auth: "Bearer abc" });
  assert.deepEqual(
    first.tests.map((t) => [t.name, t.passed]),
    [
      ["status is 200", true],
      ["id is 42", true],
    ],
  );
  assert.deepEqual(first.console, [{ level: "log", messages: ["done", "Bearer abc"] }]);

  assert.equal(second.response?.code, 404);
  assert.equal(second.tests[0].passed, false);

  assert.equal(result.environment.find((v) => v.key === "lastId")?.value, "42");
});

test("runs a single item", async () => {
  const result = await runCollection({ collection, environment: environment(), itemId: "missing" });
  assert.deepEqual(
    result.requests.map((r) => r.name),
    ["Missing"],
  );
});

test("never reaches blocked hosts, by IP, by name or through a redirect", async () => {
  const result = await runCollection({
    collection: {
      info: { name: "Blocked" },
      item: [
        { name: "Metadata IP", request: { url: "http://169.254.169.254/latest" } },
        { name: "Blocked name", request: { url: "http://localhost:1/admin" } },
        { name: "Redirect", request: { url: "{{baseUrl}}/redirect" } },
      ],
    },
    environment: environment(),
    blockedHosts: ["localhost"],
  });
  assert.equal(result.requests.length, 3);
  for (const request of result.requests) {
    assert.equal(request.response, undefined, request.name);
    assert.match(request.error ?? "", /restricted address/, request.name);
  }
});

test("runs once per data row", async () => {
  const result = await runCollection({
    collection,
    environment: environment(),
    itemId: "get-json",
    iterationData: [{ token: "one" }, { token: "two" }],
  });
  assert.deepEqual(
    result.requests.map((r) => JSON.parse(r.response!.body).auth),
    ["Bearer one", "Bearer two"],
  );
});
