import crypto from "node:crypto";
import path from "node:path";

import { and, desc, eq, gte } from "drizzle-orm";

import type {
  SourceDetail,
  SourceImportRequest,
  SourceSummary,
} from "@/lib/contracts/source";
import { sourceImportRequestSchema } from "@/lib/contracts/source";
import { SOURCE_PROCESSING_VERSION } from "@/lib/constants";
import { AppError } from "@/server/lib/errors";
import { slugifyTitle } from "@/server/lib/slug";
import { sourceChunks, sourceDocuments } from "@/server/db/schema";
import {
  copyWorkspaceSourceFileToInbox,
  buildFilenameForPastedText,
  inferSourceTypeFromFilename,
  moveWorkspaceSourceFile,
  readWorkspaceSourceFile,
  stageLocalSourceFileInInbox,
  stageSourceTextInInbox,
  writeNormalizedSourceFile,
} from "@/server/services/source-file-service";
import { chunkNormalizedSourceText } from "@/server/services/source-chunk-service";
import {
  computeChecksum,
  normalizeSourceInput,
} from "@/server/services/source-normalization-service";
import { readSourceSummaryState } from "@/server/services/source-summary-read-service";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";

function createSourceId(workspaceId: string, originalPath: string, checksum: string) {
  return `src_${crypto
    .createHash("sha1")
    .update(`${workspaceId}:${originalPath}:${checksum}`)
    .digest("hex")
    .slice(0, 32)}`;
}

function createSourceChunkId(documentId: string, chunkIndex: number, checksum: string) {
  return `sch_${crypto
    .createHash("sha1")
    .update(`${documentId}:${chunkIndex}:${checksum}`)
    .digest("hex")
    .slice(0, 32)}`;
}

function mapSourceSummary(
  source: {
    id: string;
    title: string;
    sourceType: string;
    status: string;
    ingestionMethod: string;
    originalPath: string | null;
    normalizedPath: string | null;
    checksum: string;
    importedAt: Date | null;
    processedAt: Date | null;
    tokenEstimate: number;
    language: string;
    summaryStatus: string;
    summaryUpdatedAt: Date | null;
  },
  chunkCount: number,
): SourceSummary {
  return {
    id: source.id,
    title: source.title,
    sourceType: source.sourceType as SourceSummary["sourceType"],
    status: source.status as SourceSummary["status"],
    ingestionMethod: source.ingestionMethod as SourceSummary["ingestionMethod"],
    originalPath: source.originalPath ?? "",
    normalizedPath: source.normalizedPath,
    checksum: source.checksum,
    importedAt: (source.importedAt ?? new Date(0)).toISOString(),
    processedAt: source.processedAt ? source.processedAt.toISOString() : null,
    tokenEstimate: source.tokenEstimate,
    chunkCount,
    language: source.language,
    summaryStatus: source.summaryStatus as SourceSummary["summaryStatus"],
    summaryUpdatedAt: source.summaryUpdatedAt ? source.summaryUpdatedAt.toISOString() : null,
  };
}

async function persistProcessedSource(params: {
  workspaceRoot: string;
  workspaceId: string;
  importRequest: {
    importKind: "pasted_text" | "browser_file" | "local_file_path" | "reprocess";
    title?: string;
  };
  stagedRelativePath: string;
  originalFilename: string;
  originalExternalPath: string | null;
  existingSourceId?: string;
  importedAtOverride?: Date;
}) {
  const { db } = await getWorkspaceContext(params.workspaceRoot);
  const importedAt = params.importedAtOverride ?? new Date();
  const rawBuffer = (await readWorkspaceSourceFile(
    params.workspaceRoot,
    params.stagedRelativePath,
    null,
  )) as Buffer;
  let currentOriginalRelativePath = params.stagedRelativePath;

  try {
    const normalized = normalizeSourceInput({
      importRequest: params.importRequest,
      originalFilename: params.originalFilename,
      rawBuffer,
    });
    const movedOriginalPath = await moveWorkspaceSourceFile(
      params.workspaceRoot,
      params.stagedRelativePath,
      "raw/processed",
    );
    currentOriginalRelativePath = movedOriginalPath;
    const normalizedPath = await writeNormalizedSourceFile(
      params.workspaceRoot,
      params.originalFilename,
      normalized.sourceType,
      normalized.normalizedText,
    );
    const sourceId =
      params.existingSourceId ??
      createSourceId(params.workspaceId, movedOriginalPath, normalized.checksum);
    const chunks = chunkNormalizedSourceText(normalized.normalizedText);
    const slug = slugifyTitle(normalized.title) || "untitled-source";
    const processedAt = new Date();

    await db
      .insert(sourceDocuments)
      .values({
        id: sourceId,
        workspaceId: params.workspaceId,
        title: normalized.title,
        slug,
        sourceType: normalized.sourceType,
        originalPath: movedOriginalPath,
        ingestionMethod:
          params.existingSourceId && params.importRequest.importKind !== "reprocess"
            ? params.importRequest.importKind
            : params.importRequest.importKind,
        checksum: normalized.checksum,
        importedAt,
        processedAt,
        language: normalized.language,
        metadataJson: {
          ...normalized.metadataJson,
          originalExternalPath: params.originalExternalPath,
          stagedInboxPath: params.stagedRelativePath,
        },
        rawTextExtracted: normalized.normalizedText,
        tokenEstimate: normalized.tokenEstimate,
        failureReason: null,
        originalExternalPath: params.originalExternalPath,
        summaryStatus: "not_started",
        summaryMarkdownPath: null,
        summaryJsonPath: null,
        summaryPromptHash: null,
        summaryProvider: null,
        summaryModel: null,
        summaryUpdatedAt: null,
        summaryError: null,
        summaryMetadataJson: {},
        canonicalUrl: null,
        author: null,
        publishedAt: null,
        rawPath: movedOriginalPath,
        normalizedPath,
        processingVersion: SOURCE_PROCESSING_VERSION,
        status: "processed",
        createdAt: importedAt,
        updatedAt: processedAt,
      })
      .onConflictDoUpdate({
        target: sourceDocuments.id,
        set: {
          title: normalized.title,
          slug,
          sourceType: normalized.sourceType,
          originalPath: movedOriginalPath,
          ingestionMethod: params.importRequest.importKind,
          checksum: normalized.checksum,
          importedAt,
          processedAt,
          language: normalized.language,
          metadataJson: {
            ...normalized.metadataJson,
            originalExternalPath: params.originalExternalPath,
            stagedInboxPath: params.stagedRelativePath,
          },
          rawTextExtracted: normalized.normalizedText,
          tokenEstimate: normalized.tokenEstimate,
          failureReason: null,
          originalExternalPath: params.originalExternalPath,
          summaryStatus: "not_started",
          summaryMarkdownPath: null,
          summaryJsonPath: null,
          summaryPromptHash: null,
          summaryProvider: null,
          summaryModel: null,
          summaryUpdatedAt: null,
          summaryError: null,
          summaryMetadataJson: {},
          rawPath: movedOriginalPath,
          normalizedPath,
          processingVersion: SOURCE_PROCESSING_VERSION,
          status: "processed",
          updatedAt: processedAt,
        },
      });

    await db.delete(sourceChunks).where(eq(sourceChunks.documentId, sourceId));

    if (chunks.length > 0) {
      await db.insert(sourceChunks).values(
        chunks.map((chunk) => ({
          id: createSourceChunkId(sourceId, chunk.chunkIndex, chunk.checksum),
          documentId: sourceId,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          tokenCount: chunk.tokenCount,
          charCount: chunk.charCount,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
          checksum: chunk.checksum,
          createdAt: processedAt,
        })),
      );
    }

    return sourceId;
  } catch (error) {
    let rejectedPath = currentOriginalRelativePath;

    try {
      await readWorkspaceSourceFile(params.workspaceRoot, currentOriginalRelativePath, null);
      rejectedPath = await moveWorkspaceSourceFile(
        params.workspaceRoot,
        currentOriginalRelativePath,
        "raw/rejected",
      );
    } catch {
      rejectedPath = currentOriginalRelativePath;
    }

    const checksum = computeChecksum(rawBuffer);
    const sourceId =
      params.existingSourceId ?? createSourceId(params.workspaceId, rejectedPath, checksum);
    const importedTitle =
      params.importRequest.title?.trim() ||
      path.basename(params.originalFilename, path.extname(params.originalFilename)) ||
      "Rejected Source";
    const now = new Date();
    const failureReason = error instanceof Error ? error.message : "Unknown import failure.";

    await db
      .insert(sourceDocuments)
      .values({
        id: sourceId,
        workspaceId: params.workspaceId,
        title: importedTitle,
        slug: slugifyTitle(importedTitle) || "rejected-source",
        sourceType: inferSourceTypeFromFilename(params.originalFilename),
        originalPath: rejectedPath,
        ingestionMethod: params.importRequest.importKind,
        checksum,
        importedAt,
        processedAt: now,
        language: "und",
        metadataJson: {
          originalFilename: params.originalFilename,
          originalExternalPath: params.originalExternalPath,
          stagedInboxPath: params.stagedRelativePath,
          failure: true,
        },
        rawTextExtracted: "",
        tokenEstimate: 0,
        failureReason,
        originalExternalPath: params.originalExternalPath,
        summaryStatus: "not_started",
        summaryMarkdownPath: null,
        summaryJsonPath: null,
        summaryPromptHash: null,
        summaryProvider: null,
        summaryModel: null,
        summaryUpdatedAt: null,
        summaryError: null,
        summaryMetadataJson: {},
        canonicalUrl: null,
        author: null,
        publishedAt: null,
        rawPath: rejectedPath,
        normalizedPath: null,
        processingVersion: SOURCE_PROCESSING_VERSION,
        status: "rejected",
        createdAt: importedAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: sourceDocuments.id,
        set: {
          title: importedTitle,
          slug: slugifyTitle(importedTitle) || "rejected-source",
          sourceType: inferSourceTypeFromFilename(params.originalFilename),
          originalPath: rejectedPath,
          ingestionMethod: params.importRequest.importKind,
          checksum,
          importedAt,
          processedAt: now,
          language: "und",
          metadataJson: {
            originalFilename: params.originalFilename,
            originalExternalPath: params.originalExternalPath,
            stagedInboxPath: params.stagedRelativePath,
            failure: true,
          },
          rawTextExtracted: "",
          tokenEstimate: 0,
          failureReason,
          originalExternalPath: params.originalExternalPath,
          summaryStatus: "not_started",
          summaryMarkdownPath: null,
          summaryJsonPath: null,
          summaryPromptHash: null,
          summaryProvider: null,
          summaryModel: null,
          summaryUpdatedAt: null,
          summaryError: null,
          summaryMetadataJson: {},
          rawPath: rejectedPath,
          normalizedPath: null,
          processingVersion: SOURCE_PROCESSING_VERSION,
          status: "rejected",
          updatedAt: now,
        },
      });

    await db.delete(sourceChunks).where(eq(sourceChunks.documentId, sourceId));

    if (error instanceof AppError) {
      return sourceId;
    }

    throw new AppError(
      failureReason,
      500,
      "source_import_failed",
      error,
    );
  }
}

export async function importSource(input: SourceImportRequest) {
  const parsed = sourceImportRequestSchema.safeParse(input);

  if (!parsed.success) {
    throw new AppError(
      "Invalid source import request.",
      400,
      "invalid_source_import_request",
      parsed.error.flatten(),
    );
  }

  const request = parsed.data;
  const { workspace, workspaceRoot } = await getWorkspaceContext(request.workspaceRoot);
  let stagedRelativePath = "";
  let originalFilename = "";
  let originalExternalPath: string | null = null;

  if (request.importKind === "pasted_text") {
    const inferredSourceType =
      /(^#\s)|(^[-*]\s)|(\[[^[\]]+\]\([^)]+\))|(```)/m.test(request.text) ? "markdown" : "text";
    originalFilename =
      request.filename?.trim() || buildFilenameForPastedText(request.title, inferredSourceType);
    stagedRelativePath = await stageSourceTextInInbox(
      workspaceRoot,
      originalFilename,
      request.text,
    );
  } else if (request.importKind === "browser_file") {
    originalFilename = request.filename;
    stagedRelativePath = await stageSourceTextInInbox(
      workspaceRoot,
      originalFilename,
      request.content,
    );
  } else {
    const staged = await stageLocalSourceFileInInbox(workspaceRoot, request.filePath);
    stagedRelativePath = staged.relativePath;
    originalExternalPath = staged.originalExternalPath;
    originalFilename = path.basename(staged.relativePath);
  }

  const sourceId = await persistProcessedSource({
    workspaceRoot,
    workspaceId: workspace.id,
    importRequest: request,
    stagedRelativePath,
    originalFilename,
    originalExternalPath,
  });

  return getSourceDetail(workspaceRoot, sourceId);
}

export async function listSources(input: {
  workspaceRoot: string;
  status?: "processed" | "rejected";
  sourceType?: "markdown" | "text" | "unknown";
  importedAfter?: string;
}) {
  const { db, workspace } = await getWorkspaceContext(input.workspaceRoot);
  const filters = [eq(sourceDocuments.workspaceId, workspace.id)];

  if (input.status) {
    filters.push(eq(sourceDocuments.status, input.status));
  }

  if (input.sourceType) {
    filters.push(eq(sourceDocuments.sourceType, input.sourceType));
  }

  if (input.importedAfter) {
    filters.push(gte(sourceDocuments.importedAt, new Date(`${input.importedAfter}T00:00:00.000Z`)));
  }

  const rows = await db
    .select({
      id: sourceDocuments.id,
      title: sourceDocuments.title,
      sourceType: sourceDocuments.sourceType,
      status: sourceDocuments.status,
      ingestionMethod: sourceDocuments.ingestionMethod,
      originalPath: sourceDocuments.originalPath,
      normalizedPath: sourceDocuments.normalizedPath,
      checksum: sourceDocuments.checksum,
      importedAt: sourceDocuments.importedAt,
      processedAt: sourceDocuments.processedAt,
      tokenEstimate: sourceDocuments.tokenEstimate,
      language: sourceDocuments.language,
      summaryStatus: sourceDocuments.summaryStatus,
      summaryUpdatedAt: sourceDocuments.summaryUpdatedAt,
    })
    .from(sourceDocuments)
    .where(and(...filters))
    .orderBy(desc(sourceDocuments.importedAt));

  const chunkCounts = await db
    .select({
      documentId: sourceChunks.documentId,
      chunkIndex: sourceChunks.chunkIndex,
    })
    .from(sourceChunks);
  const chunkCountMap = new Map<string, number>();

  for (const row of chunkCounts) {
    chunkCountMap.set(row.documentId, (chunkCountMap.get(row.documentId) ?? 0) + 1);
  }

  return rows.map((row) => mapSourceSummary(row, chunkCountMap.get(row.id) ?? 0));
}

export async function getSourceDetail(workspaceRoot: string, sourceId: string): Promise<SourceDetail> {
  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } = await getWorkspaceContext(
    workspaceRoot,
  );
  const source = await db.query.sourceDocuments.findFirst({
    where: and(eq(sourceDocuments.workspaceId, workspace.id), eq(sourceDocuments.id, sourceId)),
  });

  if (!source) {
    throw new AppError("Source not found.", 404, "source_not_found");
  }

  const chunks = await db.query.sourceChunks.findMany({
    where: eq(sourceChunks.documentId, sourceId),
    orderBy: (table, { asc }) => [asc(table.chunkIndex)],
  });
  const summary = await readSourceSummaryState({
    workspaceRoot: normalizedWorkspaceRoot,
    source: {
      id: source.id,
      summaryStatus: source.summaryStatus,
      summaryMarkdownPath: source.summaryMarkdownPath,
      summaryJsonPath: source.summaryJsonPath,
      summaryPromptHash: source.summaryPromptHash,
      summaryProvider: source.summaryProvider,
      summaryModel: source.summaryModel,
      summaryUpdatedAt: source.summaryUpdatedAt,
      summaryError: source.summaryError,
    },
  });

  return {
    ...mapSourceSummary(source, chunks.length),
    workspaceId: source.workspaceId,
    slug: source.slug,
    processingVersion: source.processingVersion,
    rawPath: source.rawPath,
    originalExternalPath: source.originalExternalPath,
    rawTextExtracted: source.rawTextExtracted,
    metadataJson: source.metadataJson,
    failureReason: source.failureReason,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString(),
    chunks: chunks.map((chunk) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      tokenCount: chunk.tokenCount ?? 0,
      charCount: chunk.charCount ?? chunk.content.length,
      startOffset: chunk.startOffset ?? 0,
      endOffset: chunk.endOffset ?? chunk.content.length,
      checksum: chunk.checksum,
    })),
    summary,
  };
}

export async function reprocessSource(workspaceRoot: string, sourceId: string) {
  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } = await getWorkspaceContext(
    workspaceRoot,
  );
  const existing = await db.query.sourceDocuments.findFirst({
    where: and(eq(sourceDocuments.workspaceId, workspace.id), eq(sourceDocuments.id, sourceId)),
  });

  if (!existing || !existing.originalPath) {
    throw new AppError("Source not found.", 404, "source_not_found");
  }

  const stagedRelativePath = await copyWorkspaceSourceFileToInbox(
    normalizedWorkspaceRoot,
    existing.originalPath,
  );
  const request = {
    workspaceRoot: normalizedWorkspaceRoot,
    importKind: "reprocess" as const,
    title: existing.title,
  };
  const sourceIdResult = await persistProcessedSource({
    workspaceRoot: normalizedWorkspaceRoot,
    workspaceId: workspace.id,
    importRequest: request,
    stagedRelativePath,
    originalFilename: path.basename(existing.originalPath),
    originalExternalPath: existing.originalExternalPath,
    existingSourceId: sourceId,
    importedAtOverride: existing.importedAt ?? new Date(),
  });

  return getSourceDetail(normalizedWorkspaceRoot, sourceIdResult);
}
