import crypto from "node:crypto";

import { and, eq } from "drizzle-orm";

import { SOURCE_SUMMARY_JOB_TYPE } from "@/lib/constants";
import { jobRuns } from "@/server/db/schema";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";

function createJobRunId(workspaceId: string, sourceDocumentId: string | null, jobType: string) {
  return `job_${crypto
    .createHash("sha1")
    .update(`${workspaceId}:${sourceDocumentId ?? "none"}:${jobType}:${Date.now()}:${crypto.randomUUID()}`)
    .digest("hex")
    .slice(0, 32)}`;
}

export async function createJobRun(params: {
  workspaceRoot: string;
  sourceDocumentId?: string | null;
  jobType: string;
  status: "running" | "completed" | "failed";
  retryCount?: number;
  metadataJson?: Record<string, unknown>;
}) {
  const { db, workspace } = await getWorkspaceContext(params.workspaceRoot);
  const createdAt = new Date();
  const id = createJobRunId(workspace.id, params.sourceDocumentId ?? null, params.jobType);

  await db.insert(jobRuns).values({
    id,
    workspaceId: workspace.id,
    sourceDocumentId: params.sourceDocumentId ?? null,
    jobType: params.jobType,
    status: params.status,
    retryCount: params.retryCount ?? 0,
    durationMs: null,
    metadataJson: params.metadataJson ?? {},
    createdAt,
    completedAt: params.status === "running" ? null : createdAt,
  });

  return {
    id,
    createdAt,
  };
}

export async function completeJobRun(params: {
  workspaceRoot: string;
  jobRunId: string;
  status: "completed" | "failed";
  durationMs: number;
  metadataJson?: Record<string, unknown>;
}) {
  const { db, workspace } = await getWorkspaceContext(params.workspaceRoot);
  const completedAt = new Date();

  await db
    .update(jobRuns)
    .set({
      status: params.status,
      durationMs: params.durationMs,
      metadataJson: params.metadataJson ?? {},
      completedAt,
    })
    .where(and(eq(jobRuns.workspaceId, workspace.id), eq(jobRuns.id, params.jobRunId)));

  return {
    completedAt,
  };
}

export async function getLatestSourceSummaryJobRun(
  workspaceRoot: string,
  sourceDocumentId: string,
) {
  return getLatestJobRunByType(workspaceRoot, sourceDocumentId, SOURCE_SUMMARY_JOB_TYPE);
}

export async function getLatestJobRunByType(
  workspaceRoot: string,
  sourceDocumentId: string,
  jobType: string,
) {
  const { db, workspace } = await getWorkspaceContext(workspaceRoot);

  return db.query.jobRuns.findFirst({
    where: and(
      eq(jobRuns.workspaceId, workspace.id),
      eq(jobRuns.sourceDocumentId, sourceDocumentId),
      eq(jobRuns.jobType, jobType),
    ),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.createdAt)],
  });
}
