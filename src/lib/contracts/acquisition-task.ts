import { z } from "zod";

import { researchQuestionPrioritySchema } from "@/lib/contracts/research-question";
import { topicMaturityStageSchema } from "@/lib/contracts/topic-evaluation";

export const ACQUISITION_TASK_TYPES = [
  "source-acquisition",
  "contradiction-check",
  "comparison-pass",
  "freshness-refresh",
  "operational-signal",
  "provenance-strengthening",
  "watchpoint-follow-up",
] as const;
export const acquisitionTaskTypeSchema = z.enum(ACQUISITION_TASK_TYPES);
export type AcquisitionTaskType = z.infer<typeof acquisitionTaskTypeSchema>;

export const ACQUISITION_TASK_STATUSES = [
  "queued",
  "active",
  "captured",
  "integrated",
] as const;
export const acquisitionTaskStatusSchema = z.enum(ACQUISITION_TASK_STATUSES);
export type AcquisitionTaskStatus = z.infer<typeof acquisitionTaskStatusSchema>;

export const acquisitionTaskSeedSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: acquisitionTaskStatusSchema,
  priority: researchQuestionPrioritySchema,
  taskType: acquisitionTaskTypeSchema,
  whyItMatters: z.string().min(1),
  evidenceTypeToCollect: z.string().min(1),
  linkedEvidenceGapIds: z.array(z.string().min(1)).default([]),
  linkedQuestionIds: z.array(z.string().min(1)).default([]),
  linkedSynthesisIds: z.array(z.string().min(1)).default([]),
  canonicalReviewTitles: z.array(z.string().min(1)).default([]),
  monitoringTitles: z.array(z.string().min(1)).default([]),
  suggestedSourceTypes: z.array(z.string().min(1)).default([]),
  suggestedSourceTargets: z.array(z.string().min(1)).default([]),
  suggestedContextPackTitles: z.array(z.string().min(1)).default([]),
  suggestedPageTitles: z.array(z.string().min(1)).default([]),
  successCriteria: z.array(z.string().min(1)).min(1),
  nextSessionId: z.string().nullable().default(null),
  ingestionSurfaceTitles: z.array(z.string().min(1)).default([]),
  ingestionNextStep: z.string().min(1),
  resultSourceTitles: z.array(z.string().min(1)).default([]),
  resultChangeIds: z.array(z.string().min(1)).default([]),
  resultSummary: z.string().nullable().default(null),
  maturityBlockerStages: z.array(topicMaturityStageSchema).default([]),
  integratedAt: z.string().datetime().nullable().default(null),
});
export type AcquisitionTaskSeed = z.infer<typeof acquisitionTaskSeedSchema>;

export const acquisitionTaskLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type AcquisitionTaskLink = z.infer<typeof acquisitionTaskLinkSchema>;

export const acquisitionTaskItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: acquisitionTaskStatusSchema,
  priority: researchQuestionPrioritySchema,
  taskType: acquisitionTaskTypeSchema,
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  whyItMatters: z.string().min(1),
  evidenceTypeToCollect: z.string().min(1),
  linkedEvidenceGapIds: z.array(z.string().min(1)).default([]),
  linkedEvidenceGapTitles: z.array(z.string().min(1)).default([]),
  linkedQuestionIds: z.array(z.string().min(1)).default([]),
  linkedQuestions: z.array(z.string().min(1)).default([]),
  linkedSynthesisIds: z.array(z.string().min(1)).default([]),
  linkedSyntheses: z.array(z.string().min(1)).default([]),
  canonicalReviewTitles: z.array(z.string().min(1)).default([]),
  monitoringTitles: z.array(z.string().min(1)).default([]),
  suggestedSourceTypes: z.array(z.string().min(1)).default([]),
  suggestedSourceTargets: z.array(z.string().min(1)).default([]),
  suggestedContextPackTitles: z.array(z.string().min(1)).default([]),
  suggestedPageTitles: z.array(z.string().min(1)).default([]),
  successCriteria: z.array(z.string().min(1)).min(1),
  nextSessionId: z.string().nullable(),
  nextSessionTitle: z.string().nullable(),
  nextSessionStatus: z.enum(["queued", "active", "completed"]).nullable(),
  ingestionSurfaceTitles: z.array(z.string().min(1)).default([]),
  ingestionNextStep: z.string().min(1),
  resultSourceTitles: z.array(z.string().min(1)).default([]),
  resultChangeIds: z.array(z.string().min(1)).default([]),
  resultChangeTitles: z.array(z.string().min(1)).default([]),
  resultSummary: z.string().nullable(),
  maturityBlockerStages: z.array(topicMaturityStageSchema).default([]),
  integratedAt: z.string().datetime().nullable(),
  readyForSession: z.boolean(),
  awaitingIngestion: z.boolean(),
  recentlyIntegrated: z.boolean(),
  blocksMaturityProgression: z.boolean(),
  links: z.object({
    task: acquisitionTaskLinkSchema,
    topicHome: acquisitionTaskLinkSchema,
    gapLane: acquisitionTaskLinkSchema,
    session: acquisitionTaskLinkSchema,
    sources: acquisitionTaskLinkSchema,
    changes: acquisitionTaskLinkSchema,
    canonicalReview: acquisitionTaskLinkSchema,
  }),
});
export type AcquisitionTaskItem = z.infer<typeof acquisitionTaskItemSchema>;

export const acquisitionTaskBucketSchema = z.object({
  id: z.enum([
    "next-acquisition",
    "session-ready",
    "awaiting-ingestion",
    "maturity-blockers",
    "recently-integrated",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  tasks: z.array(acquisitionTaskItemSchema),
});
export type AcquisitionTaskBucket = z.infer<typeof acquisitionTaskBucketSchema>;

export const acquisitionTaskTopicSummarySchema = z.object({
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  summary: z.string().min(1),
  taskCount: z.number().int().nonnegative(),
  queuedCount: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  capturedCount: z.number().int().nonnegative(),
  integratedCount: z.number().int().nonnegative(),
  highPriorityCount: z.number().int().nonnegative(),
  maturityBlockerCount: z.number().int().nonnegative(),
  readyForSessionCount: z.number().int().nonnegative(),
  awaitingIngestionCount: z.number().int().nonnegative(),
  nextTask: acquisitionTaskItemSchema.nullable(),
  recentIntegrated: acquisitionTaskItemSchema.nullable(),
  tasks: z.array(acquisitionTaskItemSchema),
});
export type AcquisitionTaskTopicSummary = z.infer<typeof acquisitionTaskTopicSummarySchema>;

export const acquisitionTaskOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  focusedTopic: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  focusedTask: z
    .object({
      topicId: z.string().min(1),
      taskId: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  summary: z.object({
    totalTasks: z.number().int().nonnegative(),
    queued: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    captured: z.number().int().nonnegative(),
    integrated: z.number().int().nonnegative(),
    highPriority: z.number().int().nonnegative(),
    readyForSession: z.number().int().nonnegative(),
    awaitingIngestion: z.number().int().nonnegative(),
    maturityBlockers: z.number().int().nonnegative(),
  }),
  focusTask: acquisitionTaskItemSchema.nullable(),
  buckets: z.array(acquisitionTaskBucketSchema),
  topics: z.array(acquisitionTaskTopicSummarySchema),
});
export type AcquisitionTaskOverview = z.infer<typeof acquisitionTaskOverviewSchema>;
