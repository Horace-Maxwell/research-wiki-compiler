import { z } from "zod";

import {
  SOURCE_INGESTION_METHODS,
  SOURCE_STATUSES,
  SOURCE_TYPES,
} from "@/lib/constants";
import {
  sourceCompilationStateSchema,
  sourceSummarizeRequestSchema,
  sourceSummaryStatusSchema,
} from "@/lib/contracts/source-summary";

export const sourceTypeSchema = z.enum(SOURCE_TYPES);
export const sourceStatusSchema = z.enum(SOURCE_STATUSES);
export const sourceIngestionMethodSchema = z.enum(SOURCE_INGESTION_METHODS);

export const sourceChunkSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  chunkIndex: z.number().int().nonnegative(),
  content: z.string(),
  tokenCount: z.number().int().nonnegative(),
  charCount: z.number().int().nonnegative(),
  startOffset: z.number().int().nonnegative(),
  endOffset: z.number().int().nonnegative(),
  checksum: z.string(),
});

export type SourceChunk = z.infer<typeof sourceChunkSchema>;

export const sourceSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  sourceType: sourceTypeSchema,
  status: sourceStatusSchema,
  ingestionMethod: sourceIngestionMethodSchema,
  originalPath: z.string(),
  normalizedPath: z.string().nullable(),
  checksum: z.string(),
  importedAt: z.string().datetime(),
  processedAt: z.string().datetime().nullable(),
  tokenEstimate: z.number().int().nonnegative(),
  chunkCount: z.number().int().nonnegative(),
  language: z.string(),
  summaryStatus: sourceSummaryStatusSchema,
  summaryUpdatedAt: z.string().datetime().nullable(),
});

export type SourceSummary = z.infer<typeof sourceSummarySchema>;

export const sourceDetailSchema = sourceSummarySchema.extend({
  workspaceId: z.string(),
  slug: z.string(),
  processingVersion: z.string(),
  rawPath: z.string().nullable(),
  originalExternalPath: z.string().nullable(),
  rawTextExtracted: z.string(),
  metadataJson: z.record(z.string(), z.unknown()),
  failureReason: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  chunks: z.array(sourceChunkSchema),
  summary: sourceCompilationStateSchema,
});

export type SourceDetail = z.infer<typeof sourceDetailSchema>;

const baseImportSchema = z.object({
  workspaceRoot: z.string().min(1),
  title: z.string().trim().min(1).max(240).optional(),
});

export const pastedTextImportSchema = baseImportSchema.extend({
  importKind: z.literal("pasted_text"),
  text: z.string().min(1),
  filename: z.string().trim().min(1).max(240).optional(),
});

export const browserFileImportSchema = baseImportSchema.extend({
  importKind: z.literal("browser_file"),
  filename: z.string().trim().min(1).max(240),
  content: z.string(),
});

export const localFilePathImportSchema = baseImportSchema.extend({
  importKind: z.literal("local_file_path"),
  filePath: z.string().trim().min(1),
});

export const sourceImportRequestSchema = z.discriminatedUnion("importKind", [
  pastedTextImportSchema,
  browserFileImportSchema,
  localFilePathImportSchema,
]);

export type SourceImportRequest = z.infer<typeof sourceImportRequestSchema>;

export const listSourcesQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
  status: sourceStatusSchema.optional(),
  sourceType: sourceTypeSchema.optional(),
  importedAfter: z.string().date().optional(),
});

export const listSourcesResponseSchema = z.object({
  sources: z.array(sourceSummarySchema),
});

export const sourceDetailQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const sourceReprocessRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
});

export { sourceSummarizeRequestSchema };
