import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";

import type {
  CandidateRecallPage,
  PatchPlannerDraftProposal,
  ProposedPage,
  SupportingClaim,
} from "@/lib/contracts/review";
import {
  patchPlannerOutputJsonSchema,
  patchPlannerOutputSchema,
  reviewProposalArtifactSchema,
} from "@/lib/contracts/review";
import {
  CANDIDATE_PAGE_RECALL_JOB_TYPE,
  PATCH_PLANNER_JOB_TYPE,
  PATCH_PROPOSAL_ARTIFACT_VERSION,
  WIKI_PAGE_TYPE_DIRECTORY_MAP,
} from "@/lib/constants";
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
  extractPromptVersion,
  hashPromptTemplate,
  readWorkspacePromptTemplate,
} from "@/server/services/prompt-service";
import { getSourceDetail } from "@/server/services/source-service";
import { recallCandidatePages } from "@/server/services/candidate-page-recall-service";
import {
  wikiPages,
  patchHunks,
  patchProposals,
} from "@/server/db/schema";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";
import {
  removePatchProposalArtifacts,
  writePatchProposalArtifacts,
} from "@/server/services/patch-proposal-file-service";
import { buildReviewProposalMarkdown } from "@/server/services/review-artifact-service";
import { readWikiMarkdownFile } from "@/server/services/wiki-file-service";
import { parseWikiDocument } from "@/server/services/wiki-frontmatter-service";

function createPatchProposalId(
  workspaceId: string,
  sourceDocumentId: string,
  proposalType: string,
  targetKey: string,
  title: string,
) {
  return `prop_${crypto
    .createHash("sha1")
    .update(`${workspaceId}:${sourceDocumentId}:${proposalType}:${targetKey}:${title}`)
    .digest("hex")
    .slice(0, 32)}`;
}

function createPatchHunkId(proposalId: string, index: number, sectionHeading: string | null) {
  return `hunk_${crypto
    .createHash("sha1")
    .update(`${proposalId}:${index}:${sectionHeading ?? "none"}`)
    .digest("hex")
    .slice(0, 32)}`;
}

function extractHeadings(markdown: string) {
  const headings = markdown
    .split("\n")
    .map((line) => line.match(/^#{2,3}\s+(.+)$/)?.[1]?.trim() ?? null)
    .filter((value): value is string => Boolean(value));

  return [...new Set(headings)];
}

function buildExcerpt(markdown: string, maxLength = 1200) {
  const normalized = markdown.trim().replace(/\n{3,}/g, "\n\n");

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function buildSuggestedPath(pageType: NonNullable<ProposedPage>["pageType"], title: string) {
  const slug = slugifyTitle(title) || "untitled";
  const directory = WIKI_PAGE_TYPE_DIRECTORY_MAP[pageType];

  return directory ? `wiki/${directory}/${slug}.md` : `wiki/${slug}.md`;
}

function buildPatchPlannerUserPrompt(params: {
  source: Awaited<ReturnType<typeof getSourceDetail>>;
  recall: Awaited<ReturnType<typeof recallCandidatePages>>;
  candidatePages: Array<{
    pageId: string;
    title: string;
    type: string;
    path: string;
    aliases: string[];
    tags: string[];
    headings: string[];
    excerpt: string;
    recallScore: number;
    recallReasons: CandidateRecallPage["reasons"];
  }>;
  unmatchedHints: Array<{
    title: string;
    pageType: string;
    rationale: string;
  }>;
}) {
  const artifact = params.source.summary.artifact;

  if (!artifact) {
    throw new AppError(
      "Source summary artifact is required before patch planning.",
      400,
      "source_summary_required",
    );
  }

  const serializedContext = {
    source: {
      id: params.source.id,
      title: params.source.title,
      slug: params.source.slug,
      sourceType: params.source.sourceType,
      summary: artifact.content.conciseSummary,
      entities: artifact.content.keyEntities,
      concepts: artifact.content.keyConcepts,
      majorClaims: artifact.content.majorClaims,
      openQuestions: artifact.content.openQuestions,
    },
    candidateRecall: {
      candidates: params.recall.candidates,
      unmatchedHints: params.unmatchedHints,
    },
    candidatePageContext: params.candidatePages,
    outputRequirements: {
      rule: "Use only exact candidate page ids from candidateRecall.candidates when referring to existing pages.",
      supportingClaimRule:
        "supportingClaimTexts must reuse exact text from source.majorClaims[].text when possible.",
      createPageRule:
        "Use proposalType=create_page only when no current page adequately captures the knowledge or when a distinct new durable page is warranted.",
    },
  };

  return [
    "task_mode: patch_planning",
    "",
    "planning_context_json:",
    JSON.stringify(serializedContext, null, 2),
  ].join("\n");
}

function getPlannerTargetKey(draft: PatchPlannerDraftProposal) {
  if (draft.primaryTargetPageId) {
    return draft.primaryTargetPageId;
  }

  if (draft.proposedPage) {
    return `${draft.proposedPage.pageType}:${draft.proposedPage.title}`;
  }

  return draft.title;
}

function validatePlannerDraft(params: {
  draft: PatchPlannerDraftProposal;
  candidateIds: Set<string>;
  claimBank: Set<string>;
}) {
  const { draft } = params;

  if (draft.proposalType === "create_page" && !draft.proposedPage) {
    throw new AppError(
      `Planner output for "${draft.title}" must include proposedPage for create_page proposals.`,
      502,
      "invalid_patch_planner_output",
    );
  }

  if (draft.proposalType !== "create_page" && !draft.primaryTargetPageId) {
    throw new AppError(
      `Planner output for "${draft.title}" must include primaryTargetPageId for existing-page proposals.`,
      502,
      "invalid_patch_planner_output",
    );
  }

  const referencedPageIds = [
    draft.primaryTargetPageId,
    ...draft.relatedTargetPageIds,
  ].filter((value): value is string => Boolean(value));

  for (const pageId of referencedPageIds) {
    if (!params.candidateIds.has(pageId)) {
      throw new AppError(
        `Planner output for "${draft.title}" referenced unknown candidate page id ${pageId}.`,
        502,
        "invalid_patch_planner_output",
      );
    }
  }

  for (const claimText of draft.supportingClaimTexts) {
    if (!params.claimBank.has(claimText)) {
      throw new AppError(
        `Planner output for "${draft.title}" referenced an unknown supporting claim.`,
        502,
        "invalid_patch_planner_output",
      );
    }
  }
}

async function deleteExistingProposalsForSource(workspaceRoot: string, sourceId: string) {
  const { db, workspace } = await getWorkspaceContext(workspaceRoot);
  const existing = await db.query.patchProposals.findMany({
    where: and(
      eq(patchProposals.workspaceId, workspace.id),
      eq(patchProposals.sourceDocumentId, sourceId),
    ),
  });

  for (const proposal of existing) {
    await removePatchProposalArtifacts({
      workspaceRoot,
      markdownPath: proposal.artifactMarkdownPath,
      jsonPath: proposal.artifactJsonPath,
    });
  }

  if (existing.length > 0) {
    await db.delete(patchProposals).where(
      and(
        eq(patchProposals.workspaceId, workspace.id),
        eq(patchProposals.sourceDocumentId, sourceId),
      ),
    );
  }
}

export async function planPatchProposalsForSource(
  workspaceRoot: string,
  sourceId: string,
) {
  const source = await getSourceDetail(workspaceRoot, sourceId);

  if (source.summary.status !== "completed" || !source.summary.artifact) {
    throw new AppError(
      "Only summarized sources can generate patch proposals.",
      400,
      "source_summary_required",
    );
  }

  const recallJobRun = await createJobRun({
    workspaceRoot,
    sourceDocumentId: sourceId,
    jobType: CANDIDATE_PAGE_RECALL_JOB_TYPE,
    status: "running",
    metadataJson: {
      sourceId,
    },
  });
  const recallStartedAt = Date.now();

  let recallResult: Awaited<ReturnType<typeof recallCandidatePages>> | null = null;

  try {
    recallResult = await recallCandidatePages(workspaceRoot, sourceId);

    await completeJobRun({
      workspaceRoot,
      jobRunId: recallJobRun.id,
      status: "completed",
      durationMs: Date.now() - recallStartedAt,
      metadataJson: {
        sourceId,
        candidateCount: recallResult.candidates.length,
      },
    });
  } catch (error) {
    await completeJobRun({
      workspaceRoot,
      jobRunId: recallJobRun.id,
      status: "failed",
      durationMs: Date.now() - recallStartedAt,
      metadataJson: {
        sourceId,
        error: error instanceof Error ? error.message : "Unknown recall failure.",
      },
    });

    throw error;
  }

  const providerConfig = await getActiveLlmProviderConfig(workspaceRoot);
  const plannerPrompt = await readWorkspacePromptTemplate(workspaceRoot, "patch_planner.md");
  const promptHash = hashPromptTemplate(plannerPrompt);
  const promptVersion = extractPromptVersion(plannerPrompt);
  const { workspace, workspaceRoot: normalizedWorkspaceRoot, db } =
    await getWorkspaceContext(workspaceRoot);
  const recall = recallResult;

  if (!recall) {
    throw new AppError(
      "Candidate recall did not complete successfully.",
      500,
      "candidate_recall_missing",
    );
  }

  const candidatePages = await Promise.all(
    recall.candidates.map(async (candidate) => {
      const rawContent = await readWikiMarkdownFile(normalizedWorkspaceRoot, candidate.path);
      const parsed = parseWikiDocument({
        rawContent,
        relativePath: candidate.path,
      });
      const dbPage = await db.query.wikiPages.findFirst({
        where: and(eq(wikiPages.workspaceId, workspace.id), eq(wikiPages.id, candidate.pageId)),
      });

      return {
        pageId: candidate.pageId,
        title: candidate.title,
        type: candidate.type,
        path: candidate.path,
        aliases: dbPage?.aliasesJson ?? [],
        tags: dbPage?.tagsJson ?? [],
        headings: extractHeadings(parsed.body),
        excerpt: buildExcerpt(parsed.body),
        recallScore: candidate.score,
        recallReasons: candidate.reasons,
      };
    }),
  );
  const matchedCandidateTitles = new Set(recall.candidates.map((candidate) => candidate.title.toLowerCase()));
  const unmatchedHints = source.summary.artifact.content.possibleTargetPageHints
    .filter((hint) => !matchedCandidateTitles.has(hint.title.toLowerCase()))
    .map((hint) => ({
      title: hint.title,
      pageType: hint.pageType,
      rationale: hint.rationale,
    }));
  const planningJobRun = await createJobRun({
    workspaceRoot,
    sourceDocumentId: sourceId,
    jobType: PATCH_PLANNER_JOB_TYPE,
    status: "running",
    retryCount: 0,
    metadataJson: {
      provider: providerConfig.provider,
      model: providerConfig.model,
      promptHash,
      promptVersion,
    },
  });
  const planningStartedAt = Date.now();

  try {
    const plannerOutput = await generateStructuredObject({
      config: providerConfig,
      systemPrompt: plannerPrompt,
      userPrompt: buildPatchPlannerUserPrompt({
        source,
        recall,
        candidatePages,
        unmatchedHints,
      }),
      schema: patchPlannerOutputSchema,
      schemaName: "emit_patch_plan",
      jsonSchema: patchPlannerOutputJsonSchema,
      maxOutputTokens: 2800,
    });
    const candidateMap = new Map(recall.candidates.map((candidate) => [candidate.pageId, candidate]));
    const claimMap = new Map(
      source.summary.artifact.content.majorClaims.map((claim) => [claim.text, claim]),
    );
    const claimBank = new Set(claimMap.keys());
    const candidateIds = new Set(candidateMap.keys());

    for (const draft of plannerOutput.proposals) {
      validatePlannerDraft({
        draft,
        candidateIds,
        claimBank,
      });
    }

    await deleteExistingProposalsForSource(normalizedWorkspaceRoot, sourceId);

    const createdAt = new Date();
    const proposalIds: string[] = [];

    for (const draft of plannerOutput.proposals) {
      const targetPages = [
        draft.primaryTargetPageId
          ? {
              ...candidateMap.get(draft.primaryTargetPageId)!,
              relation: "primary" as const,
            }
          : null,
        ...draft.relatedTargetPageIds
          .filter((pageId) => pageId !== draft.primaryTargetPageId)
          .map((pageId) => ({
            ...candidateMap.get(pageId)!,
            relation: "related" as const,
          })),
      ].filter((value): value is NonNullable<typeof value> => Boolean(value));
      const supportingClaims = draft.supportingClaimTexts.map((claimText) => {
        const claim = claimMap.get(claimText)!;

        return {
          text: claim.text,
          polarity: claim.polarity,
          evidenceStrength: claim.evidenceStrength,
          rationale: claim.rationale,
          citations: [
            {
              sourceId: source.id,
              note: `Source summary claim: ${claim.text}`,
            },
          ],
        } satisfies SupportingClaim;
      });
      const citations =
        supportingClaims.length > 0
          ? supportingClaims.flatMap((claim) => claim.citations)
          : [
              {
                sourceId: source.id,
                note: "Derived from the source summary artifact.",
              },
            ];
      const proposedPage = draft.proposedPage
        ? {
            title: draft.proposedPage.title,
            pageType: draft.proposedPage.pageType,
            suggestedPath: buildSuggestedPath(draft.proposedPage.pageType, draft.proposedPage.title),
            rationale: draft.proposedPage.rationale,
          }
        : null;
      const proposalId = createPatchProposalId(
        workspace.id,
        source.id,
        draft.proposalType,
        getPlannerTargetKey(draft),
        draft.title,
      );
      const artifact = reviewProposalArtifactSchema.parse({
        schemaVersion: PATCH_PROPOSAL_ARTIFACT_VERSION,
        proposalId,
        sourceId: source.id,
        sourceTitle: source.title,
        status: "pending",
        proposalType: draft.proposalType,
        title: draft.title,
        generatedAt: createdAt.toISOString(),
        provider: providerConfig.provider,
        model: providerConfig.model,
        promptHash,
        promptVersion,
        riskLevel: draft.riskLevel,
        patchGoal: draft.patchGoal,
        rationale: draft.rationale,
        targetPages: targetPages.map((page) => ({
          pageId: page.pageId,
          title: page.title,
          slug: page.slug,
          type: page.type,
          path: page.path,
          relation: page.relation,
          recallScore: page.score,
          recallReasons: page.reasons,
        })),
        proposedPage,
        affectedSections: draft.affectedSections,
        supportingClaims,
        citations,
        conflictNotes: draft.conflictNotes,
        candidateRecall: {
          primaryCandidates: recall.candidates,
          omittedCandidateCount: recall.omittedCandidateCount,
        },
        hunks: draft.hunks.map((hunk) => ({
          sectionHeading: hunk.sectionHeading,
          operation: hunk.operation,
          beforeText: hunk.beforeText,
          afterText: hunk.afterText,
          citations,
        })),
        review: {
          reviewedAt: null,
          note: null,
          editedBeforeApply: false,
        },
        applyResult: {
          appliedAt: null,
          success: null,
          affectedPaths: [],
          appliedPageId: null,
          git: null,
          error: null,
        },
      });
      const markdown = buildReviewProposalMarkdown(artifact);
      const artifactPaths = await writePatchProposalArtifacts({
        workspaceRoot: normalizedWorkspaceRoot,
        sourceSlug: source.slug,
        proposalId,
        markdown,
        artifact,
      });

      await db.insert(patchProposals).values({
        id: proposalId,
        workspaceId: workspace.id,
        sourceDocumentId: source.id,
        targetPageId: draft.primaryTargetPageId,
        title: draft.title,
        status: "pending",
        proposalType: draft.proposalType,
        riskLevel: draft.riskLevel,
        promptVersion,
        promptHash,
        provider: providerConfig.provider,
        model: providerConfig.model,
        rationale: draft.rationale,
        targetPageTitle: targetPages.find((page) => page.relation === "primary")?.title ?? null,
        proposedPageTitle: proposedPage?.title ?? null,
        artifactMarkdownPath: artifactPaths.markdownPath,
        artifactJsonPath: artifactPaths.jsonPath,
        affectedSectionsJson: draft.affectedSections,
        createdAt,
        updatedAt: createdAt,
      });

      if (artifact.hunks.length > 0) {
        await db.insert(patchHunks).values(
          artifact.hunks.map((hunk, index) => ({
            id: createPatchHunkId(proposalId, index, hunk.sectionHeading),
            proposalId,
            sectionHeading: hunk.sectionHeading,
            operation: hunk.operation,
            beforeText: hunk.beforeText,
            afterText: hunk.afterText,
            citationsJson: hunk.citations,
            createdAt,
          })),
        );
      }

      proposalIds.push(proposalId);
    }

    await completeJobRun({
      workspaceRoot,
      jobRunId: planningJobRun.id,
      status: "completed",
      durationMs: Date.now() - planningStartedAt,
      metadataJson: {
        provider: providerConfig.provider,
        model: providerConfig.model,
        promptHash,
        promptVersion,
        proposalCount: proposalIds.length,
      },
    });

    return {
      proposalIds,
    };
  } catch (error) {
    await completeJobRun({
      workspaceRoot,
      jobRunId: planningJobRun.id,
      status: "failed",
      durationMs: Date.now() - planningStartedAt,
      metadataJson: {
        provider: providerConfig.provider,
        model: providerConfig.model,
        promptHash,
        promptVersion,
        error: error instanceof Error ? error.message : "Unknown patch planning failure.",
      },
    });

    throw error;
  }
}
