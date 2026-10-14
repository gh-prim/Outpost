import assert from "node:assert/strict";
import { test } from "node:test";
import { parseCsv } from "./csv";

test("parses CSV with quotes, commas and newlines in fields", () => {
  const csv = 'name,note\r\nalice,"hello, world"\nbob,"multi\nline ""quoted"""\n\n';
  assert.deepEqual(parseCsv(csv), [
    { name: "alice", note: "hello, world" },
    { name: "bob", note: 'multi\nline "quoted"' },
  ]);
});

test("returns no rows for an empty file", () => {
  assert.deepEqual(parseCsv(""), []);
});
