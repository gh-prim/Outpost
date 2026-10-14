import { parse as parseYaml } from "yaml";

/** Converts an OpenAPI 3.x document into a Collection Format v2.1 document. */

type Schema = {
  $ref?: string;
  type?: string | string[];
  format?: string;
  example?: unknown;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  items?: Schema;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
};
type Parameter = { $ref?: string; name: string; in: string; required?: boolean; example?: unknown; schema?: Schema; description?: string };
type MediaType = { schema?: Schema; example?: unknown; examples?: Record<string, { value?: unknown }> };
type Operation = {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: Parameter[];
  requestBody?: { $ref?: string; content?: Record<string, MediaType> };
  responses?: Record<string, { $ref?: string; description?: string; content?: Record<string, MediaType> }>;
};
type OpenApi = {
  openapi?: string;
  info?: { title?: string; description?: string; version?: string };
  servers?: { url: string }[];
  paths?: Record<string, Record<string, Operation | Parameter[]>>;
  components?: Record<string, Record<string, unknown>>;
};

const METHODS = ["get", "post", "put", "patch", "delete", "head", "options"];
const SCHEMA_V21 = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json";

export function isOpenApi(document: unknown): document is OpenApi {
  return typeof document === "object" && document !== null && typeof (document as OpenApi).openapi === "string";
}

/** Reads JSON or YAML text. */
export function parseApiDocument(text: string): unknown {
  const trimmed = text.trim();
  return trimmed.startsWith("{") ? JSON.parse(trimmed) : parseYaml(trimmed);
}

function resolver(spec: OpenApi) {
  return function resolve<T>(value: T & { $ref?: string }, depth = 0): T {
    if (!value?.$ref || depth > 20) return value;
    const path = value.$ref.replace(/^#\//, "").split("/");
    let target: unknown = spec;
    for (const key of path) target = (target as Record<string, unknown>)?.[key.replaceAll("~1", "/").replaceAll("~0", "~")];
    return resolve(target as T & { $ref?: string }, depth + 1);
  };
}

/** A plausible example value built from a schema, so requests and docs are not empty. */
function exampleFrom(schema: Schema | undefined, resolve: ReturnType<typeof resolver>, depth = 0): unknown {
  if (!schema || depth > 8) return null;
  schema = resolve(schema);
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return schema.enum[0];
  const combined = schema.allOf ?? schema.oneOf ?? schema.anyOf;
  if (combined) {
    const parts = combined.map((s) => exampleFrom(s, resolve, depth + 1));
    return schema.allOf && parts.every((p) => typeof p === "object" && p && !Array.isArray(p))
      ? Object.assign({}, ...parts)
      : parts[0];
  }
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== "null") : schema.type;
  if (type === "object" || schema.properties) {
    return Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([key, value]) => [key, exampleFrom(value, resolve, depth + 1)]),
    );
  }
  if (type === "array") return [exampleFrom(schema.items, resolve, depth + 1)];
  if (type === "integer" || type === "number") return 0;
  if (type === "boolean") return true;
  if (type === "string") {
    if (schema.format === "date-time") return "2026-01-01T00:00:00Z";
    if (schema.format === "date") return "2026-01-01";
    if (schema.format === "email") return "user@example.com";
    if (schema.format === "uuid") return "00000000-0000-0000-0000-000000000000";
    return "string";
  }
  return null;
}

function mediaExample(media: MediaType | undefined, resolve: ReturnType<typeof resolver>) {
  if (!media) return undefined;
  if (media.example !== undefined) return media.example;
  const first = media.examples && Object.values(media.examples)[0];
  if (first?.value !== undefined) return first.value;
  return exampleFrom(media.schema, resolve);
}

function jsonContent(content: Record<string, MediaType> | undefined) {
  if (!content) return undefined;
  const key = Object.keys(content).find((k) => k.includes("json")) ?? Object.keys(content)[0];
  return key ? { type: key, media: content[key] } : undefined;
}

export function openApiToCollection(spec: OpenApi) {
  const resolve = resolver(spec);
  const folders = new Map<string, unknown[]>();
  const root: unknown[] = [];

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    const shared = ((pathItem.parameters as Parameter[] | undefined) ?? []).map((p) => resolve(p));
    for (const method of METHODS) {
      const operation = pathItem[method] as Operation | undefined;
      if (!operation) continue;
      const parameters = [...shared, ...(operation.parameters ?? []).map((p) => resolve(p))];
      const query = parameters.filter((p) => p.in === "query");
      const urlPath = path.replace(/\{([^}]+)\}/g, ":$1");
      const queryString = query.length
        ? "?" + query.map((p) => `${p.name}=${encodeURIComponent(String(p.example ?? exampleFrom(p.schema, resolve) ?? ""))}`).join("&")
        : "";

      const header = parameters
        .filter((p) => p.in === "header")
        .map((p) => ({ key: p.name, value: String(p.example ?? exampleFrom(p.schema, resolve) ?? ""), description: p.description }));
      const body = jsonContent(resolve(operation.requestBody ?? {})?.content);
      if (body) header.push({ key: "Content-Type", value: body.type, description: undefined });
      const bodyExample = body ? mediaExample(body.media, resolve) : undefined;

      const request = {
        method: method.toUpperCase(),
        url: {
          raw: `{{baseUrl}}${urlPath}${queryString}`,
          variable: parameters
            .filter((p) => p.in === "path")
            .map((p) => ({ key: p.name, value: String(p.example ?? exampleFrom(p.schema, resolve) ?? ""), description: p.description })),
        },
        header,
        description: operation.description,
        ...(bodyExample !== undefined
          ? {
              body: {
                mode: "raw",
                raw: typeof bodyExample === "string" ? bodyExample : JSON.stringify(bodyExample, null, 2),
                options: { raw: { language: "json" } },
              },
            }
          : {}),
      };

      const response = Object.entries(operation.responses ?? {}).flatMap(([code, raw]) => {
        const r = resolve(raw);
        const content = jsonContent(r.content);
        const example = content ? mediaExample(content.media, resolve) : undefined;
        const status = Number(code);
        if (!Number.isFinite(status)) return [];
        return [
          {
            name: r.description || code,
            code: status,
            header: content ? [{ key: "Content-Type", value: content.type }] : [],
            body: example === undefined ? "" : typeof example === "string" ? example : JSON.stringify(example, null, 2),
          },
        ];
      });

      const item = { name: operation.summary || operation.operationId || `${method.toUpperCase()} ${path}`, request, response };
      const tag = operation.tags?.[0];
      if (tag) {
        if (!folders.has(tag)) folders.set(tag, []);
        folders.get(tag)!.push(item);
      } else {
        root.push(item);
      }
    }
  }

  return {
    info: {
      name: spec.info?.title || "Imported API",
      description: spec.info?.description,
      schema: SCHEMA_V21,
    },
    item: [...[...folders.entries()].map(([name, item]) => ({ name, item })), ...root],
    variable: [{ key: "baseUrl", value: spec.servers?.[0]?.url ?? "" }],
  };
}
