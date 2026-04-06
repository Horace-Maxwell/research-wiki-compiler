import { z } from "zod";

import {
  researchQuestionPrioritySchema,
  researchQuestionStatusSchema,
} from "@/lib/contracts/research-question";
import { topicMaturityStageSchema } from "@/lib/contracts/topic-evaluation";

export const RESEARCH_SESSION_STATUSES = ["queued", "active", "completed"] as const;
export const researchSessionStatusSchema = z.enum(RESEARCH_SESSION_STATUSES);
export type ResearchSessionStatus = z.infer<typeof researchSessionStatusSchema>;

export const RESEARCH_SESSION_OUTCOMES = [
  "question-advanced",
  "needs-more-sources",
  "ready-for-synthesis",
  "synthesized",
  "updated-working-note",
  "updated-canonical",
  "archived-answer",
] as const;
export const researchSessionOutcomeSchema = z.enum(RESEARCH_SESSION_OUTCOMES);
export type ResearchSessionOutcome = z.infer<typeof researchSessionOutcomeSchema>;

export const researchSessionQuestionStatusChangeSchema = z.object({
  from: researchQuestionStatusSchema,
  to: researchQuestionStatusSchema,
  reason: z.string().min(1),
});
export type ResearchSessionQuestionStatusChange = z.infer<
  typeof researchSessionQuestionStatusChangeSchema
>;

export const researchSessionSeedSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  title: z.string().min(1),
  goal: z.string().min(1),
  summary: z.string().min(1),
  status: researchSessionStatusSchema,
  priority: researchQuestionPrioritySchema,
  sessionDate: z.string().datetime(),
  loadedContextPackTitles: z.array(z.string().min(1)).min(1),
  supportingContextPackTitles: z.array(z.string().min(1)).default([]),
  relevantPages: z.array(z.string().min(1)).default([]),
  relevantSources: z.array(z.string().min(1)).default([]),
  draftConclusion: z.string().min(1),
  evidenceGained: z.array(z.string().min(1)).default([]),
  remainingUncertainty: z.array(z.string().min(1)).default([]),
  recommendedNextStep: z.string().min(1),
  outcome: researchSessionOutcomeSchema.nullable().default(null),
  synthesisTitle: z.string().nullable().default(null),
  archiveTitle: z.string().nullable().default(null),
  canonicalUpdateTitle: z.string().nullable().default(null),
  maintenanceUpdateTitles: z.array(z.string().min(1)).default([]),
  questionStatusChange: researchSessionQuestionStatusChangeSchema.nullable().default(null),
  resumeNotes: z.array(z.string().min(1)).default([]),
});
export type ResearchSessionSeed = z.infer<typeof researchSessionSeedSchema>;

export const researchSessionLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type ResearchSessionLink = z.infer<typeof researchSessionLinkSchema>;

export const researchSessionItemSchema = z.object({
  id: z.string().min(1),
  questionId: z.string().min(1),
  question: z.string().min(1),
  questionStatus: researchQuestionStatusSchema,
  title: z.string().min(1),
  goal: z.string().min(1),
  summary: z.string().min(1),
  status: researchSessionStatusSchema,
  priority: researchQuestionPrioritySchema,
  sessionDate: z.string().datetime(),
  outcome: researchSessionOutcomeSchema.nullable(),
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  loadedContextPackTitles: z.array(z.string().min(1)).min(1),
  supportingContextPackTitles: z.array(z.string().min(1)).default([]),
  relevantPages: z.array(z.string().min(1)).default([]),
  relevantSources: z.array(z.string().min(1)).default([]),
  draftConclusion: z.string().min(1),
  evidenceGained: z.array(z.string().min(1)).default([]),
  remainingUncertainty: z.array(z.string().min(1)).default([]),
  recommendedNextStep: z.string().min(1),
  synthesisTitle: z.string().nullable(),
  archiveTitle: z.string().nullable(),
  canonicalUpdateTitle: z.string().nullable(),
  maintenanceUpdateTitles: z.array(z.string().min(1)).default([]),
  questionStatusChange: researchSessionQuestionStatusChangeSchema.nullable(),
  resumeNotes: z.array(z.string().min(1)).default([]),
  changedQuestionState: z.boolean(),
  producedDurableUpdate: z.boolean(),
  readyForSynthesis: z.boolean(),
  links: z.object({
    session: researchSessionLinkSchema,
    questionQueue: researchSessionLinkSchema,
    questionNote: researchSessionLinkSchema,
    topicHome: researchSessionLinkSchema,
    maintenance: researchSessionLinkSchema,
    canonicalTarget: researchSessionLinkSchema,
  }),
});
export type ResearchSessionItem = z.infer<typeof researchSessionItemSchema>;

export const researchSessionBucketSchema = z.object({
  id: z.enum(["queue", "ready-for-synthesis", "recent-outcomes"]),
  title: z.string().min(1),
  description: z.string().min(1),
  sessions: z.array(researchSessionItemSchema),
});
export type ResearchSessionBucket = z.infer<typeof researchSessionBucketSchema>;

export const researchSessionTopicSummarySchema = z.object({
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  summary: z.string().min(1),
  sessionCount: z.number().int().nonnegative(),
  queuedCount: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  completedCount: z.number().int().nonnegative(),
  changedQuestionStateCount: z.number().int().nonnegative(),
  nextSession: researchSessionItemSchema.nullable(),
  recentSession: researchSessionItemSchema.nullable(),
  sessions: z.array(researchSessionItemSchema),
});
export type ResearchSessionTopicSummary = z.infer<typeof researchSessionTopicSummarySchema>;

export const researchSessionOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  focusedTopic: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  focusedQuestion: z
    .object({
      topicId: z.string().min(1),
      questionId: z.string().min(1),
      question: z.string().min(1),
    })
    .nullable(),
  summary: z.object({
    totalSessions: z.number().int().nonnegative(),
    queued: z.number().int().nonnegative(),
    active: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    changedQuestionState: z.number().int().nonnegative(),
    producedDurableUpdate: z.number().int().nonnegative(),
    readyForSynthesis: z.number().int().nonnegative(),
  }),
  focusSession: researchSessionItemSchema.nullable(),
  buckets: z.array(researchSessionBucketSchema),
  topics: z.array(researchSessionTopicSummarySchema),
});
export type ResearchSessionOverview = z.infer<typeof researchSessionOverviewSchema>;
