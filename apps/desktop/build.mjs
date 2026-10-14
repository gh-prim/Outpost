// Bundles the main and preload processes. The collection runtime stays in node_modules.
import { copyFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";

const common = { bundle: true, platform: "node", target: "node22", format: "cjs", external: ["electron", "postman-runtime", "postman-collection"] };

await mkdir("dist", { recursive: true });
await build({ ...common, entryPoints: ["src/main.ts"], outfile: "dist/main.cjs" });
await build({ ...common, entryPoints: ["src/preload.ts"], outfile: "dist/preload.cjs" });
await copyFile("src/setup.html", "dist/setup.html");
