import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { runCollection, type Variable } from "@outpost/engine";
import { ApiClient } from "./client";
import { loadConfig, saveConfig } from "./config";
import { loadIterationData } from "./data";
import { printReport, summarize } from "./report";

const HELP = `Outpost CLI

Usage:
  outpost login --server <url> --key <api key>
  outpost whoami
  outpost workspaces --org <organization id or slug>
  outpost collections --workspace <workspace id>
  outpost run <collection id | collection.json> [options]

Run options:
  -e, --environment <id | file.json>  Environment from the server (id) or an exported file
      --item <id or name>             Run one folder or request only
  -d, --data <file.csv | file.json>   Iteration data, one iteration per row
  -n, --iterations <count>            Number of iterations (default: rows in --data, or 1)
      --reporter-json <file>          Also write the full result as JSON
      --blocked-hosts <a,b>           Hosts the run must never call

Requests run from this machine, so it can reach your internal network.
OUTPOST_SERVER and OUTPOST_API_KEY override the saved login, which is handy in CI.
Exit code is 1 when a request fails or a test does not pass.`;

async function client() {
  const config = await loadConfig();
  if (!config) throw new Error("Not logged in. Run `outpost login --server <url> --key <api key>` first.");
  return new ApiClient(config);
}

async function readJson(path: string) {
  return JSON.parse(await readFile(path, "utf8"));
}

const isFile = (value: string) => value.endsWith(".json");

/** Accepts both environment exports ({ values: [...] }) and plain key/value lists. */
function toVariables(data: { values?: Variable[] } | Variable[]): Variable[] {
  const values = Array.isArray(data) ? data : (data.values ?? []);
  return values.map((v) => ({ key: v.key, value: String(v.value ?? ""), enabled: v.enabled !== false }));
}

async function run(target: string, options: Record<string, string | undefined>) {
  const collection = isFile(target)
    ? await readJson(target)
    : (await (await client()).get<{ content: unknown }>(`/collections/${encodeURIComponent(target)}`)).content;

  let environment: Variable[] = [];
  if (options.environment) {
    environment = isFile(options.environment)
      ? toVariables(await readJson(options.environment))
      : toVariables(await (await client()).get<{ values: Variable[] }>(`/environments/${encodeURIComponent(options.environment)}`));
  }

  const iterationData = options.data ? await loadIterationData(options.data) : undefined;
  const result = await runCollection({
    collection,
    itemId: options.item,
    environment,
    iterationData,
    iterationCount: options.iterations ? Number(options.iterations) : undefined,
    blockedHosts: options["blocked-hosts"]?.split(",").map((h) => h.trim()),
  });

  printReport(result, (collection as { info?: { name?: string } }).info?.name ?? "Collection");
  if (options["reporter-json"]) {
    await writeFile(options["reporter-json"], JSON.stringify(result, null, 2));
  }
  const summary = summarize(result);
  return summary.failedRequests || summary.failedTests || result.error ? 1 : 0;
}

async function main(argv: string[]) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      server: { type: "string" },
      key: { type: "string" },
      org: { type: "string" },
      workspace: { type: "string" },
      environment: { type: "string", short: "e" },
      item: { type: "string" },
      data: { type: "string", short: "d" },
      iterations: { type: "string", short: "n" },
      "reporter-json": { type: "string" },
      "blocked-hosts": { type: "string" },
      help: { type: "boolean", short: "h" },
    },
  });
  const [command, target] = positionals;

  switch (command) {
    case "login": {
      if (!values.server || !values.key) throw new Error("login needs --server and --key");
      const config = { server: values.server, apiKey: values.key };
      const me = await new ApiClient(config).get<{ email: string }>("/me");
      const path = await saveConfig(config);
      console.log(`Logged in as ${me.email}. Saved to ${path}`);
      return 0;
    }
    case "whoami": {
      const me = await (await client()).get<{ email: string; organizations: { id: string; slug: string; name: string }[] }>(
        "/me",
      );
      console.log(me.email);
      for (const org of me.organizations) console.log(`  ${org.name}  slug=${org.slug}  id=${org.id}`);
      return 0;
    }
    case "workspaces": {
      if (!values.org) throw new Error("workspaces needs --org");
      const api = await client();
      const me = await api.get<{ organizations: { id: string; slug: string }[] }>("/me");
      const org = me.organizations.find((o) => o.id === values.org || o.slug === values.org);
      if (!org) throw new Error(`Organization not found: ${values.org}`);
      const { workspaces } = await api.get<{ workspaces: { id: string; name: string; role: string }[] }>(
        `/workspaces?organizationId=${org.id}`,
      );
      for (const w of workspaces) console.log(`${w.id}  ${w.name}  (${w.role.toLowerCase()})`);
      return 0;
    }
    case "collections": {
      if (!values.workspace) throw new Error("collections needs --workspace");
      const api = await client();
      const [{ collections }, { environments }] = await Promise.all([
        api.get<{ collections: { id: string; name: string }[] }>(`/workspaces/${values.workspace}/collections`),
        api.get<{ environments: { id: string; name: string }[] }>(`/workspaces/${values.workspace}/environments`),
      ]);
      console.log("Collections");
      for (const c of collections) console.log(`  ${c.id}  ${c.name}`);
      console.log("Environments");
      for (const e of environments) console.log(`  ${e.id}  ${e.name}`);
      return 0;
    }
    case "run":
      if (!target) throw new Error("run needs a collection id or a collection.json file");
      return run(target, values as Record<string, string | undefined>);
    default:
      console.log(HELP);
      return command && !values.help ? 1 : 0;
  }
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (error: Error) => {
    console.error(`outpost: ${error.message}`);
    process.exit(1);
  },
);
