export type Variable = { key: string; value: string; enabled?: boolean };

export type RunInput = {
  /** Collection Format v2.1 document. */
  collection: unknown;
  /** Run only this item (request or folder), by id or name. Runs the whole collection when omitted. */
  itemId?: string;
  environment?: Variable[];
  globals?: Variable[];
  /** One entry per iteration, for data-driven runs (CSV/JSON data files). */
  iterationData?: Record<string, unknown>[];
  iterationCount?: number;
  /** Hosts or IPs the run must never reach (cloud metadata endpoints, internal admin APIs...). */
  blockedHosts?: string[];
  timeoutMs?: number;
  /** Responses larger than this are cut, in bytes. */
  maxResponseSize?: number;
};

export type TestResult = { name: string; passed: boolean; skipped: boolean; error?: string };

export type ConsoleEntry = { level: string; messages: string[] };

export type ExecutedRequest = {
  itemId: string;
  name: string;
  iteration: number;
  request: { method: string; url: string; headers: { key: string; value: string }[]; body?: string };
  response?: {
    code: number;
    status: string;
    headers: { key: string; value: string }[];
    body: string;
    /** Body as base64 when it is not text (images, archives...). */
    bodyBase64?: string;
    sizeBytes: number;
    timeMs: number;
  };
  error?: string;
  tests: TestResult[];
  console: ConsoleEntry[];
};

export type RunResult = {
  requests: ExecutedRequest[];
  /** Environment after the run, including values set by scripts. */
  environment: Variable[];
  globals: Variable[];
  durationMs: number;
  error?: string;
};
