import { z } from "zod";

import {
  topicActionPrioritySchema,
  topicEvaluationActionSchema,
  topicEvaluationCriterionSchema,
  topicMaturityStageSchema,
} from "@/lib/contracts/topic-evaluation";

export const topicPortfolioLinkSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
});
export type TopicPortfolioLink = z.infer<typeof topicPortfolioLinkSchema>;

export const topicPortfolioItemSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["topic", "example"]),
  title: z.string().min(1),
  description: z.string().min(1),
  maturityStage: topicMaturityStageSchema,
  nextStage: topicMaturityStageSchema.nullable(),
  overallScore: z.number().min(0).max(5),
  overallPercent: z.number().min(0).max(100),
  summary: z.string().min(1),
  generatedAt: z.string().datetime(),
  corpusFileCount: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
  contextPackCount: z.number().int().nonnegative(),
  auditCount: z.number().int().nonnegative(),
  strengths: z.array(z.string().min(1)),
  weakSurfaces: z.array(z.string().min(1)),
  missingSurfaces: z.array(z.string().min(1)),
  promotionReadinessPercent: z.number().min(0).max(100),
  promotionReadinessSummary: z.string().min(1),
  promotionBlockers: z.array(topicEvaluationCriterionSchema),
  nextActions: z.array(topicEvaluationActionSchema).min(1),
  links: z.object({
    home: topicPortfolioLinkSchema,
    canonical: topicPortfolioLinkSchema,
    maintenance: topicPortfolioLinkSchema,
    evaluation: topicPortfolioLinkSchema,
  }),
  fileRoots: z.object({
    canonical: z.string().min(1),
    obsidian: z.string().min(1),
    evaluation: z.string().min(1),
  }),
});
export type TopicPortfolioItem = z.infer<typeof topicPortfolioItemSchema>;

export const topicPortfolioSummarySchema = z.object({
  totalTopics: z.number().int().nonnegative(),
  flagshipTopics: z.number().int().nonnegative(),
  starterTopics: z.number().int().nonnegative(),
  needsWorkflowGrounding: z.number().int().nonnegative(),
  actionItems: z.number().int().nonnegative(),
});
export type TopicPortfolioSummary = z.infer<typeof topicPortfolioSummarySchema>;

export const topicPortfolioStageBucketSchema = z.object({
  stage: topicMaturityStageSchema,
  title: z.string().min(1),
  description: z.string().min(1),
  topics: z.array(topicPortfolioItemSchema),
});
export type TopicPortfolioStageBucket = z.infer<typeof topicPortfolioStageBucketSchema>;

export const topicPortfolioActionItemSchema = z.object({
  topicId: z.string().min(1),
  topicTitle: z.string().min(1),
  maturityStage: topicMaturityStageSchema,
  priority: topicActionPrioritySchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  whyNow: z.string().min(1),
  href: z.string().min(1),
});
export type TopicPortfolioActionItem = z.infer<typeof topicPortfolioActionItemSchema>;

export const topicPortfolioComparisonSchema = z.object({
  leaderId: z.string().min(1),
  challengerId: z.string().min(1),
  summary: z.string().min(1),
  decisiveDifferences: z.array(z.string().min(1)).min(1),
});
export type TopicPortfolioComparison = z.infer<typeof topicPortfolioComparisonSchema>;

export const topicPortfolioOverviewSchema = z.object({
  generatedAt: z.string().datetime(),
  summary: topicPortfolioSummarySchema,
  buckets: z.array(topicPortfolioStageBucketSchema).min(1),
  topics: z.array(topicPortfolioItemSchema).min(1),
  actionQueue: z.array(topicPortfolioActionItemSchema),
  comparisonSpotlight: topicPortfolioComparisonSchema.nullable(),
});
export type TopicPortfolioOverview = z.infer<typeof topicPortfolioOverviewSchema>;
