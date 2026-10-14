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
  type: z.enum(["default", "secret"]).default("default"),
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
