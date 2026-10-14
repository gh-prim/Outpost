import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    // Tests share one database; run files one after the other.
    fileParallelism: false,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "postgresql://outpost:outpost@localhost:5440/outpost_test",
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret",
    },
  },
});
