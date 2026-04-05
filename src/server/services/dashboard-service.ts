import type { DashboardOverview } from "@/lib/contracts/dashboard";
import { dashboardOverviewSchema } from "@/lib/contracts/dashboard";
import { WIKI_PAGE_TYPES } from "@/lib/constants";
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
    recentActivity,
  });
}
