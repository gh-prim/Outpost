import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type Config = { server: string; apiKey: string };

const configPath = join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "outpost", "config.json");

/** Environment variables win over the saved config, which suits CI. */
export async function loadConfig(): Promise<Config | null> {
  const fromEnv = { server: process.env.OUTPOST_SERVER, apiKey: process.env.OUTPOST_API_KEY };
  if (fromEnv.server && fromEnv.apiKey) return fromEnv as Config;
  try {
    const saved = JSON.parse(await readFile(configPath, "utf8")) as Config;
    return { server: fromEnv.server ?? saved.server, apiKey: fromEnv.apiKey ?? saved.apiKey };
  } catch {
    return null;
  }
}

export async function saveConfig(config: Config) {
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + "\n", { mode: 0o600 });
  await chmod(configPath, 0o600);
  return configPath;
}
