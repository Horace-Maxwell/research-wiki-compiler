import { z } from "zod";

import { LLM_PROVIDERS } from "@/lib/constants";

const llmProviderSchema = z.enum(LLM_PROVIDERS);

const llmProviderProfileSchema = z.object({
  apiKey: z.string().nullable().default(null),
  model: z.string().nullable(),
});

const llmSettingsSchema = z.object({
  provider: llmProviderSchema.nullable(),
  model: z.string().nullable(),
  openai: llmProviderProfileSchema.default({
    apiKey: null,
    model: null,
  }),
  anthropic: llmProviderProfileSchema.default({
    apiKey: null,
    model: null,
  }),
});

const reviewSettingsSchema = z.object({
  autoDraftLowRiskPatches: z.boolean(),
  gitCommitOnApply: z.boolean(),
});

export type WorkspaceReviewSettings = z.infer<typeof reviewSettingsSchema>;

export const workspaceSettingsSchema = z.object({
  version: z.literal("0.1.0"),
  workspaceName: z.string().min(1),
  workspaceRoot: z.string().min(1),
  initializeGit: z.boolean(),
  llm: llmSettingsSchema,
  review: reviewSettingsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkspaceSettings = z.infer<typeof workspaceSettingsSchema>;
export type WorkspaceLlmSettings = z.infer<typeof llmSettingsSchema>;

export const workspaceInitRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  workspaceName: z.string().trim().min(1).max(120).optional(),
  initializeGit: z.boolean().default(true),
});

export type WorkspaceInitRequest = z.infer<typeof workspaceInitRequestSchema>;

export const requiredPathStatusSchema = z.object({
  relativePath: z.string(),
  absolutePath: z.string(),
  kind: z.enum(["directory", "file"]),
  exists: z.boolean(),
});

export type RequiredPathStatus = z.infer<typeof requiredPathStatusSchema>;

export const workspaceRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
  rootPath: z.string(),
  gitEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkspaceRecord = z.infer<typeof workspaceRecordSchema>;

export const workspaceStatusSchema = z.object({
  workspaceRoot: z.string(),
  exists: z.boolean(),
  initialized: z.boolean(),
  gitInitialized: z.boolean(),
  databaseInitialized: z.boolean(),
  databaseTables: z.array(z.string()),
  requiredPaths: z.array(requiredPathStatusSchema),
  settings: workspaceSettingsSchema.nullable(),
  workspaceRecord: workspaceRecordSchema.nullable(),
});

export type WorkspaceStatus = z.infer<typeof workspaceStatusSchema>;

export const workspaceSettingsQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const workspaceSettingsResponseSchema = z.object({
  settings: workspaceSettingsSchema,
});

export const workspaceSettingsUpdateRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  llm: llmSettingsSchema,
  review: reviewSettingsSchema,
});
