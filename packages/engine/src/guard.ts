import { createHash } from "node:crypto";
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import type { Duplex } from "node:stream";

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

function normalize(host: string) {
  return host.toLowerCase().replace(/^\[|\]$/g, "").replace(/\.$/, "");
}

type GuardedAgents = ReturnType<typeof createGuardedAgents>;

const cache = new Map<string, GuardedAgents>();

/**
 * HTTP(S) agents that refuse to connect to blocked hosts, checked on the hostname and on
 * every resolved IP. Works for numeric hosts and redirects, which DNS-only checks miss.
 */
export function guardedAgents(blockedHosts: string[]) {
  const blocked = [...new Set(blockedHosts.map(normalize))].sort();
  const key = createHash("sha256").update(blocked.join("\n")).digest("hex").slice(0, 16);
  let agents = cache.get(key);
  if (!agents) {
    agents = createGuardedAgents(new Set(blocked), key);
    cache.set(key, agents);
  }
  return agents;
}

function createGuardedAgents(blocked: Set<string>, key: string) {
  const isBlocked = (host: string) => blocked.has(normalize(host));
  const refuse = (host: string) =>
    Object.assign(new Error(`Outpost blocked a request to a restricted address: ${host}`), { code: "EOUTPOSTBLOCKED" });

  const lookup = (hostname: string, options: object, callback: LookupCallback) => {
    dnsLookup(hostname, { ...options, all: true }, (err, addresses) => {
      if (err) return callback(err, []);
      const blockedAddress = addresses.find((a) => isBlocked(a.address));
      if (blockedAddress) return callback(refuse(hostname), []);
      const all = (options as { all?: boolean }).all;
      if (all) return callback(null, addresses);
      callback(null, addresses[0].address, addresses[0].family);
    });
  };

  function guard<T extends { host?: string | null; hostname?: string | null }>(options: T) {
    const host = options.hostname ?? options.host ?? "";
    if (isBlocked(host)) throw refuse(host);
    return isIP(normalize(host)) ? options : { ...options, lookup };
  }

  class GuardedHttpAgent extends http.Agent {
    createConnection(options: http.ClientRequestArgs, callback?: (err: Error | null, socket: Duplex) => void) {
      return super.createConnection(guard(options), callback);
    }
  }

  class GuardedHttpsAgent extends https.Agent {
    createConnection(options: http.ClientRequestArgs, callback?: (err: Error | null, socket: Duplex) => void) {
      return super.createConnection(guard(options), callback);
    }
  }

  // The HTTP client pools agents by class name, so each blocklist needs its own name.
  Object.defineProperty(GuardedHttpAgent, "name", { value: `OutpostHttpAgent_${key}` });
  Object.defineProperty(GuardedHttpsAgent, "name", { value: `OutpostHttpsAgent_${key}` });

  return { http: { agentClass: GuardedHttpAgent }, https: { agentClass: GuardedHttpsAgent } };
}
