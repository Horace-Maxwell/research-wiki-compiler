import { z } from "zod";

import {
  LLM_PROVIDERS,
  SOURCE_SUMMARY_ARTIFACT_VERSION,
  SOURCE_SUMMARY_STATUSES,
} from "@/lib/constants";

const pageHintTypeSchema = z.enum([
  "topic",
  "entity",
  "concept",
  "timeline",
  "synthesis",
  "note",
]);

export const llmProviderSchema = z.enum(LLM_PROVIDERS);
export const sourceSummaryStatusSchema = z.enum(SOURCE_SUMMARY_STATUSES);
export const sourceSummaryClaimPolaritySchema = z.enum([
  "supports",
  "mixed",
  "neutral",
  "contradicts",
]);
export const sourceSummaryEvidenceStrengthSchema = z.enum(["low", "medium", "high"]);

export const sourceSummaryEntitySchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
});

export const sourceSummaryConceptSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
});

export const sourceSummaryClaimSchema = z.object({
  text: z.string().min(1),
  polarity: sourceSummaryClaimPolaritySchema,
  evidenceStrength: sourceSummaryEvidenceStrengthSchema,
  rationale: z.string().min(1),
});

export const sourceSummaryHintSchema = z.object({
  title: z.string().min(1),
  pageType: pageHintTypeSchema,
  rationale: z.string().min(1),
});

export const sourceSummaryArtifactContentSchema = z.object({
  conciseSummary: z.string().min(1),
  keyEntities: z.array(sourceSummaryEntitySchema),
  keyConcepts: z.array(sourceSummaryConceptSchema),
  majorClaims: z.array(sourceSummaryClaimSchema),
  openQuestions: z.array(z.string().min(1)),
  possibleTargetPageHints: z.array(sourceSummaryHintSchema),
});

export type SourceSummaryArtifactContent = z.infer<typeof sourceSummaryArtifactContentSchema>;

export const sourceSummaryArtifactSchema = z.object({
  schemaVersion: z.literal(SOURCE_SUMMARY_ARTIFACT_VERSION),
  sourceId: z.string(),
  sourceTitle: z.string(),
  sourceType: z.enum(["markdown", "text", "unknown"]),
  generatedAt: z.string().datetime(),
  provider: llmProviderSchema,
  model: z.string().min(1),
  promptHash: z.string().min(1),
  chunkStrategy: z.enum(["direct", "staged"]),
  content: sourceSummaryArtifactContentSchema,
});

export type SourceSummaryArtifact = z.infer<typeof sourceSummaryArtifactSchema>;

export const sourceSummaryRunSchema = z.object({
  id: z.string(),
  status: z.enum(["running", "completed", "failed"]),
  retryCount: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative().nullable(),
  provider: llmProviderSchema.nullable(),
  model: z.string().nullable(),
  promptHash: z.string().nullable(),
  error: z.string().nullable(),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export type SourceSummaryRun = z.infer<typeof sourceSummaryRunSchema>;

export const sourceCompilationStateSchema = z.object({
  status: sourceSummaryStatusSchema,
  markdownPath: z.string().nullable(),
  jsonPath: z.string().nullable(),
  promptHash: z.string().nullable(),
  provider: llmProviderSchema.nullable(),
  model: z.string().nullable(),
  updatedAt: z.string().datetime().nullable(),
  error: z.string().nullable(),
  markdown: z.string().nullable(),
  artifact: sourceSummaryArtifactSchema.nullable(),
  latestJobRun: sourceSummaryRunSchema.nullable(),
});

export type SourceCompilationState = z.infer<typeof sourceCompilationStateSchema>;

export const sourceSummarizeRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const sourceSummaryArtifactJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "conciseSummary",
    "keyEntities",
    "keyConcepts",
    "majorClaims",
    "openQuestions",
    "possibleTargetPageHints",
  ],
  properties: {
    conciseSummary: {
      type: "string",
    },
    keyEntities: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description", "aliases"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          aliases: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
    keyConcepts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "description"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
        },
      },
    },
    majorClaims: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "polarity", "evidenceStrength", "rationale"],
        properties: {
          text: { type: "string" },
          polarity: {
            type: "string",
            enum: ["supports", "mixed", "neutral", "contradicts"],
          },
          evidenceStrength: {
            type: "string",
            enum: ["low", "medium", "high"],
          },
          rationale: { type: "string" },
        },
      },
    },
    openQuestions: {
      type: "array",
      items: { type: "string" },
    },
    possibleTargetPageHints: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "pageType", "rationale"],
        properties: {
          title: { type: "string" },
          pageType: {
            type: "string",
            enum: ["topic", "entity", "concept", "timeline", "synthesis", "note"],
          },
          rationale: { type: "string" },
        },
      },
    },
  },
} as const satisfies Record<string, unknown>;

export const sourceChunkDigestSchema = z.object({
  chunkSummary: z.string().min(1),
  keyEntities: z.array(z.string().min(1)),
  keyConcepts: z.array(z.string().min(1)),
  claims: z.array(z.string().min(1)),
  openQuestions: z.array(z.string().min(1)),
});

export type SourceChunkDigest = z.infer<typeof sourceChunkDigestSchema>;

export const sourceChunkDigestJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["chunkSummary", "keyEntities", "keyConcepts", "claims", "openQuestions"],
  properties: {
    chunkSummary: { type: "string" },
    keyEntities: {
      type: "array",
      items: { type: "string" },
    },
    keyConcepts: {
      type: "array",
      items: { type: "string" },
    },
    claims: {
      type: "array",
      items: { type: "string" },
    },
    openQuestions: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const satisfies Record<string, unknown>;
