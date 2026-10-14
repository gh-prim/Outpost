import { readFile } from "node:fs/promises";
import { parseCsv } from "@outpost/engine/csv";

/** Iteration data from a .csv or .json file (an array of objects). */
export async function loadIterationData(path: string): Promise<Record<string, unknown>[]> {
  const text = await readFile(path, "utf8");
  if (path.toLowerCase().endsWith(".csv")) return parseCsv(text);
  const data = JSON.parse(text);
  if (!Array.isArray(data)) throw new Error(`${path} must contain a JSON array`);
  return data;
}
