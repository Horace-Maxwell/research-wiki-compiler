import { and, eq, inArray } from "drizzle-orm";

import type { ReviewProposalDetail, ReviewProposalSummary } from "@/lib/contracts/review";
import {
  reviewProposalArtifactSchema,
  reviewProposalDetailSchema,
  reviewProposalSummarySchema,
} from "@/lib/contracts/review";
import { AppError } from "@/server/lib/errors";
import { patchHunks, patchProposals, sourceDocuments, wikiPages } from "@/server/db/schema";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";
import {
  readPatchProposalArtifactJson,
  readPatchProposalArtifactMarkdown,
} from "@/server/services/patch-proposal-file-service";
import { buildReviewProposalMarkdown } from "@/server/services/review-artifact-service";

type ProposalRow = typeof patchProposals.$inferSelect;

function mergeArtifactApplyState(
  proposal: ProposalRow,
  artifact: ReturnType<typeof reviewProposalArtifactSchema.parse> | null,
) {
  if (!artifact) {
    return null;
  }

  const gitMetadata = proposal.applyMetadataJson.git;
  const affectedPaths =
    Array.isArray(proposal.applyMetadataJson.affectedPaths) &&
    proposal.applyMetadataJson.affectedPaths.every((value) => typeof value === "string")
      ? proposal.applyMetadataJson.affectedPaths
      : null;
  const gitRecord =
    gitMetadata &&
    typeof gitMetadata === "object" &&
    "attempted" in gitMetadata &&
    "success" in gitMetadata
      ? (gitMetadata as Record<string, unknown>)
      : null;

  return reviewProposalArtifactSchema.parse({
    ...artifact,
    applyResult: {
      ...artifact.applyResult,
      appliedAt: artifact.applyResult.appliedAt ?? proposal.appliedAt?.toISOString() ?? null,
      affectedPaths:
        artifact.applyResult.affectedPaths.length > 0
          ? artifact.applyResult.affectedPaths
          : affectedPaths ?? [],
      appliedPageId: artifact.applyResult.appliedPageId ?? proposal.appliedPageId ?? null,
      git:
        artifact.applyResult.git ??
        (gitRecord
          ? {
              attempted: Boolean(gitRecord.attempted),
              success:
                typeof gitRecord.success === "boolean" || gitRecord.success === null
                  ? gitRecord.success
                  : null,
              commitHash:
                typeof gitRecord.commitHash === "string" || gitRecord.commitHash === null
                  ? gitRecord.commitHash
                  : null,
              message:
                typeof gitRecord.message === "string" || gitRecord.message === null
                  ? gitRecord.message
                  : null,
            }
          : null),
      error: artifact.applyResult.error ?? proposal.applyError ?? null,
    },
  });
}

function mapProposalSummary(
  proposal: ProposalRow,
  sourceTitle: string | null,
): ReviewProposalSummary {
  return reviewProposalSummarySchema.parse({
    id: proposal.id,
    sourceDocumentId: proposal.sourceDocumentId,
    sourceTitle,
    targetPageId: proposal.targetPageId,
    targetPageTitle: proposal.targetPageTitle,
    proposedPageTitle: proposal.proposedPageTitle,
    title: proposal.title,
    status: proposal.status,
    proposalType: proposal.proposalType,
    riskLevel: proposal.riskLevel,
    promptVersion: proposal.promptVersion,
    promptHash: proposal.promptHash,
    provider:
      proposal.provider === "openai" || proposal.provider === "anthropic"
        ? proposal.provider
        : null,
    model: proposal.model,
    rationale: proposal.rationale,
    affectedSections: proposal.affectedSectionsJson,
    artifactMarkdownPath: proposal.artifactMarkdownPath,
    artifactJsonPath: proposal.artifactJsonPath,
    reviewedAt: proposal.reviewedAt?.toISOString() ?? null,
    reviewNote: proposal.reviewNote,
    appliedAt: proposal.appliedAt?.toISOString() ?? null,
    applyError: proposal.applyError,
    appliedPageId: proposal.appliedPageId,
    applyMetadataJson: proposal.applyMetadataJson,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  });
}

export async function listReviewProposals(
  workspaceRoot: string,
  options?: {
    status?: string;
  },
) {
  const { db, workspace } = await getWorkspaceContext(workspaceRoot);
  const status = options?.status ?? "pending";
  const proposals = await db.query.patchProposals.findMany({
    where: and(
      eq(patchProposals.workspaceId, workspace.id),
      eq(patchProposals.status, status),
    ),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.updatedAt), orderDesc(table.createdAt)],
  });
  const sourceIds = proposals
    .map((proposal) => proposal.sourceDocumentId)
    .filter((value): value is string => Boolean(value));
  const sources =
    sourceIds.length > 0
      ? await db.query.sourceDocuments.findMany({
          where: inArray(sourceDocuments.id, sourceIds),
        })
      : [];
  const sourceTitleMap = new Map(sources.map((source) => [source.id, source.title]));

  return proposals.map((proposal) =>
    mapProposalSummary(proposal, sourceTitleMap.get(proposal.sourceDocumentId ?? "") ?? null),
  );
}

export async function getReviewProposalSummariesByIds(
  workspaceRoot: string,
  proposalIds: string[],
) {
  if (proposalIds.length === 0) {
    return [] as ReviewProposalSummary[];
  }

  const { db, workspace } = await getWorkspaceContext(workspaceRoot);
  const proposals = await db.query.patchProposals.findMany({
    where: and(
      eq(patchProposals.workspaceId, workspace.id),
      inArray(patchProposals.id, proposalIds),
    ),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.updatedAt)],
  });
  const sourceIds = proposals
    .map((proposal) => proposal.sourceDocumentId)
    .filter((value): value is string => Boolean(value));
  const sources =
    sourceIds.length > 0
      ? await db.query.sourceDocuments.findMany({
          where: inArray(sourceDocuments.id, sourceIds),
        })
      : [];
  const sourceTitleMap = new Map(sources.map((source) => [source.id, source.title]));

  return proposals.map((proposal) =>
    mapProposalSummary(proposal, sourceTitleMap.get(proposal.sourceDocumentId ?? "") ?? null),
  );
}

export async function getReviewProposalDetail(
  workspaceRoot: string,
  proposalId: string,
): Promise<ReviewProposalDetail> {
  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } =
    await getWorkspaceContext(workspaceRoot);
  const proposal = await db.query.patchProposals.findFirst({
    where: and(eq(patchProposals.workspaceId, workspace.id), eq(patchProposals.id, proposalId)),
  });

  if (!proposal) {
    throw new AppError("Review proposal not found.", 404, "review_proposal_not_found");
  }

  const [source, targetPage, appliedPage, hunkRows, markdown, rawArtifact] = await Promise.all([
    proposal.sourceDocumentId
      ? db.query.sourceDocuments.findFirst({
          where: eq(sourceDocuments.id, proposal.sourceDocumentId),
        })
      : Promise.resolve(null),
    proposal.targetPageId
      ? db.query.wikiPages.findFirst({
          where: eq(wikiPages.id, proposal.targetPageId),
        })
      : Promise.resolve(null),
    proposal.appliedPageId
      ? db.query.wikiPages.findFirst({
          where: eq(wikiPages.id, proposal.appliedPageId),
        })
      : Promise.resolve(null),
    db.query.patchHunks.findMany({
      where: eq(patchHunks.proposalId, proposal.id),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    }),
    readPatchProposalArtifactMarkdown(normalizedWorkspaceRoot, proposal.artifactMarkdownPath),
    readPatchProposalArtifactJson(normalizedWorkspaceRoot, proposal.artifactJsonPath),
  ]);
  const artifact = mergeArtifactApplyState(
    proposal,
    rawArtifact ? reviewProposalArtifactSchema.parse(rawArtifact) : null,
  );
  const renderedMarkdown = artifact ? buildReviewProposalMarkdown(artifact) : markdown;

  return reviewProposalDetailSchema.parse({
    ...mapProposalSummary(proposal, source?.title ?? null),
    markdown: renderedMarkdown,
    artifact,
    hunks:
      artifact?.hunks ??
      hunkRows.map((hunk) => ({
        sectionHeading: hunk.sectionHeading,
        operation: hunk.operation,
        beforeText: hunk.beforeText,
        afterText: hunk.afterText,
        citations: hunk.citationsJson,
      })),
    source: source
      ? {
          id: source.id,
          title: source.title,
          slug: source.slug,
        }
      : null,
    targetPage: targetPage
      ? {
          id: targetPage.id,
          title: targetPage.title,
          slug: targetPage.slug,
          path: targetPage.path,
          type: targetPage.type,
        }
      : null,
    appliedPage: appliedPage
      ? {
          id: appliedPage.id,
          title: appliedPage.title,
          slug: appliedPage.slug,
          path: appliedPage.path,
          type: appliedPage.type,
        }
      : null,
  });
}
