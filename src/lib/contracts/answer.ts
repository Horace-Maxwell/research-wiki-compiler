import { z } from "zod";

import { llmProviderSchema } from "@/lib/contracts/source-summary";
import { wikiPageTypeSchema } from "@/lib/contracts/wiki";

export const answerEvidenceLayerSchema = z.enum([
  "wiki_page",
  "source_summary",
  "raw_chunk",
]);

export const answerCitationSchema = z.object({
  referenceId: z.string().min(1),
  layer: answerEvidenceLayerSchema,
  pageId: z.string().nullable(),
  pageTitle: z.string().nullable(),
  pagePath: z.string().nullable(),
  sourceId: z.string().nullable(),
  sourceTitle: z.string().nullable(),
  chunkId: z.string().nullable(),
  locator: z.string().nullable(),
  note: z.string().min(1),
});

export type AnswerCitation = z.infer<typeof answerCitationSchema>;

export const answerBasedOnPageSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  path: z.string(),
  type: wikiPageTypeSchema,
  href: z.string(),
});

export type AnswerBasedOnPage = z.infer<typeof answerBasedOnPageSchema>;

export const answerArtifactMetadataSchema = z.object({
  provider: llmProviderSchema.nullable(),
  model: z.string().nullable(),
  promptHash: z.string().nullable(),
  promptVersion: z.string().nullable(),
  insufficientKnowledge: z.boolean(),
  recommendedSourceTypes: z.array(z.string().min(1)),
  retrieval: z.object({
    order: z.tuple([
      z.literal("wiki_pages"),
      z.literal("source_summaries"),
      z.literal("raw_chunks"),
    ]),
    wikiPageIds: z.array(z.string()),
    sourceIds: z.array(z.string()),
    chunkIds: z.array(z.string()),
    usedSummaryFallback: z.boolean(),
    usedChunkFallback: z.boolean(),
  }),
});

export type AnswerArtifactMetadata = z.infer<typeof answerArtifactMetadataSchema>;

export const answerArtifactSchema = z.object({
  id: z.string(),
  question: z.string().min(1),
  shortAnswer: z.string().min(1),
  detailedAnswer: z.string().min(1),
  citations: z.array(answerCitationSchema),
  basedOnPageIds: z.array(z.string()),
  basedOnPages: z.array(answerBasedOnPageSchema),
  caveats: z.array(z.string().min(1)),
  followUpQuestions: z.array(z.string().min(1)),
  archivedPageId: z.string().nullable(),
  archivedPage: answerBasedOnPageSchema.nullable(),
  metadata: answerArtifactMetadataSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AnswerArtifact = z.infer<typeof answerArtifactSchema>;

export const askRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  question: z.string().trim().min(1).max(2000),
});

export const askResponseSchema = z.object({
  answer: answerArtifactSchema,
});

export const getAnswerQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const answerArchiveTypeSchema = z.enum(["synthesis", "note"]);
export type AnswerArchiveType = z.infer<typeof answerArchiveTypeSchema>;

export const archiveAnswerRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  archiveType: answerArchiveTypeSchema,
});

export const archiveAnswerResponseSchema = z.object({
  answer: answerArtifactSchema,
});

export const answererOutputCitationSchema = z.object({
  referenceId: z.string().min(1),
  note: z.string().min(1),
});

export const answererOutputSchema = z.object({
  shortAnswer: z.string().min(1),
  detailedAnswer: z.string().min(1),
  citations: z.array(answererOutputCitationSchema),
  caveats: z.array(z.string().min(1)),
  basedOnPageIds: z.array(z.string()),
  followUpQuestions: z.array(z.string().min(1)),
  insufficientKnowledge: z.boolean(),
  recommendedSourceTypes: z.array(z.string().min(1)),
});

export type AnswererOutput = z.infer<typeof answererOutputSchema>;

export const answererOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "shortAnswer",
    "detailedAnswer",
    "citations",
    "caveats",
    "basedOnPageIds",
    "followUpQuestions",
    "insufficientKnowledge",
    "recommendedSourceTypes",
  ],
  properties: {
    shortAnswer: {
      type: "string",
    },
    detailedAnswer: {
      type: "string",
    },
    citations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["referenceId", "note"],
        properties: {
          referenceId: { type: "string" },
          note: { type: "string" },
        },
      },
    },
    caveats: {
      type: "array",
      items: { type: "string" },
    },
    basedOnPageIds: {
      type: "array",
      items: { type: "string" },
    },
    followUpQuestions: {
      type: "array",
      items: { type: "string" },
    },
    insufficientKnowledge: {
      type: "boolean",
    },
    recommendedSourceTypes: {
      type: "array",
      items: { type: "string" },
    },
  },
} as const satisfies Record<string, unknown>;
