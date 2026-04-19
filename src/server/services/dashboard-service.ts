import type { DashboardOverview } from "@/lib/contracts/dashboard";
import { dashboardOverviewSchema } from "@/lib/contracts/dashboard";
import { WIKI_PAGE_TYPES } from "@/lib/constants";
import { buildWorkspacePageHref } from "@/server/lib/page-route-hrefs";
import { listRecentActivityLogs } from "@/server/services/logs-service";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";
import { getWorkspaceStatus } from "@/server/services/workspace-service";

function countBy<T extends string>(values: T[]) {
  const counts: Record<string, number> = {};

  values.forEach((value) => {
    counts[value] = (counts[value] ?? 0) + 1;
  });

  return counts;
}

function emptyWikiTypeCounts() {
  return Object.fromEntries(WIKI_PAGE_TYPES.map((type) => [type, 0]));
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function reviewStatusPriority(status: string) {
  switch (status) {
    case "pending":
      return 0;
    case "approved":
      return 1;
    case "rejected":
      return 2;
    default:
      return 3;
  }
}

function severityPriority(value: "low" | "medium" | "high") {
  switch (value) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
    default:
      return 1;
  }
}

export async function getDashboardOverview(workspaceRoot: string): Promise<DashboardOverview> {
  const status = await getWorkspaceStatus(workspaceRoot);

  if (!status.initialized) {
    return dashboardOverviewSchema.parse({
      workspaceRoot: status.workspaceRoot,
      initialized: false,
      workspaceName: status.settings?.workspaceName ?? null,
      gitInitialized: status.gitInitialized,
      databaseInitialized: status.databaseInitialized,
      counts: null,
      featuredPages: [],
      recentSources: [],
      reviewFocus: [],
      archivedAnswers: [],
      recentAudits: [],
      recentActivity: [],
    });
  }

  const {
    db,
    workspace,
    workspaceRoot: normalizedWorkspaceRoot,
  } = await getWorkspaceContext(workspaceRoot);
  const [wikiRows, sourceRows, reviewRows, answerRows, auditRows, jobRows, recentActivity] =
    await Promise.all([
      db.query.wikiPages.findMany({
        where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      }),
      db.query.sourceDocuments.findMany({
        where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      }),
      db.query.patchProposals.findMany({
        where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      }),
      db.query.answerArtifacts.findMany({
        where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      }),
      db.query.auditRuns.findMany({
        where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      }),
      db.query.jobRuns.findMany({
        where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      }),
      listRecentActivityLogs(workspaceRoot, 16),
    ]);

  const wikiByType = {
    ...emptyWikiTypeCounts(),
    ...countBy(wikiRows.map((row) => row.type)),
  };
  const sourcesByStatus = countBy(sourceRows.map((row) => row.status));
  const sourcesBySummaryStatus = countBy(sourceRows.map((row) => row.summaryStatus));
  const reviewsByStatus = countBy(reviewRows.map((row) => row.status));
  const auditsByStatus = countBy(auditRows.map((row) => row.status));
  const jobsByStatus = countBy(jobRows.map((row) => row.status));
  const pageById = new Map(wikiRows.map((row) => [row.id, row]));

  const featuredPages = wikiRows
    .filter((row) => row.type !== "index")
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 5)
    .map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      path: row.path,
      reviewStatus: row.reviewStatus,
      sourceRefCount: row.sourceRefsJson.length,
      pageRefCount: row.pageRefsJson.length,
      updatedAt: row.updatedAt.toISOString(),
      href: buildWorkspacePageHref("/wiki", normalizedWorkspaceRoot, row.path),
    }));

  const recentSources = sourceRows
    .sort((left, right) => {
      const leftTime = (left.importedAt ?? left.createdAt).getTime();
      const rightTime = (right.importedAt ?? right.createdAt).getTime();

      return rightTime - leftTime;
    })
    .slice(0, 4)
    .map((row) => ({
      id: row.id,
      title: row.title,
      sourceType: row.sourceType,
      status: row.status,
      summaryStatus: row.summaryStatus,
      importedAt: toIso(row.importedAt),
      updatedAt: row.updatedAt.toISOString(),
      href: `/sources?${new URLSearchParams({
        workspaceRoot: normalizedWorkspaceRoot,
        sourceId: row.id,
      }).toString()}`,
    }));

  const reviewFocus = reviewRows
    .sort((left, right) => {
      const statusDifference =
        reviewStatusPriority(left.status) - reviewStatusPriority(right.status);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return right.updatedAt.getTime() - left.updatedAt.getTime();
    })
    .slice(0, 4)
    .map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      riskLevel: row.riskLevel,
      proposalType: row.proposalType,
      targetPageTitle: row.targetPageTitle ?? row.proposedPageTitle ?? null,
      updatedAt: row.updatedAt.toISOString(),
      href: `/reviews?${new URLSearchParams({
        workspaceRoot: normalizedWorkspaceRoot,
        status: row.status,
        reviewId: row.id,
      }).toString()}`,
    }));

  const archivedAnswers = answerRows
    .filter((row) => Boolean(row.archivedPageId))
    .sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())
    .slice(0, 3)
    .map((row) => {
      const archivedPage = row.archivedPageId ? pageById.get(row.archivedPageId) : null;

      return {
        id: row.id,
        question: row.question,
        archivedPageTitle: archivedPage?.title ?? null,
        archivedPagePath: archivedPage?.path ?? null,
        updatedAt: row.updatedAt.toISOString(),
        href: `/ask?${new URLSearchParams({
          workspaceRoot: normalizedWorkspaceRoot,
          answerId: row.id,
        }).toString()}`,
      };
    });

  const recentAudits = auditRows
    .sort((left, right) => {
      const leftTime = (left.completedAt ?? left.createdAt).getTime();
      const rightTime = (right.completedAt ?? right.createdAt).getTime();

      return rightTime - leftTime;
    })
    .slice(0, 3)
    .map((row) => {
      const highestSeverity = row.findingsJson.reduce<"low" | "medium" | "high" | null>(
        (currentHighest, finding) => {
          if (!currentHighest) {
            return finding.severity;
          }

          return severityPriority(finding.severity) > severityPriority(currentHighest)
            ? finding.severity
            : currentHighest;
        },
        null,
      );

      return {
        id: row.id,
        mode: row.mode,
        status: row.status,
        findingsCount: row.findingsJson.length,
        highestSeverity,
        completedAt: toIso(row.completedAt),
        href: `/audits?${new URLSearchParams({
          workspaceRoot: normalizedWorkspaceRoot,
          auditId: row.id,
        }).toString()}`,
      };
    });

  return dashboardOverviewSchema.parse({
    workspaceRoot: normalizedWorkspaceRoot,
    initialized: true,
    workspaceName: status.settings?.workspaceName ?? status.workspaceRecord?.name ?? null,
    gitInitialized: status.gitInitialized,
    databaseInitialized: status.databaseInitialized,
    counts: {
      wikiPages: {
        total: wikiRows.length,
        byType: wikiByType,
      },
      sources: {
        total: sourceRows.length,
        byStatus: sourcesByStatus,
        bySummaryStatus: sourcesBySummaryStatus,
      },
      reviews: {
        total: reviewRows.length,
        byStatus: reviewsByStatus,
      },
      answers: {
        total: answerRows.length,
        archived: answerRows.filter((row) => Boolean(row.archivedPageId)).length,
      },
      audits: {
        total: auditRows.length,
        byStatus: auditsByStatus,
      },
      jobs: {
        total: jobRows.length,
        byStatus: jobsByStatus,
      },
    },
    featuredPages,
    recentSources,
    reviewFocus,
    archivedAnswers,
    recentAudits,
    recentActivity,
  });
}
