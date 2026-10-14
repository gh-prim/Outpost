import { decryptSecret, prisma } from "@outpost/db";
import { type Integration, readSecret } from "./providers";

export type { Integration } from "./providers";
export { readSecret } from "./providers";

/** `<integration>:<path>#<key>`, e.g. `corp-vault:secret/data/payments#apiKey`. */
export function parseReference(reference: string) {
  const match = /^([a-z0-9][a-z0-9-]*):([^#]+)(?:#(.+))?$/.exec(reference.trim());
  if (!match) return null;
  return { integration: match[1], path: match[2], key: match[3] };
}

type StoredValue = { key: string; value: string; type: string; enabled: boolean };

const CACHE_MS = 60_000;
const cache = new Map<string, { value: string; expires: number }>();

/**
 * Turns stored environment values into run variables: decrypts secrets and fetches
 * vault references. A reference that cannot be resolved becomes an empty value and is reported.
 */
export async function resolveEnvironmentValues(organizationId: string, values: StoredValue[]) {
  const errors: string[] = [];
  const integrations = new Map<string, Integration | null>();

  async function integration(name: string) {
    if (!integrations.has(name)) {
      const row = await prisma.vaultIntegration.findUnique({
        where: { organizationId_name: { organizationId, name } },
      });
      integrations.set(
        name,
        row ? ({ type: row.type, config: row.config, credentials: JSON.parse(decryptSecret(row.credentials)) } as Integration) : null,
      );
    }
    return integrations.get(name)!;
  }

  const variables = await Promise.all(
    values.map(async (v) => {
      if (v.type === "secret") return { key: v.key, value: decryptSecret(v.value), enabled: v.enabled };
      if (v.type !== "vault" || !v.enabled) return { key: v.key, value: v.value, enabled: v.enabled };

      const reference = parseReference(v.value);
      const cacheKey = `${organizationId}|${v.value}`;
      const cached = cache.get(cacheKey);
      if (cached && cached.expires > Date.now()) return { key: v.key, value: cached.value, enabled: true };
      try {
        if (!reference) throw new Error(`"${v.value}" is not a vault reference (name:path#key)`);
        const target = await integration(reference.integration);
        if (!target) throw new Error(`Unknown vault "${reference.integration}"`);
        const value = await readSecret(target, reference.path, reference.key);
        cache.set(cacheKey, { value, expires: Date.now() + CACHE_MS });
        return { key: v.key, value, enabled: true };
      } catch (error) {
        errors.push(`${v.key}: ${(error as Error).message}`);
        return { key: v.key, value: "", enabled: true };
      }
    }),
  );
  return { variables, errors };
}
