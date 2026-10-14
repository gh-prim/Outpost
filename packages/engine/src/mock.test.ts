import assert from "node:assert/strict";
import { test } from "node:test";
import { matchExample } from "./mock";

const collection = {
  info: { name: "Mocks" },
  item: [
    {
      name: "Users",
      item: [
        {
          name: "Get user",
          request: { method: "GET", url: "{{baseUrl}}/users/:id" },
          response: [
            { name: "Found", code: 200, header: [{ key: "Content-Type", value: "application/json" }], body: '{"id":1}' },
            { name: "Missing", code: 404, body: '{"error":"not found"}' },
          ],
        },
        {
          name: "Current user",
          request: { method: "GET", url: "{{baseUrl}}/users/me" },
          response: [{ name: "Me", code: 200, body: '{"id":"me"}' }],
        },
        {
          name: "Create user",
          request: { method: "POST", url: { raw: "https://api.example.com/v1/users?notify=true" } },
          response: [{ name: "Created", code: 201, body: "{}" }],
        },
      ],
    },
  ],
};

test("matches path parameters and prefers 2xx examples", () => {
  const response = matchExample(collection, [], { method: "GET", path: "/users/42" });
  assert.equal(response?.name, "Found");
  assert.equal(response?.headers[0].value, "application/json");
});

test("exact segments win over parameters", () => {
  assert.equal(matchExample(collection, [], { method: "GET", path: "/users/me" })?.name, "Me");
});

test("headers select a specific example", () => {
  const byCode = matchExample(collection, [], { method: "GET", path: "/users/42", headers: { "x-mock-response-code": "404" } });
  assert.equal(byCode?.code, 404);
  const byName = matchExample(collection, [], { method: "GET", path: "/users/1", headers: { "x-mock-response-name": "Missing" } });
  assert.equal(byName?.name, "Missing");
});

test("full URLs keep their path and ignore the query string", () => {
  assert.equal(matchExample(collection, [], { method: "POST", path: "/v1/users?x=1" })?.code, 201);
});

test("method and unknown paths do not match", () => {
  assert.equal(matchExample(collection, [], { method: "DELETE", path: "/users/42" }), null);
  assert.equal(matchExample(collection, [], { method: "GET", path: "/orders" }), null);
});

test("environment variables are resolved in templates", () => {
  const withPrefix = {
    item: [{ request: { method: "GET", url: "{{host}}/{{version}}/ping" }, response: [{ name: "Pong", code: 200 }] }],
  };
  const env = [{ key: "version", value: "v2" }];
  assert.equal(matchExample(withPrefix, env, { method: "GET", path: "/v2/ping" })?.name, "Pong");
  assert.equal(matchExample(withPrefix, env, { method: "GET", path: "/v3/ping" }), null);
});
