"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Activity,
  BookText,
  BotMessageSquare,
  ClipboardCheck,
  DatabaseZap,
  FileStack,
  FolderKanban,
  Sparkles,
} from "lucide-react";

import type { DashboardOverview } from "@/lib/contracts/dashboard";
import { dashboardOverviewSchema } from "@/lib/contracts/dashboard";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/lib/constants";
import type { WorkspaceStatus } from "@/lib/contracts/workspace";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkspaceSetupPanel } from "@/features/workspace/components/workspace-setup-panel";

type DashboardWorkbenchProps = {
  defaultWorkspaceRoot: string;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchDashboard(workspaceRoot: string) {
  const response = await fetch(
    `/api/dashboard?${new URLSearchParams({ workspaceRoot }).toString()}`,
    {
      cache: "no-store",
    },
  );
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(
      (data as { message?: string } | null)?.message ?? "Failed to load dashboard overview.",
    );
  }

  return dashboardOverviewSchema.parse((data as { dashboard: unknown }).dashboard);
}

function MetricCard({
  title,
  value,
  description,
  icon,
  href,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  href?: string;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardDescription>{title}</CardDescription>
            <CardTitle className="text-3xl">{value}</CardTitle>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-3 text-muted-foreground">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="text-sm leading-6 text-muted-foreground">{description}</div>
        {href ? (
          <Button asChild size="sm" variant="outline">
            <Link href={href}>Open</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EmptyOverview({ workspaceRoot }: { workspaceRoot: string }) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle>Initialize a workspace to unlock the compiled wiki loops</CardTitle>
        <CardDescription>
          The dashboard will show wiki, source, review, ask, archive, and audit activity once the
          local workspace at <span className="font-mono">{workspaceRoot}</span> is ready.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export function DashboardWorkbench({ defaultWorkspaceRoot }: DashboardWorkbenchProps) {
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedRoot =
      window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ?? defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
  }, [defaultWorkspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextDashboard = await fetchDashboard(workspaceRoot);

        if (!isActive) {
          return;
        }

        setDashboard(nextDashboard);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDashboard(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load dashboard overview.",
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadDashboard();
    }

    return () => {
      isActive = false;
    };
  }, [workspaceRoot]);

  function handleStatusChange(status: WorkspaceStatus) {
    setWorkspaceRoot(status.workspaceRoot);
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, status.workspaceRoot);
    void fetchDashboard(status.workspaceRoot)
      .then((nextDashboard) => {
        setDashboard(nextDashboard);
        setErrorMessage(null);
      })
      .catch((error) => {
        setDashboard(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to refresh dashboard overview.",
        );
      });
  }

  const recentActivity = dashboard?.recentActivity ?? [];
  const counts = dashboard?.counts;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title="Visible control surface for the local research workspace"
        description="Track the health of the file-backed wiki, source pipeline, review queue, answer artifacts, and audit history from one place."
        badge="MVP"
      />

      {errorMessage ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800">
          {errorMessage}
        </div>
      ) : null}

      <WorkspaceSetupPanel
        defaultWorkspaceRoot={defaultWorkspaceRoot}
        onStatusChange={handleStatusChange}
      />

      {isLoading && !dashboard ? (
        <Card>
          <CardContent className="py-10 text-sm text-muted-foreground">
            Loading workspace overview...
          </CardContent>
        </Card>
      ) : !dashboard || !dashboard.initialized || !counts ? (
        <EmptyOverview workspaceRoot={workspaceRoot} />
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-4">
            <MetricCard
              title="Wiki pages"
              value={String(counts.wikiPages.total)}
              description={`${counts.wikiPages.byType.concept ?? 0} concepts, ${counts.wikiPages.byType.topic ?? 0} topics, ${counts.wikiPages.byType.synthesis ?? 0} syntheses.`}
              icon={<BookText className="size-5" />}
              href={`/wiki?${new URLSearchParams({ workspaceRoot }).toString()}`}
            />
            <MetricCard
              title="Imported sources"
              value={String(counts.sources.total)}
              description={`${counts.sources.bySummaryStatus.completed ?? 0} summarized, ${counts.sources.bySummaryStatus.failed ?? 0} failed, ${counts.sources.bySummaryStatus.not_started ?? 0} waiting.`}
              icon={<FileStack className="size-5" />}
              href={`/sources?${new URLSearchParams({ workspaceRoot }).toString()}`}
            />
            <MetricCard
              title="Review queue"
              value={String(counts.reviews.byStatus.pending ?? 0)}
              description={`${counts.reviews.byStatus.approved ?? 0} approved and ${counts.reviews.byStatus.rejected ?? 0} rejected proposals remain visible in history.`}
              icon={<ClipboardCheck className="size-5" />}
              href={`/reviews?${new URLSearchParams({ workspaceRoot, status: "pending" }).toString()}`}
            />
            <MetricCard
              title="Answers and audits"
              value={`${counts.answers.total} / ${counts.audits.total}`}
              description={`${counts.answers.archived} archived answers and ${counts.audits.byStatus.completed ?? 0} completed audits are already part of the local evidence trail.`}
              icon={<DatabaseZap className="size-5" />}
              href={`/ask?${new URLSearchParams({ workspaceRoot }).toString()}`}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_420px]">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-border/70">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <CardTitle>Recent local activity</CardTitle>
                    <CardDescription>
                      Lightweight logs from persisted jobs, reviews, answers, and audits.
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{recentActivity.length} events</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-5">
                {recentActivity.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/60 px-4 py-8 text-sm text-muted-foreground">
                    Local activity will appear here as soon as this workspace runs summaries,
                    reviews, answers, or audits.
                  </div>
                ) : (
                  recentActivity.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-background/60 p-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{entry.kind.replace("_", " ")}</Badge>
                          <Badge
                            variant={
                              entry.status === "completed" ||
                              entry.status === "approved" ||
                              entry.status === "archived"
                                ? "success"
                                : entry.status === "failed" || entry.status === "rejected"
                                  ? "default"
                                  : "warning"
                            }
                          >
                            {entry.status}
                          </Badge>
                        </div>
                        <div className="text-sm font-medium text-foreground">{entry.title}</div>
                        <div className="text-sm leading-6 text-muted-foreground">
                          {entry.description}
                        </div>
                      </div>
                      <div className="shrink-0 space-y-2 text-right">
                        <div className="text-xs text-muted-foreground">
                          {formatDateTime(entry.timestamp)}
                        </div>
                        {entry.href ? (
                          <Button asChild size="sm" variant="outline">
                            <Link href={entry.href}>Open</Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <div className="space-y-5">
              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/70">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="size-5 text-primary" />
                    <div>
                      <CardTitle>Workspace posture</CardTitle>
                      <CardDescription>
                        Core local prerequisites for a trustworthy compiled wiki workflow.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="success">{dashboard.workspaceName ?? "Workspace"}</Badge>
                    <Badge variant={dashboard.gitInitialized ? "success" : "outline"}>
                      {dashboard.gitInitialized ? "Git ready" : "Git disabled"}
                    </Badge>
                    <Badge variant={dashboard.databaseInitialized ? "success" : "outline"}>
                      {dashboard.databaseInitialized ? "SQLite ready" : "DB missing"}
                    </Badge>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm leading-7 text-foreground">
                    Active local root:
                    <div className="mt-2 break-all font-mono text-xs text-muted-foreground">
                      {dashboard.workspaceRoot}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/70">
                  <div className="flex items-center gap-3">
                    <Sparkles className="size-5 text-primary" />
                    <div>
                      <CardTitle>Fast paths</CardTitle>
                      <CardDescription>
                        Jump into the parts of the product that matter most in a live demo.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 pt-5">
                  <Button asChild variant="outline">
                    <Link href={`/sources?${new URLSearchParams({ workspaceRoot }).toString()}`}>
                      <FileStack className="size-4" />
                      Browse sources
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/reviews?${new URLSearchParams({ workspaceRoot }).toString()}`}>
                      <ClipboardCheck className="size-4" />
                      Open review queue
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/ask?${new URLSearchParams({ workspaceRoot }).toString()}`}>
                      <BotMessageSquare className="size-4" />
                      Ask from the wiki
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/audits?${new URLSearchParams({ workspaceRoot }).toString()}`}>
                      <Activity className="size-4" />
                      Inspect audits
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
