"use client";

import type { ChangeEvent, ReactNode } from "react";
import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCheck,
  FileDiff,
  FilePlus2,
  GitCommitHorizontal,
  PencilLine,
  RefreshCw,
  SendHorizontal,
  XCircle,
} from "lucide-react";

import type {
  EditableReviewProposal,
  PatchHunkArtifact,
  ReviewProposalDetail,
  ReviewProposalSummary,
} from "@/lib/contracts/review";
import {
  approveReviewRequestSchema,
  editAndApproveReviewRequestSchema,
  listReviewsResponseSchema,
  rejectReviewRequestSchema,
  reviewProposalDetailSchema,
} from "@/lib/contracts/review";
import { describeApiError, readResponseJson } from "@/lib/client-api";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ReviewQueueProps = {
  defaultWorkspaceRoot: string;
};

type ReviewStatusFilter = "pending" | "approved" | "rejected";

const reviewStatuses: ReviewStatusFilter[] = ["pending", "approved", "rejected"];
const riskVariantMap = {
  low: "success",
  medium: "warning",
  high: "default",
} as const;
const statusVariantMap = {
  pending: "warning",
  approved: "success",
  rejected: "outline",
  superseded: "outline",
} as const;
const statusCopy = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  superseded: "Superseded",
} as const;
const proposalTypeCopy = {
  update_page: "Update page",
  create_page: "Create page",
  add_citations: "Add citations",
  add_backlinks: "Add backlinks",
  conflict_note: "Conflict note",
} as const;
const operationCopy = {
  append: "Append",
  insert: "Insert",
  replace: "Replace",
  create_section: "Create section",
  note_conflict: "Conflict note",
} as const;
const selectClassName =
  "flex h-10 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

async function fetchReviewList(workspaceRoot: string, status: ReviewStatusFilter) {
  const params = new URLSearchParams({
    workspaceRoot,
    status,
  });
  const response = await fetch(`/api/reviews?${params.toString()}`, {
    cache: "no-store",
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to load review proposals."));
  }

  return listReviewsResponseSchema.parse(data).proposals;
}

async function fetchReviewDetail(workspaceRoot: string, reviewId: string) {
  const response = await fetch(
    `/api/reviews/${reviewId}?${new URLSearchParams({ workspaceRoot }).toString()}`,
    {
      cache: "no-store",
    },
  );
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to load review proposal."));
  }

  return reviewProposalDetailSchema.parse(data);
}

function splitMultiline(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatJson(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function createEditableProposal(detail: ReviewProposalDetail): EditableReviewProposal | null {
  if (!detail.artifact) {
    return null;
  }

  return {
    title: detail.artifact.title,
    patchGoal: detail.artifact.patchGoal,
    rationale: detail.artifact.rationale,
    affectedSections: detail.artifact.affectedSections,
    conflictNotes: detail.artifact.conflictNotes,
    proposedPage: detail.artifact.proposedPage,
    hunks: detail.artifact.hunks,
  };
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-2xl border border-border/70 bg-background/60 p-3">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm text-foreground">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border/70 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">{children}</CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-5 py-10 text-center">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
    </div>
  );
}

function HunkDiffCard({
  hunk,
}: {
  hunk: PatchHunkArtifact;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{operationCopy[hunk.operation]}</Badge>
        <div className="text-sm font-medium text-foreground">
          {hunk.sectionHeading ?? "Document root"}
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Before
          </div>
          <pre className="min-h-[120px] overflow-x-auto rounded-2xl border border-border/70 bg-background/80 p-3 text-xs leading-6 text-muted-foreground">
            {hunk.beforeText?.trim() || "No local excerpt required for this operation."}
          </pre>
        </div>
        <div className="space-y-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            After
          </div>
          <pre className="min-h-[120px] overflow-x-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-6 text-foreground">
            {hunk.afterText.trim()}
          </pre>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {hunk.citations.length > 0 ? (
          hunk.citations.map((citation, index) => (
            <Badge key={`${citation.sourceId}-${index}`} variant="outline">
              {citation.sourceId}
              {citation.note ? `: ${citation.note}` : ""}
            </Badge>
          ))
        ) : (
          <div className="text-xs text-muted-foreground">No explicit citations attached.</div>
        )}
      </div>
    </div>
  );
}

export function ReviewQueue({ defaultWorkspaceRoot }: ReviewQueueProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("pending");
  const [proposals, setProposals] = useState<ReviewProposalSummary[]>([]);
  const [detail, setDetail] = useState<ReviewProposalDetail | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [draft, setDraft] = useState<EditableReviewProposal | null>(null);

  const queryWorkspaceRoot = searchParams.get("workspaceRoot");
  const selectedReviewId = searchParams.get("reviewId");
  const queryStatus = searchParams.get("status");

  useEffect(() => {
    const storedRoot =
      queryWorkspaceRoot ??
      window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ??
      defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, storedRoot);
  }, [defaultWorkspaceRoot, queryWorkspaceRoot]);

  useEffect(() => {
    if (queryStatus === "pending" || queryStatus === "approved" || queryStatus === "rejected") {
      setStatusFilter(queryStatus);
      return;
    }

    setStatusFilter("pending");
  }, [queryStatus]);

  function navigate(next: {
    reviewId?: string | null;
    status?: ReviewStatusFilter;
    workspaceRoot?: string;
    replace?: boolean;
  }) {
    const params = new URLSearchParams();
    const nextWorkspaceRoot = next.workspaceRoot ?? workspaceRoot;
    const nextStatus = next.status ?? statusFilter;
    const nextReviewId =
      next.reviewId === undefined ? selectedReviewId : next.reviewId;

    params.set("workspaceRoot", nextWorkspaceRoot);
    params.set("status", nextStatus);

    if (nextReviewId) {
      params.set("reviewId", nextReviewId);
    }

    startTransition(() => {
      if (next.replace) {
        router.replace(`${pathname}?${params.toString()}`);
      } else {
        router.push(`${pathname}?${params.toString()}`);
      }
    });
  }

  useEffect(() => {
    let isActive = true;

    async function loadReviews() {
      setIsLoadingList(true);
      setErrorMessage(null);

      try {
        const nextProposals = await fetchReviewList(workspaceRoot, statusFilter);

        if (!isActive) {
          return;
        }

        setProposals(nextProposals);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setProposals([]);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load review proposals.",
        );
      } finally {
        if (isActive) {
          setIsLoadingList(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadReviews();
    }

    return () => {
      isActive = false;
    };
  }, [statusFilter, workspaceRoot]);

  useEffect(() => {
    function replaceSelection(reviewId: string | null) {
      const params = new URLSearchParams({
        workspaceRoot,
        status: statusFilter,
      });

      if (reviewId) {
        params.set("reviewId", reviewId);
      }

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }

    if (isLoadingList) {
      return;
    }

    if (!selectedReviewId && proposals.length > 0) {
      replaceSelection(proposals[0]!.id);
      return;
    }

    if (selectedReviewId && proposals.length === 0) {
      setDetail(null);
      setDraft(null);
      return;
    }

    if (
      selectedReviewId &&
      proposals.length > 0 &&
      !proposals.some((proposal) => proposal.id === selectedReviewId)
    ) {
      replaceSelection(proposals[0]!.id);
    }
  }, [isLoadingList, pathname, proposals, router, selectedReviewId, statusFilter, workspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadDetail() {
      if (!selectedReviewId) {
        setDetail(null);
        setDraft(null);
        setIsEditMode(false);
        return;
      }

      setIsLoadingDetail(true);
      setErrorMessage(null);

      try {
        const nextDetail = await fetchReviewDetail(workspaceRoot, selectedReviewId);

        if (!isActive) {
          return;
        }

        setDetail(nextDetail);
        setReviewNote(nextDetail.reviewNote ?? nextDetail.artifact?.review.note ?? "");
        setDraft(createEditableProposal(nextDetail));
        setIsEditMode(false);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDetail(null);
        setDraft(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load review proposal detail.",
        );
      } finally {
        if (isActive) {
          setIsLoadingDetail(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadDetail();
    }

    return () => {
      isActive = false;
    };
  }, [selectedReviewId, workspaceRoot]);

  function updateDraftField<Key extends keyof EditableReviewProposal>(
    key: Key,
    value: EditableReviewProposal[Key],
  ) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  function updateHunk(index: number, patch: Partial<PatchHunkArtifact>) {
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const hunks = [...current.hunks];
      hunks[index] = {
        ...hunks[index],
        ...patch,
      };

      return {
        ...current,
        hunks,
      };
    });
  }

  function removeHunk(index: number) {
    setDraft((current) =>
      current
        ? {
            ...current,
            hunks: current.hunks.filter((_, currentIndex) => currentIndex !== index),
          }
        : current,
    );
  }

  function addHunk() {
    setDraft((current) =>
      current
        ? {
            ...current,
            hunks: [
              ...current.hunks,
              {
                sectionHeading: null,
                operation: "append",
                beforeText: null,
                afterText: "",
                citations: [],
              },
            ],
          }
        : current,
    );
  }

  async function refreshCurrentView(nextStatus?: ReviewStatusFilter, nextReviewId?: string | null) {
    const effectiveStatus = nextStatus ?? statusFilter;
    const effectiveReviewId = nextReviewId ?? selectedReviewId ?? null;
    const [nextList, nextDetail] = await Promise.all([
      fetchReviewList(workspaceRoot, effectiveStatus),
      effectiveReviewId ? fetchReviewDetail(workspaceRoot, effectiveReviewId) : Promise.resolve(null),
    ]);

    setProposals(nextList);
    setDetail(nextDetail);
    setDraft(nextDetail ? createEditableProposal(nextDetail) : null);
    setReviewNote(nextDetail?.reviewNote ?? nextDetail?.artifact?.review.note ?? "");
  }

  async function handleApprove() {
    if (!detail) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const response = await fetch(`/api/reviews/${detail.id}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          approveReviewRequestSchema.parse({
            workspaceRoot,
            note: reviewNote.trim() || undefined,
          }),
        ),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        throw new Error(describeApiError(data, "Failed to approve proposal."));
      }

      const nextDetail = reviewProposalDetailSchema.parse(data);
      setNoticeMessage(
        nextDetail.applyError
          ? "Patch apply failed and the proposal stayed pending for review."
          : "Proposal approved and patch applied to the wiki.",
      );
      navigate({
        reviewId: nextDetail.id,
        status:
          nextDetail.status === "pending" ||
          nextDetail.status === "approved" ||
          nextDetail.status === "rejected"
            ? nextDetail.status
            : statusFilter,
        replace: true,
      });
      await refreshCurrentView(
        nextDetail.status === "pending" ||
          nextDetail.status === "approved" ||
          nextDetail.status === "rejected"
          ? nextDetail.status
          : statusFilter,
        nextDetail.id,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to approve proposal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReject() {
    if (!detail) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const response = await fetch(`/api/reviews/${detail.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          rejectReviewRequestSchema.parse({
            workspaceRoot,
            note: reviewNote.trim(),
          }),
        ),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        throw new Error(describeApiError(data, "Failed to reject proposal."));
      }

      const nextDetail = reviewProposalDetailSchema.parse(data);
      setNoticeMessage("Proposal rejected and preserved in review history.");
      navigate({
        reviewId: nextDetail.id,
        status: "rejected",
        replace: true,
      });
      await refreshCurrentView("rejected", nextDetail.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to reject proposal.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEditAndApprove() {
    if (!detail || !draft) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const response = await fetch(`/api/reviews/${detail.id}/edit-and-approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          editAndApproveReviewRequestSchema.parse({
            workspaceRoot,
            note: reviewNote.trim() || undefined,
            edits: draft,
          }),
        ),
      });
      const data = await readResponseJson(response);

      if (!response.ok) {
        throw new Error(describeApiError(data, "Failed to edit and approve proposal."));
      }

      const nextDetail = reviewProposalDetailSchema.parse(data);
      setIsEditMode(false);
      setNoticeMessage(
        nextDetail.applyError
          ? "Edited proposal was saved, but apply failed and stayed pending."
          : "Edited proposal approved and applied.",
      );
      navigate({
        reviewId: nextDetail.id,
        status:
          nextDetail.status === "pending" ||
          nextDetail.status === "approved" ||
          nextDetail.status === "rejected"
            ? nextDetail.status
            : statusFilter,
        replace: true,
      });
      await refreshCurrentView(
        nextDetail.status === "pending" ||
          nextDetail.status === "approved" ||
          nextDetail.status === "rejected"
          ? nextDetail.status
          : statusFilter,
        nextDetail.id,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to edit and approve proposal.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Review Queue"
        title="Review and apply wiki mutations"
        description="Patch proposals become durable knowledge only after explicit human review. Approve, reject, or edit the persisted patch payload before any wiki file changes."
        badge="Review-first mutation"
      />

      {errorMessage ? <FeedbackBanner variant="error">{errorMessage}</FeedbackBanner> : null}

      {noticeMessage ? <FeedbackBanner variant="success">{noticeMessage}</FeedbackBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <div className="space-y-2">
              <CardTitle>Proposals</CardTitle>
              <CardDescription>
                Filter the visible review history and open a proposal to inspect or act on it.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-3 gap-2">
              {reviewStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={cn(
                    "rounded-2xl border px-3 py-3 text-left transition-colors",
                    statusFilter === status
                      ? "border-primary bg-primary/10"
                      : "border-border/70 bg-background/60 hover:bg-accent/50",
                  )}
                  onClick={() =>
                    navigate({
                      status,
                      reviewId: null,
                    })
                  }
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {statusCopy[status]}
                  </div>
                  <div className="mt-1 text-lg font-semibold text-foreground">
                    {statusFilter === status ? proposals.length : "Browse"}
                  </div>
                </button>
              ))}
            </div>

            {isLoadingList ? (
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                Loading review proposals...
              </div>
            ) : proposals.length === 0 ? (
              <EmptyState
                title={`No ${statusCopy[statusFilter].toLowerCase()} proposals`}
                description="Generate review proposals from summarized sources to populate this queue."
              />
            ) : (
              <div className="space-y-3">
                {proposals.map((proposal) => (
                  <button
                    key={proposal.id}
                    type="button"
                    className={cn(
                      "w-full rounded-2xl border px-4 py-4 text-left transition-colors",
                      selectedReviewId === proposal.id
                        ? "border-primary bg-primary/10"
                        : "border-border/70 bg-background/60 hover:bg-accent/50",
                    )}
                    onClick={() =>
                      navigate({
                        reviewId: proposal.id,
                      })
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusVariantMap[proposal.status]}>
                        {statusCopy[proposal.status]}
                      </Badge>
                      <Badge variant={riskVariantMap[proposal.riskLevel]}>
                        {proposal.riskLevel}
                      </Badge>
                    </div>
                    <div className="mt-3 text-sm font-medium text-foreground">
                      {proposal.title}
                    </div>
                    <div className="mt-2 text-xs leading-6 text-muted-foreground">
                      {proposal.sourceTitle ?? "Unknown source"} {"->"}{" "}
                      {proposal.targetPageTitle ?? proposal.proposedPageTitle ?? "New page"}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                      <span>{proposalTypeCopy[proposal.proposalType]}</span>
                      <span>Updated {formatDateTime(proposal.updatedAt)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          {isLoadingDetail ? (
            <Card className="overflow-hidden">
              <CardContent className="py-10 text-sm text-muted-foreground">
                Loading proposal detail...
              </CardContent>
            </Card>
          ) : !detail ? (
            <EmptyState
              title="Select a proposal"
              description="Choose a review proposal from the left to inspect the artifact, diff, and apply outcome."
            />
          ) : (
            <>
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/70">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariantMap[detail.status]}>
                          {statusCopy[detail.status]}
                        </Badge>
                        <Badge variant={riskVariantMap[detail.riskLevel]}>
                          {detail.riskLevel}
                        </Badge>
                        <Badge variant="outline">
                          {proposalTypeCopy[detail.proposalType]}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-2xl font-semibold tracking-tight text-foreground">
                          {detail.title}
                        </h3>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                          {detail.rationale}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNoticeMessage(null);
                          setErrorMessage(null);
                          void refreshCurrentView();
                        }}
                        disabled={isSubmitting}
                      >
                        <RefreshCw className="size-4" />
                        Refresh
                      </Button>
                      {detail.status === "pending" ? (
                        <Button
                          variant={isEditMode ? "secondary" : "outline"}
                          onClick={() => setIsEditMode((current) => !current)}
                          disabled={isSubmitting || !draft}
                        >
                          <PencilLine className="size-4" />
                          {isEditMode ? "Hide edit" : "Edit draft"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-6">
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <MetaRow label="Source" value={detail.sourceTitle ?? "Unknown source"} />
                    <MetaRow
                      label="Target"
                      value={detail.targetPageTitle ?? detail.proposedPageTitle ?? "New page"}
                    />
                    <MetaRow label="Prompt version" value={detail.promptVersion} />
                    <MetaRow label="Updated" value={formatDateTime(detail.updatedAt)} />
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="space-y-5">
                      <Section title="Patch Goal">
                        {isEditMode && draft ? (
                          <div className="space-y-4">
                            <Input
                              value={draft.title}
                              onChange={(event) => updateDraftField("title", event.target.value)}
                              placeholder="Proposal title"
                            />
                            <Textarea
                              value={draft.patchGoal}
                              onChange={(event) =>
                                updateDraftField("patchGoal", event.target.value)
                              }
                              className="min-h-[110px]"
                            />
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm font-medium text-foreground">
                              {detail.artifact?.patchGoal ?? "No patch goal recorded."}
                            </div>
                            <div className="text-sm leading-7 text-muted-foreground">
                              {detail.rationale}
                            </div>
                          </div>
                        )}
                      </Section>

                      <Section
                        title="Patch Diff"
                        actions={
                          isEditMode ? (
                            <Button variant="outline" size="sm" onClick={addHunk}>
                              <FilePlus2 className="size-4" />
                              Add hunk
                            </Button>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <FileDiff className="size-4" />
                              {detail.hunks.length} hunk{detail.hunks.length === 1 ? "" : "s"}
                            </div>
                          )
                        }
                      >
                        {(isEditMode ? draft?.hunks : detail.hunks)?.length ? (
                          <div className="space-y-4">
                            {(isEditMode ? draft?.hunks : detail.hunks)?.map((hunk, index) =>
                              isEditMode && draft ? (
                                <div
                                  key={`${index}-${hunk.operation}`}
                                  className="space-y-4 rounded-2xl border border-border/70 bg-background/60 p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-sm font-medium text-foreground">
                                      Hunk {index + 1}
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      type="button"
                                      onClick={() => removeHunk(index)}
                                    >
                                      <XCircle className="size-4" />
                                      Remove
                                    </Button>
                                  </div>
                                  <div className="grid gap-4 md:grid-cols-2">
                                    <label className="space-y-2">
                                      <div className="text-sm text-muted-foreground">
                                        Section heading
                                      </div>
                                      <Input
                                        value={hunk.sectionHeading ?? ""}
                                        onChange={(event) =>
                                          updateHunk(index, {
                                            sectionHeading: event.target.value || null,
                                          })
                                        }
                                        placeholder="Summary"
                                      />
                                    </label>
                                    <label className="space-y-2">
                                      <div className="text-sm text-muted-foreground">
                                        Operation
                                      </div>
                                      <select
                                        className={selectClassName}
                                        value={hunk.operation}
                                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                          updateHunk(index, {
                                            operation: event.target.value as PatchHunkArtifact["operation"],
                                          })
                                        }
                                      >
                                        {Object.entries(operationCopy).map(([value, label]) => (
                                          <option key={value} value={value}>
                                            {label}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                  </div>
                                  <div className="grid gap-4 lg:grid-cols-2">
                                    <label className="space-y-2">
                                      <div className="text-sm text-muted-foreground">
                                        Before excerpt
                                      </div>
                                      <Textarea
                                        value={hunk.beforeText ?? ""}
                                        onChange={(event) =>
                                          updateHunk(index, {
                                            beforeText: event.target.value || null,
                                          })
                                        }
                                        className="min-h-[160px]"
                                      />
                                    </label>
                                    <label className="space-y-2">
                                      <div className="text-sm text-muted-foreground">
                                        After excerpt
                                      </div>
                                      <Textarea
                                        value={hunk.afterText}
                                        onChange={(event) =>
                                          updateHunk(index, {
                                            afterText: event.target.value,
                                          })
                                        }
                                        className="min-h-[160px]"
                                      />
                                    </label>
                                  </div>
                                </div>
                              ) : (
                                <HunkDiffCard
                                  key={`${index}-${hunk.operation}-${hunk.sectionHeading ?? "root"}`}
                                  hunk={hunk}
                                />
                              ),
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            No patch hunks were recorded for this proposal.
                          </div>
                        )}
                      </Section>

                      <Section title="Review Artifact">
                        <div className="grid gap-3 md:grid-cols-2">
                          <MetaRow
                            label="Markdown artifact"
                            value={detail.artifactMarkdownPath ?? "Not persisted"}
                          />
                          <MetaRow
                            label="JSON artifact"
                            value={detail.artifactJsonPath ?? "Not persisted"}
                          />
                        </div>
                        <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-background/80 p-4 text-xs leading-6 text-muted-foreground">
                          {detail.markdown ?? "No markdown artifact found."}
                        </pre>
                      </Section>
                    </div>

                    <div className="space-y-5">
                      <Section title="Review Controls">
                        <div className="space-y-4">
                          <label className="space-y-2">
                            <div className="text-sm font-medium text-foreground">Review note</div>
                            <Textarea
                              value={reviewNote}
                              onChange={(event) => setReviewNote(event.target.value)}
                              className="min-h-[120px]"
                              placeholder="Add rationale for approval, rejection, or edit decisions."
                            />
                          </label>

                          {isEditMode && draft ? (
                            <>
                              <label className="space-y-2">
                                <div className="text-sm font-medium text-foreground">Rationale</div>
                                <Textarea
                                  value={draft.rationale}
                                  onChange={(event) =>
                                    updateDraftField("rationale", event.target.value)
                                  }
                                  className="min-h-[130px]"
                                />
                              </label>
                              <label className="space-y-2">
                                <div className="text-sm font-medium text-foreground">
                                  Affected sections
                                </div>
                                <Textarea
                                  value={draft.affectedSections.join("\n")}
                                  onChange={(event) =>
                                    updateDraftField(
                                      "affectedSections",
                                      splitMultiline(event.target.value),
                                    )
                                  }
                                  className="min-h-[110px]"
                                  placeholder="One section per line"
                                />
                              </label>
                              <label className="space-y-2">
                                <div className="text-sm font-medium text-foreground">
                                  Conflict notes
                                </div>
                                <Textarea
                                  value={draft.conflictNotes.join("\n")}
                                  onChange={(event) =>
                                    updateDraftField(
                                      "conflictNotes",
                                      splitMultiline(event.target.value),
                                    )
                                  }
                                  className="min-h-[110px]"
                                  placeholder="One conflict note per line"
                                />
                              </label>
                              {draft.proposedPage ? (
                                <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-4">
                                  <div className="text-sm font-medium text-foreground">
                                    Proposed page
                                  </div>
                                  <Input
                                    value={draft.proposedPage.title}
                                    onChange={(event) =>
                                      updateDraftField("proposedPage", {
                                        ...draft.proposedPage!,
                                        title: event.target.value,
                                      })
                                    }
                                    placeholder="Page title"
                                  />
                                  <select
                                    className={selectClassName}
                                    value={draft.proposedPage.pageType}
                                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                                      updateDraftField("proposedPage", {
                                        ...draft.proposedPage!,
                                        pageType: event.target.value as NonNullable<
                                          EditableReviewProposal["proposedPage"]
                                        >["pageType"],
                                      })
                                    }
                                  >
                                    <option value="topic">Topic</option>
                                    <option value="entity">Entity</option>
                                    <option value="concept">Concept</option>
                                    <option value="timeline">Timeline</option>
                                    <option value="synthesis">Synthesis</option>
                                    <option value="note">Note</option>
                                  </select>
                                  <Textarea
                                    value={draft.proposedPage.rationale}
                                    onChange={(event) =>
                                      updateDraftField("proposedPage", {
                                        ...draft.proposedPage!,
                                        rationale: event.target.value,
                                      })
                                    }
                                    className="min-h-[100px]"
                                  />
                                </div>
                              ) : null}
                            </>
                          ) : null}

                          <div className="flex flex-wrap gap-2">
                            {detail.status === "pending" ? (
                              <>
                                <Button onClick={() => void handleApprove()} disabled={isSubmitting}>
                                  {isSubmitting ? (
                                    <RefreshCw className="size-4 animate-spin" />
                                  ) : (
                                    <CheckCheck className="size-4" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  variant="secondary"
                                  onClick={() => void handleEditAndApprove()}
                                  disabled={isSubmitting || !isEditMode || !draft}
                                >
                                  <SendHorizontal className="size-4" />
                                  Edit and approve
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => void handleReject()}
                                  disabled={isSubmitting || !reviewNote.trim()}
                                >
                                  <XCircle className="size-4" />
                                  Reject
                                </Button>
                              </>
                            ) : (
                              <div className="text-sm text-muted-foreground">
                                This proposal is no longer pending. Its review history remains inspectable below.
                              </div>
                            )}
                          </div>
                        </div>
                      </Section>

                      <Section title="Context">
                        <div className="space-y-3">
                          <MetaRow
                            label="Source"
                            value={detail.source ? `${detail.source.title} (${detail.source.id})` : "Unknown"}
                          />
                          <MetaRow
                            label="Target page"
                            value={
                              detail.targetPage
                                ? `${detail.targetPage.title} (${detail.targetPage.path})`
                                : "No existing target page"
                            }
                          />
                          <MetaRow
                            label="Applied page"
                            value={
                              detail.appliedPage
                                ? `${detail.appliedPage.title} (${detail.appliedPage.path})`
                                : "Not applied yet"
                            }
                          />
                          <MetaRow
                            label="Affected sections"
                            value={
                              detail.affectedSections.length > 0
                                ? detail.affectedSections.join(", ")
                                : "None recorded"
                            }
                          />
                        </div>
                        {detail.artifact?.targetPages.length ? (
                          <div className="space-y-2">
                            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                              Candidate targets
                            </div>
                            <div className="space-y-2">
                              {detail.artifact.targetPages.map((page) => (
                                <div
                                  key={page.pageId}
                                  className="rounded-2xl border border-border/70 bg-background/60 p-3"
                                >
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm font-medium text-foreground">
                                      {page.title}
                                    </div>
                                    <Badge variant="outline">{page.relation}</Badge>
                                  </div>
                                  <div className="mt-2 text-xs leading-6 text-muted-foreground">
                                    Score {page.recallScore}.{" "}
                                    {page.recallReasons.map((reason) => reason.label).join("; ")}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </Section>

                      <Section title="Claims and conflicts">
                        <div className="space-y-3">
                          {detail.artifact?.supportingClaims.length ? (
                            detail.artifact.supportingClaims.map((claim, index) => (
                              <div
                                key={`${claim.text}-${index}`}
                                className="rounded-2xl border border-border/70 bg-background/60 p-3"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge variant="outline">{claim.polarity}</Badge>
                                  <Badge variant="outline">{claim.evidenceStrength}</Badge>
                                </div>
                                <div className="mt-2 text-sm font-medium text-foreground">
                                  {claim.text}
                                </div>
                                <div className="mt-2 text-sm leading-7 text-muted-foreground">
                                  {claim.rationale}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No supporting claims were recorded.
                            </div>
                          )}
                        </div>
                        <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-3">
                          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            Conflict notes
                          </div>
                          {detail.artifact?.conflictNotes.length ? (
                            <ul className="space-y-2 text-sm text-foreground">
                              {detail.artifact.conflictNotes.map((note, index) => (
                                <li key={`${note}-${index}`} className="flex gap-2">
                                  <AlertTriangle className="mt-0.5 size-4 text-amber-700" />
                                  <span>{note}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              No explicit conflicts recorded.
                            </div>
                          )}
                        </div>
                      </Section>

                      <Section title="Apply Result">
                        <div className="space-y-3">
                          <MetaRow label="Reviewed at" value={formatDateTime(detail.reviewedAt)} />
                          <MetaRow label="Applied at" value={formatDateTime(detail.appliedAt)} />
                          <MetaRow
                            label="Apply error"
                            value={detail.applyError ?? "No apply error recorded"}
                          />
                          <MetaRow
                            label="Affected paths"
                            value={
                              Array.isArray(detail.applyMetadataJson.affectedPaths) &&
                              detail.applyMetadataJson.affectedPaths.length > 0
                                ? (detail.applyMetadataJson.affectedPaths as string[]).join(", ")
                                : "No affected paths recorded"
                            }
                          />
                        </div>
                        <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                            <GitCommitHorizontal className="size-4" />
                            Git outcome
                          </div>
                          <div className="mt-3 text-sm leading-7 text-muted-foreground">
                            {detail.applyMetadataJson.git ? (
                              <>
                                Attempted:{" "}
                                {(detail.applyMetadataJson.git as { attempted?: boolean }).attempted
                                  ? "yes"
                                  : "no"}
                                <br />
                                Success:{" "}
                                {typeof (detail.applyMetadataJson.git as { success?: boolean | null }).success ===
                                "boolean"
                                  ? (detail.applyMetadataJson.git as { success?: boolean | null }).success
                                    ? "yes"
                                    : "no"
                                  : "not available"}
                                <br />
                                Commit hash:{" "}
                                {(detail.applyMetadataJson.git as { commitHash?: string | null }).commitHash ??
                                  "None"}
                                <br />
                                Message:{" "}
                                {(detail.applyMetadataJson.git as { message?: string | null }).message ??
                                  "None"}
                              </>
                            ) : (
                              "No git commit metadata recorded."
                            )}
                          </div>
                        </div>
                        {Object.keys(detail.applyMetadataJson).length > 0 ? (
                          <pre className="overflow-x-auto rounded-2xl border border-border/70 bg-background/80 p-4 text-xs leading-6 text-muted-foreground">
                            {formatJson(detail.applyMetadataJson)}
                          </pre>
                        ) : null}
                      </Section>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
