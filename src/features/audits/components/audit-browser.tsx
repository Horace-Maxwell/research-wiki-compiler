"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DatabaseZap,
  FileSearch,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

import type { AuditFinding, AuditMode, AuditRunDetail, AuditRunSummary } from "@/lib/contracts/audit";
import {
  auditRunDetailSchema,
  listAuditsResponseSchema,
  runAuditRequestSchema,
  runAuditResponseSchema,
} from "@/lib/contracts/audit";
import { describeApiError, readResponseJson } from "@/lib/client-api";
import {
  ACTIVE_WORKSPACE_STORAGE_KEY,
  AUDIT_MODE_LABELS,
  AUDIT_MODES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type AuditBrowserProps = {
  defaultWorkspaceRoot: string;
};

const auditModeDescriptions: Record<AuditMode, string> = {
  contradiction:
    "Compare summarized claims conservatively and surface polarity or time tensions that deserve review.",
  coverage:
    "Find recurring entities or concepts in summarized sources that still lack durable wiki coverage.",
  orphan:
    "Flag pages that are effectively disconnected from the rest of the wiki graph.",
  stale:
    "Highlight important referenced pages that have gone quiet for too long.",
  unsupported_claims:
    "Detect substantive wiki pages that no longer point back to real supporting sources.",
};

const severityVariantMap = {
  low: "outline",
  medium: "warning",
  high: "default",
} as const;

const statusVariantMap = {
  running: "warning",
  completed: "success",
  failed: "default",
} as const;

function readStoredWorkspaceRoot() {
  if (typeof window === "undefined") {
    return null;
  }

  const storage = window.localStorage;

  if (!storage || typeof storage.getItem !== "function") {
    return null;
  }

  return storage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}

function persistWorkspaceRoot(workspaceRoot: string) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = window.localStorage;

  if (!storage || typeof storage.setItem !== "function") {
    return;
  }

  storage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceRoot);
}

async function fetchAuditList(workspaceRoot: string) {
  const response = await fetch(
    `/api/audits?${new URLSearchParams({ workspaceRoot }).toString()}`,
    {
      cache: "no-store",
    },
  );
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to load audits."));
  }

  return listAuditsResponseSchema.parse(data).audits;
}

async function fetchAuditDetail(workspaceRoot: string, auditId: string) {
  const response = await fetch(
    `/api/audits/${auditId}?${new URLSearchParams({ workspaceRoot }).toString()}`,
    {
      cache: "no-store",
    },
  );
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to load audit."));
  }

  return auditRunDetailSchema.parse(data);
}

async function requestAuditRun(workspaceRoot: string, mode: AuditMode) {
  const response = await fetch("/api/audits/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      runAuditRequestSchema.parse({
        workspaceRoot,
        mode,
      }),
    ),
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to run audit."));
  }

  return runAuditResponseSchema.parse(data).audit;
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

function mapDetailToSummary(detail: AuditRunDetail): AuditRunSummary {
  return {
    id: detail.id,
    mode: detail.mode,
    status: detail.status,
    reportPath: detail.reportPath,
    findingCount: detail.findings.length,
    severityCounts: detail.severityCounts,
    createdAt: detail.createdAt,
    completedAt: detail.completedAt,
  };
}

function createPageHref(workspaceRoot: string, pageId: string) {
  return `/wiki?${new URLSearchParams({
    workspaceRoot,
    pageId,
  }).toString()}`;
}

function createSourceHref(workspaceRoot: string, sourceId: string) {
  return `/sources?${new URLSearchParams({
    workspaceRoot,
    sourceId,
  }).toString()}`;
}

function Pane({
  title,
  actions,
  className,
  children,
}: {
  title: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[640px] flex-col rounded-[24px] border border-border/70 bg-card/80 shadow-[0_14px_50px_-34px_rgba(15,23,42,0.45)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </div>
        {actions}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
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

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1.5 rounded-2xl border border-border/70 bg-background/60 p-3">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm text-foreground">{value}</div>
    </div>
  );
}

function FindingCard({
  workspaceRoot,
  finding,
}: {
  workspaceRoot: string;
  finding: AuditFinding;
}) {
  return (
    <div className="space-y-4 rounded-[22px] border border-border/70 bg-background/65 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={severityVariantMap[finding.severity]}>{finding.severity}</Badge>
        <Badge variant="outline">{AUDIT_MODE_LABELS[finding.mode]}</Badge>
        <div className="text-sm font-medium text-foreground">{finding.title}</div>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{finding.note}</p>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-border/70 bg-background/80 p-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Related pages
          </div>
          {finding.relatedPageIds.length === 0 ? (
            <div className="text-sm text-muted-foreground">No wiki pages attached.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {finding.relatedPageIds.map((pageId, index) => (
                <Button key={`${pageId}-${index}`} asChild variant="outline" size="sm">
                  <Link href={createPageHref(workspaceRoot, pageId)}>
                    {finding.relatedPagePaths[index] ?? pageId}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="space-y-2 rounded-2xl border border-border/70 bg-background/80 p-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Related sources
          </div>
          {finding.relatedSourceIds.length === 0 ? (
            <div className="text-sm text-muted-foreground">No raw or summarized sources attached.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {finding.relatedSourceIds.map((sourceId) => (
                <Button key={sourceId} asChild variant="outline" size="sm">
                  <Link href={createSourceHref(workspaceRoot, sourceId)}>{sourceId}</Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
      {Object.keys(finding.metadata).length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-border/70 bg-background/80 p-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Detection metadata
          </div>
          <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-muted-foreground">
            {JSON.stringify(finding.metadata, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}

export function AuditBrowser({ defaultWorkspaceRoot }: AuditBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [audits, setAudits] = useState<AuditRunSummary[]>([]);
  const [detail, setDetail] = useState<AuditRunDetail | null>(null);
  const [isLoadingAudits, setIsLoadingAudits] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [runningMode, setRunningMode] = useState<AuditMode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const queryWorkspaceRoot = searchParams.get("workspaceRoot");
  const selectedAuditId = searchParams.get("auditId");

  useEffect(() => {
    const storedRoot =
      queryWorkspaceRoot ?? readStoredWorkspaceRoot() ?? defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
    persistWorkspaceRoot(storedRoot);
  }, [defaultWorkspaceRoot, queryWorkspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadAudits() {
      setIsLoadingAudits(true);
      setErrorMessage(null);

      try {
        const nextAudits = await fetchAuditList(workspaceRoot);

        if (!isActive) {
          return;
        }

        setAudits(nextAudits);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setAudits([]);
        setDetail(null);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load audits.");
      } finally {
        if (isActive) {
          setIsLoadingAudits(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadAudits();
    }

    return () => {
      isActive = false;
    };
  }, [workspaceRoot]);

  useEffect(() => {
    if (isLoadingAudits) {
      return;
    }

    const hasSelectedAudit =
      selectedAuditId !== null && audits.some((audit) => audit.id === selectedAuditId);

    if (audits.length === 0) {
      if (selectedAuditId) {
        const params = new URLSearchParams({ workspaceRoot });

        startTransition(() => {
          router.replace(`${pathname}?${params.toString()}`);
        });
      }
      return;
    }

    if (!hasSelectedAudit) {
      const params = new URLSearchParams({
        workspaceRoot,
        auditId: audits[0]!.id,
      });

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }
  }, [audits, isLoadingAudits, pathname, router, selectedAuditId, workspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadAuditDetail() {
      if (!selectedAuditId) {
        setDetail(null);
        return;
      }

      setIsLoadingDetail(true);
      setErrorMessage(null);

      try {
        const nextDetail = await fetchAuditDetail(workspaceRoot, selectedAuditId);

        if (!isActive) {
          return;
        }

        setDetail(nextDetail);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDetail(null);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load audit detail.");
      } finally {
        if (isActive) {
          setIsLoadingDetail(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadAuditDetail();
    }

    return () => {
      isActive = false;
    };
  }, [selectedAuditId, workspaceRoot]);

  async function reloadAuditList() {
    setIsLoadingAudits(true);
    setErrorMessage(null);

    try {
      const nextAudits = await fetchAuditList(workspaceRoot);

      setAudits(nextAudits);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh audits.");
    } finally {
      setIsLoadingAudits(false);
    }
  }

  async function handleRunAudit(mode: AuditMode) {
    setRunningMode(mode);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const nextDetail = await requestAuditRun(workspaceRoot, mode);
      const nextSummary = mapDetailToSummary(nextDetail);
      const params = new URLSearchParams({
        workspaceRoot,
        auditId: nextDetail.id,
      });

      setDetail(nextDetail);
      setAudits((current) => [
        nextSummary,
        ...current.filter((audit) => audit.id !== nextDetail.id),
      ]);
      setNoticeMessage(
        `${AUDIT_MODE_LABELS[mode]} audit completed with ${nextDetail.findings.length} finding${nextDetail.findings.length === 1 ? "" : "s"}.`,
      );

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to run audit.");
    } finally {
      setRunningMode(null);
    }
  }

  const sortedFindings = useMemo(() => {
    if (!detail) {
      return [];
    }

    return [...detail.findings].sort((left, right) => {
      const severityWeight = {
        high: 3,
        medium: 2,
        low: 1,
      };

      return (
        severityWeight[right.severity] - severityWeight[left.severity] ||
        left.title.localeCompare(right.title)
      );
    });
  }, [detail]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Audits"
        title="Inspect structural weaknesses in the compiled knowledge base"
        description="Run conservative audit passes over the local wiki and summarized sources to spot contradictions, coverage gaps, stale pages, orphan pages, and unsupported claims before they calcify."
        badge="Inspection"
      />

      {errorMessage ? <FeedbackBanner variant="error">{errorMessage}</FeedbackBanner> : null}

      {noticeMessage ? <FeedbackBanner variant="success">{noticeMessage}</FeedbackBanner> : null}

      <div className="grid gap-6 xl:grid-cols-[1.05fr_1.35fr_1fr]">
        <Pane
          title="Run & History"
          actions={
            <Button variant="ghost" size="sm" onClick={() => void reloadAuditList()}>
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          }
        >
          <div className="space-y-6 p-4">
            <div className="space-y-3">
              {AUDIT_MODES.map((mode) => {
                const isRunning = runningMode === mode;

                return (
                  <div
                    key={mode}
                    className="space-y-3 rounded-[22px] border border-border/70 bg-background/65 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">
                          {AUDIT_MODE_LABELS[mode]}
                        </div>
                        <div className="text-sm leading-6 text-muted-foreground">
                          {auditModeDescriptions[mode]}
                        </div>
                      </div>
                      <div className="rounded-2xl bg-accent/50 p-2 text-muted-foreground">
                        <DatabaseZap className="size-4" />
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => void handleRunAudit(mode)}
                      disabled={runningMode !== null}
                    >
                      {isRunning ? "Running audit..." : `Run ${AUDIT_MODE_LABELS[mode]} audit`}
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Audit history
              </div>
              {isLoadingAudits ? (
                <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                  Loading audit history...
                </div>
              ) : audits.length === 0 ? (
                <EmptyState
                  title="No audits yet"
                  description="Run an audit mode to generate a file-backed report and add it to the local history."
                />
              ) : (
                <div className="space-y-3">
                  {audits.map((audit) => {
                    const active = audit.id === selectedAuditId;
                    const params = new URLSearchParams({
                      workspaceRoot,
                      auditId: audit.id,
                    });

                    return (
                      <button
                        key={audit.id}
                        type="button"
                        className={cn(
                          "w-full rounded-[22px] border px-4 py-4 text-left transition-colors",
                          active
                            ? "border-primary/40 bg-primary/10"
                            : "border-border/70 bg-background/65 hover:bg-accent/40",
                        )}
                        onClick={() =>
                          startTransition(() => {
                            router.push(`${pathname}?${params.toString()}`);
                          })
                        }
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={statusVariantMap[audit.status]}>{audit.status}</Badge>
                          <Badge variant="outline">{AUDIT_MODE_LABELS[audit.mode]}</Badge>
                        </div>
                        <div className="mt-3 text-sm font-medium text-foreground">
                          {audit.findingCount} finding{audit.findingCount === 1 ? "" : "s"}
                        </div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          {formatDateTime(audit.completedAt ?? audit.createdAt)}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline">High {audit.severityCounts.high}</Badge>
                          <Badge variant="outline">Medium {audit.severityCounts.medium}</Badge>
                          <Badge variant="outline">Low {audit.severityCounts.low}</Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Pane>

        <Pane
          title="Findings"
          actions={
            detail ? (
              <div className="flex flex-wrap gap-2">
                <Badge variant={statusVariantMap[detail.status]}>{detail.status}</Badge>
                <Badge variant="outline">{AUDIT_MODE_LABELS[detail.mode]}</Badge>
              </div>
            ) : null
          }
        >
          <div className="space-y-4 p-4">
            {isLoadingDetail ? (
              <div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                Loading audit detail...
              </div>
            ) : !detail ? (
              <EmptyState
                title="Select an audit run"
                description="Choose an item from the local history or run a new audit pass to inspect findings."
              />
            ) : sortedFindings.length === 0 ? (
              <div className="space-y-4 rounded-[22px] border border-emerald-500/30 bg-emerald-500/10 p-5">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="size-5 text-emerald-700" />
                  <div className="text-sm font-medium text-foreground">
                    No findings detected in this pass
                  </div>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  This conservative audit run did not detect issues that crossed the reporting
                  threshold for {AUDIT_MODE_LABELS[detail.mode].toLowerCase()}.
                </p>
              </div>
            ) : (
              sortedFindings.map((finding) => (
                <FindingCard
                  key={finding.id}
                  workspaceRoot={workspaceRoot}
                  finding={finding}
                />
              ))
            )}
          </div>
        </Pane>

        <Pane title="Report & Metadata">
          <div className="space-y-4 p-4">
            {!detail ? (
              <EmptyState
                title="No audit report selected"
                description="Audit reports are written into the workspace under /audits and indexed here for later review."
              />
            ) : (
              <>
                <div className="grid gap-3">
                  <MetaRow label="Audit ID" value={<code>{detail.id}</code>} />
                  <MetaRow label="Report path" value={detail.reportPath ?? "Not written"} />
                  <MetaRow label="Created" value={formatDateTime(detail.createdAt)} />
                  <MetaRow
                    label="Completed"
                    value={formatDateTime(detail.completedAt ?? detail.createdAt)}
                  />
                  <MetaRow label="Findings" value={detail.findings.length} />
                  <MetaRow
                    label="Severity mix"
                    value={`High ${detail.severityCounts.high}, Medium ${detail.severityCounts.medium}, Low ${detail.severityCounts.low}`}
                  />
                </div>

                <div className="space-y-3 rounded-[22px] border border-border/70 bg-background/65 p-4">
                  <div className="flex items-center gap-2">
                    <FileSearch className="size-4 text-muted-foreground" />
                    <div className="text-sm font-medium text-foreground">
                      Human-readable report artifact
                    </div>
                  </div>
                  {detail.reportMarkdown ? (
                    <pre className="max-h-[560px] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-border/70 bg-background/80 p-4 text-xs leading-6 text-muted-foreground">
                      {detail.reportMarkdown}
                    </pre>
                  ) : (
                    <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-6 text-sm text-muted-foreground">
                      The markdown artifact could not be read from disk.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Pane>
      </div>
    </div>
  );
}
