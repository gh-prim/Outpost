import path from "node:path";
import { config } from "dotenv";
import type { NextConfig } from "next";

// The .env file lives at the repository root, shared with the db package.
config({ path: path.resolve(import.meta.dirname, "../../.env"), quiet: true });

const nextConfig: NextConfig = {
  // The collection runtime is CommonJS with dynamic requires: load it from node_modules at runtime.
  serverExternalPackages: ["postman-runtime", "postman-collection"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
