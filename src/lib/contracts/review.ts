import { z } from "zod";

import {
  PATCH_HUNK_OPERATIONS,
  PATCH_PROPOSAL_ARTIFACT_VERSION,
  PATCH_PROPOSAL_RISK_LEVELS,
  PATCH_PROPOSAL_STATUSES,
  PATCH_PROPOSAL_TYPES,
} from "@/lib/constants";
import {
  sourceSummaryClaimPolaritySchema,
  sourceSummaryEvidenceStrengthSchema,
  llmProviderSchema,
} from "@/lib/contracts/source-summary";
import { wikiPageTypeSchema } from "@/lib/contracts/wiki";

export const reviewStatusSchema = z.enum(PATCH_PROPOSAL_STATUSES);
export const patchProposalRiskLevelSchema = z.enum(PATCH_PROPOSAL_RISK_LEVELS);
export const patchProposalTypeSchema = z.enum(PATCH_PROPOSAL_TYPES);
export const patchHunkOperationSchema = z.enum(PATCH_HUNK_OPERATIONS);

export const sourceCitationSchema = z.object({
  sourceId: z.string(),
  note: z.string().min(1).optional(),
});

export type SourceCitation = z.infer<typeof sourceCitationSchema>;

export const supportingClaimSchema = z.object({
  text: z.string().min(1),
  polarity: sourceSummaryClaimPolaritySchema,
  evidenceStrength: sourceSummaryEvidenceStrengthSchema,
  rationale: z.string().min(1),
  citations: z.array(sourceCitationSchema),
});

export type SupportingClaim = z.infer<typeof supportingClaimSchema>;

export const candidateRecallReasonSchema = z.object({
  kind: z.enum([
    "title_exact",
    "title_fuzzy",
    "alias_exact",
    "slug_exact",
    "entity_overlap",
    "concept_overlap",
    "fts",
    "hint_exact",
    "hint_fuzzy",
    "link_neighborhood",
    "backlink_neighborhood",
    "recency",
    "importance",
  ]),
  label: z.string().min(1),
  score: z.number(),
  matchedValue: z.string().nullable(),
});

export type CandidateRecallReason = z.infer<typeof candidateRecallReasonSchema>;

export const candidateRecallPageSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  canonicalTitle: z.string(),
  slug: z.string(),
  type: wikiPageTypeSchema,
  path: z.string(),
  score: z.number(),
  reasons: z.array(candidateRecallReasonSchema),
});

export type CandidateRecallPage = z.infer<typeof candidateRecallPageSchema>;

export const candidateRecallResultSchema = z.object({
  sourceId: z.string(),
  sourceTitle: z.string(),
  generatedAt: z.string().datetime(),
  candidates: z.array(candidateRecallPageSchema),
  omittedCandidateCount: z.number().int().nonnegative(),
});

export type CandidateRecallResult = z.infer<typeof candidateRecallResultSchema>;

export const proposalTargetPageSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  slug: z.string(),
  type: wikiPageTypeSchema,
  path: z.string(),
  relation: z.enum(["primary", "related"]),
  recallScore: z.number(),
  recallReasons: z.array(candidateRecallReasonSchema),
});

export type ProposalTargetPage = z.infer<typeof proposalTargetPageSchema>;

export const proposedPageSchema = z.object({
  title: z.string().min(1),
  pageType: wikiPageTypeSchema.exclude(["index"]),
  suggestedPath: z.string().min(1),
  rationale: z.string().min(1),
});

export type ProposedPage = z.infer<typeof proposedPageSchema>;

export const patchHunkArtifactSchema = z.object({
  sectionHeading: z.string().nullable(),
  operation: patchHunkOperationSchema,
  beforeText: z.string().nullable(),
  afterText: z.string().min(1),
  citations: z.array(sourceCitationSchema),
});

export type PatchHunkArtifact = z.infer<typeof patchHunkArtifactSchema>;

export const reviewProposalArtifactSchema = z.object({
  schemaVersion: z.literal(PATCH_PROPOSAL_ARTIFACT_VERSION),
  proposalId: z.string(),
  sourceId: z.string(),
  sourceTitle: z.string(),
  status: reviewStatusSchema,
  proposalType: patchProposalTypeSchema,
  title: z.string().min(1),
  generatedAt: z.string().datetime(),
  provider: llmProviderSchema,
  model: z.string().min(1),
  promptHash: z.string().min(1),
  promptVersion: z.string().min(1),
  riskLevel: patchProposalRiskLevelSchema,
  patchGoal: z.string().min(1),
  rationale: z.string().min(1),
  targetPages: z.array(proposalTargetPageSchema),
  proposedPage: proposedPageSchema.nullable(),
  affectedSections: z.array(z.string().min(1)),
  supportingClaims: z.array(supportingClaimSchema),
  citations: z.array(sourceCitationSchema),
  conflictNotes: z.array(z.string().min(1)),
  candidateRecall: z.object({
    primaryCandidates: z.array(candidateRecallPageSchema),
    omittedCandidateCount: z.number().int().nonnegative(),
  }),
  hunks: z.array(patchHunkArtifactSchema),
  review: z
    .object({
      reviewedAt: z.string().datetime().nullable(),
      note: z.string().nullable(),
      editedBeforeApply: z.boolean(),
    })
    .default({
      reviewedAt: null,
      note: null,
      editedBeforeApply: false,
    }),
  applyResult: z
    .object({
      appliedAt: z.string().datetime().nullable(),
      success: z.boolean().nullable(),
      affectedPaths: z.array(z.string()),
      appliedPageId: z.string().nullable(),
      git: z
        .object({
          attempted: z.boolean(),
          success: z.boolean().nullable(),
          commitHash: z.string().nullable(),
          message: z.string().nullable(),
        })
        .nullable(),
      error: z.string().nullable(),
    })
    .default({
      appliedAt: null,
      success: null,
      affectedPaths: [],
      appliedPageId: null,
      git: null,
      error: null,
    }),
});

export type ReviewProposalArtifact = z.infer<typeof reviewProposalArtifactSchema>;

export const reviewProposalSummarySchema = z.object({
  id: z.string(),
  sourceDocumentId: z.string().nullable(),
  sourceTitle: z.string().nullable(),
  targetPageId: z.string().nullable(),
  targetPageTitle: z.string().nullable(),
  proposedPageTitle: z.string().nullable(),
  title: z.string(),
  status: reviewStatusSchema,
  proposalType: patchProposalTypeSchema,
  riskLevel: patchProposalRiskLevelSchema,
  promptVersion: z.string(),
  promptHash: z.string().nullable(),
  provider: llmProviderSchema.nullable(),
  model: z.string().nullable(),
  rationale: z.string(),
  affectedSections: z.array(z.string()),
  artifactMarkdownPath: z.string().nullable(),
  artifactJsonPath: z.string().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  reviewNote: z.string().nullable(),
  appliedAt: z.string().datetime().nullable(),
  applyError: z.string().nullable(),
  appliedPageId: z.string().nullable(),
  applyMetadataJson: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type ReviewProposalSummary = z.infer<typeof reviewProposalSummarySchema>;

export const reviewProposalDetailSchema = reviewProposalSummarySchema.extend({
  markdown: z.string().nullable(),
  artifact: reviewProposalArtifactSchema.nullable(),
  hunks: z.array(patchHunkArtifactSchema),
  source: z
    .object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
    })
    .nullable(),
  targetPage: z
    .object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      path: z.string(),
      type: wikiPageTypeSchema,
    })
    .nullable(),
  appliedPage: z
    .object({
      id: z.string(),
      title: z.string(),
      slug: z.string(),
      path: z.string(),
      type: wikiPageTypeSchema,
    })
    .nullable(),
});

export type ReviewProposalDetail = z.infer<typeof reviewProposalDetailSchema>;

export const listReviewsQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
  status: reviewStatusSchema.optional(),
});

export const listReviewsResponseSchema = z.object({
  proposals: z.array(reviewProposalSummarySchema),
});

export const getReviewQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const planSourcePatchesRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const planSourcePatchesResponseSchema = z.object({
  proposals: z.array(reviewProposalSummarySchema),
});

export const editableReviewProposalSchema = z.object({
  title: z.string().min(1),
  patchGoal: z.string().min(1),
  rationale: z.string().min(1),
  affectedSections: z.array(z.string().min(1)).default([]),
  conflictNotes: z.array(z.string().min(1)).default([]),
  proposedPage: proposedPageSchema.nullable(),
  hunks: z.array(patchHunkArtifactSchema),
});

export type EditableReviewProposal = z.infer<typeof editableReviewProposalSchema>;

export const approveReviewRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  note: z.string().trim().max(1000).optional(),
});

export const rejectReviewRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  note: z.string().trim().min(1).max(1000),
});

export const editAndApproveReviewRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  note: z.string().trim().max(1000).optional(),
  edits: editableReviewProposalSchema,
});

export const patchPlannerDraftProposalSchema = z.object({
  title: z.string().min(1),
  proposalType: patchProposalTypeSchema,
  primaryTargetPageId: z.string().nullable(),
  relatedTargetPageIds: z.array(z.string()).default([]),
  proposedPage: z
    .object({
      title: z.string().min(1),
      pageType: wikiPageTypeSchema.exclude(["index"]),
      rationale: z.string().min(1),
    })
    .nullable(),
  patchGoal: z.string().min(1),
  rationale: z.string().min(1),
  affectedSections: z.array(z.string().min(1)).default([]),
  supportingClaimTexts: z.array(z.string().min(1)).default([]),
  conflictNotes: z.array(z.string().min(1)).default([]),
  riskLevel: patchProposalRiskLevelSchema,
  hunks: z
    .array(
      z.object({
        sectionHeading: z.string().nullable(),
        operation: patchHunkOperationSchema,
        beforeText: z.string().nullable(),
        afterText: z.string().min(1),
      }),
    )
    .default([]),
});

export type PatchPlannerDraftProposal = z.infer<typeof patchPlannerDraftProposalSchema>;

export const patchPlannerOutputSchema = z.object({
  proposals: z.array(patchPlannerDraftProposalSchema),
});

export type PatchPlannerOutput = z.infer<typeof patchPlannerOutputSchema>;

export const patchPlannerOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["proposals"],
  properties: {
    proposals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "proposalType",
          "primaryTargetPageId",
          "relatedTargetPageIds",
          "proposedPage",
          "patchGoal",
          "rationale",
          "affectedSections",
          "supportingClaimTexts",
          "conflictNotes",
          "riskLevel",
          "hunks",
        ],
        properties: {
          title: { type: "string" },
          proposalType: {
            type: "string",
            enum: [...PATCH_PROPOSAL_TYPES],
          },
          primaryTargetPageId: {
            anyOf: [{ type: "string" }, { type: "null" }],
          },
          relatedTargetPageIds: {
            type: "array",
            items: { type: "string" },
          },
          proposedPage: {
            anyOf: [
              {
                type: "object",
                additionalProperties: false,
                required: ["title", "pageType", "rationale"],
                properties: {
                  title: { type: "string" },
                  pageType: {
                    type: "string",
                    enum: ["topic", "entity", "concept", "timeline", "synthesis", "note"],
                  },
                  rationale: { type: "string" },
                },
              },
              { type: "null" },
            ],
          },
          patchGoal: { type: "string" },
          rationale: { type: "string" },
          affectedSections: {
            type: "array",
            items: { type: "string" },
          },
          supportingClaimTexts: {
            type: "array",
            items: { type: "string" },
          },
          conflictNotes: {
            type: "array",
            items: { type: "string" },
          },
          riskLevel: {
            type: "string",
            enum: [...PATCH_PROPOSAL_RISK_LEVELS],
          },
          hunks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["sectionHeading", "operation", "beforeText", "afterText"],
              properties: {
                sectionHeading: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                operation: {
                  type: "string",
                  enum: [...PATCH_HUNK_OPERATIONS],
                },
                beforeText: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
                afterText: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const satisfies Record<string, unknown>;
