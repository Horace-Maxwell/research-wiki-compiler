import { z } from "zod";

export const openClawExampleModeSchema = z.enum(["reference", "live"]);
export type OpenClawExampleMode = z.infer<typeof openClawExampleModeSchema>;

export const openClawExampleCorpusFileSchema = z.object({
  fileName: z.string().min(1),
  snapshotPath: z.string().min(1),
  originPath: z.string().min(1),
  excerptScope: z.array(z.string().min(1)).min(1),
});
export type OpenClawExampleCorpusFile = z.infer<typeof openClawExampleCorpusFileSchema>;

export const openClawExampleQuestionSchema = z.object({
  question: z.string().min(1),
  archiveAs: z.enum(["note", "synthesis"]).nullable().default(null),
});
export type OpenClawExampleQuestion = z.infer<typeof openClawExampleQuestionSchema>;

export const openClawExamplePageExpectationSchema = z.object({
  path: z.string().min(1),
  title: z.string().min(1),
  type: z.string().min(1),
  requiredHeadings: z.array(z.string().min(1)).default([]),
});
export type OpenClawExamplePageExpectation = z.infer<
  typeof openClawExamplePageExpectationSchema
>;

export const openClawExamplePathsSchema = z.object({
  corpusRoot: z.string().min(1),
  canonicalSnapshotRoot: z.string().min(1),
  canonicalManifestPath: z.string().min(1),
  referenceBaselinePath: z.string().min(1),
  canonicalObsidianVaultRoot: z.string().min(1),
  referenceRuntimeWorkspaceRoot: z.string().min(1),
  referenceRuntimeManifestPath: z.string().min(1),
  referenceRuntimeObsidianVaultRoot: z.string().min(1),
  liveRuntimeWorkspaceRoot: z.string().min(1),
  liveRuntimeManifestPath: z.string().min(1),
  liveRuntimeObsidianVaultRoot: z.string().min(1),
});
export type OpenClawExamplePaths = z.infer<typeof openClawExamplePathsSchema>;

export const openClawExamplePipelineConfigSchema = z.object({
  schemaVersion: z.literal(1),
  exampleName: z.string().min(1),
  renderedRoute: z.string().min(1),
  paths: openClawExamplePathsSchema,
  modes: z.object({
    reference: z.object({
      description: z.string().min(1),
      provider: z.string().min(1),
      seedTimestamp: z.string().datetime(),
    }),
    live: z.object({
      description: z.string().min(1),
      provider: z.string().min(1),
      requiredEnvVars: z.array(z.string().min(1)).min(1),
      optionalEnvVars: z.array(z.string().min(1)).default([]),
    }),
  }),
  corpusFiles: z.array(openClawExampleCorpusFileSchema).min(1),
  questions: z.array(openClawExampleQuestionSchema).min(1),
  validation: z.object({
    requiredWorkspaceDirectories: z.array(z.string().min(1)).min(1),
    requiredWikiPages: z.array(openClawExamplePageExpectationSchema).min(1),
    requiredArtifactPaths: z.array(z.string().min(1)).min(1),
    requiredApprovedProposalCount: z.number().int().nonnegative(),
    requiredRejectedProposalCount: z.number().int().nonnegative(),
    requiredAuditModes: z.array(z.string().min(1)).min(1),
    archivedAnswerPagePath: z.string().min(1),
    keyInspectionPaths: z.array(z.string().min(1)).min(1),
    requiredObsidianNotes: z.array(
      z.object({
        path: z.string().min(1),
        title: z.string().min(1),
        requiredHeadings: z.array(z.string().min(1)).default([]),
      }),
    ).min(1),
  }),
});
export type OpenClawExamplePipelineConfig = z.infer<
  typeof openClawExamplePipelineConfigSchema
>;

export const openClawExampleSourcePlanSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summaryMarkdownPath: z.string().nullable(),
  summaryJsonPath: z.string().nullable(),
  proposalIds: z.array(z.string().min(1)),
  approvedProposalIds: z.array(z.string().min(1)),
  rejectedProposalIds: z.array(z.string().min(1)),
});
export type OpenClawExampleSourcePlan = z.infer<typeof openClawExampleSourcePlanSchema>;

export const openClawExampleAnswerManifestSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  shortAnswer: z.string().min(1),
  archivedPagePath: z.string().nullable(),
});
export type OpenClawExampleAnswerManifest = z.infer<
  typeof openClawExampleAnswerManifestSchema
>;

export const openClawExampleAuditManifestSchema = z.object({
  id: z.string().min(1),
  mode: z.string().min(1),
  reportPath: z.string().nullable(),
  findingCount: z.number().int().nonnegative(),
});
export type OpenClawExampleAuditManifest = z.infer<
  typeof openClawExampleAuditManifestSchema
>;

export const openClawExampleManifestSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  generatedMode: openClawExampleModeSchema,
  exampleName: z.string().min(1),
  corpusFiles: z.array(
    z.object({
      snapshotPath: z.string().min(1),
      originPath: z.string().min(1),
      excerptScope: z.array(z.string().min(1)).min(1),
    }),
  ),
  sources: z.array(openClawExampleSourcePlanSchema),
  pages: z.array(
    z.object({
      title: z.string().min(1),
      type: z.string().min(1),
      path: z.string().min(1),
    }),
  ),
  answers: z.array(openClawExampleAnswerManifestSchema),
  audits: z.array(openClawExampleAuditManifestSchema),
  notes: z.object({
    mockProvider: z.string().nullable(),
    runtimeWorkspaceRoot: z.string().min(1),
    committedSnapshotRoot: z.string().min(1),
    reproducibility: z.object({
      referenceMode: z.string().min(1),
      liveMode: z.string().min(1),
    }),
  }),
});
export type OpenClawExampleManifest = z.infer<typeof openClawExampleManifestSchema>;

export const openClawExampleBaselineEntrySchema = z.object({
  logicalPath: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type OpenClawExampleBaselineEntry = z.infer<
  typeof openClawExampleBaselineEntrySchema
>;

export const openClawExampleReferenceBaselineSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  mode: z.literal("reference"),
  manifestLogicalPath: z.literal("manifest.json"),
  entries: z.array(openClawExampleBaselineEntrySchema).min(1),
  corpusEntries: z.array(openClawExampleBaselineEntrySchema).min(1),
});
export type OpenClawExampleReferenceBaseline = z.infer<
  typeof openClawExampleReferenceBaselineSchema
>;
