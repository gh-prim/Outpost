/// <reference path="../node_modules/postman-collection/types/index.d.ts" />
// postman-runtime ships no type definitions; this covers the parts Outpost uses.
declare module "postman-runtime" {
  import type { Collection } from "postman-collection";

  export interface RunHandle {
    start(callbacks: Record<string, (...args: any[]) => void>): void;
    abort(): void;
  }

  export class Runner {
    run(collection: Collection, options: Record<string, unknown>, callback: (err: Error | null, run: RunHandle) => void): void;
  }

}
