"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookText,
  Settings2,
  Sparkles,
} from "lucide-react";

import {
  getLocaleCopy,
  getReviewStatusLabel,
  getWikiPageTypeLabel,
  localeToIntlTag,
} from "@/lib/app-locale";
import type { DashboardOverview } from "@/lib/contracts/dashboard";
import type { WikiPageType } from "@/lib/contracts/wiki";
import { dashboardOverviewSchema } from "@/lib/contracts/dashboard";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/lib/constants";
import type { WorkspaceStatus } from "@/lib/contracts/workspace";
import { cn } from "@/lib/utils";
import { useAppLocale } from "@/components/app-locale-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkspaceSetupPanel } from "@/features/workspace/components/workspace-setup-panel";

type DashboardWorkbenchProps = {
  defaultWorkspaceRoot: string;
  initialDashboard?: DashboardOverview | null;
};

const DASHBOARD_REQUEST_TIMEOUT_MS = 10_000;

class DashboardRequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardRequestTimeoutError";
  }
}

function LocalizedDateTime({
  locale,
  value,
}: {
  locale: "en" | "zh";
  value: string;
}) {
  return (
    <time dateTime={value} suppressHydrationWarning>
      {new Intl.DateTimeFormat(localeToIntlTag(locale), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))}
    </time>
  );
}

async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchDashboard(workspaceRoot: string, fallbackMessage: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort("dashboard_request_timeout");
  }, DASHBOARD_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `/api/dashboard?${new URLSearchParams({ workspaceRoot }).toString()}`,
      {
        cache: "no-store",
        signal: controller.signal,
      },
    );
    const data = await readResponseJson(response);

    if (!response.ok) {
      throw new Error((data as { message?: string } | null)?.message ?? fallbackMessage);
    }

    return dashboardOverviewSchema.parse((data as { dashboard: unknown }).dashboard);
  } catch (error) {
    if (
      controller.signal.aborted &&
      controller.signal.reason === "dashboard_request_timeout"
    ) {
      throw new DashboardRequestTimeoutError(fallbackMessage);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function sanitizeDashboardHref(
  href: string | null | undefined,
  fallbackPath = "/wiki",
) {
  if (!href) {
    return fallbackPath;
  }

  try {
    const url = new URL(href, "http://localhost");
    const hasPageId = url.searchParams.has("pageId");
    const hasPagePath = url.searchParams.has("pagePath");
    const pathnameLooksFileLike =
      /\.html(?:$|[?#])/.test(url.pathname) || /\.md(?:$|[?#])/.test(url.pathname);

    url.searchParams.delete("workspaceRoot");

    if (hasPageId) {
      url.searchParams.delete("pagePath");
    }

    if ((hasPagePath && !hasPageId) || pathnameLooksFileLike) {
      return fallbackPath;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallbackPath;
  }
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
  className,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-6 py-5",
        className,
      )}
    >
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

function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="rounded-[22px] bg-muted/55 px-5 py-7">
      <div className="text-sm font-medium text-foreground">{title}</div>
      {description ? (
        <div className="mt-2 text-sm leading-6 text-muted-foreground">{description}</div>
      ) : null}
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
  meta?: ReactNode;
  badges?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-[22px] border border-transparent px-5 py-5 transition-[background-color,border-color,box-shadow,transform] hover:border-border/70 hover:bg-foreground/[0.03] hover:shadow-[0_16px_40px_-34px_rgba(15,23,42,0.22)]"
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0 space-y-2.5">
          <div className="flex items-center gap-2">
            <div className="truncate text-[15px] font-semibold text-foreground">{title}</div>
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className="text-sm leading-6 text-muted-foreground">{description}</div>
          {meta ? (
            <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {meta}
            </div>
          ) : null}
        </div>
        {badges ? (
          <div className="flex shrink-0 flex-wrap items-start gap-2 md:justify-end">{badges}</div>
        ) : null}
      </div>
    </Link>
  );
}

function InitializedWorkspaceView({
  dashboard,
  locale,
  defaultWorkspaceRoot,
  onStatusChange,
}: {
  dashboard: DashboardOverview;
  locale: "en" | "zh";
  defaultWorkspaceRoot: string;
  onStatusChange: (status: WorkspaceStatus) => void;
}) {
  const copy = getLocaleCopy(locale);
  const [showWorkspaceTools, setShowWorkspaceTools] = useState(false);
  const counts = dashboard.counts!;
  const pendingReviews = counts.reviews.byStatus.pending ?? 0;
  const latestPage = dashboard.featuredPages[0] ?? null;
  const workspaceReady = dashboard.gitInitialized && dashboard.databaseInitialized;
  const featuredPages = dashboard.featuredPages.slice(0, 3);
  const resumeHref = sanitizeDashboardHref(latestPage?.href, "/wiki");

  return (
    <>
      <Surface className="flex min-h-[calc(100dvh-12.5rem)] flex-col overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(249,247,242,0.94))]">
        <div className="border-b border-border/60 px-5 py-5 sm:px-6 lg:px-7 lg:py-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
            <div className="min-w-0 space-y-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {copy.dashboard.workspaceEyebrow}
              </div>
              <h1 className="max-w-none text-[clamp(2.25rem,3.4vw,3.7rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-foreground">
                {dashboard.workspaceName ?? "Research Wiki"}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={workspaceReady ? "success" : "outline"}>
                  {workspaceReady ? copy.dashboard.ready : copy.dashboard.setup}
                </Badge>
                {pendingReviews > 0 ? (
                  <Badge variant="outline">{copy.dashboard.reviewBadge(pendingReviews)}</Badge>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:items-end">
              <div className="flex flex-wrap items-center gap-3 xl:justify-end">
                <div className="flex flex-wrap items-center gap-2 rounded-[22px] border border-border/70 bg-background/84 p-2 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.2)]">
                  <Button
                    asChild
                    size="lg"
                    className="min-w-[120px] rounded-[16px] px-5 sm:min-w-[136px]"
                  >
                    <Link href="/topics">
                      {copy.dashboard.topics}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="min-w-[120px] rounded-[16px] border-border/80 bg-background/94 px-4 text-foreground shadow-none sm:min-w-[136px]"
                  >
                    <Link href={resumeHref}>
                      <BookText className="size-4" />
                      {copy.dashboard.wiki}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="min-w-[120px] rounded-[16px] border border-transparent px-4 text-muted-foreground hover:border-border/60 hover:bg-foreground/[0.04] hover:text-foreground sm:min-w-[136px]"
                  >
                    <Link href="/topics/openclaw">
                      <Sparkles className="size-4" />
                      {copy.dashboard.showcase}
                    </Link>
                  </Button>
                </div>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-w-[132px] rounded-[16px] border-border/80 bg-background/96 px-4 text-foreground shadow-[0_14px_32px_-28px_rgba(15,23,42,0.2)] sm:min-w-[148px]"
                >
                  <Link href="/settings">
                    <Settings2 className="size-4" />
                    {copy.dashboard.settings}
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Button
                  aria-controls="dashboard-workspace-tools"
                  aria-expanded={showWorkspaceTools}
                  size="sm"
                  variant="ghost"
                  className="rounded-[14px] border border-transparent px-3 text-muted-foreground hover:border-border/60 hover:bg-foreground/[0.04] hover:text-foreground"
                  onClick={() => setShowWorkspaceTools((current) => !current)}
                >
                  {showWorkspaceTools
                    ? copy.dashboard.hideWorkspaceTools
                    : copy.dashboard.workspaceTools}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-3 pb-3 pt-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
          <div className="flex flex-1 flex-col rounded-[26px] border border-border/65 bg-background/72 shadow-[0_18px_48px_-42px_rgba(15,23,42,0.18)]">
            <SurfaceHeader
              eyebrow={copy.dashboard.wiki}
              title={copy.dashboard.pages}
              className="px-5 py-4 lg:px-6"
              actions={
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="rounded-[14px] border-border/70 bg-background/85 px-3.5 text-foreground shadow-none"
                >
                  <Link href="/wiki">
                    {copy.dashboard.allPages}
                  </Link>
                </Button>
              }
            />
            <div className="flex flex-1 flex-col divide-y divide-border/70 px-2 py-2 lg:px-3">
              {featuredPages.length === 0 ? (
                <div className="px-4 py-4 lg:px-5">
                  <EmptyState title={copy.dashboard.noWikiPagesYet} />
                </div>
              ) : (
                featuredPages.map((page) => (
                  <ListRow
                    key={page.id}
                    href={sanitizeDashboardHref(page.href, "/wiki")}
                    title={page.title}
                    description={
                      locale === "zh"
                        ? `${page.sourceRefCount} 条来源引用 · ${page.pageRefCount} 条相关页面引用`
                        : `${page.sourceRefCount} source ref${page.sourceRefCount === 1 ? "" : "s"} · ${page.pageRefCount} related page reference${page.pageRefCount === 1 ? "" : "s"}`
                    }
                    meta={
                      <>
                        {getWikiPageTypeLabel(locale, page.type as WikiPageType)} ·{" "}
                        <LocalizedDateTime locale={locale} value={page.updatedAt} />
                      </>
                    }
                    badges={
                      <Badge variant={reviewStatusVariant(page.reviewStatus)}>
                        {getReviewStatusLabel(locale, page.reviewStatus)}
                      </Badge>
                    }
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </Surface>

      {showWorkspaceTools ? (
        <div id="dashboard-workspace-tools" className="space-y-3">
          <div className="text-[13px] leading-6 text-muted-foreground">
            {copy.dashboard.activeRoot}:{" "}
            <span className="font-mono text-[11px] text-foreground/90">
              {dashboard.workspaceRoot}
            </span>
          </div>
          <WorkspaceSetupPanel
            defaultWorkspaceRoot={defaultWorkspaceRoot}
            onStatusChange={onStatusChange}
          />
        </div>
      ) : null}
    </>
  );
}

function UninitializedWorkspaceView({
  workspaceRoot,
  locale,
  defaultWorkspaceRoot,
  onStatusChange,
}: {
  workspaceRoot: string;
  locale: "en" | "zh";
  defaultWorkspaceRoot: string;
  onStatusChange: (status: WorkspaceStatus) => void;
}) {
  const copy = getLocaleCopy(locale);
  return (
    <div className="space-y-8">
      <Surface className="overflow-hidden">
        <div className="px-7 py-7">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{copy.dashboard.workspaceNotInitialized}</Badge>
            <Badge variant="outline">{copy.dashboard.fileFirstSetup}</Badge>
          </div>
          <div className="mt-5 max-w-[72rem] space-y-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {copy.dashboard.dashboardEyebrow}
            </div>
            <h1 className="max-w-[72rem] text-[clamp(2.2rem,3.8vw,4rem)] font-semibold leading-[1.04] tracking-[-0.04em] text-foreground">
              {copy.dashboard.setUpLocalWorkspace}
            </h1>
            <div className="break-all font-mono text-[11px] leading-6 text-foreground/90">
              {workspaceRoot}
            </div>
          </div>
          <div className="mt-5">
            <Button asChild variant="outline">
              <Link href="/topics/openclaw">
                <Sparkles className="size-4" />
                {copy.dashboard.showcase}
              </Link>
            </Button>
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
    <Surface className="flex min-h-[calc(100dvh-12.5rem)] flex-col overflow-hidden">
      <div className="border-b border-border/60 px-5 py-5 sm:px-6 lg:px-7 lg:py-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-3">
            <div className="h-3 w-28 rounded-full bg-muted" />
            <div className="h-12 w-full max-w-4xl rounded-[18px] bg-muted/80" />
            <div className="h-4 w-full max-w-3xl rounded-full bg-muted/60" />
          </div>
          <div className="space-y-3 xl:min-w-[360px]">
            <div className="h-16 rounded-[22px] bg-muted/55" />
            <div className="h-10 w-full rounded-[16px] bg-muted/45" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-3 sm:px-4 sm:pb-4 lg:px-5 lg:pb-5">
        <div className="flex flex-1 flex-col rounded-[26px] border border-border/65 bg-background/72 px-5 py-4 lg:px-6">
          <div className="h-3 w-24 rounded-full bg-muted/70" />
          <div className="mt-3 h-6 w-full max-w-[220px] rounded-full bg-muted/80" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 4 }).map((_, rowIndex) => (
              <div key={rowIndex} className="h-20 rounded-[22px] bg-muted/45" />
            ))}
          </div>
        </div>
      </div>
    </Surface>
  );
}

export function DashboardWorkbench({
  defaultWorkspaceRoot,
  initialDashboard = null,
}: DashboardWorkbenchProps) {
  const { locale } = useAppLocale();
  const copy = getLocaleCopy(locale);
  const dashboardLoadFallback = copy.dashboard.failedLoad;
  const dashboardRefreshFallback = copy.dashboard.failedRefresh;
  const [workspaceRoot, setWorkspaceRoot] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(initialDashboard);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedWorkspaceRoot, setLoadedWorkspaceRoot] = useState<string | null>(
    initialDashboard?.workspaceRoot ?? null,
  );
  const [hasResolvedClientWorkspaceRoot, setHasResolvedClientWorkspaceRoot] = useState(false);

  useEffect(() => {
    const storedRoot =
      window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ?? defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
    setHasResolvedClientWorkspaceRoot(true);
  }, [defaultWorkspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadDashboard() {
      if (!workspaceRoot || workspaceRoot === loadedWorkspaceRoot) {
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextDashboard = await fetchDashboard(workspaceRoot, dashboardLoadFallback);

        if (!isActive) {
          return;
        }

        setDashboard(nextDashboard);
        setLoadedWorkspaceRoot(nextDashboard.workspaceRoot);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (
          error instanceof DashboardRequestTimeoutError &&
          workspaceRoot !== defaultWorkspaceRoot
        ) {
          window.localStorage.setItem(
            ACTIVE_WORKSPACE_STORAGE_KEY,
            defaultWorkspaceRoot,
          );
          setWorkspaceRoot(defaultWorkspaceRoot);
          setErrorMessage(null);
          return;
        }

        setDashboard(null);
        setLoadedWorkspaceRoot(workspaceRoot);
        setErrorMessage(
          error instanceof Error ? error.message : dashboardLoadFallback,
        );
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    if (hasResolvedClientWorkspaceRoot && workspaceRoot) {
      void loadDashboard();
    }

    return () => {
      isActive = false;
    };
  }, [
    defaultWorkspaceRoot,
    dashboardLoadFallback,
    hasResolvedClientWorkspaceRoot,
    loadedWorkspaceRoot,
    workspaceRoot,
  ]);

  function handleStatusChange(status: WorkspaceStatus) {
    setIsLoading(true);
    setWorkspaceRoot(status.workspaceRoot);
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, status.workspaceRoot);
    void fetchDashboard(status.workspaceRoot, dashboardRefreshFallback)
      .then((nextDashboard) => {
        setDashboard(nextDashboard);
        setLoadedWorkspaceRoot(nextDashboard.workspaceRoot);
        setErrorMessage(null);
        setIsLoading(false);
      })
      .catch((error) => {
        setDashboard(null);
        setLoadedWorkspaceRoot(status.workspaceRoot);
        setErrorMessage(
          error instanceof Error ? error.message : dashboardRefreshFallback,
        );
        setIsLoading(false);
      });
  }

  const activeDashboard =
    workspaceRoot && dashboard && dashboard.workspaceRoot === workspaceRoot
      ? dashboard
      : null;
  const isWorkspaceSyncPending =
    !workspaceRoot ||
    (dashboard !== null && dashboard.workspaceRoot !== workspaceRoot) ||
    (dashboard === null && loadedWorkspaceRoot !== workspaceRoot);
  const shouldShowLoading =
    !hasResolvedClientWorkspaceRoot || (!errorMessage && (isLoading || isWorkspaceSyncPending));

  return (
    <div className="min-h-[calc(100dvh-10rem)] space-y-6">
      {errorMessage ? (
        <div className="rounded-[22px] border border-amber-500/25 bg-amber-500/10 px-5 py-4 text-sm leading-7 text-amber-900">
          {errorMessage}
        </div>
      ) : null}

      {shouldShowLoading ? (
        <LoadingView />
      ) : activeDashboard?.initialized && activeDashboard.counts ? (
        <InitializedWorkspaceView
          dashboard={activeDashboard}
          locale={locale}
          defaultWorkspaceRoot={defaultWorkspaceRoot}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <UninitializedWorkspaceView
          locale={locale}
          workspaceRoot={workspaceRoot ?? defaultWorkspaceRoot}
          defaultWorkspaceRoot={defaultWorkspaceRoot}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
