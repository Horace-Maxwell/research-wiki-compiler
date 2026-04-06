import { z } from "zod";

export const TOPIC_MATURITY_STAGES = [
  "starter",
  "developing",
  "maintained",
  "mature",
  "flagship",
] as const;

export const topicMaturityStageSchema = z.enum(TOPIC_MATURITY_STAGES);
export type TopicMaturityStage = z.infer<typeof topicMaturityStageSchema>;

export const TOPIC_EVALUATION_STATUS = [
  "missing",
  "weak",
  "adequate",
  "strong",
] as const;

export const topicEvaluationStatusSchema = z.enum(TOPIC_EVALUATION_STATUS);
export type TopicEvaluationStatus = z.infer<typeof topicEvaluationStatusSchema>;

export const TOPIC_QUALITY_DIMENSIONS = [
  "surface_completeness",
  "navigation",
  "canonical_depth",
  "maintenance_readiness",
  "context_pack_quality",
  "workflow_provenance",
  "projection_utility",
] as const;

export const topicQualityDimensionSchema = z.enum(TOPIC_QUALITY_DIMENSIONS);
export type TopicQualityDimension = z.infer<typeof topicQualityDimensionSchema>;

export const topicEvaluationTargetSchema = z.object({
  kind: z.enum(["topic", "example"]),
  id: z.string().min(1),
  title: z.string().min(1),
  rootPath: z.string().min(1),
  workspaceRoot: z.string().min(1),
  obsidianVaultRoot: z.string().min(1),
});
export type TopicEvaluationTarget = z.infer<typeof topicEvaluationTargetSchema>;

export const topicEvaluationCriterionSchema = z.object({
  label: z.string().min(1),
  satisfied: z.boolean(),
  details: z.string().min(1),
});
export type TopicEvaluationCriterion = z.infer<typeof topicEvaluationCriterionSchema>;

export const topicStageAssessmentSchema = z.object({
  stage: topicMaturityStageSchema,
  achieved: z.boolean(),
  criteria: z.array(topicEvaluationCriterionSchema).min(1),
});
export type TopicStageAssessment = z.infer<typeof topicStageAssessmentSchema>;

export const topicDimensionScoreSchema = z.object({
  id: topicQualityDimensionSchema,
  label: z.string().min(1),
  score: z.number().min(0).max(5),
  maxScore: z.literal(5),
  percent: z.number().min(0).max(100),
  status: topicEvaluationStatusSchema,
  summary: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  recommendedAction: z.string().min(1).nullable(),
});
export type TopicDimensionScore = z.infer<typeof topicDimensionScoreSchema>;

export const topicSurfaceEvaluationSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum([
    "navigation",
    "maintenance",
    "context-pack",
    "artifact",
    "canonical",
    "projection",
  ]),
  paths: z.array(z.string().min(1)).default([]),
  score: z.number().min(0).max(5),
  maxScore: z.literal(5),
  percent: z.number().min(0).max(100),
  status: topicEvaluationStatusSchema,
  summary: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  issues: z.array(z.string().min(1)).default([]),
});
export type TopicSurfaceEvaluation = z.infer<typeof topicSurfaceEvaluationSchema>;

export const topicEvaluationReportSchema = z.object({
  schemaVersion: z.literal(1),
  target: topicEvaluationTargetSchema,
  maturity: z.object({
    stage: topicMaturityStageSchema,
    nextStage: topicMaturityStageSchema.nullable(),
    summary: z.string().min(1),
    stageAssessments: z.array(topicStageAssessmentSchema).min(1),
  }),
  overall: z.object({
    score: z.number().min(0).max(5),
    maxScore: z.literal(5),
    percent: z.number().min(0).max(100),
    status: topicEvaluationStatusSchema,
  }),
  dimensions: z.array(topicDimensionScoreSchema).min(1),
  surfaces: z.array(topicSurfaceEvaluationSchema).min(1),
  strengths: z.array(z.string().min(1)),
  weakSurfaces: z.array(z.string().min(1)),
  missingSurfaces: z.array(z.string().min(1)),
  recommendedNextSteps: z.array(z.string().min(1)).min(1),
  reportPaths: z.object({
    json: z.string().min(1),
    markdown: z.string().min(1),
  }),
});
export type TopicEvaluationReport = z.infer<typeof topicEvaluationReportSchema>;
