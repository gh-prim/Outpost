import { execSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

/** Creates the test database if needed and applies migrations. */
export default async function setup() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "postgresql://outpost:outpost@localhost:5440/outpost_test");
  const database = url.pathname.slice(1);
  const admin = new Client({ connectionString: Object.assign(new URL(url), { pathname: "/postgres" }).toString() });
  await admin.connect();
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [database]);
  if (exists.rowCount === 0) await admin.query(`CREATE DATABASE "${database}"`);
  await admin.end();

  execSync("pnpm exec prisma migrate deploy", {
    cwd: path.resolve(import.meta.dirname, "../../../packages/db"),
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: "ignore",
  });
}
