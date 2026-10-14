import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { app } from "electron";

type Config = { serverUrl?: string };

const path = () => join(app.getPath("userData"), "config.json");

export function readConfig(): Config {
  try {
    return JSON.parse(readFileSync(path(), "utf8"));
  } catch {
    return {};
  }
}

export function writeConfig(config: Config) {
  mkdirSync(dirname(path()), { recursive: true });
  writeFileSync(path(), JSON.stringify(config, null, 2));
}

/** Accepts "outpost.company.com" or a full URL, returns the origin. */
export function normalizeServerUrl(input: string) {
  const url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  return url.origin;
}
