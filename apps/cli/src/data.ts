import { readFile } from "node:fs/promises";

/** Parses CSV with a header row. Handles quoted fields, escaped quotes and newlines inside quotes. */
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...records] = rows.filter((r) => r.some((cell) => cell !== ""));
  if (!header) return [];
  return records.map((record) => Object.fromEntries(header.map((key, i) => [key.trim(), record[i] ?? ""])));
}

/** Iteration data from a .csv or .json file (an array of objects). */
export async function loadIterationData(path: string): Promise<Record<string, unknown>[]> {
  const text = await readFile(path, "utf8");
  if (path.toLowerCase().endsWith(".csv")) return parseCsv(text);
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error(`${path} must contain a JSON array`);
  return data;
}
