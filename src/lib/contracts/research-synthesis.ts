import { z } from "zod";

import { topicMaturityStageSchema } from "@/lib/contracts/topic-evaluation";

export const RESEARCH_SYNTHESIS_STATUSES = [
  "candidate",
  "in-progress",
  "ready",
  "published",
  "stale",
] as const;
export const researchSynthesisStatusSchema = z.enum(RESEARCH_SYNTHESIS_STATUSES);
export type ResearchSynthesisStatus = z.infer<typeof researchSynthesisStatusSchema>;

export const RESEARCH_SYNTHESIS_DECISION_TYPES = [
  "recommendation",
  "caution",
  "watch",
  "not-enough-evidence",
  "comparison",
] as const;
export const researchSynthesisDecisionTypeSchema = z.enum(RESEARCH_SYNTHESIS_DECISION_TYPES);
export type ResearchSynthesisDecisionType = z.infer<typeof researchSynthesisDecisionTypeSchema>;

export const RESEARCH_SYNTHESIS_QUESTION_EFFECTS = [
  "resolved",
  "advanced",
  "reframed",
  "reopened",
] as const;
export const researchSynthesisQuestionEffectSchema = z.enum(RESEARCH_SYNTHESIS_QUESTION_EFFECTS);
export type ResearchSynthesisQuestionEffect = z.infer<typeof researchSynthesisQuestionEffectSchema>;

export const researchSynthesisDecisionSchema = z.object({
  type: researchSynthesisDecisionTypeSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  action: z.string().min(1),
});
export type ResearchSynthesisDecision = z.infer<typeof researchSynthesisDecisionSchema>;

export const researchSynthesisQuestionImpactSchema = z.object({
  questionId: z.string().min(1),
  effect: researchSynthesisQuestionEffectSchema,
  note: z.string().min(1),
});
export type ResearchSynthesisQuestionImpact = z.infer<
  typeof researchSynthesisQuestionImpactSchema
>;

export const researchSynthesisSeedSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  goal: z.string().min(1),
  status: researchSynthesisStatusSchema,
  confidencePercent: z.number().int().min(0).max(100),
  updatedAt: z.string().datetime(),
  sourceQuestionIds: z.array(z.string().min(1)).min(1),
  sourceSessionIds: z.array(z.string().min(1)).default([]),
  evidenceSummary: z.array(z.string().min(1)).default([]),
  durableConclusion: z.string().min(1),
  provisionalBoundary: z.string().nullable().default(null),
  publishedPageTitle: z.string().nullable().default(null),
  canonicalUpdateTitles: z.array(z.string().min(1)).default([]),
  maintenanceUpdateTitles: z.array(z.string().min(1)).default([]),
  watchpointUpdateTitles: z.array(z.string().min(1)).default([]),
  tensionUpdateTitles: z.array(z.string().min(1)).default([]),
  archiveTitles: z.array(z.string().min(1)).default([]),
  questionImpacts: z.array(researchSynthesisQuestionImpactSchema).default([]),
  decisions: z.array(researchSynthesisDecisionSchema).min(1),
  changedCanonicalSummary: z.string().nullable().default(null),
  recommendedNextStep: z.string().min(1),
  revisitTriggers: z.array(z.string().min(1)).default([]),
});
export type ResearchSynthesisSeed = z.infer<typeof researchSynthesisSeedSchema>;

export const researchSynthesisLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type ResearchSynthesisLink = z.infer<typeof researchSynthesisLinkSchema>;

export const researchSynthesisItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  goal: z.string().min(1),
  status: researchSynthesisStatusSchema,
  confidencePercent: z.number().int().min(0).max(100),
  updatedAt: z.string().datetime(),
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  sourceQuestionIds: z.array(z.string().min(1)).min(1),
  sourceQuestions: z.array(z.string().min(1)).min(1),
  sourceSessionIds: z.array(z.string().min(1)).default([]),
  sourceSessions: z.array(z.string().min(1)).default([]),
  evidenceSummary: z.array(z.string().min(1)).default([]),
  durableConclusion: z.string().min(1),
  provisionalBoundary: z.string().nullable(),
  publishedPageTitle: z.string().nullable(),
  canonicalUpdateTitles: z.array(z.string().min(1)).default([]),
  maintenanceUpdateTitles: z.array(z.string().min(1)).default([]),
  watchpointUpdateTitles: z.array(z.string().min(1)).default([]),
  tensionUpdateTitles: z.array(z.string().min(1)).default([]),
  archiveTitles: z.array(z.string().min(1)).default([]),
  questionImpacts: z.array(researchSynthesisQuestionImpactSchema).default([]),
  decisions: z.array(researchSynthesisDecisionSchema).min(1),
  changedCanonicalSummary: z.string().nullable(),
  recommendedNextStep: z.string().min(1),
  revisitTriggers: z.array(z.string().min(1)).default([]),
  readyForPublication: z.boolean(),
  hasPublishedPage: z.boolean(),
  changesCanonical: z.boolean(),
  introducesWatchpoints: z.boolean(),
  links: z.object({
    synthesis: researchSynthesisLinkSchema,
    topicHome: researchSynthesisLinkSchema,
    maintenance: researchSynthesisLinkSchema,
    publishedPage: researchSynthesisLinkSchema,
    canonicalTarget: researchSynthesisLinkSchema,
    questionQueue: researchSynthesisLinkSchema,
    sessionWorkspace: researchSynthesisLinkSchema,
  }),
});
export type ResearchSynthesisItem = z.infer<typeof researchSynthesisItemSchema>;

export const researchSynthesisBucketSchema = z.object({
  id: z.enum(["ready", "decision-loop", "recent-published", "stale"]),
  title: z.string().min(1),
  description: z.string().min(1),
  syntheses: z.array(researchSynthesisItemSchema),
});
export type ResearchSynthesisBucket = z.infer<typeof researchSynthesisBucketSchema>;

export const researchSynthesisTopicSummarySchema = z.object({
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  summary: z.string().min(1),
  synthesisCount: z.number().int().nonnegative(),
  candidateCount: z.number().int().nonnegative(),
  inProgressCount: z.number().int().nonnegative(),
  readyCount: z.number().int().nonnegative(),
  publishedCount: z.number().int().nonnegative(),
  staleCount: z.number().int().nonnegative(),
  changedCanonicalCount: z.number().int().nonnegative(),
  nextSynthesis: researchSynthesisItemSchema.nullable(),
  recentPublished: researchSynthesisItemSchema.nullable(),
  syntheses: z.array(researchSynthesisItemSchema),
});
export type ResearchSynthesisTopicSummary = z.infer<
  typeof researchSynthesisTopicSummarySchema
>;

export const researchSynthesisOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  focusedTopic: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  focusedSynthesis: z
    .object({
      topicId: z.string().min(1),
      synthesisId: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  summary: z.object({
    totalSyntheses: z.number().int().nonnegative(),
    candidate: z.number().int().nonnegative(),
    inProgress: z.number().int().nonnegative(),
    ready: z.number().int().nonnegative(),
    published: z.number().int().nonnegative(),
    stale: z.number().int().nonnegative(),
    changedCanonical: z.number().int().nonnegative(),
    introducedWatchpoints: z.number().int().nonnegative(),
  }),
  focusSynthesis: researchSynthesisItemSchema.nullable(),
  buckets: z.array(researchSynthesisBucketSchema),
  topics: z.array(researchSynthesisTopicSummarySchema),
});
export type ResearchSynthesisOverview = z.infer<typeof researchSynthesisOverviewSchema>;
