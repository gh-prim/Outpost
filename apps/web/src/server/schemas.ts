import { z } from "zod";

export const workspaceRole = z.enum(["ADMIN", "EDITOR", "RUNNER", "VIEWER"]);

export const createWorkspaceInput = z.object({
  organizationId: z.string().min(1),
  name: z.string().trim().min(1).max(100),
  description: z.string().max(2000).optional(),
  visibility: z.enum(["PRIVATE", "ORGANIZATION"]).default("ORGANIZATION"),
});

export const updateWorkspaceInput = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().max(2000).nullable().optional(),
  visibility: z.enum(["PRIVATE", "ORGANIZATION"]).optional(),
});

export const addWorkspaceMemberInput = z
  .object({
    userId: z.string().min(1).optional(),
    teamId: z.string().min(1).optional(),
    role: workspaceRole.default("EDITOR"),
  })
  .refine((v) => Boolean(v.userId) !== Boolean(v.teamId), { message: "Provide either userId or teamId" });

/** Collection Format v2.1: only the envelope is checked, items are kept as is. */
export const collectionDocument = z.looseObject({
  info: z.looseObject({
    name: z.string().trim().min(1),
    schema: z.string().optional(),
  }),
  item: z.array(z.unknown()).default([]),
});

export const createCollectionInput = z.union([
  z.object({ content: collectionDocument }),
  z.object({ name: z.string().trim().min(1).max(200) }),
]);

export const updateCollectionInput = z.object({
  content: collectionDocument,
  baseVersion: z.number().int().positive(),
});

export const environmentValue = z.object({
  key: z.string().min(1),
  value: z.string().default(""),
  // "vault" values are references: <vault name>:<path>#<key>
  type: z.enum(["default", "secret", "vault"]).default("default"),
  enabled: z.boolean().default(true),
});

export const createEnvironmentInput = z.object({
  name: z.string().trim().min(1).max(200),
  values: z.array(environmentValue).default([]),
});

export const updateEnvironmentInput = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  values: z.array(environmentValue).optional(),
  baseVersion: z.number().int().positive(),
});

export const runInput = z.object({
  workspaceId: z.string().min(1),
  collection: collectionDocument,
  itemId: z.string().optional(),
  environmentId: z.string().optional(),
  iterationData: z.array(z.record(z.string(), z.unknown())).max(10_000).optional(),
});

export const MONITOR_INTERVALS = [5, 10, 15, 30, 60, 360, 720, 1440] as const;

const webhookUrl = z
  .url({ protocol: /^https?$/ })
  .max(2000)
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const createMonitorInput = z.object({
  name: z.string().trim().min(1).max(200),
  collectionId: z.string().min(1),
  environmentId: z.string().min(1).nullable().optional(),
  intervalMinutes: z.union(MONITOR_INTERVALS.map((m) => z.literal(m))),
  webhookUrl,
});

export const updateMonitorInput = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  environmentId: z.string().min(1).nullable().optional(),
  intervalMinutes: z.union(MONITOR_INTERVALS.map((m) => z.literal(m))).optional(),
  enabled: z.boolean().optional(),
  webhookUrl,
});

export const createMockInput = z.object({
  name: z.string().trim().min(1).max(200),
  collectionId: z.string().min(1),
  environmentId: z.string().min(1).nullable().optional(),
  isPrivate: z.boolean().default(true),
  delayMs: z.number().int().min(0).max(30_000).default(0),
});

export const updateMockInput = createMockInput.partial().omit({ collectionId: true });

export const publishDocsInput = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,62}$/, "Use 2 to 63 lowercase letters, digits or dashes"),
  environmentId: z.string().min(1).nullable().optional(),
  title: z.string().trim().max(200).nullable().optional(),
  logoUrl: z
    .url({ protocol: /^https$/ })
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional()
    .or(z.literal("").transform(() => null)),
});

export const organizationSettingsInput = z.object({
  enforceSso: z.boolean(),
});

export const gitSyncInput = z.object({
  repoUrl: z.url({ protocol: /^https?$/ }).max(500),
  branch: z
    .string()
    .trim()
    .regex(/^[\w./-]{1,100}$/)
    .default("main"),
  directory: z
    .string()
    .trim()
    .regex(/^[\w-]+(\/[\w-]+)*$/, "Use a relative folder like outpost or api/collections")
    .default("outpost"),
  // Omitted keeps the stored token, null removes it.
  token: z.string().min(1).max(500).nullable().optional(),
});

export const vaultIntegrationInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("hashicorp"),
    name: z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/, "Lowercase letters, digits and dashes"),
    address: z.url({ protocol: /^https?$/ }),
    namespace: z.string().max(200).optional(),
    token: z.string().min(1).max(1000),
  }),
  z.object({
    type: z.literal("aws"),
    name: z.string().regex(/^[a-z0-9][a-z0-9-]{0,40}$/, "Lowercase letters, digits and dashes"),
    region: z.string().regex(/^[a-z]{2}(-[a-z]+)+-\d$/, "An AWS region like eu-west-3"),
    accessKeyId: z.string().min(1).max(200),
    secretAccessKey: z.string().min(1).max(500),
  }),
]);

export const vaultTestInput = z.object({ reference: z.string().min(1).max(1000) });
