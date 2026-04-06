import { z } from "zod";

import { topicMaturityStageSchema } from "@/lib/contracts/topic-evaluation";

export const RESEARCH_QUESTION_STATUSES = [
  "open",
  "active",
  "blocked",
  "waiting-for-sources",
  "ready-for-synthesis",
  "synthesized",
  "stale",
] as const;

export const researchQuestionStatusSchema = z.enum(RESEARCH_QUESTION_STATUSES);
export type ResearchQuestionStatus = z.infer<typeof researchQuestionStatusSchema>;

export const RESEARCH_QUESTION_PRIORITIES = ["high", "medium", "low"] as const;
export const researchQuestionPrioritySchema = z.enum(RESEARCH_QUESTION_PRIORITIES);
export type ResearchQuestionPriority = z.infer<typeof researchQuestionPrioritySchema>;

export const researchQuestionSeedSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  summary: z.string().min(1),
  status: researchQuestionStatusSchema,
  priority: researchQuestionPrioritySchema,
  whyNow: z.string().min(1),
  contextPackTitle: z.string().min(1),
  supportingContextPackTitles: z.array(z.string().min(1)).default([]),
  relatedPages: z.array(z.string().min(1)).min(1),
  relatedTensions: z.array(z.string().min(1)).default([]),
  relatedWatchpoints: z.array(z.string().min(1)).default([]),
  evidenceToAdvance: z.array(z.string().min(1)).default([]),
  sourceGaps: z.array(z.string().min(1)).default([]),
  synthesizeInto: z.string().nullable().default(null),
  canonicalTargetTitle: z.string().nullable().default(null),
  reopenTriggers: z.array(z.string().min(1)).default([]),
  provenanceNotes: z.array(z.string().min(1)).default([]),
});
export type ResearchQuestionSeed = z.infer<typeof researchQuestionSeedSchema>;

export const questionWorkflowLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type QuestionWorkflowLink = z.infer<typeof questionWorkflowLinkSchema>;

export const questionWorkflowItemSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  summary: z.string().min(1),
  status: researchQuestionStatusSchema,
  priority: researchQuestionPrioritySchema,
  whyNow: z.string().min(1),
  readinessPercent: z.number().min(0).max(100),
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  contextPackTitle: z.string().min(1),
  supportingContextPackTitles: z.array(z.string().min(1)).default([]),
  relatedPages: z.array(z.string().min(1)).default([]),
  relatedTensions: z.array(z.string().min(1)).default([]),
  relatedWatchpoints: z.array(z.string().min(1)).default([]),
  evidenceToAdvance: z.array(z.string().min(1)).default([]),
  sourceGaps: z.array(z.string().min(1)).default([]),
  synthesizeInto: z.string().nullable(),
  canonicalTargetTitle: z.string().nullable(),
  reopenTriggers: z.array(z.string().min(1)).default([]),
  provenanceNotes: z.array(z.string().min(1)).default([]),
  needsSources: z.boolean(),
  readyForSynthesis: z.boolean(),
  watchForReopen: z.boolean(),
  sessionCount: z.number().int().nonnegative(),
  hasActiveSession: z.boolean(),
  nextSessionTitle: z.string().nullable(),
  nextSessionGoal: z.string().nullable(),
  nextSessionStatus: z.enum(["queued", "active"]).nullable(),
  latestSessionTitle: z.string().nullable(),
  latestSessionSummary: z.string().nullable(),
  latestSessionOutcome: z
    .enum([
      "question-advanced",
      "needs-more-sources",
      "ready-for-synthesis",
      "synthesized",
      "updated-working-note",
      "updated-canonical",
      "archived-answer",
    ])
    .nullable(),
  latestStatusChangeReason: z.string().nullable(),
  lastWorkedAt: z.string().datetime().nullable(),
  links: z.object({
    topicHome: questionWorkflowLinkSchema,
    openQuestions: questionWorkflowLinkSchema,
    maintenance: questionWorkflowLinkSchema,
    canonicalTarget: questionWorkflowLinkSchema,
    sessionWorkspace: questionWorkflowLinkSchema,
  }),
});
export type QuestionWorkflowItem = z.infer<typeof questionWorkflowItemSchema>;

export const questionWorkflowBucketSchema = z.object({
  id: z.enum([
    "work-next",
    "ready-for-synthesis",
    "needs-sources",
    "watch-for-reopen",
  ]),
  title: z.string().min(1),
  description: z.string().min(1),
  questions: z.array(questionWorkflowItemSchema),
});
export type QuestionWorkflowBucket = z.infer<typeof questionWorkflowBucketSchema>;

export const questionWorkflowTopicSummarySchema = z.object({
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  topicKind: z.enum(["topic", "example"]),
  topicMaturityStage: topicMaturityStageSchema,
  summary: z.string().min(1),
  questionCount: z.number().int().nonnegative(),
  readyForSynthesisCount: z.number().int().nonnegative(),
  needsSourcesCount: z.number().int().nonnegative(),
  watchForReopenCount: z.number().int().nonnegative(),
  topQuestion: questionWorkflowItemSchema.nullable(),
  questions: z.array(questionWorkflowItemSchema),
});
export type QuestionWorkflowTopicSummary = z.infer<typeof questionWorkflowTopicSummarySchema>;

export const questionWorkflowOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  focusedTopic: z
    .object({
      id: z.string().min(1),
      title: z.string().min(1),
    })
    .nullable(),
  summary: z.object({
    totalQuestions: z.number().int().nonnegative(),
    workQueue: z.number().int().nonnegative(),
    readyForSynthesis: z.number().int().nonnegative(),
    needsSources: z.number().int().nonnegative(),
    watchForReopen: z.number().int().nonnegative(),
    synthesized: z.number().int().nonnegative(),
  }),
  focusQueue: z.array(questionWorkflowItemSchema),
  buckets: z.array(questionWorkflowBucketSchema),
  topics: z.array(questionWorkflowTopicSummarySchema),
});
export type QuestionWorkflowOverview = z.infer<typeof questionWorkflowOverviewSchema>;
