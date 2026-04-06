import { z } from "zod";

import { researchQuestionSeedSchema } from "@/lib/contracts/research-question";
import { wikiPageTypeSchema } from "@/lib/contracts/wiki";

export const TOPIC_BOOTSTRAP_QUALITY_FLAGS = [
  "canonical-index",
  "start-here",
  "topic-map",
  "reading-paths",
  "open-questions",
  "current-tensions",
  "maintenance-watchpoints",
  "maintenance-rhythm",
  "artifact-map",
  "at-least-one-context-pack",
  "starter-validation",
] as const;

export const topicBootstrapQualityFlagSchema = z.enum(TOPIC_BOOTSTRAP_QUALITY_FLAGS);
export type TopicBootstrapQualityFlag = z.infer<typeof topicBootstrapQualityFlagSchema>;

export const topicBootstrapLayerNoteSchema = z.object({
  root: z.string().min(1),
  role: z.string().min(1),
});
export type TopicBootstrapLayerNote = z.infer<typeof topicBootstrapLayerNoteSchema>;

export const topicBootstrapCorpusFileSchema = z.object({
  fileName: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  origin: z.string().min(1).default("user-supplied corpus"),
});
export type TopicBootstrapCorpusFile = z.infer<typeof topicBootstrapCorpusFileSchema>;

export const topicBootstrapSurfaceSchema = z.object({
  title: z.string().min(1),
  purpose: z.string().min(1),
  role: z.string().min(1),
  revisitCadence: z.string().min(1).optional(),
  refreshTriggers: z.array(z.string().min(1)).default([]),
});
export type TopicBootstrapSurface = z.infer<typeof topicBootstrapSurfaceSchema>;

export const topicBootstrapPageSectionSchema = z.object({
  heading: z.string().min(1),
  lines: z.array(z.string().min(1)).min(1),
});
export type TopicBootstrapPageSection = z.infer<typeof topicBootstrapPageSectionSchema>;

export const topicBootstrapPageSchema = z.object({
  title: z.string().min(1),
  type: wikiPageTypeSchema.exclude(["index"]),
  summary: z.string().min(1),
  purpose: z.string().min(1),
  role: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  tags: z.array(z.string().min(1)).default([]),
  revisitCadence: z.string().min(1).optional(),
  refreshTriggers: z.array(z.string().min(1)).default([]),
  sourceFiles: z.array(z.string().min(1)).default([]),
  relatedPages: z.array(z.string().min(1)).default([]),
  nextSteps: z.array(z.string().min(1)).default([]),
  sections: z.array(topicBootstrapPageSectionSchema).default([]),
});
export type TopicBootstrapPage = z.infer<typeof topicBootstrapPageSchema>;

export const topicBootstrapReadingPassSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  steps: z.array(z.string().min(1)).min(1),
});
export type TopicBootstrapReadingPass = z.infer<typeof topicBootstrapReadingPassSchema>;

export const topicBootstrapContextPackSchema = z.object({
  title: z.string().min(1),
  useWhen: z.string().min(1),
  load: z.array(z.string().min(1)).min(1),
  optional: z.array(z.string().min(1)).default([]),
  keepActive: z.array(z.string().min(1)).default([]),
  walkOrder: z.array(z.string().min(1)).default([]),
});
export type TopicBootstrapContextPack = z.infer<typeof topicBootstrapContextPackSchema>;

export const topicBootstrapRevisitItemSchema = z.object({
  title: z.string().min(1),
  why: z.string().min(1),
  trigger: z.string().min(1),
});
export type TopicBootstrapRevisitItem = z.infer<typeof topicBootstrapRevisitItemSchema>;

export const topicBootstrapContextRefreshItemSchema = z.object({
  title: z.string().min(1),
  trigger: z.string().min(1),
  load: z.array(z.string().min(1)).min(1),
});
export type TopicBootstrapContextRefreshItem = z.infer<
  typeof topicBootstrapContextRefreshItemSchema
>;

export const topicBootstrapSynthesisCandidateSchema = z.object({
  title: z.string().min(1),
  whyNow: z.string().min(1),
  load: z.array(z.string().min(1)).min(1),
});
export type TopicBootstrapSynthesisCandidate = z.infer<
  typeof topicBootstrapSynthesisCandidateSchema
>;

export const topicBootstrapAuditActionSchema = z.object({
  signal: z.string().min(1),
  nextSurface: z.string().min(1),
  action: z.string().min(1),
});
export type TopicBootstrapAuditAction = z.infer<typeof topicBootstrapAuditActionSchema>;

export const topicBootstrapValidationSchema = z.object({
  requiredStarterQualityBar: z
    .array(topicBootstrapQualityFlagSchema)
    .min(1)
    .default([...TOPIC_BOOTSTRAP_QUALITY_FLAGS]),
  requiredAtlasNotes: z.array(z.string().min(1)).min(1),
  requiredContextPackTitles: z.array(z.string().min(1)).min(1),
  keyInspectionPaths: z.array(z.string().min(1)).min(1),
});
export type TopicBootstrapValidation = z.infer<typeof topicBootstrapValidationSchema>;

export const topicBootstrapConfigSchema = z.object({
  schemaVersion: z.literal(1),
  topic: z.object({
    slug: z.string().min(1),
    title: z.string().min(1),
    aliases: z.array(z.string().min(1)).default([]),
    description: z.string().min(1),
    seedTimestamp: z.string().datetime(),
  }),
  layerModel: z.object({
    canonical: topicBootstrapLayerNoteSchema,
    working: topicBootstrapLayerNoteSchema,
    projection: topicBootstrapLayerNoteSchema,
  }),
  corpus: z.object({
    root: z.literal("source-corpus"),
    notes: z.array(z.string().min(1)).default([]),
    files: z.array(topicBootstrapCorpusFileSchema).default([]),
  }),
  surfaces: z.object({
    indexTitle: z.string().min(1),
    starterPages: z.array(topicBootstrapPageSchema).min(1),
    readingPaths: topicBootstrapSurfaceSchema,
    currentTensions: topicBootstrapSurfaceSchema,
    openQuestions: topicBootstrapSurfaceSchema,
    maintenanceWatchpoints: topicBootstrapSurfaceSchema,
    maintenanceRhythm: topicBootstrapSurfaceSchema,
    operationalNote: topicBootstrapPageSchema.refine((page) => page.type === "note", {
      message: "Operational note must be a note page.",
    }),
    artifactSurfaces: z.array(topicBootstrapSurfaceSchema).min(1),
  }),
  readingPasses: z.array(topicBootstrapReadingPassSchema).min(1),
  tensionsSummary: z.string().min(1),
  tensions: z.array(z.string().min(1)).min(1),
  tensionImportance: z.array(z.string().min(1)).min(1),
  openQuestionsSummary: z.string().min(1),
  openQuestions: z.array(z.string().min(1)).min(1),
  researchQuestions: z.array(researchQuestionSeedSchema).default([]),
  resolutionSignals: z.array(z.string().min(1)).min(1),
  revisitQueue: z.array(topicBootstrapRevisitItemSchema).min(1),
  contextPackRefreshes: z.array(topicBootstrapContextRefreshItemSchema).min(1),
  synthesisCandidates: z.array(topicBootstrapSynthesisCandidateSchema).min(1),
  auditActions: z.array(topicBootstrapAuditActionSchema).min(1),
  contextPacks: z.array(topicBootstrapContextPackSchema).min(1),
  artifactLadder: z.array(z.string().min(1)).min(1),
  validation: topicBootstrapValidationSchema,
});
export type TopicBootstrapConfig = z.infer<typeof topicBootstrapConfigSchema>;

export const topicBootstrapManifestPageSchema = z.object({
  title: z.string().min(1),
  type: wikiPageTypeSchema,
  path: z.string().min(1),
  managedRole: z.enum(["canonical", "working", "monitoring", "navigation"]),
});
export type TopicBootstrapManifestPage = z.infer<typeof topicBootstrapManifestPageSchema>;

export const topicBootstrapManifestNoteSchema = z.object({
  title: z.string().min(1),
  path: z.string().min(1),
  kind: z.enum(["readme", "atlas", "context-pack", "article", "artifact"]),
});
export type TopicBootstrapManifestNote = z.infer<typeof topicBootstrapManifestNoteSchema>;

export const topicBootstrapManifestSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  seedTimestamp: z.string().datetime(),
  topicRoot: z.string().min(1),
  managedPaths: z.object({
    configPath: z.string().min(1),
    readmePath: z.string().min(1),
    manifestPath: z.string().min(1),
    baselinePath: z.string().min(1),
    sourceCorpusRoot: z.string().min(1),
    workspaceRoot: z.string().min(1),
    obsidianVaultRoot: z.string().min(1),
  }),
  layers: z.object({
    canonical: topicBootstrapLayerNoteSchema,
    working: topicBootstrapLayerNoteSchema,
    projection: topicBootstrapLayerNoteSchema,
  }),
  qualityBar: topicBootstrapValidationSchema,
  corpusFiles: z.array(topicBootstrapCorpusFileSchema),
  pages: z.array(topicBootstrapManifestPageSchema).min(1),
  obsidianNotes: z.array(topicBootstrapManifestNoteSchema).min(1),
  notes: z.object({
    bootstrapMode: z.string().min(1),
    canonicalSourceOfTruth: z.string().min(1),
    projectionRole: z.string().min(1),
  }),
});
export type TopicBootstrapManifest = z.infer<typeof topicBootstrapManifestSchema>;

export const topicBootstrapBaselineEntrySchema = z.object({
  logicalPath: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
});
export type TopicBootstrapBaselineEntry = z.infer<typeof topicBootstrapBaselineEntrySchema>;

export const topicBootstrapBaselineSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().datetime(),
  seedTimestamp: z.string().datetime(),
  manifestLogicalPath: z.literal("manifest.json"),
  entries: z.array(topicBootstrapBaselineEntrySchema).min(1),
  corpusEntries: z.array(topicBootstrapBaselineEntrySchema).min(1),
});
export type TopicBootstrapBaseline = z.infer<typeof topicBootstrapBaselineSchema>;
