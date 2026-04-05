"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  BookText,
  ClipboardCheck,
  Sparkles,
  Workflow,
} from "lucide-react";

import type { DashboardOverview } from "@/lib/contracts/dashboard";
import { dashboardOverviewSchema } from "@/lib/contracts/dashboard";
import { ACTIVE_WORKSPACE_STORAGE_KEY, WIKI_PAGE_TYPE_LABELS } from "@/lib/constants";
import type { WorkspaceStatus } from "@/lib/contracts/workspace";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceSetupPanel } from "@/features/workspace/components/workspace-setup-panel";

type DashboardWorkbenchProps = {
  defaultWorkspaceRoot: string;
  initialDashboard?: DashboardOverview | null;
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

function createWorkspaceHref(
  routePath: string,
  workspaceRoot: string,
  query: Record<string, string> = {},
) {
  const params = new URLSearchParams({
    workspaceRoot,
    ...query,
  });

  return `${routePath}?${params.toString()}`;
}

function formatActivityKind(kind: DashboardOverview["recentActivity"][number]["kind"]) {
  switch (kind) {
    case "job_run":
      return "Job";
    case "review":
      return "Review";
    case "answer":
      return "Answer";
    case "audit":
      return "Audit";
    case "workspace":
      return "Workspace";
    default:
      return kind;
  }
}

function statusVariant(status: string) {
  if (
    status === "completed" ||
    status === "approved" ||
    status === "archived" ||
    status === "created"
  ) {
    return "success";
  }

  if (status === "failed" || status === "rejected") {
    return "default";
  }

  return "warning";
}

function summaryStatusVariant(status: string) {
  if (status === "completed") {
    return "success";
  }

  if (status === "failed") {
    return "default";
  }

  return "outline";
}

function reviewStatusVariant(status: string) {
  if (status === "approved") {
    return "success";
  }

  if (status === "rejected") {
    return "outline";
  }

  return "warning";
}

function riskVariant(riskLevel: string) {
  if (riskLevel === "low") {
    return "success";
  }

  if (riskLevel === "medium") {
    return "warning";
  }

  return "default";
}

function severityVariant(severity: "low" | "medium" | "high" | null) {
  if (severity === "low") {
    return "success";
  }

  if (severity === "medium") {
    return "warning";
  }

  if (severity === "high") {
    return "default";
  }

  return "outline";
}

function Surface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[30px] border border-border/55 bg-card/76 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.18)] backdrop-blur-[2px]",
        className,
      )}
    >
      {children}
    </section>
  );
}

function SurfaceHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-6 py-5">
      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {eyebrow}
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? (
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">{description}</p>
          ) : null}
        </div>
      </div>
      {actions}
    </div>
  );
}

function CompactMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="space-y-2 border-t border-border/60 pt-4 first:border-t-0 first:pt-0 md:border-t-0 md:border-l md:pl-5 md:first:border-l-0 md:first:pl-0">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="text-[2rem] font-semibold tracking-[-0.05em] text-foreground">{value}</div>
      <div className="max-w-[24ch] text-sm leading-6 text-muted-foreground">{detail}</div>
    </div>
  );
}

function FlowStage({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="space-y-2 border-t border-border/60 pt-4 first:border-t-0 first:pt-0 md:border-t-0 md:border-l md:pl-5 md:first:border-l-0 md:first:pl-0">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="text-base font-semibold tracking-tight text-foreground">{value}</div>
      <div className="max-w-[24ch] text-sm leading-6 text-muted-foreground">{note}</div>
    </div>
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
    <div className="rounded-[22px] bg-muted/55 px-5 py-7">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{description}</div>
    </div>
  );
}

function ListRow({
  href,
  title,
  description,
  meta,
  badges,
}: {
  href: string;
  title: string;
  description: string;
  meta?: string;
  badges?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[18px] px-4 py-4 transition-colors hover:bg-foreground/[0.03]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-medium text-foreground">{title}</div>
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="text-sm leading-6 text-muted-foreground">{description}</div>
          {meta ? (
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {meta}
            </div>
          ) : null}
        </div>
        {badges ? <div className="flex shrink-0 flex-wrap gap-2">{badges}</div> : null}
      </div>
    </Link>
  );
}

function ActionRow({
  href,
  title,
  description,
  index,
}: {
  href: string;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <Link
      href={href}
      className="group block border-t border-border/60 py-4 first:border-t-0 first:pt-0 last:pb-0"
    >
      <div className="flex items-start gap-4">
        <div className="pt-0.5 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {String(index).padStart(2, "0")}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-foreground">{title}</div>
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="text-sm leading-6 text-muted-foreground">{description}</div>
        </div>
      </div>
    </Link>
  );
}

function ActivityRow({
  title,
  description,
  timestamp,
  kind,
  status,
  href,
}: DashboardOverview["recentActivity"][number]) {
  const content = (
    <div className="group rounded-[18px] px-4 py-4 transition-colors hover:bg-foreground/[0.035]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{formatActivityKind(kind)}</Badge>
            <Badge variant={statusVariant(status)}>{status}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-foreground">{title}</div>
            {href ? (
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            ) : null}
          </div>
          <div className="text-sm leading-6 text-muted-foreground">{description}</div>
        </div>
        <div className="shrink-0 text-right font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {formatDateTime(timestamp)}
        </div>
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function InitializedWorkspaceView({
  dashboard,
  workspaceRoot,
  defaultWorkspaceRoot,
  onStatusChange,
}: {
  dashboard: DashboardOverview;
  workspaceRoot: string;
  defaultWorkspaceRoot: string;
  onStatusChange: (status: WorkspaceStatus) => void;
}) {
  const [showWorkspaceTools, setShowWorkspaceTools] = useState(false);

  const counts = dashboard.counts!;
  const nextActions = useMemo(() => {
    const actions = [];

    if ((counts.reviews.byStatus.pending ?? 0) > 0) {
      actions.push({
        title: "Clear the review queue",
        description: `${counts.reviews.byStatus.pending} proposal${counts.reviews.byStatus.pending === 1 ? "" : "s"} waiting before the wiki can move forward safely.`,
        href: createWorkspaceHref("/reviews", workspaceRoot, { status: "pending" }),
      });
    }

    if ((counts.sources.bySummaryStatus.failed ?? 0) > 0) {
      actions.push({
        title: "Fix failed summaries",
        description: `${counts.sources.bySummaryStatus.failed} source summary run${counts.sources.bySummaryStatus.failed === 1 ? "" : "s"} failed and should be inspected.`,
        href: createWorkspaceHref("/sources", workspaceRoot),
      });
    }

    if (dashboard.featuredPages[0]) {
      actions.push({
        title: "Resume from the latest wiki page",
        description: `Continue reading or editing ${dashboard.featuredPages[0].title}.`,
        href: dashboard.featuredPages[0].href,
      });
    }

    if (dashboard.recentAudits[0]) {
      actions.push({
        title: "Inspect the latest audit finding",
        description: `${dashboard.recentAudits[0].mode} audit captured ${dashboard.recentAudits[0].findingsCount} finding${dashboard.recentAudits[0].findingsCount === 1 ? "" : "s"}.`,
        href: dashboard.recentAudits[0].href,
      });
    }

    actions.push({
      title: "Walk through the rendered example",
      description: "Use the OpenClaw example as the fastest guided way to understand the product.",
      href: "/examples/openclaw",
    });

    return actions.slice(0, 4);
  }, [counts, dashboard.featuredPages, dashboard.recentAudits, workspaceRoot]);

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.52fr)_332px]">
        <Surface className="overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(249,247,242,0.92))]">
          <div className="border-b border-border/60 px-7 py-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Knowledge workspace</Badge>
              <Badge variant={dashboard.gitInitialized ? "success" : "outline"}>
                {dashboard.gitInitialized ? "Git ready" : "Git off"}
              </Badge>
              <Badge variant={dashboard.databaseInitialized ? "success" : "outline"}>
                {dashboard.databaseInitialized ? "SQLite indexed" : "DB missing"}
              </Badge>
            </div>
            <div className="mt-5 grid gap-8 2xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Workspace home
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground/65">
                    Workspace: {dashboard.workspaceName ?? "Research Wiki"}
                  </div>
                  <h1 className="max-w-4xl text-[clamp(2.15rem,3.3vw,3.7rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-foreground">
                    Keep the wiki current, review what changed, and follow the next knowledge moves.
                  </h1>
                  <p className="max-w-3xl text-base leading-8 text-muted-foreground">
                    This workspace is a compiled research environment where source material becomes
                    visible summaries, reviewable mutation, durable wiki pages, grounded answers,
                    and inspectable audits.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href={createWorkspaceHref("/wiki", workspaceRoot)}>
                      <BookText className="size-4" />
                      Open wiki
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href={createWorkspaceHref("/reviews", workspaceRoot, { status: "pending" })}>
                      <ClipboardCheck className="size-4" />
                      Review changes
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost">
                    <Link href="/examples/openclaw">
                      <Sparkles className="size-4" />
                      Start with the example wiki
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="border-l border-border/60 pl-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Workspace posture
                </div>
                <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
                  <div className="space-y-1">
                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Durable layer
                    </div>
                    <p>
                      <span className="font-medium text-foreground">{counts.wikiPages.total} wiki pages</span>{" "}
                      already anchor the durable knowledge layer.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Review gate
                    </div>
                    <p>
                      <span className="font-medium text-foreground">
                        {counts.reviews.byStatus.pending ?? 0} pending reviews
                      </span>{" "}
                      are still holding back new knowledge from mutating the wiki.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                      Archived learning
                    </div>
                    <p>
                      <span className="font-medium text-foreground">{counts.answers.archived} archived answers</span>{" "}
                      have already folded grounded synthesis back into retrieval.
                    </p>
                  </div>
                </div>
                <div className="mt-5 border-t border-border/60 pt-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Active root
                  </div>
                  <div className="mt-2 break-all font-mono text-[11px] leading-6 text-foreground/90">
                    {dashboard.workspaceRoot}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5 px-7 py-6 md:grid-cols-2 xl:grid-cols-4">
            <CompactMetric
              label="Wiki pages"
              value={String(counts.wikiPages.total)}
              detail={`${counts.wikiPages.byType.topic ?? 0} topics, ${counts.wikiPages.byType.entity ?? 0} entities, ${counts.wikiPages.byType.synthesis ?? 0} syntheses.`}
            />
            <CompactMetric
              label="Source intake"
              value={String(counts.sources.total)}
              detail={`${counts.sources.bySummaryStatus.completed ?? 0} summarized, ${counts.sources.bySummaryStatus.failed ?? 0} failed, ${counts.sources.bySummaryStatus.not_started ?? 0} queued.`}
            />
            <CompactMetric
              label="Review queue"
              value={String(counts.reviews.byStatus.pending ?? 0)}
              detail={`${counts.reviews.byStatus.approved ?? 0} approved and ${counts.reviews.byStatus.rejected ?? 0} rejected proposals remain inspectable.`}
            />
            <CompactMetric
              label="Answers + audits"
              value={`${counts.answers.archived} / ${counts.audits.total}`}
              detail={`${counts.answers.total} total answers and ${counts.audits.byStatus.completed ?? 0} completed audits shape the evidence trail.`}
            />
          </div>

          <div className="border-t border-border/60 px-7 py-6">
            <div className="mb-4 flex items-center gap-3">
              <Workflow className="size-4 text-primary" />
              <div>
                <div className="text-sm font-medium text-foreground">Compiled wiki loop</div>
                <div className="text-sm text-muted-foreground">
                  The product model should feel like an operating rhythm, not a grid of modules.
                </div>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <FlowStage
                label="Sources"
                value={`${counts.sources.total} imported`}
                note={`${counts.sources.bySummaryStatus.completed ?? 0} sources have summary artifacts on disk.`}
              />
              <FlowStage
                label="Review"
                value={`${counts.reviews.byStatus.pending ?? 0} pending`}
                note="Knowledge mutation stays explicit until a proposal is approved."
              />
              <FlowStage
                label="Wiki"
                value={`${counts.wikiPages.total} pages`}
                note="Markdown pages remain the durable source of truth."
              />
              <FlowStage
                label="Archive"
                value={`${counts.answers.archived} archived`}
                note="Good grounded answers can re-enter retrieval as durable notes or syntheses."
              />
              <FlowStage
                label="Audit"
                value={`${counts.audits.total} runs`}
                note="Audits surface coverage gaps, orphans, staleness, and unsupported claims."
              />
            </div>
          </div>
        </Surface>

        <div className="space-y-5">
          <Surface className="overflow-hidden bg-background/72 shadow-none">
            <SurfaceHeader
              eyebrow="Next actions"
              title="What deserves attention next"
              description="The workspace home should tell you what to do, not just what exists."
            />
            <div className="px-6 py-5">
              {nextActions.map((action, index) => (
                <ActionRow
                  key={action.title}
                  description={action.description}
                  href={action.href}
                  index={index + 1}
                  title={action.title}
                />
              ))}
            </div>
          </Surface>

          <Surface className="overflow-hidden bg-background/72 shadow-none">
            <SurfaceHeader
              eyebrow="Workspace + example"
              title="Local posture and guided entry"
              description="Keep the real workspace visible while still making the example path easy to reach."
              actions={
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowWorkspaceTools((current) => !current)}
                >
                  {showWorkspaceTools ? "Hide workspace tools" : "Adjust workspace"}
                </Button>
              }
            />
            <div className="space-y-5 px-6 py-5">
              <div className="space-y-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Active root
                </div>
                <div className="break-all font-mono text-[11px] leading-6 text-foreground/90">
                  {dashboard.workspaceRoot}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant={dashboard.gitInitialized ? "success" : "outline"}>
                  {dashboard.gitInitialized ? "Versioned locally" : "Git not initialized"}
                </Badge>
                <Badge variant={dashboard.databaseInitialized ? "success" : "outline"}>
                  {dashboard.databaseInitialized ? "Index ready" : "SQLite missing"}
                </Badge>
              </div>
              <p className="text-sm leading-7 text-muted-foreground">
                Open the rendered example first to see the file-backed wiki in product form, then
                inspect the source-of-truth Markdown and artifact trail in the repository.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href="/examples/openclaw">
                    <BookMarked className="size-4" />
                    Open rendered example
                  </Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki">
                    <ArrowRight className="size-4" />
                    Inspect example files
                  </Link>
                </Button>
              </div>
            </div>
          </Surface>
        </div>
      </div>

      {showWorkspaceTools ? (
        <WorkspaceSetupPanel
          defaultWorkspaceRoot={defaultWorkspaceRoot}
          onStatusChange={onStatusChange}
        />
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_352px]">
        <Surface className="overflow-hidden">
          <SurfaceHeader
            eyebrow="Knowledge workspace"
            title="Pages worth opening next"
            description="The wiki should read like the center of gravity, not a secondary tab."
            actions={
              <Button asChild size="sm" variant="ghost">
                <Link href={createWorkspaceHref("/wiki", workspaceRoot)}>
                  Open full wiki
                </Link>
              </Button>
            }
          />
          <div className="divide-y divide-border/70 px-2 py-2">
            {dashboard.featuredPages.length === 0 ? (
              <div className="px-4 py-4">
                <EmptyState
                  title="No wiki pages yet"
                  description="Once pages are created or compiled, the dashboard will spotlight the most relevant entries here."
                />
              </div>
            ) : (
              dashboard.featuredPages.map((page) => (
                <ListRow
                  key={page.id}
                  href={page.href}
                  title={page.title}
                  description={`${page.sourceRefCount} source refs · ${page.pageRefCount} related page references`}
                  meta={`${WIKI_PAGE_TYPE_LABELS[page.type as keyof typeof WIKI_PAGE_TYPE_LABELS] ?? page.type} · ${formatDateTime(page.updatedAt)}`}
                  badges={<Badge variant={reviewStatusVariant(page.reviewStatus)}>{page.reviewStatus}</Badge>}
                />
              ))
            )}
          </div>
        </Surface>

        <Surface className="overflow-hidden bg-background/74 shadow-none">
          <SurfaceHeader
            eyebrow="Work in flight"
            title="What is feeding the wiki right now"
            description="Sources and review proposals belong in the same operational frame: one feeds the system, the other gates mutation."
          />
          <div className="divide-y divide-border/60">
            <div className="px-2 py-2">
              <div className="px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Recent sources
                </div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Latest raw material entering the compile loop.
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {dashboard.recentSources.length === 0 ? (
                  <div className="px-4 py-4">
                    <EmptyState
                      title="No sources imported"
                      description="Bring in raw material and this section will track the top of the compile pipeline."
                    />
                  </div>
                ) : (
                  dashboard.recentSources.map((source) => (
                    <ListRow
                      key={source.id}
                      href={source.href}
                      title={source.title}
                      description={`${source.sourceType} source · ${source.status}`}
                      meta={formatDateTime(source.importedAt ?? source.updatedAt)}
                      badges={
                        <Badge variant={summaryStatusVariant(source.summaryStatus)}>
                          {source.summaryStatus}
                        </Badge>
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="px-2 py-2">
              <div className="px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Review focus
                </div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Proposals that are currently deciding whether the wiki moves forward.
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {dashboard.reviewFocus.length === 0 ? (
                  <div className="px-4 py-4">
                    <EmptyState
                      title="No review proposals yet"
                      description="Patch proposals will appear here once summarized sources begin targeting the wiki."
                    />
                  </div>
                ) : (
                  dashboard.reviewFocus.map((proposal) => (
                    <ListRow
                      key={proposal.id}
                      href={proposal.href}
                      title={proposal.title}
                      description={
                        proposal.targetPageTitle
                          ? `Targets ${proposal.targetPageTitle}`
                          : "Proposes a new page or structural change."
                      }
                      meta={`${proposal.proposalType.replace("_", " ")} · ${formatDateTime(proposal.updatedAt)}`}
                      badges={
                        <>
                          <Badge variant={reviewStatusVariant(proposal.status)}>{proposal.status}</Badge>
                          <Badge variant={riskVariant(proposal.riskLevel)}>{proposal.riskLevel} risk</Badge>
                        </>
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_352px]">
        <Surface className="overflow-hidden">
          <SurfaceHeader
            eyebrow="Recent movement"
            title="The knowledge base is alive"
            description="This timeline is the human-readable trace of summaries, reviews, archives, and audits changing the workspace."
            actions={<Badge variant="outline">{dashboard.recentActivity.length} recent events</Badge>}
          />
          <div className="divide-y divide-border/70 px-2 py-2">
            {dashboard.recentActivity.length === 0 ? (
              <div className="px-4 py-4">
                <EmptyState
                  title="No recent activity yet"
                  description="As soon as the workspace runs summaries, reviews, answers, or audits, the event stream will appear here."
                />
              </div>
            ) : (
              dashboard.recentActivity.map((entry) => <ActivityRow key={entry.id} {...entry} />)
            )}
          </div>
        </Surface>

        <Surface className="overflow-hidden bg-background/74 shadow-none">
          <SurfaceHeader
            eyebrow="Grounded outcomes"
            title="What is becoming durable"
            description="Archived answers and audits show whether the system is learning well and where it still needs work."
          />
          <div className="divide-y divide-border/60">
            <div className="px-2 py-2">
              <div className="px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Archived answers
                </div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Grounded answers that have already been folded back into the wiki.
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {dashboard.archivedAnswers.length === 0 ? (
                  <div className="px-4 py-4">
                    <EmptyState
                      title="No archived answers yet"
                      description="Ask from the wiki and archive the best grounded answers back into it."
                    />
                  </div>
                ) : (
                  dashboard.archivedAnswers.map((answer) => (
                    <ListRow
                      key={answer.id}
                      href={answer.href}
                      title={answer.archivedPageTitle ?? "Archived answer"}
                      description={answer.question}
                      meta={
                        answer.archivedPagePath
                          ? `${answer.archivedPagePath} · ${formatDateTime(answer.updatedAt)}`
                          : formatDateTime(answer.updatedAt)
                      }
                    />
                  ))
                )}
              </div>
            </div>

            <div className="px-2 py-2">
              <div className="px-4 py-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Audit watchpoints
                </div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">
                  Structural signals that keep the knowledge base honest about gaps and unsupported claims.
                </div>
              </div>
              <div className="divide-y divide-border/60">
                {dashboard.recentAudits.length === 0 ? (
                  <div className="px-4 py-4">
                    <EmptyState
                      title="No audits yet"
                      description="Run an audit to see structural weaknesses in the current knowledge base."
                    />
                  </div>
                ) : (
                  dashboard.recentAudits.map((audit) => (
                    <ListRow
                      key={audit.id}
                      href={audit.href}
                      title={`${audit.mode} audit`}
                      description={`${audit.findingsCount} finding${audit.findingsCount === 1 ? "" : "s"} recorded.`}
                      meta={audit.completedAt ? formatDateTime(audit.completedAt) : "Run still active"}
                      badges={
                        <>
                          <Badge variant={statusVariant(audit.status)}>{audit.status}</Badge>
                          {audit.highestSeverity ? (
                            <Badge variant={severityVariant(audit.highestSeverity)}>
                              {audit.highestSeverity} severity
                            </Badge>
                          ) : null}
                        </>
                      }
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </Surface>
      </div>
    </>
  );
}

function UninitializedWorkspaceView({
  workspaceRoot,
  defaultWorkspaceRoot,
  onStatusChange,
}: {
  workspaceRoot: string;
  defaultWorkspaceRoot: string;
  onStatusChange: (status: WorkspaceStatus) => void;
}) {
  return (
    <div className="space-y-8">
      <Surface className="overflow-hidden">
        <div className="grid gap-8 px-7 py-7 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Workspace not initialized</Badge>
              <Badge variant="outline">File-first setup</Badge>
            </div>
            <div className="space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Dashboard
              </div>
              <h1 className="max-w-4xl text-[clamp(2.2rem,3.8vw,4rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-foreground">
                Start by creating a real local research workspace.
              </h1>
              <p className="max-w-3xl text-base leading-8 text-muted-foreground">
                The product only becomes meaningful once it has a local workspace to own. That
                workspace will hold the Markdown wiki, visible summary artifacts, reviews, audits,
                and runtime index that make the system trustworthy.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-border/70 bg-background/74 p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Active root
            </div>
            <div className="mt-3 break-all font-mono text-xs leading-6 text-foreground">
              {workspaceRoot}
            </div>
            <div className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
              <p>Initialize the workspace first, then open the wiki as the main knowledge layer.</p>
              <p>
                If you want to see the finished product shape before setting up your own workspace,
                open the rendered OpenClaw example.
              </p>
            </div>
            <div className="mt-5">
              <Button asChild variant="outline">
                <Link href="/examples/openclaw">
                  <Sparkles className="size-4" />
                  Open rendered example
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Surface>

      <WorkspaceSetupPanel
        defaultWorkspaceRoot={defaultWorkspaceRoot}
        onStatusChange={onStatusChange}
      />
    </div>
  );
}

function LoadingView() {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
      <Surface className="overflow-hidden">
        <div className="space-y-6 px-7 py-7">
          <div className="space-y-3">
            <div className="h-3 w-28 rounded-full bg-muted" />
            <div className="h-11 w-full max-w-3xl rounded-full bg-muted/80" />
            <div className="h-4 w-full max-w-2xl rounded-full bg-muted/60" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3 border-t border-border/60 pt-4 first:border-t-0 first:pt-0 md:border-t-0 md:border-l md:pl-5 md:first:border-l-0 md:first:pl-0">
                <div className="h-3 w-20 rounded-full bg-muted/70" />
                <div className="h-8 w-16 rounded-full bg-muted/80" />
                <div className="h-3 w-full max-w-[180px] rounded-full bg-muted/60" />
                <div className="h-3 w-full max-w-[150px] rounded-full bg-muted/45" />
              </div>
            ))}
          </div>
          <div className="border-t border-border/60 pt-6">
            <div className="h-3 w-32 rounded-full bg-muted/70" />
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="space-y-3 border-t border-border/60 pt-4 first:border-t-0 first:pt-0 md:border-t-0 md:border-l md:pl-5 md:first:border-l-0 md:first:pl-0">
                  <div className="h-3 w-16 rounded-full bg-muted/70" />
                  <div className="h-5 w-24 rounded-full bg-muted/75" />
                  <div className="h-3 w-full max-w-[140px] rounded-full bg-muted/50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </Surface>

      <div className="space-y-5">
        {Array.from({ length: 2 }).map((_, index) => (
          <Surface key={index} className="overflow-hidden">
            <div className="space-y-4 px-6 py-5">
              <div className="h-3 w-24 rounded-full bg-muted/70" />
              <div className="h-6 w-full max-w-[220px] rounded-full bg-muted/80" />
              <div className="space-y-2 pt-2">
                {Array.from({ length: 3 }).map((__, rowIndex) => (
                  <div key={rowIndex} className="h-12 rounded-[18px] bg-muted/45" />
                ))}
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}

export function DashboardWorkbench({
  defaultWorkspaceRoot,
  initialDashboard = null,
}: DashboardWorkbenchProps) {
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(initialDashboard);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedWorkspaceRoot, setLoadedWorkspaceRoot] = useState<string | null>(
    initialDashboard?.workspaceRoot ?? null,
  );

  useEffect(() => {
    const storedRoot =
      window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ?? defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
  }, [defaultWorkspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      if (workspaceRoot === loadedWorkspaceRoot) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextDashboard = await fetchDashboard(workspaceRoot);

        if (!isActive) {
          return;
        }

        setDashboard(nextDashboard);
        setLoadedWorkspaceRoot(nextDashboard.workspaceRoot);
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
  }, [loadedWorkspaceRoot, workspaceRoot]);

  function handleStatusChange(status: WorkspaceStatus) {
    setWorkspaceRoot(status.workspaceRoot);
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, status.workspaceRoot);
    void fetchDashboard(status.workspaceRoot)
      .then((nextDashboard) => {
        setDashboard(nextDashboard);
        setLoadedWorkspaceRoot(nextDashboard.workspaceRoot);
        setErrorMessage(null);
      })
      .catch((error) => {
        setDashboard(null);
        setLoadedWorkspaceRoot(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to refresh dashboard overview.",
        );
      });
  }

  return (
    <div className="space-y-8">
      {errorMessage ? (
        <div className="rounded-[22px] border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm leading-7 text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      {isLoading && !dashboard ? (
        <LoadingView />
      ) : dashboard?.initialized && dashboard.counts ? (
        <InitializedWorkspaceView
          dashboard={dashboard}
          workspaceRoot={workspaceRoot}
          defaultWorkspaceRoot={defaultWorkspaceRoot}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <UninitializedWorkspaceView
          workspaceRoot={workspaceRoot}
          defaultWorkspaceRoot={defaultWorkspaceRoot}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
