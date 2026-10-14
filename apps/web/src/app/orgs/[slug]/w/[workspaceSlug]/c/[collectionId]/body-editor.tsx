"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@outpost/ui";
import type { RequestBody } from "@/lib/collection-items";
import { HeadersEditor } from "./headers-editor";

type Mode = "none" | "json" | "text" | "graphql" | "urlencoded";

const MODES: { value: Mode; label: string }[] = [
  { value: "none", label: "No body" },
  { value: "json", label: "JSON" },
  { value: "text", label: "Text" },
  { value: "graphql", label: "GraphQL" },
  { value: "urlencoded", label: "Form URL-encoded" },
];

function modeOf(body: RequestBody | undefined): Mode {
  if (!body?.mode) return "none";
  if (body.mode === "graphql") return "graphql";
  if (body.mode === "urlencoded") return "urlencoded";
  if (body.mode === "raw") return body.options?.raw?.language === "text" ? "text" : "json";
  return "none";
}

/** Body in Collection Format v2.1 shapes, so collections stay compatible with other tools. */
export function BodyEditor({
  body,
  readOnly,
  onChange,
}: {
  body: RequestBody | undefined;
  readOnly: boolean;
  onChange: (body: RequestBody | undefined) => void;
}) {
  const mode = modeOf(body);

  function switchMode(next: Mode) {
    const text = body?.raw ?? "";
    if (next === "none") onChange(undefined);
    else if (next === "json" || next === "text")
      onChange({ mode: "raw", raw: text, options: { raw: { language: next } } });
    else if (next === "graphql") onChange({ mode: "graphql", graphql: body?.graphql ?? { query: "", variables: "" } });
    else onChange({ mode: "urlencoded", urlencoded: body?.urlencoded ?? [] });
  }

  return (
    <div className="space-y-2">
      <Select value={mode} onValueChange={(v) => switchMode(v as Mode)} disabled={readOnly}>
        <SelectTrigger className="w-48" aria-label="Body type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODES.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(mode === "json" || mode === "text") && (
        <Textarea
          value={body?.raw ?? ""}
          readOnly={readOnly}
          onChange={(e) => onChange({ ...body, mode: "raw", raw: e.target.value })}
          placeholder={mode === "json" ? '{ "hello": "world" }' : "Plain text"}
          rows={8}
          className="font-mono"
          aria-label="Body"
        />
      )}

      {mode === "graphql" && (
        <div className="grid gap-2 md:grid-cols-[2fr_1fr]">
          <Textarea
            value={body?.graphql?.query ?? ""}
            readOnly={readOnly}
            onChange={(e) => onChange({ mode: "graphql", graphql: { ...body?.graphql, query: e.target.value } })}
            placeholder={"query User($id: ID!) {\n  user(id: $id) { id name }\n}"}
            rows={8}
            className="font-mono"
            aria-label="GraphQL query"
          />
          <Textarea
            value={body?.graphql?.variables ?? ""}
            readOnly={readOnly}
            onChange={(e) => onChange({ mode: "graphql", graphql: { ...body?.graphql, variables: e.target.value } })}
            placeholder={'{ "id": "1" }'}
            rows={8}
            className="font-mono"
            aria-label="GraphQL variables"
          />
        </div>
      )}

      {mode === "urlencoded" && (
        <HeadersEditor
          headers={body?.urlencoded ?? []}
          readOnly={readOnly}
          onChange={(urlencoded) => onChange({ mode: "urlencoded", urlencoded })}
          addLabel="Add field"
        />
      )}
    </div>
  );
}
