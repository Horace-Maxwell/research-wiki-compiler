import type { ActivityLogEntry } from "@/lib/contracts/log";
import { activityLogEntrySchema } from "@/lib/contracts/log";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";
import { getWorkspaceStatus } from "@/server/services/workspace-service";

function toIsoString(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function sortRecentLogs(logs: ActivityLogEntry[]) {
  return [...logs].sort((left, right) => {
    return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
  });
}

export async function listRecentActivityLogs(workspaceRoot: string, limit = 12) {
  const status = await getWorkspaceStatus(workspaceRoot);

  if (!status.initialized) {
    return [];
  }

  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } = await getWorkspaceContext(
    workspaceRoot,
  );
  const [jobRows, proposalRows, answerRows, auditRows] = await Promise.all([
    db.query.jobRuns.findMany({
      where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit,
    }),
    db.query.patchProposals.findMany({
      where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
      limit,
    }),
    db.query.answerArtifacts.findMany({
      where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
      limit,
    }),
    db.query.auditRuns.findMany({
      where: (table, { eq }) => eq(table.workspaceId, workspace.id),
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit,
    }),
  ]);

  const jobLogs = jobRows.map((row) =>
    activityLogEntrySchema.parse({
      id: `job:${row.id}`,
      timestamp: toIsoString(row.completedAt ?? row.createdAt) ?? new Date().toISOString(),
      kind: "job_run",
      status: row.status,
      title: `Job run: ${row.jobType}`,
      description:
        row.status === "failed"
          ? `A ${row.jobType} run failed${row.retryCount > 0 ? ` after ${row.retryCount} retr${row.retryCount === 1 ? "y" : "ies"}` : ""}.`
          : `A ${row.jobType} run finished with status ${row.status}.`,
      href:
        row.sourceDocumentId !== null
          ? `/sources?${new URLSearchParams({
              workspaceRoot: normalizedWorkspaceRoot,
              sourceId: row.sourceDocumentId,
            }).toString()}`
          : null,
    }),
  );

  const reviewLogs = proposalRows.map((row) =>
    activityLogEntrySchema.parse({
      id: `review:${row.id}`,
      timestamp:
        toIsoString(row.reviewedAt ?? row.appliedAt ?? row.updatedAt ?? row.createdAt) ??
        new Date().toISOString(),
      kind: "review",
      status: row.status,
      title:
        row.status === "pending"
          ? "Patch proposal queued"
          : row.status === "approved"
            ? "Patch proposal approved"
            : row.status === "rejected"
              ? "Patch proposal rejected"
              : "Patch proposal updated",
      description: row.title,
      href: `/reviews?${new URLSearchParams({
        workspaceRoot: normalizedWorkspaceRoot,
        status:
          row.status === "approved" || row.status === "rejected" ? row.status : "pending",
        reviewId: row.id,
      }).toString()}`,
    }),
  );

  const answerLogs = answerRows.map((row) =>
    activityLogEntrySchema.parse({
      id: `answer:${row.id}`,
      timestamp: toIsoString(row.updatedAt) ?? new Date().toISOString(),
      kind: "answer",
      status: row.archivedPageId ? "archived" : "created",
      title: row.archivedPageId ? "Answer archived into wiki" : "Answer artifact saved",
      description: row.question,
      href: `/ask?${new URLSearchParams({
        workspaceRoot: normalizedWorkspaceRoot,
        answerId: row.id,
      }).toString()}`,
    }),
  );

  const auditLogs = auditRows.map((row) =>
    activityLogEntrySchema.parse({
      id: `audit:${row.id}`,
      timestamp: toIsoString(row.completedAt ?? row.createdAt) ?? new Date().toISOString(),
      kind: "audit",
      status: row.status,
      title: `Audit run: ${row.mode}`,
      description:
        row.status === "completed"
          ? `${row.findingsJson.length} finding${row.findingsJson.length === 1 ? "" : "s"} recorded.`
          : `Audit run finished with status ${row.status}.`,
      href: `/audits?${new URLSearchParams({
        workspaceRoot: normalizedWorkspaceRoot,
        auditId: row.id,
      }).toString()}`,
    }),
  );

  return sortRecentLogs([...jobLogs, ...reviewLogs, ...answerLogs, ...auditLogs]).slice(0, limit);
}
