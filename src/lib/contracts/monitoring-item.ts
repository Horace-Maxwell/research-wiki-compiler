import { z } from "zod";

import { researchQuestionPrioritySchema } from "@/lib/contracts/research-question";
import { topicMaturityStageSchema } from "@/lib/contracts/topic-evaluation";

export const MONITORING_MODES = [
  "passive",
  "event-triggered",
  "periodic-review",
] as const;
export const monitoringModeSchema = z.enum(MONITORING_MODES);
export type MonitoringMode = z.infer<typeof monitoringModeSchema>;

export const MONITORING_TRIGGER_ACTIONS = [
  "spawn-acquisition",
  "mark-review",
  "reopen-work",
  "keep-watching",
] as const;
export const monitoringTriggerActionSchema = z.enum(MONITORING_TRIGGER_ACTIONS);
export type MonitoringTriggerAction = z.infer<typeof monitoringTriggerActionSchema>;

export const MONITORING_STATUSES = [
  "watching",
  "triggered",
  "review-needed",
  "spawned-acquisition",
  "stable",
] as const;
export const monitoringStatusSchema = z.enum(MONITORING_STATUSES);
export type MonitoringStatus = z.infer<typeof monitoringStatusSchema>;

export const monitoringItemSeedSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: monitoringStatusSchema,
  mode: monitoringModeSchema,
  priority: researchQuestionPrioritySchema,
  triggerAction: monitoringTriggerActionSchema,
  whyItMatters: z.string().min(1),
  triggerSignals: z.array(z.string().min(1)).min(1),
  latestSignalSummary: z.string().min(1),
  linkedWatchpointTitles: z.array(z.string().min(1)).default([]),
  linkedEvidenceGapIds: z.array(z.string().min(1)).default([]),
  linkedAcquisitionTaskIds: z.array(z.string().min(1)).default([]),
  linkedChangeIds: z.array(z.string().min(1)).default([]),
  linkedQuestionIds: z.array(z.string().min(1)).default([]),
  linkedSynthesisIds: z.array(z.string().min(1)).default([]),
  canonicalReviewTitles: z.array(z.string().min(1)).default([]),
  reviewSurfaceTitles: z.array(z.string().min(1)).default([]),
  suggestedContextPackTitles: z.array(z.string().min(1)).default([]),
  suggestedPageTitles: z.array(z.string().min(1)).default([]),
  spawnSessionId: z.string().nullable().default(null),
  nextCheck: z.string().min(1),
  recommendedAction: z.string().min(1),
  maturityImpactStages: z.array(topicMaturityStageSchema).default([]),
  lastCheckedAt: z.string().datetime().nullable().default(null),
  triggeredAt: z.string().datetime().nullable().default(null),
  stableSince: z.string().datetime().nullable().default(null),
});
export type MonitoringItemSeed = z.infer<typeof monitoringItemSeedSchema>;

export const monitoringItemLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type MonitoringItemLink = z.infer<typeof monitoringItemLinkSchema>;

export const monitoringItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: monitoringStatusSchema,
  mode: monitoringModeSchema,
  priority: researchQuestionPrioritySchema,
  triggerAction: monitoringTriggerActionSchema,
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  whyItMatters: z.string().min(1),
  triggerSignals: z.array(z.string().min(1)).min(1),
  latestSignalSummary: z.string().min(1),
  linkedWatchpointTitles: z.array(z.string().min(1)).default([]),
  linkedEvidenceGapIds: z.array(z.string().min(1)).default([]),
  linkedEvidenceGapTitles: z.array(z.string().min(1)).default([]),
  linkedAcquisitionTaskIds: z.array(z.string().min(1)).default([]),
  linkedAcquisitionTaskTitles: z.array(z.string().min(1)).default([]),
  linkedChangeIds: z.array(z.string().min(1)).default([]),
  linkedChangeTitles: z.array(z.string().min(1)).default([]),
  linkedQuestionIds: z.array(z.string().min(1)).default([]),
  linkedQuestions: z.array(z.string().min(1)).default([]),
  linkedSynthesisIds: z.array(z.string().min(1)).default([]),
  linkedSyntheses: z.array(z.string().min(1)).default([]),
  canonicalReviewTitles: z.array(z.string().min(1)).default([]),
  reviewSurfaceTitles: z.array(z.string().min(1)).default([]),
  suggestedContextPackTitles: z.array(z.string().min(1)).default([]),
  suggestedPageTitles: z.array(z.string().min(1)).default([]),
  spawnSessionId: z.string().nullable(),
  spawnSessionTitle: z.string().nullable(),
  spawnSessionStatus: z.enum(["queued", "active", "completed"]).nullable(),
  nextCheck: z.string().min(1),
  recommendedAction: z.string().min(1),
  maturityImpactStages: z.array(topicMaturityStageSchema).default([]),
  lastCheckedAt: z.string().datetime().nullable(),
  triggeredAt: z.string().datetime().nullable(),
  stableSince: z.string().datetime().nullable(),
  spawnsAcquisition: z.boolean(),
  marksReview: z.boolean(),
  reopensWork: z.boolean(),
  links: z.object({
    monitor: monitoringItemLinkSchema,
    topicHome: monitoringItemLinkSchema,
    acquisition: monitoringItemLinkSchema,
    changes: monitoringItemLinkSchema,
    questionQueue: monitoringItemLinkSchema,
    maintenance: monitoringItemLinkSchema,
    canonicalReview: monitoringItemLinkSchema,
  }),
});
export type MonitoringItem = z.infer<typeof monitoringItemSchema>;

export const monitoringBucketSchema = z.object({
  id: z.enum([
    "spawn-acquisition",
    "review-needed",
    "periodic-review",
    "keep-watching",
    "recently-stable",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  items: z.array(monitoringItemSchema),
});
export type MonitoringBucket = z.infer<typeof monitoringBucketSchema>;

export const monitoringTopicSummarySchema = z.object({
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  summary: z.string().min(1),
  itemCount: z.number().int().nonnegative(),
  watchingCount: z.number().int().nonnegative(),
  triggeredCount: z.number().int().nonnegative(),
  reviewNeededCount: z.number().int().nonnegative(),
  spawnedAcquisitionCount: z.number().int().nonnegative(),
  periodicReviewCount: z.number().int().nonnegative(),
  nextMonitor: monitoringItemSchema.nullable(),
  nextAcquisitionTrigger: monitoringItemSchema.nullable(),
  items: z.array(monitoringItemSchema),
});
export type MonitoringTopicSummary = z.infer<typeof monitoringTopicSummarySchema>;

export const monitoringOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  focusedTopic: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  focusedMonitor: z
    .object({
      topicId: z.string().min(1),
      monitorId: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  summary: z.object({
    totalItems: z.number().int().nonnegative(),
    watching: z.number().int().nonnegative(),
    triggered: z.number().int().nonnegative(),
    reviewNeeded: z.number().int().nonnegative(),
    spawnedAcquisition: z.number().int().nonnegative(),
    periodicReview: z.number().int().nonnegative(),
  }),
  focusMonitor: monitoringItemSchema.nullable(),
  buckets: z.array(monitoringBucketSchema),
  topics: z.array(monitoringTopicSummarySchema),
});
export type MonitoringOverview = z.infer<typeof monitoringOverviewSchema>;
