import { z } from "zod";

import { researchQuestionPrioritySchema } from "@/lib/contracts/research-question";
import { topicMaturityStageSchema } from "@/lib/contracts/topic-evaluation";

export const EVIDENCE_BUNDLE_KINDS = [
  "source-pattern",
  "summary-pattern",
  "release-signal",
  "provider-signal",
  "audit-signal",
  "maintenance-signal",
] as const;
export const evidenceBundleKindSchema = z.enum(EVIDENCE_BUNDLE_KINDS);
export type EvidenceBundleKind = z.infer<typeof evidenceBundleKindSchema>;

export const EVIDENCE_CHANGE_STATES = [
  "review-needed",
  "reopened",
  "stabilized",
] as const;
export const evidenceChangeStateSchema = z.enum(EVIDENCE_CHANGE_STATES);
export type EvidenceChangeState = z.infer<typeof evidenceChangeStateSchema>;

export const EVIDENCE_CHANGE_TYPES = [
  "new-source",
  "summary-shift",
  "audit-finding",
  "release-signal",
  "provider-shift",
  "operator-signal",
] as const;
export const evidenceChangeTypeSchema = z.enum(EVIDENCE_CHANGE_TYPES);
export type EvidenceChangeType = z.infer<typeof evidenceChangeTypeSchema>;

export const evidenceBundleSeedSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: evidenceBundleKindSchema,
  summary: z.string().min(1),
  sourceTitles: z.array(z.string().min(1)).default([]),
  assumptionNotes: z.array(z.string().min(1)).default([]),
  linkedQuestionIds: z.array(z.string().min(1)).default([]),
  linkedSynthesisIds: z.array(z.string().min(1)).default([]),
  canonicalPageTitles: z.array(z.string().min(1)).default([]),
  watchpointTitles: z.array(z.string().min(1)).default([]),
  maintenanceSurfaceTitles: z.array(z.string().min(1)).default([]),
});
export type EvidenceBundleSeed = z.infer<typeof evidenceBundleSeedSchema>;

export const evidenceChangeSeedSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  state: evidenceChangeStateSchema,
  priority: researchQuestionPrioritySchema,
  changeType: evidenceChangeTypeSchema,
  changedAt: z.string().datetime(),
  evidenceBundleIds: z.array(z.string().min(1)).min(1),
  sourceTitles: z.array(z.string().min(1)).default([]),
  whyItMatters: z.string().min(1),
  impactSummary: z.string().min(1),
  affectedQuestionIds: z.array(z.string().min(1)).default([]),
  affectedSynthesisIds: z.array(z.string().min(1)).default([]),
  canonicalReviewTitles: z.array(z.string().min(1)).default([]),
  triggeredWatchpointTitles: z.array(z.string().min(1)).default([]),
  maintenanceActionTitles: z.array(z.string().min(1)).default([]),
  likelyStableTitles: z.array(z.string().min(1)).default([]),
  reopenQuestionIds: z.array(z.string().min(1)).default([]),
  staleSynthesisIds: z.array(z.string().min(1)).default([]),
  downgradedDecisionTitles: z.array(z.string().min(1)).default([]),
  recommendedAction: z.string().min(1),
});
export type EvidenceChangeSeed = z.infer<typeof evidenceChangeSeedSchema>;

export const evidenceChangeLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type EvidenceChangeLink = z.infer<typeof evidenceChangeLinkSchema>;

export const evidenceBundleItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  kind: evidenceBundleKindSchema,
  summary: z.string().min(1),
  sourceTitles: z.array(z.string().min(1)).default([]),
  assumptionNotes: z.array(z.string().min(1)).default([]),
  linkedQuestions: z.array(z.string().min(1)).default([]),
  linkedSyntheses: z.array(z.string().min(1)).default([]),
  canonicalPageTitles: z.array(z.string().min(1)).default([]),
  watchpointTitles: z.array(z.string().min(1)).default([]),
  maintenanceSurfaceTitles: z.array(z.string().min(1)).default([]),
});
export type EvidenceBundleItem = z.infer<typeof evidenceBundleItemSchema>;

export const evidenceChangeItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  state: evidenceChangeStateSchema,
  priority: researchQuestionPrioritySchema,
  changeType: evidenceChangeTypeSchema,
  changedAt: z.string().datetime(),
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  evidenceBundleIds: z.array(z.string().min(1)).min(1),
  evidenceBundles: z.array(evidenceBundleItemSchema).min(1),
  sourceTitles: z.array(z.string().min(1)).default([]),
  whyItMatters: z.string().min(1),
  impactSummary: z.string().min(1),
  affectedQuestionIds: z.array(z.string().min(1)).default([]),
  affectedQuestions: z.array(z.string().min(1)).default([]),
  affectedSynthesisIds: z.array(z.string().min(1)).default([]),
  affectedSyntheses: z.array(z.string().min(1)).default([]),
  canonicalReviewTitles: z.array(z.string().min(1)).default([]),
  triggeredWatchpointTitles: z.array(z.string().min(1)).default([]),
  maintenanceActionTitles: z.array(z.string().min(1)).default([]),
  likelyStableTitles: z.array(z.string().min(1)).default([]),
  reopenQuestionIds: z.array(z.string().min(1)).default([]),
  reopenQuestions: z.array(z.string().min(1)).default([]),
  staleSynthesisIds: z.array(z.string().min(1)).default([]),
  staleSyntheses: z.array(z.string().min(1)).default([]),
  downgradedDecisionTitles: z.array(z.string().min(1)).default([]),
  recommendedAction: z.string().min(1),
  reopensWork: z.boolean(),
  needsCanonicalReview: z.boolean(),
  triggersMaintenance: z.boolean(),
  links: z.object({
    change: evidenceChangeLinkSchema,
    topicHome: evidenceChangeLinkSchema,
    maintenance: evidenceChangeLinkSchema,
    questionQueue: evidenceChangeLinkSchema,
    syntheses: evidenceChangeLinkSchema,
    canonicalReview: evidenceChangeLinkSchema,
  }),
});
export type EvidenceChangeItem = z.infer<typeof evidenceChangeItemSchema>;

export const evidenceChangeBucketSchema = z.object({
  id: z.enum(["recent", "reopen", "review", "stabilized"]),
  title: z.string().min(1),
  description: z.string().min(1),
  changes: z.array(evidenceChangeItemSchema),
});
export type EvidenceChangeBucket = z.infer<typeof evidenceChangeBucketSchema>;

export const evidenceChangeTopicSummarySchema = z.object({
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  summary: z.string().min(1),
  changeCount: z.number().int().nonnegative(),
  reviewNeededCount: z.number().int().nonnegative(),
  reopenedCount: z.number().int().nonnegative(),
  stabilizedCount: z.number().int().nonnegative(),
  canonicalReviewCount: z.number().int().nonnegative(),
  reopenedQuestionCount: z.number().int().nonnegative(),
  staleSynthesisCount: z.number().int().nonnegative(),
  latestChange: evidenceChangeItemSchema.nullable(),
  nextReview: evidenceChangeItemSchema.nullable(),
  changes: z.array(evidenceChangeItemSchema),
});
export type EvidenceChangeTopicSummary = z.infer<typeof evidenceChangeTopicSummarySchema>;

export const evidenceChangeOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  focusedTopic: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  focusedChange: z
    .object({
      topicId: z.string().min(1),
      changeId: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  summary: z.object({
    totalChanges: z.number().int().nonnegative(),
    reviewNeeded: z.number().int().nonnegative(),
    reopened: z.number().int().nonnegative(),
    stabilized: z.number().int().nonnegative(),
    canonicalReview: z.number().int().nonnegative(),
    reopenedQuestions: z.number().int().nonnegative(),
    staleSyntheses: z.number().int().nonnegative(),
  }),
  focusChange: evidenceChangeItemSchema.nullable(),
  buckets: z.array(evidenceChangeBucketSchema),
  topics: z.array(evidenceChangeTopicSummarySchema),
});
export type EvidenceChangeOverview = z.infer<typeof evidenceChangeOverviewSchema>;
