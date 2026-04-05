import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";

import {
  type SourceChunkDigest,
  type SourceSummaryArtifact,
  sourceChunkDigestJsonSchema,
  sourceChunkDigestSchema,
  sourceSummaryArtifactJsonSchema,
  sourceSummaryArtifactContentSchema,
  sourceSummaryArtifactSchema,
} from "@/lib/contracts/source-summary";
import {
  SOURCE_SUMMARY_ARTIFACT_VERSION,
  SOURCE_SUMMARY_DIRECT_CHAR_LIMIT,
  SOURCE_SUMMARY_JOB_TYPE,
} from "@/lib/constants";
import { logger } from "@/server/lib/logger";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";
import { AppError } from "@/server/lib/errors";
import { slugifyTitle } from "@/server/lib/slug";
import {
  completeJobRun,
  createJobRun,
} from "@/server/services/job-run-service";
import {
  generateStructuredObject,
  getActiveLlmProviderConfig,
} from "@/server/services/llm-provider-service";
import {
  hashPromptTemplate,
  readWorkspacePromptTemplate,
} from "@/server/services/prompt-service";
import {
  writeSourceSummaryArtifacts,
} from "@/server/services/source-summary-file-service";
import { getSourceDetail } from "@/server/services/source-service";
import {
  claims,
  conceptMentions,
  entityMentions,
  sourceChunks,
  sourceDocuments,
} from "@/server/db/schema";

function createDeterministicId(prefix: string, documentId: string, value: string) {
  return `${prefix}_${crypto
    .createHash("sha1")
    .update(`${documentId}:${value}`)
    .digest("hex")
    .slice(0, 32)}`;
}

function buildDirectSummaryPrompt(params: {
  sourceTitle: string;
  sourceType: string;
  tokenEstimate: number;
  normalizedPath: string | null;
  text: string;
}) {
  return [
    "task_mode: final_summary",
    `source_title: ${params.sourceTitle}`,
    `source_type: ${params.sourceType}`,
    `token_estimate: ${params.tokenEstimate}`,
    `normalized_path: ${params.normalizedPath ?? "unknown"}`,
    "",
    "normalized_source_text:",
    params.text,
  ].join("\n");
}

function buildChunkDigestPrompt(params: {
  sourceTitle: string;
  sourceType: string;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  text: string;
}) {
  return [
    "task_mode: chunk_digest",
    `source_title: ${params.sourceTitle}`,
    `source_type: ${params.sourceType}`,
    `chunk_index: ${params.chunkIndex}`,
    `chunk_offsets: ${params.startOffset}-${params.endOffset}`,
    "",
    "normalized_chunk_text:",
    params.text,
  ].join("\n");
}

function buildStagedSummaryPrompt(params: {
  sourceTitle: string;
  sourceType: string;
  tokenEstimate: number;
  digests: SourceChunkDigest[];
}) {
  const digestText = params.digests
    .map((digest, index) =>
      [
        `chunk_digest_${index + 1}:`,
        `summary: ${digest.chunkSummary}`,
        `entities: ${digest.keyEntities.join(", ") || "none"}`,
        `concepts: ${digest.keyConcepts.join(", ") || "none"}`,
        `claims: ${digest.claims.join(" | ") || "none"}`,
        `open_questions: ${digest.openQuestions.join(" | ") || "none"}`,
      ].join("\n"),
    )
    .join("\n\n");

  return [
    "task_mode: final_summary_from_chunk_digests",
    `source_title: ${params.sourceTitle}`,
    `source_type: ${params.sourceType}`,
    `token_estimate: ${params.tokenEstimate}`,
    "",
    "chunk_digests:",
    digestText,
  ].join("\n");
}

function buildSummaryMarkdown(artifact: SourceSummaryArtifact) {
  const entities = artifact.content.keyEntities
    .map((entity) =>
      `- **${entity.name}**${entity.aliases.length > 0 ? ` (${entity.aliases.join(", ")})` : ""}: ${entity.description}`,
    )
    .join("\n");
  const concepts = artifact.content.keyConcepts
    .map((concept) => `- **${concept.name}**: ${concept.description}`)
    .join("\n");
  const claimsMarkdown = artifact.content.majorClaims
    .map(
      (claim) =>
        `- **${claim.polarity} / ${claim.evidenceStrength}**: ${claim.text}\n  Rationale: ${claim.rationale}`,
    )
    .join("\n");
  const openQuestions = artifact.content.openQuestions.map((question) => `- ${question}`).join("\n");
  const pageHints = artifact.content.possibleTargetPageHints
    .map((hint) => `- **${hint.title}** (${hint.pageType}): ${hint.rationale}`)
    .join("\n");

  return [
    `# ${artifact.sourceTitle} Summary`,
    "",
    `- Source ID: \`${artifact.sourceId}\``,
    `- Generated at: ${artifact.generatedAt}`,
    `- Provider: ${artifact.provider}`,
    `- Model: ${artifact.model}`,
    `- Prompt hash: \`${artifact.promptHash}\``,
    `- Chunk strategy: ${artifact.chunkStrategy}`,
    "",
    "## Concise Summary",
    artifact.content.conciseSummary,
    "",
    "## Key Entities",
    entities || "- None identified.",
    "",
    "## Key Concepts",
    concepts || "- None identified.",
    "",
    "## Major Claims",
    claimsMarkdown || "- None identified.",
    "",
    "## Open Questions",
    openQuestions || "- None identified.",
    "",
    "## Possible Target Page Hints",
    pageHints || "- None identified.",
    "",
  ].join("\n");
}

async function persistStructuredExtractions(params: {
  workspaceId: string;
  sourceDocumentId: string;
  entities: SourceSummaryArtifact["content"]["keyEntities"];
  concepts: SourceSummaryArtifact["content"]["keyConcepts"];
  majorClaims: SourceSummaryArtifact["content"]["majorClaims"];
  createdAt: Date;
  workspaceRoot: string;
}) {
  const { db } = await getWorkspaceContext(params.workspaceRoot);

  await db.delete(entityMentions).where(eq(entityMentions.documentId, params.sourceDocumentId));
  await db.delete(conceptMentions).where(eq(conceptMentions.documentId, params.sourceDocumentId));
  await db.delete(claims).where(eq(claims.documentId, params.sourceDocumentId));

  if (params.entities.length > 0) {
    await db.insert(entityMentions).values(
      params.entities.map((entity) => ({
        id: createDeterministicId(
          "ent",
          params.sourceDocumentId,
          entity.name.toLowerCase(),
        ),
        workspaceId: params.workspaceId,
        pageId: null,
        documentId: params.sourceDocumentId,
        name: entity.name,
        normalizedName: entity.name.toLowerCase(),
        mentionCount: 1,
        createdAt: params.createdAt,
      })),
    );
  }

  if (params.concepts.length > 0) {
    await db.insert(conceptMentions).values(
      params.concepts.map((concept) => ({
        id: createDeterministicId(
          "con",
          params.sourceDocumentId,
          concept.name.toLowerCase(),
        ),
        workspaceId: params.workspaceId,
        pageId: null,
        documentId: params.sourceDocumentId,
        name: concept.name,
        normalizedName: concept.name.toLowerCase(),
        mentionCount: 1,
        createdAt: params.createdAt,
      })),
    );
  }

  if (params.majorClaims.length > 0) {
    await db.insert(claims).values(
      params.majorClaims.map((claimRecord) => ({
        id: createDeterministicId("clm", params.sourceDocumentId, claimRecord.text),
        workspaceId: params.workspaceId,
        pageId: null,
        documentId: params.sourceDocumentId,
        text: claimRecord.text,
        polarity: claimRecord.polarity,
        evidenceStrength: claimRecord.evidenceStrength,
        contradictionGroupId: null,
        citationsJson: [
          {
            sourceId: params.sourceDocumentId,
            note: "Persisted from source summary artifact.",
          },
        ],
        createdAt: params.createdAt,
        updatedAt: params.createdAt,
      })),
    );
  }
}

async function compileSummaryArtifact(params: {
  systemPrompt: string;
  providerConfig: Awaited<ReturnType<typeof getActiveLlmProviderConfig>>;
  source: {
    id: string;
    title: string;
    sourceType: string;
    tokenEstimate: number;
    normalizedPath: string | null;
    rawTextExtracted: string;
  };
  chunks: Array<{
    chunkIndex: number;
    content: string;
    startOffset: number | null;
    endOffset: number | null;
  }>;
}) {
  if (params.source.rawTextExtracted.length <= SOURCE_SUMMARY_DIRECT_CHAR_LIMIT) {
    const content = await generateStructuredObject({
      config: params.providerConfig,
      systemPrompt: params.systemPrompt,
      userPrompt: buildDirectSummaryPrompt({
        sourceTitle: params.source.title,
        sourceType: params.source.sourceType,
        tokenEstimate: params.source.tokenEstimate,
        normalizedPath: params.source.normalizedPath,
        text: params.source.rawTextExtracted,
      }),
      schema: sourceSummaryArtifactContentSchema,
      schemaName: "emit_source_summary_artifact",
      jsonSchema: sourceSummaryArtifactJsonSchema,
      maxOutputTokens: 2500,
    });

    return {
      chunkStrategy: "direct" as const,
      content,
    };
  }

  const digests: SourceChunkDigest[] = [];

  for (const chunk of params.chunks) {
    const digest = await generateStructuredObject({
      config: params.providerConfig,
      systemPrompt: params.systemPrompt,
      userPrompt: buildChunkDigestPrompt({
        sourceTitle: params.source.title,
        sourceType: params.source.sourceType,
        chunkIndex: chunk.chunkIndex,
        startOffset: chunk.startOffset ?? 0,
        endOffset: chunk.endOffset ?? chunk.content.length,
        text: chunk.content,
      }),
      schema: sourceChunkDigestSchema,
      schemaName: "emit_source_chunk_digest",
      jsonSchema: sourceChunkDigestJsonSchema,
      maxOutputTokens: 1200,
    });

    digests.push(digest);
  }

  const content = await generateStructuredObject({
    config: params.providerConfig,
    systemPrompt: params.systemPrompt,
    userPrompt: buildStagedSummaryPrompt({
      sourceTitle: params.source.title,
      sourceType: params.source.sourceType,
      tokenEstimate: params.source.tokenEstimate,
      digests,
    }),
    schema: sourceSummaryArtifactContentSchema,
    schemaName: "emit_source_summary_artifact",
    jsonSchema: sourceSummaryArtifactJsonSchema,
    maxOutputTokens: 2500,
  });

  return {
    chunkStrategy: "staged" as const,
    content,
  };
}

export async function summarizeSource(workspaceRoot: string, sourceId: string) {
  const startedAtMs = Date.now();
  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } = await getWorkspaceContext(
    workspaceRoot,
  );
  const source = await db.query.sourceDocuments.findFirst({
    where: and(eq(sourceDocuments.workspaceId, workspace.id), eq(sourceDocuments.id, sourceId)),
  });

  if (!source) {
    throw new AppError("Source not found.", 404, "source_not_found");
  }

  if (source.status !== "processed" || !source.rawTextExtracted.trim()) {
    throw new AppError(
      "Only processed normalized sources can be summarized.",
      409,
      "source_not_ready_for_summary",
    );
  }

  const jobRun = await createJobRun({
    workspaceRoot: normalizedWorkspaceRoot,
    sourceDocumentId: sourceId,
    jobType: SOURCE_SUMMARY_JOB_TYPE,
    status: "running",
    retryCount: 0,
    metadataJson: {
      sourceId,
      sourceTitle: source.title,
    },
  });

  await db
    .update(sourceDocuments)
    .set({
      summaryStatus: "running",
      summaryError: null,
      updatedAt: new Date(),
    })
    .where(and(eq(sourceDocuments.workspaceId, workspace.id), eq(sourceDocuments.id, sourceId)));

  let promptHash: string | null = null;
  let provider: string | null = null;
  let model: string | null = null;

  try {
    const promptTemplate = await readWorkspacePromptTemplate(
      normalizedWorkspaceRoot,
      "source_summarizer.md",
    );
    promptHash = hashPromptTemplate(promptTemplate);

    const providerConfig = await getActiveLlmProviderConfig(normalizedWorkspaceRoot);
    provider = providerConfig.provider;
    model = providerConfig.model;

    const chunks = await db.query.sourceChunks.findMany({
      where: eq(sourceChunks.documentId, sourceId),
      orderBy: (table, { asc }) => [asc(table.chunkIndex)],
    });
    const compiled = await compileSummaryArtifact({
      systemPrompt: promptTemplate,
      providerConfig,
      source: {
        id: source.id,
        title: source.title,
        sourceType: source.sourceType,
        tokenEstimate: source.tokenEstimate,
        normalizedPath: source.normalizedPath,
        rawTextExtracted: source.rawTextExtracted,
      },
      chunks,
    });
    const generatedAt = new Date();
    const artifact = sourceSummaryArtifactSchema.parse({
      schemaVersion: SOURCE_SUMMARY_ARTIFACT_VERSION,
      sourceId: source.id,
      sourceTitle: source.title,
      sourceType: source.sourceType,
      generatedAt: generatedAt.toISOString(),
      provider: providerConfig.provider,
      model: providerConfig.model,
      promptHash,
      chunkStrategy: compiled.chunkStrategy,
      content: compiled.content,
    });
    const markdown = buildSummaryMarkdown(artifact);
    const artifactPaths = await writeSourceSummaryArtifacts({
      workspaceRoot: normalizedWorkspaceRoot,
      sourceId: source.id,
      sourceSlug: slugifyTitle(source.title) || "source-summary",
      markdown,
      artifact,
    });

    await persistStructuredExtractions({
      workspaceId: workspace.id,
      sourceDocumentId: source.id,
      entities: artifact.content.keyEntities,
      concepts: artifact.content.keyConcepts,
      majorClaims: artifact.content.majorClaims,
      createdAt: generatedAt,
      workspaceRoot: normalizedWorkspaceRoot,
    });

    await db
      .update(sourceDocuments)
      .set({
        summaryStatus: "completed",
        summaryMarkdownPath: artifactPaths.markdownPath,
        summaryJsonPath: artifactPaths.jsonPath,
        summaryPromptHash: promptHash,
        summaryProvider: providerConfig.provider,
        summaryModel: providerConfig.model,
        summaryUpdatedAt: generatedAt,
        summaryError: null,
        summaryMetadataJson: {
          chunkStrategy: artifact.chunkStrategy,
          entityCount: artifact.content.keyEntities.length,
          conceptCount: artifact.content.keyConcepts.length,
          claimCount: artifact.content.majorClaims.length,
          openQuestionCount: artifact.content.openQuestions.length,
          pageHintCount: artifact.content.possibleTargetPageHints.length,
        },
        updatedAt: generatedAt,
      })
      .where(and(eq(sourceDocuments.workspaceId, workspace.id), eq(sourceDocuments.id, sourceId)));

    await completeJobRun({
      workspaceRoot: normalizedWorkspaceRoot,
      jobRunId: jobRun.id,
      status: "completed",
      durationMs: Date.now() - startedAtMs,
      metadataJson: {
        sourceId,
        promptHash,
        provider: providerConfig.provider,
        model: providerConfig.model,
        markdownPath: artifactPaths.markdownPath,
        jsonPath: artifactPaths.jsonPath,
        chunkStrategy: artifact.chunkStrategy,
      },
    });

    logger.info(
      {
        sourceId,
        provider: providerConfig.provider,
        model: providerConfig.model,
        promptHash,
      },
      "Source summarized.",
    );
  } catch (error) {
    const failureMessage =
      error instanceof Error ? error.message : "Unknown source summarization failure.";
    const failedAt = new Date();

    await db
      .update(sourceDocuments)
      .set({
        summaryStatus: "failed",
        summaryPromptHash: promptHash,
        summaryProvider: provider,
        summaryModel: model,
        summaryError: failureMessage,
        updatedAt: failedAt,
      })
      .where(and(eq(sourceDocuments.workspaceId, workspace.id), eq(sourceDocuments.id, sourceId)));

    await completeJobRun({
      workspaceRoot: normalizedWorkspaceRoot,
      jobRunId: jobRun.id,
      status: "failed",
      durationMs: Date.now() - startedAtMs,
      metadataJson: {
        sourceId,
        promptHash,
        provider,
        model,
        error: failureMessage,
      },
    });

    logger.error(
      {
        error,
        sourceId,
        provider,
        model,
      },
      "Source summarization failed.",
    );

    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError(
      failureMessage,
      500,
      "source_summary_failed",
      error,
    );
  }

  return getSourceDetail(normalizedWorkspaceRoot, sourceId);
}
