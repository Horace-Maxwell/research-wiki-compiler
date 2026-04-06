import { z } from "zod";

import { researchQuestionPrioritySchema } from "@/lib/contracts/research-question";
import { topicMaturityStageSchema } from "@/lib/contracts/topic-evaluation";

export const EVIDENCE_GAP_TYPES = [
  "source-coverage",
  "contradictory-evidence",
  "comparison-evidence",
  "freshness-evidence",
  "operational-evidence",
  "provenance-quality",
  "synthesis-readiness",
  "recommendation-confidence",
] as const;
export const evidenceGapTypeSchema = z.enum(EVIDENCE_GAP_TYPES);
export type EvidenceGapType = z.infer<typeof evidenceGapTypeSchema>;

export const EVIDENCE_GAP_STATUSES = [
  "open",
  "planned",
  "in-session",
  "resolved",
] as const;
export const evidenceGapStatusSchema = z.enum(EVIDENCE_GAP_STATUSES);
export type EvidenceGapStatus = z.infer<typeof evidenceGapStatusSchema>;

export const evidenceGapSeedSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: evidenceGapStatusSchema,
  priority: researchQuestionPrioritySchema,
  gapType: evidenceGapTypeSchema,
  whyItMatters: z.string().min(1),
  impactSummary: z.string().min(1),
  missingEvidence: z.string().min(1),
  nextEvidenceToAcquire: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).min(1),
  linkedQuestionIds: z.array(z.string().min(1)).default([]),
  linkedSynthesisIds: z.array(z.string().min(1)).default([]),
  canonicalReviewTitles: z.array(z.string().min(1)).default([]),
  watchpointTitles: z.array(z.string().min(1)).default([]),
  maintenanceSurfaceTitles: z.array(z.string().min(1)).default([]),
  acquisitionSessionId: z.string().nullable().default(null),
  preferredContextPackTitles: z.array(z.string().min(1)).default([]),
  firstPageTitles: z.array(z.string().min(1)).default([]),
  firstSourceTitles: z.array(z.string().min(1)).default([]),
  maturityBlockerStages: z.array(topicMaturityStageSchema).default([]),
  qualityBlockerNotes: z.array(z.string().min(1)).default([]),
  advancesQuestionIds: z.array(z.string().min(1)).default([]),
  advancesSynthesisIds: z.array(z.string().min(1)).default([]),
  resolvedAt: z.string().datetime().nullable().default(null),
  resolutionSummary: z.string().nullable().default(null),
});
export type EvidenceGapSeed = z.infer<typeof evidenceGapSeedSchema>;

export const evidenceGapLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type EvidenceGapLink = z.infer<typeof evidenceGapLinkSchema>;

export const evidenceGapItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  status: evidenceGapStatusSchema,
  priority: researchQuestionPrioritySchema,
  gapType: evidenceGapTypeSchema,
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  whyItMatters: z.string().min(1),
  impactSummary: z.string().min(1),
  missingEvidence: z.string().min(1),
  nextEvidenceToAcquire: z.string().min(1),
  successCriteria: z.array(z.string().min(1)).min(1),
  linkedQuestionIds: z.array(z.string().min(1)).default([]),
  linkedQuestions: z.array(z.string().min(1)).default([]),
  linkedSynthesisIds: z.array(z.string().min(1)).default([]),
  linkedSyntheses: z.array(z.string().min(1)).default([]),
  canonicalReviewTitles: z.array(z.string().min(1)).default([]),
  watchpointTitles: z.array(z.string().min(1)).default([]),
  maintenanceSurfaceTitles: z.array(z.string().min(1)).default([]),
  acquisitionSessionId: z.string().nullable(),
  acquisitionSessionTitle: z.string().nullable(),
  acquisitionSessionStatus: z.enum(["queued", "active", "completed"]).nullable(),
  preferredContextPackTitles: z.array(z.string().min(1)).default([]),
  firstPageTitles: z.array(z.string().min(1)).default([]),
  firstSourceTitles: z.array(z.string().min(1)).default([]),
  maturityBlockerStages: z.array(topicMaturityStageSchema).default([]),
  qualityBlockerNotes: z.array(z.string().min(1)).default([]),
  advancesQuestionIds: z.array(z.string().min(1)).default([]),
  advancesQuestions: z.array(z.string().min(1)).default([]),
  advancesSynthesisIds: z.array(z.string().min(1)).default([]),
  advancesSyntheses: z.array(z.string().min(1)).default([]),
  resolvedAt: z.string().datetime().nullable(),
  resolutionSummary: z.string().nullable(),
  blocksQuestions: z.boolean(),
  blocksSyntheses: z.boolean(),
  blocksMaturityProgression: z.boolean(),
  acquisitionReady: z.boolean(),
  recentlyResolved: z.boolean(),
  links: z.object({
    gap: evidenceGapLinkSchema,
    topicHome: evidenceGapLinkSchema,
    session: evidenceGapLinkSchema,
    questionQueue: evidenceGapLinkSchema,
    syntheses: evidenceGapLinkSchema,
    maintenance: evidenceGapLinkSchema,
    canonicalReview: evidenceGapLinkSchema,
  }),
});
export type EvidenceGapItem = z.infer<typeof evidenceGapItemSchema>;

export const evidenceGapBucketSchema = z.object({
  id: z.enum([
    "next-evidence",
    "question-blockers",
    "synthesis-blockers",
    "maturity-blockers",
    "recently-resolved",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  gaps: z.array(evidenceGapItemSchema),
});
export type EvidenceGapBucket = z.infer<typeof evidenceGapBucketSchema>;

export const evidenceGapTopicSummarySchema = z.object({
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  summary: z.string().min(1),
  gapCount: z.number().int().nonnegative(),
  openCount: z.number().int().nonnegative(),
  plannedCount: z.number().int().nonnegative(),
  inSessionCount: z.number().int().nonnegative(),
  resolvedCount: z.number().int().nonnegative(),
  highPriorityCount: z.number().int().nonnegative(),
  blockedQuestionCount: z.number().int().nonnegative(),
  blockedSynthesisCount: z.number().int().nonnegative(),
  maturityBlockerCount: z.number().int().nonnegative(),
  nextGap: evidenceGapItemSchema.nullable(),
  recentlyResolved: evidenceGapItemSchema.nullable(),
  gaps: z.array(evidenceGapItemSchema),
});
export type EvidenceGapTopicSummary = z.infer<typeof evidenceGapTopicSummarySchema>;

export const evidenceGapOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  focusedTopic: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  focusedGap: z
    .object({
      topicId: z.string().min(1),
      gapId: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  summary: z.object({
    totalGaps: z.number().int().nonnegative(),
    open: z.number().int().nonnegative(),
    planned: z.number().int().nonnegative(),
    inSession: z.number().int().nonnegative(),
    resolved: z.number().int().nonnegative(),
    highPriority: z.number().int().nonnegative(),
    blockedQuestions: z.number().int().nonnegative(),
    blockedSyntheses: z.number().int().nonnegative(),
    maturityBlockers: z.number().int().nonnegative(),
  }),
  focusGap: evidenceGapItemSchema.nullable(),
  buckets: z.array(evidenceGapBucketSchema),
  topics: z.array(evidenceGapTopicSummarySchema),
});
export type EvidenceGapOverview = z.infer<typeof evidenceGapOverviewSchema>;
