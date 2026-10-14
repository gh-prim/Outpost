import type { Config } from "./config";

export class ApiClient {
  constructor(private readonly config: Config) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(new URL(`/api/v1${path}`, this.config.server), {
      headers: { authorization: `Bearer ${this.config.apiKey}`, "user-agent": "outpost-cli" },
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.error ?? `${response.status} ${response.statusText}`);
    return data as T;
  }
}
