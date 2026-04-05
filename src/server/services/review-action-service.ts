import { and, eq } from "drizzle-orm";

import type {
  EditableReviewProposal,
  ReviewProposalArtifact,
  ReviewProposalDetail,
} from "@/lib/contracts/review";
import { reviewProposalArtifactSchema } from "@/lib/contracts/review";
import { PATCH_APPLY_JOB_TYPE, WIKI_PAGE_TYPE_DIRECTORY_MAP } from "@/lib/constants";
import { patchHunks, patchProposals } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { slugifyTitle } from "@/server/lib/slug";
import { completeJobRun, createJobRun } from "@/server/services/job-run-service";
import {
  removePatchProposalArtifacts,
  writePatchProposalArtifacts,
} from "@/server/services/patch-proposal-file-service";
import { applyPatchProposal } from "@/server/services/patch-apply-service";
import { buildReviewProposalMarkdown } from "@/server/services/review-artifact-service";
import { getReviewProposalDetail } from "@/server/services/review-service";
import { readWorkspaceSettings } from "@/server/services/settings-service";
import { commitWorkspaceFiles } from "@/server/services/git-service";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";

function buildSuggestedPath(title: string, pageType: NonNullable<ReviewProposalArtifact["proposedPage"]>["pageType"]) {
  const slug = slugifyTitle(title) || "untitled";
  const directory = WIKI_PAGE_TYPE_DIRECTORY_MAP[pageType];

  return directory ? `wiki/${directory}/${slug}.md` : `wiki/${slug}.md`;
}

function getSourceSlug(detail: ReviewProposalDetail) {
  return detail.source?.slug ?? (slugifyTitle(detail.sourceTitle ?? detail.title) || "review");
}

function assertPendingProposal(detail: ReviewProposalDetail) {
  if (detail.status !== "pending") {
    throw new AppError(
      "Only pending review proposals can be acted on.",
      409,
      "review_status_not_pending",
    );
  }

  if (!detail.artifact) {
    throw new AppError(
      "Review proposal artifact is missing.",
      409,
      "review_artifact_missing",
    );
  }
}

function buildEditedArtifact(params: {
  detail: ReviewProposalDetail;
  status: ReviewProposalArtifact["status"];
  note?: string | null;
  reviewedAt?: string | null;
  editedBeforeApply: boolean;
  edits?: EditableReviewProposal;
  applyResult?: Partial<ReviewProposalArtifact["applyResult"]>;
}) {
  const baseArtifact = params.detail.artifact;

  if (!baseArtifact) {
    throw new AppError(
      "Review proposal artifact is missing.",
      409,
      "review_artifact_missing",
    );
  }

  const editedProposedPage =
    params.edits?.proposedPage
      ? {
          ...params.edits.proposedPage,
          suggestedPath: buildSuggestedPath(
            params.edits.proposedPage.title,
            params.edits.proposedPage.pageType,
          ),
        }
      : params.edits?.proposedPage === null
        ? null
        : baseArtifact.proposedPage;

  return reviewProposalArtifactSchema.parse({
    ...baseArtifact,
    status: params.status,
    title: params.edits?.title ?? baseArtifact.title,
    patchGoal: params.edits?.patchGoal ?? baseArtifact.patchGoal,
    rationale: params.edits?.rationale ?? baseArtifact.rationale,
    affectedSections: params.edits?.affectedSections ?? baseArtifact.affectedSections,
    conflictNotes: params.edits?.conflictNotes ?? baseArtifact.conflictNotes,
    proposedPage: editedProposedPage,
    hunks: params.edits?.hunks ?? baseArtifact.hunks,
    review: {
      reviewedAt: params.reviewedAt ?? (params.status === "pending" ? null : new Date().toISOString()),
      note: params.note ?? baseArtifact.review.note ?? null,
      editedBeforeApply: params.editedBeforeApply,
    },
    applyResult: {
      ...baseArtifact.applyResult,
      ...params.applyResult,
    },
  });
}

async function rewriteProposalArtifacts(params: {
  workspaceRoot: string;
  sourceSlug: string;
  proposalId: string;
  artifact: ReviewProposalArtifact;
  statusFolder: "pending" | "approved" | "rejected";
  previousMarkdownPath: string | null;
  previousJsonPath: string | null;
}) {
  const markdown = buildReviewProposalMarkdown(params.artifact);
  const nextPaths = await writePatchProposalArtifacts({
    workspaceRoot: params.workspaceRoot,
    sourceSlug: params.sourceSlug,
    proposalId: params.proposalId,
    markdown,
    artifact: params.artifact,
    statusFolder: params.statusFolder,
  });

  const previousPaths = [params.previousMarkdownPath, params.previousJsonPath].filter(
    (value): value is string => Boolean(value),
  );
  const shouldRemovePrevious =
    previousPaths.some((value) => value !== nextPaths.markdownPath && value !== nextPaths.jsonPath);

  if (shouldRemovePrevious) {
    await removePatchProposalArtifacts({
      workspaceRoot: params.workspaceRoot,
      markdownPath: params.previousMarkdownPath,
      jsonPath: params.previousJsonPath,
    });
  }

  return nextPaths;
}

async function persistPendingEdits(params: {
  workspaceRoot: string;
  proposalId: string;
  edits: EditableReviewProposal;
}) {
  const detail = await getReviewProposalDetail(params.workspaceRoot, params.proposalId);

  assertPendingProposal(detail);

  const { db, workspace } = await getWorkspaceContext(params.workspaceRoot);
  const updatedArtifact = buildEditedArtifact({
    detail,
    status: "pending",
    editedBeforeApply: true,
    edits: params.edits,
    applyResult: {
      success: null,
      error: null,
    },
  });
  const nextPaths = await rewriteProposalArtifacts({
    workspaceRoot: params.workspaceRoot,
    sourceSlug: getSourceSlug(detail),
    proposalId: detail.id,
    artifact: updatedArtifact,
    statusFolder: "pending",
    previousMarkdownPath: detail.artifactMarkdownPath,
    previousJsonPath: detail.artifactJsonPath,
  });
  const now = new Date();

  await db
    .update(patchProposals)
    .set({
      title: updatedArtifact.title,
      rationale: updatedArtifact.rationale,
      proposedPageTitle: updatedArtifact.proposedPage?.title ?? null,
      artifactMarkdownPath: nextPaths.markdownPath,
      artifactJsonPath: nextPaths.jsonPath,
      affectedSectionsJson: updatedArtifact.affectedSections,
      applyError: null,
      updatedAt: now,
    })
    .where(and(eq(patchProposals.workspaceId, workspace.id), eq(patchProposals.id, detail.id)));

  await db.delete(patchHunks).where(eq(patchHunks.proposalId, detail.id));

  if (updatedArtifact.hunks.length > 0) {
    await db.insert(patchHunks).values(
      updatedArtifact.hunks.map((hunk, index) => ({
        id: `hunk_${detail.id}_${index}_${Date.now()}`,
        proposalId: detail.id,
        sectionHeading: hunk.sectionHeading,
        operation: hunk.operation,
        beforeText: hunk.beforeText,
        afterText: hunk.afterText,
        citationsJson: hunk.citations,
        createdAt: now,
      })),
    );
  }

  return getReviewProposalDetail(params.workspaceRoot, params.proposalId);
}

async function updateProposalOutcome(params: {
  workspaceRoot: string;
  detail: ReviewProposalDetail;
  artifact: ReviewProposalArtifact;
  statusFolder: "approved" | "rejected" | "pending";
  reviewedAt: Date | null;
  note: string | null;
  appliedAt: Date | null;
  appliedPageId: string | null;
  applyError: string | null;
  applyMetadataJson: Record<string, unknown>;
}) {
  const { db, workspace } = await getWorkspaceContext(params.workspaceRoot);
  const nextPaths = await rewriteProposalArtifacts({
    workspaceRoot: params.workspaceRoot,
    sourceSlug: getSourceSlug(params.detail),
    proposalId: params.detail.id,
    artifact: params.artifact,
    statusFolder: params.statusFolder,
    previousMarkdownPath: params.detail.artifactMarkdownPath,
    previousJsonPath: params.detail.artifactJsonPath,
  });
  const now = new Date();

  await db
    .update(patchProposals)
    .set({
      title: params.artifact.title,
      status: params.artifact.status,
      rationale: params.artifact.rationale,
      proposedPageTitle: params.artifact.proposedPage?.title ?? null,
      artifactMarkdownPath: nextPaths.markdownPath,
      artifactJsonPath: nextPaths.jsonPath,
      affectedSectionsJson: params.artifact.affectedSections,
      reviewedAt: params.reviewedAt,
      reviewNote: params.note,
      appliedAt: params.appliedAt,
      applyError: params.applyError,
      appliedPageId: params.appliedPageId,
      applyMetadataJson: params.applyMetadataJson,
      updatedAt: now,
    })
    .where(and(eq(patchProposals.workspaceId, workspace.id), eq(patchProposals.id, params.detail.id)));

  return {
    markdownPath: nextPaths.markdownPath,
    jsonPath: nextPaths.jsonPath,
  };
}

function buildCommitMessage(detail: ReviewProposalDetail) {
  const targetLabel = detail.targetPageTitle ?? detail.proposedPageTitle ?? detail.title;

  return `Apply review proposal: ${targetLabel}`;
}

async function persistApprovedGitFailure(params: {
  workspaceRoot: string;
  detail: ReviewProposalDetail;
  note: string | null;
  appliedAt: Date;
  appliedPageId: string;
  affectedPaths: string[];
  editedBeforeApply: boolean;
  action: "approve" | "edit_and_approve";
  git: {
    attempted: boolean;
    success: boolean | null;
    commitHash: string | null;
    message: string | null;
  };
}) {
  const artifact = buildEditedArtifact({
    detail: params.detail,
    status: "approved",
    note: params.note,
    reviewedAt: params.appliedAt.toISOString(),
    editedBeforeApply: params.editedBeforeApply,
    applyResult: {
      appliedAt: params.appliedAt.toISOString(),
      success: true,
      affectedPaths: params.affectedPaths,
      appliedPageId: params.appliedPageId,
      git: params.git,
      error: null,
    },
  });

  await updateProposalOutcome({
    workspaceRoot: params.workspaceRoot,
    detail: params.detail,
    artifact,
    statusFolder: "approved",
    reviewedAt: params.appliedAt,
    note: params.note,
    appliedAt: params.appliedAt,
    appliedPageId: params.appliedPageId,
    applyError: null,
    applyMetadataJson: {
      action: params.action,
      affectedPaths: params.affectedPaths,
      editedBeforeApply: params.editedBeforeApply,
      git: params.git,
    },
  });
}

export async function rejectReviewProposal(
  workspaceRoot: string,
  proposalId: string,
  note: string,
) {
  const detail = await getReviewProposalDetail(workspaceRoot, proposalId);

  assertPendingProposal(detail);

  const reviewedAt = new Date();
  const artifact = buildEditedArtifact({
    detail,
    status: "rejected",
    note,
    reviewedAt: reviewedAt.toISOString(),
    editedBeforeApply: detail.artifact!.review.editedBeforeApply,
  });

  await updateProposalOutcome({
    workspaceRoot,
    detail,
    artifact,
    statusFolder: "rejected",
    reviewedAt,
    note,
    appliedAt: null,
    appliedPageId: null,
    applyError: null,
    applyMetadataJson: {
      action: "rejected",
    },
  });

  return getReviewProposalDetail(workspaceRoot, proposalId);
}

async function approveProposalInternal(params: {
  workspaceRoot: string;
  proposalId: string;
  note?: string;
  edits?: EditableReviewProposal;
}) {
  let detail = params.edits
    ? await persistPendingEdits({
        workspaceRoot: params.workspaceRoot,
        proposalId: params.proposalId,
        edits: params.edits,
      })
    : await getReviewProposalDetail(params.workspaceRoot, params.proposalId);

  assertPendingProposal(detail);

  const applyJob = await createJobRun({
    workspaceRoot: params.workspaceRoot,
    sourceDocumentId: detail.sourceDocumentId,
    jobType: PATCH_APPLY_JOB_TYPE,
    status: "running",
    metadataJson: {
      proposalId: detail.id,
      editedBeforeApply: Boolean(params.edits),
    },
  });
  const startedAt = Date.now();

  try {
    const applyResult = await applyPatchProposal(params.workspaceRoot, detail);
    const reviewedAt = new Date();
    const editedBeforeApply =
      Boolean(params.edits) || detail.artifact!.review.editedBeforeApply;
    const artifact = buildEditedArtifact({
      detail,
      status: "approved",
      note: params.note ?? null,
      reviewedAt: reviewedAt.toISOString(),
      editedBeforeApply,
      applyResult: {
        appliedAt: reviewedAt.toISOString(),
        success: true,
        affectedPaths: applyResult.affectedPaths,
        appliedPageId: applyResult.appliedPageId,
        error: null,
      },
    });
    const movedPaths = await updateProposalOutcome({
      workspaceRoot: params.workspaceRoot,
      detail,
      artifact,
      statusFolder: "approved",
      reviewedAt,
      note: params.note ?? null,
      appliedAt: reviewedAt,
      appliedPageId: applyResult.appliedPageId,
      applyError: null,
      applyMetadataJson: {
        action: params.edits ? "edit_and_approve" : "approve",
        affectedPaths: applyResult.affectedPaths,
        editedBeforeApply,
      },
    });
    const settings = await readWorkspaceSettings(params.workspaceRoot);
    const commitPaths = [
      ...applyResult.affectedPaths,
      movedPaths.markdownPath,
      movedPaths.jsonPath,
    ].filter(Boolean);
    const gitResult =
      settings?.review.gitCommitOnApply
        ? await commitWorkspaceFiles({
            workspaceRoot: params.workspaceRoot,
            relativePaths: commitPaths,
            message: buildCommitMessage(detail),
          })
        : null;

    if (gitResult) {
      const { db, workspace } = await getWorkspaceContext(params.workspaceRoot);

      await db
        .update(patchProposals)
        .set({
          applyMetadataJson: {
            action: params.edits ? "edit_and_approve" : "approve",
            affectedPaths: applyResult.affectedPaths,
            editedBeforeApply,
            git: gitResult,
          },
        })
        .where(and(eq(patchProposals.workspaceId, workspace.id), eq(patchProposals.id, detail.id)));

      if (gitResult.success !== true) {
        await persistApprovedGitFailure({
          workspaceRoot: params.workspaceRoot,
          detail,
          note: params.note ?? null,
          appliedAt: reviewedAt,
          appliedPageId: applyResult.appliedPageId,
          affectedPaths: applyResult.affectedPaths,
          editedBeforeApply,
          action: params.edits ? "edit_and_approve" : "approve",
          git: gitResult,
        });
      }
    }

    await completeJobRun({
      workspaceRoot: params.workspaceRoot,
      jobRunId: applyJob.id,
      status: "completed",
      durationMs: Date.now() - startedAt,
      metadataJson: {
        proposalId: detail.id,
        affectedFiles: applyResult.affectedPaths,
        git: gitResult,
      },
    });

    return getReviewProposalDetail(params.workspaceRoot, params.proposalId);
  } catch (error) {
    detail = await getReviewProposalDetail(params.workspaceRoot, params.proposalId);
    const failureArtifact = buildEditedArtifact({
      detail,
      status: "pending",
      note: params.note ?? detail.reviewNote ?? null,
      editedBeforeApply:
        Boolean(params.edits) || detail.artifact!.review.editedBeforeApply,
      applyResult: {
        success: false,
        error: error instanceof Error ? error.message : "Patch apply failed.",
      },
    });

    await updateProposalOutcome({
      workspaceRoot: params.workspaceRoot,
      detail,
      artifact: failureArtifact,
      statusFolder: "pending",
      reviewedAt: null,
      note: params.note ?? null,
      appliedAt: null,
      appliedPageId: null,
      applyError: error instanceof Error ? error.message : "Patch apply failed.",
      applyMetadataJson: {
        action: params.edits ? "edit_and_approve" : "approve",
        lastFailedAt: new Date().toISOString(),
      },
    });

    await completeJobRun({
      workspaceRoot: params.workspaceRoot,
      jobRunId: applyJob.id,
      status: "failed",
      durationMs: Date.now() - startedAt,
      metadataJson: {
        proposalId: detail.id,
        error: error instanceof Error ? error.message : "Patch apply failed.",
      },
    });

    throw error;
  }
}

export async function approveReviewProposal(
  workspaceRoot: string,
  proposalId: string,
  note?: string,
) {
  return approveProposalInternal({
    workspaceRoot,
    proposalId,
    note,
  });
}

export async function editAndApproveReviewProposal(params: {
  workspaceRoot: string;
  proposalId: string;
  note?: string;
  edits: EditableReviewProposal;
}) {
  return approveProposalInternal(params);
}
