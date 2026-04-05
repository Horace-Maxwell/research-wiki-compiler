import crypto from "node:crypto";

import { and, eq, inArray } from "drizzle-orm";

import type { AnswerArtifact, AnswerArtifactMetadata, AnswerCitation, AnswererOutput } from "@/lib/contracts/answer";
import {
  answerArtifactMetadataSchema,
  answerArtifactSchema,
  answererOutputJsonSchema,
  answererOutputSchema,
} from "@/lib/contracts/answer";
import { ANSWER_JOB_TYPE } from "@/lib/constants";
import { answerArtifacts, wikiPages } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { completeJobRun, createJobRun } from "@/server/services/job-run-service";
import {
  generateStructuredObject,
  getActiveLlmProviderConfig,
} from "@/server/services/llm-provider-service";
import {
  extractPromptVersion,
  hashPromptTemplate,
  readWorkspacePromptTemplate,
} from "@/server/services/prompt-service";
import {
  type RetrievalResult,
  retrieveAskContext,
} from "@/server/services/retrieval-service";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";

function createAnswerArtifactId(workspaceId: string, question: string) {
  return `ans_${crypto
    .createHash("sha1")
    .update(`${workspaceId}:${question}:${Date.now()}:${crypto.randomUUID()}`)
    .digest("hex")
    .slice(0, 32)}`;
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function buildIngestRecommendations(question: string) {
  const normalized = question.toLowerCase();

  if (normalized.includes("when") || normalized.includes("timeline")) {
    return [
      "dated primary sources or changelogs",
      "timeline-oriented research notes",
      "summary sources that connect events to existing wiki pages",
    ];
  }

  if (normalized.includes("who") || normalized.includes("company") || normalized.includes("person")) {
    return [
      "entity-focused notes or profiles",
      "official documentation or primary bios",
      "recent reporting tied to the named entities",
    ];
  }

  return [
    "primary sources directly about this question",
    "source summaries tied to the relevant topic or concept pages",
    "recent articles or notes with explicit claims and citations",
  ];
}

function buildDeterministicInsufficientAnswer(
  question: string,
  retrieval: RetrievalResult,
): {
  shortAnswer: string;
  detailedAnswer: string;
  citations: AnswerCitation[];
  basedOnPageIds: string[];
  caveats: string[];
  followUpQuestions: string[];
  metadata: AnswerArtifactMetadata;
} {
  const recommendations = buildIngestRecommendations(question);

  return {
    shortAnswer:
      "The compiled wiki does not yet contain enough grounded information to answer this confidently.",
    detailedAnswer: [
      "I could not ground a confident answer from the current workspace.",
      "",
      "Retrieval checked wiki pages first, then source summaries, then raw chunks. The available evidence was too sparse or too indirect to support a reliable synthesis.",
      "",
      "Recommended next inputs:",
      ...recommendations.map((item) => `- ${item}`),
    ].join("\n"),
    citations: [],
    basedOnPageIds: [],
    caveats: [
      "No sufficiently grounded compiled knowledge was found for this question.",
      "A stronger answer will require ingesting more relevant sources or updating the wiki coverage.",
    ],
    followUpQuestions: [
      "What source types would best close this gap?",
      "Which wiki page should exist before this question can be answered well?",
    ],
    metadata: answerArtifactMetadataSchema.parse({
      provider: null,
      model: null,
      promptHash: null,
      promptVersion: null,
      insufficientKnowledge: true,
      recommendedSourceTypes: recommendations,
      retrieval: {
        order: retrieval.policy.order,
        wikiPageIds: retrieval.wikiPages.map((page) => page.pageId),
        sourceIds: retrieval.sourceSummaries.map((summary) => summary.sourceId),
        chunkIds: retrieval.rawChunks.map((chunk) => chunk.chunkId),
        usedSummaryFallback: retrieval.policy.usedSummaryFallback,
        usedChunkFallback: retrieval.policy.usedChunkFallback,
      },
    }),
  };
}

function buildAnswerPrompt(params: {
  question: string;
  retrieval: RetrievalResult;
}) {
  const evidenceJson = {
    retrievalOrder: params.retrieval.policy.order,
    policyState: params.retrieval.policy,
    wikiPages: params.retrieval.wikiPages.map((page) => ({
      referenceId: page.referenceId,
      pageId: page.pageId,
      title: page.title,
      type: page.type,
      path: page.path,
      score: page.score,
      sourceRefs: page.sourceRefs,
      excerpt: page.excerpt,
    })),
    sourceSummaries: params.retrieval.sourceSummaries.map((summary) => ({
      referenceId: summary.referenceId,
      sourceId: summary.sourceId,
      sourceTitle: summary.sourceTitle,
      score: summary.score,
      conciseSummary: summary.conciseSummary,
      claims: summary.claims,
      normalizedPath: summary.normalizedPath,
    })),
    rawChunks: params.retrieval.rawChunks.map((chunk) => ({
      referenceId: chunk.referenceId,
      chunkId: chunk.chunkId,
      sourceId: chunk.sourceId,
      sourceTitle: chunk.sourceTitle,
      chunkIndex: chunk.chunkIndex,
      score: chunk.score,
      content: chunk.content,
      offsets:
        chunk.startOffset !== null && chunk.endOffset !== null
          ? `${chunk.startOffset}-${chunk.endOffset}`
          : null,
    })),
  };

  return [
    "task_mode: grounded_answer",
    `question: ${params.question}`,
    "",
    "evidence_json:",
    JSON.stringify(evidenceJson, null, 2),
  ].join("\n");
}

function mapEvidenceCitations(params: {
  retrieval: RetrievalResult;
  answererOutput: AnswererOutput;
}) {
  const evidenceMap = new Map<
    string,
    {
      layer: AnswerCitation["layer"];
      pageId: string | null;
      pageTitle: string | null;
      pagePath: string | null;
      sourceId: string | null;
      sourceTitle: string | null;
      chunkId: string | null;
      locator: string | null;
    }
  >();

  params.retrieval.wikiPages.forEach((page) => {
    evidenceMap.set(page.referenceId, {
      layer: "wiki_page",
      pageId: page.pageId,
      pageTitle: page.title,
      pagePath: page.path,
      sourceId: null,
      sourceTitle: null,
      chunkId: null,
      locator: page.path,
    });
  });
  params.retrieval.sourceSummaries.forEach((summary) => {
    evidenceMap.set(summary.referenceId, {
      layer: "source_summary",
      pageId: null,
      pageTitle: null,
      pagePath: null,
      sourceId: summary.sourceId,
      sourceTitle: summary.sourceTitle,
      chunkId: null,
      locator: summary.normalizedPath,
    });
  });
  params.retrieval.rawChunks.forEach((chunk) => {
    evidenceMap.set(chunk.referenceId, {
      layer: "raw_chunk",
      pageId: null,
      pageTitle: null,
      pagePath: null,
      sourceId: chunk.sourceId,
      sourceTitle: chunk.sourceTitle,
      chunkId: chunk.chunkId,
      locator:
        chunk.startOffset !== null && chunk.endOffset !== null
          ? `${chunk.startOffset}-${chunk.endOffset}`
          : null,
    });
  });

  return params.answererOutput.citations.map((citation) => {
    const evidence = evidenceMap.get(citation.referenceId);

    if (!evidence) {
      throw new AppError(
        `Answer output referenced unknown evidence id ${citation.referenceId}.`,
        502,
        "invalid_answerer_output",
      );
    }

    return {
      referenceId: citation.referenceId,
      layer: evidence.layer,
      pageId: evidence.pageId,
      pageTitle: evidence.pageTitle,
      pagePath: evidence.pagePath,
      sourceId: evidence.sourceId,
      sourceTitle: evidence.sourceTitle,
      chunkId: evidence.chunkId,
      locator: evidence.locator,
      note: citation.note,
    } satisfies AnswerCitation;
  });
}

async function resolvePagesByIds(
  workspaceRoot: string,
  pageIds: string[],
) {
  if (pageIds.length === 0) {
    return [];
  }

  const { db } = await getWorkspaceContext(workspaceRoot);
  const rows = await db.query.wikiPages.findMany({
    where: inArray(wikiPages.id, pageIds),
  });
  const rowMap = new Map(rows.map((row) => [row.id, row]));

  return pageIds
    .map((pageId) => {
      const row = rowMap.get(pageId);

      if (!row) {
        return null;
      }

      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        path: row.path,
        type: row.type,
        href: `/wiki?${new URLSearchParams({
          workspaceRoot,
          pageId: row.id,
        }).toString()}`,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));
}

async function persistAnswerArtifact(params: {
  workspaceRoot: string;
  question: string;
  shortAnswer: string;
  detailedAnswer: string;
  citations: AnswerCitation[];
  basedOnPageIds: string[];
  caveats: string[];
  followUpQuestions: string[];
  metadata: AnswerArtifactMetadata;
}) {
  const { db, workspace } = await getWorkspaceContext(params.workspaceRoot);
  const now = new Date();
  const id = createAnswerArtifactId(workspace.id, params.question);

  await db.insert(answerArtifacts).values({
    id,
    workspaceId: workspace.id,
    question: params.question,
    shortAnswer: params.shortAnswer,
    detailedAnswer: params.detailedAnswer,
    citationsJson: params.citations,
    basedOnPagesJson: params.basedOnPageIds,
    caveatsJson: params.caveats,
    followUpQuestionsJson: params.followUpQuestions,
    metadataJson: params.metadata,
    archivedPageId: null,
    createdAt: now,
    updatedAt: now,
  });

  return id;
}

function validateAnswererOutput(params: {
  output: AnswererOutput;
  retrieval: RetrievalResult;
}) {
  const retrievedPageIds = new Set(params.retrieval.wikiPages.map((page) => page.pageId));

  for (const pageId of params.output.basedOnPageIds) {
    if (!retrievedPageIds.has(pageId)) {
      throw new AppError(
        `Answer output referenced unknown based-on page id ${pageId}.`,
        502,
        "invalid_answerer_output",
      );
    }
  }

  if (!params.output.insufficientKnowledge && params.retrieval.wikiPages.length > 0 && params.output.citations.length === 0) {
    throw new AppError(
      "Answer output must cite the provided evidence.",
      502,
      "invalid_answerer_output",
    );
  }
}

async function hydrateAnswerArtifact(params: {
  workspaceRoot: string;
  row: typeof answerArtifacts.$inferSelect;
}) {
  const basedOnPageIds = params.row.basedOnPagesJson;
  const basedOnPages = await resolvePagesByIds(params.workspaceRoot, basedOnPageIds);
  const archivedPage = params.row.archivedPageId
    ? (await resolvePagesByIds(params.workspaceRoot, [params.row.archivedPageId]))[0] ?? null
    : null;

  return answerArtifactSchema.parse({
    id: params.row.id,
    question: params.row.question,
    shortAnswer: params.row.shortAnswer,
    detailedAnswer: params.row.detailedAnswer,
    citations: params.row.citationsJson,
    basedOnPageIds,
    basedOnPages,
    caveats: params.row.caveatsJson,
    followUpQuestions: params.row.followUpQuestionsJson,
    archivedPageId: params.row.archivedPageId,
    archivedPage,
    metadata: params.row.metadataJson,
    createdAt: params.row.createdAt.toISOString(),
    updatedAt: params.row.updatedAt.toISOString(),
  });
}

export async function getAnswerArtifact(
  workspaceRoot: string,
  answerId: string,
): Promise<AnswerArtifact> {
  const { db, workspace } = await getWorkspaceContext(workspaceRoot);
  const row = await db.query.answerArtifacts.findFirst({
    where: and(eq(answerArtifacts.workspaceId, workspace.id), eq(answerArtifacts.id, answerId)),
  });

  if (!row) {
    throw new AppError("Answer artifact not found.", 404, "answer_artifact_not_found");
  }

  return hydrateAnswerArtifact({
    workspaceRoot,
    row,
  });
}

export async function answerQuestion(
  workspaceRoot: string,
  question: string,
): Promise<AnswerArtifact> {
  const retrieval = await retrieveAskContext(workspaceRoot, question);
  const insufficientDeterministic =
    retrieval.wikiPages.length === 0 &&
    retrieval.sourceSummaries.length === 0 &&
    retrieval.rawChunks.length === 0;
  const startedAtMs = Date.now();

  if (insufficientDeterministic) {
    const answer = buildDeterministicInsufficientAnswer(question, retrieval);
    const artifactId = await persistAnswerArtifact({
      workspaceRoot,
      question,
      shortAnswer: answer.shortAnswer,
      detailedAnswer: answer.detailedAnswer,
      citations: answer.citations,
      basedOnPageIds: answer.basedOnPageIds,
      caveats: answer.caveats,
      followUpQuestions: answer.followUpQuestions,
      metadata: answer.metadata,
    });

    const jobRun = await createJobRun({
      workspaceRoot,
      sourceDocumentId: null,
      jobType: ANSWER_JOB_TYPE,
      status: "completed",
      metadataJson: {
        answerId: artifactId,
        provider: null,
        model: null,
        promptHash: null,
        promptVersion: null,
        insufficientKnowledge: true,
      },
    });

    await completeJobRun({
      workspaceRoot,
      jobRunId: jobRun.id,
      status: "completed",
      durationMs: Date.now() - startedAtMs,
      metadataJson: {
        answerId: artifactId,
        provider: null,
        model: null,
        promptHash: null,
        promptVersion: null,
        insufficientKnowledge: true,
      },
    });

    return getAnswerArtifact(workspaceRoot, artifactId);
  }

  const promptTemplate = await readWorkspacePromptTemplate(workspaceRoot, "answerer.md");
  const promptHash = hashPromptTemplate(promptTemplate);
  const promptVersion = extractPromptVersion(promptTemplate);
  const providerConfig = await getActiveLlmProviderConfig(workspaceRoot);
  const jobRun = await createJobRun({
    workspaceRoot,
    sourceDocumentId: null,
    jobType: ANSWER_JOB_TYPE,
    status: "running",
    metadataJson: {
      provider: providerConfig.provider,
      model: providerConfig.model,
      promptHash,
      promptVersion,
    },
  });

  try {
    const answererOutput = await generateStructuredObject({
      config: providerConfig,
      systemPrompt: promptTemplate,
      userPrompt: buildAnswerPrompt({
        question,
        retrieval,
      }),
      schema: answererOutputSchema,
      schemaName: "emit_grounded_answer_artifact",
      jsonSchema: answererOutputJsonSchema,
      maxOutputTokens: 2600,
    });

    validateAnswererOutput({
      output: answererOutput,
      retrieval,
    });

    const citations = mapEvidenceCitations({
      retrieval,
      answererOutput,
    });
    const metadata = answerArtifactMetadataSchema.parse({
      provider: providerConfig.provider,
      model: providerConfig.model,
      promptHash,
      promptVersion,
      insufficientKnowledge: answererOutput.insufficientKnowledge,
      recommendedSourceTypes:
        answererOutput.insufficientKnowledge && answererOutput.recommendedSourceTypes.length === 0
          ? buildIngestRecommendations(question)
          : answererOutput.recommendedSourceTypes,
      retrieval: {
        order: retrieval.policy.order,
        wikiPageIds: retrieval.wikiPages.map((page) => page.pageId),
        sourceIds: uniqueValues([
          ...retrieval.sourceSummaries.map((summary) => summary.sourceId),
          ...retrieval.rawChunks.map((chunk) => chunk.sourceId),
        ]),
        chunkIds: retrieval.rawChunks.map((chunk) => chunk.chunkId),
        usedSummaryFallback: retrieval.policy.usedSummaryFallback,
        usedChunkFallback: retrieval.policy.usedChunkFallback,
      },
    });
    const artifactId = await persistAnswerArtifact({
      workspaceRoot,
      question,
      shortAnswer: answererOutput.shortAnswer,
      detailedAnswer: answererOutput.detailedAnswer,
      citations,
      basedOnPageIds: uniqueValues(answererOutput.basedOnPageIds),
      caveats: answererOutput.caveats,
      followUpQuestions: answererOutput.followUpQuestions,
      metadata,
    });

    await completeJobRun({
      workspaceRoot,
      jobRunId: jobRun.id,
      status: "completed",
      durationMs: Date.now() - startedAtMs,
      metadataJson: {
        answerId: artifactId,
        provider: providerConfig.provider,
        model: providerConfig.model,
        promptHash,
        promptVersion,
        insufficientKnowledge: metadata.insufficientKnowledge,
      },
    });

    logger.info(
      {
        question,
        provider: providerConfig.provider,
        model: providerConfig.model,
        promptHash,
      },
      "Question answered.",
    );

    return getAnswerArtifact(workspaceRoot, artifactId);
  } catch (error) {
    await completeJobRun({
      workspaceRoot,
      jobRunId: jobRun.id,
      status: "failed",
      durationMs: Date.now() - startedAtMs,
      metadataJson: {
        provider: providerConfig.provider,
        model: providerConfig.model,
        promptHash,
        promptVersion,
        error: error instanceof Error ? error.message : "Answer generation failed.",
      },
    });

    logger.error(
      {
        question,
        provider: providerConfig.provider,
        model: providerConfig.model,
        promptHash,
        error,
      },
      "Answer generation failed.",
    );

    throw error;
  }
}
