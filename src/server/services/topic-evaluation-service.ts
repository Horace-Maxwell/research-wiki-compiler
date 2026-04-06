import fs from "node:fs/promises";
import path from "node:path";

import {
  openClawExampleManifestSchema,
  openClawExamplePipelineConfigSchema,
  type OpenClawExampleManifest,
  type OpenClawExamplePipelineConfig,
} from "@/lib/contracts/openclaw-example";
import {
  topicBootstrapConfigSchema,
  topicBootstrapManifestSchema,
  type TopicBootstrapConfig,
  type TopicBootstrapManifest,
} from "@/lib/contracts/topic-bootstrap";
import {
  TOPIC_MATURITY_STAGES,
  topicEvaluationReportSchema,
  type TopicEvaluationAction,
  type TopicDimensionScore,
  type TopicEvaluationCriterion,
  type TopicEvaluationReport,
  type TopicEvaluationStatus,
  type TopicMaturityStage,
  type TopicQualityDimension,
  type TopicStageAssessment,
  type TopicSurfaceEvaluation,
} from "@/lib/contracts/topic-evaluation";
import { OPENCLAW_EXAMPLE_ROOT, TOPICS_ROOT } from "@/server/lib/repo-paths";
import { openClawKnowledgeMethodData } from "@/server/services/openclaw-knowledge-method";
import { parseWikiDocument } from "@/server/services/wiki-frontmatter-service";

const REQUIRED_ATLAS_NOTES = [
  "Start Here",
  "Topic Map",
  "Key Pages",
  "Reading Paths",
  "Open Questions",
  "Current Tensions",
  "Monitoring",
  "Maintenance Rhythm",
  "LLM Context Pack",
  "Artifact Map",
] as const;

const SURFACE_LABELS: Record<TopicQualityDimension, string> = {
  surface_completeness: "Surface completeness",
  navigation: "Navigation and wayfinding",
  canonical_depth: "Canonical depth",
  maintenance_readiness: "Maintenance readiness",
  context_pack_quality: "Context-pack quality",
  workflow_provenance: "Workflow and provenance",
  projection_utility: "Projection utility",
};

const DIMENSION_WEIGHTS: Record<TopicQualityDimension, number> = {
  surface_completeness: 0.5,
  navigation: 1,
  canonical_depth: 1.2,
  maintenance_readiness: 1.2,
  context_pack_quality: 1,
  workflow_provenance: 2,
  projection_utility: 1.1,
};

type EvaluationTargetArgs =
  | {
      slug: string;
      example?: undefined;
      writeReport?: boolean;
    }
  | {
      slug?: undefined;
      example: "openclaw";
      writeReport?: boolean;
    };

type EvaluationSubjectKind = "topic" | "example";

type MarkdownDoc = {
  title: string;
  absolutePath: string;
  relativePath: string;
  raw: string;
  body: string;
  wordCount: number;
  sectionHeadings: string[];
  wikiLinkCount: number;
  bulletCount: number;
  orderedCount: number;
};

type WikiDoc = MarkdownDoc & {
  frontmatter: ReturnType<typeof parseWikiDocument>["frontmatter"];
};

type EvaluationSubject = {
  kind: EvaluationSubjectKind;
  id: string;
  title: string;
  rootPath: string;
  workspaceRoot: string;
  obsidianVaultRoot: string;
  evaluationRoot: string;
  reportPaths: {
    json: string;
    markdown: string;
  };
  manifestPath: string;
  baselinePath: string;
  configPath?: string;
  pages: WikiDoc[];
  pageByTitle: Map<string, WikiDoc>;
  atlasNotes: Map<string, MarkdownDoc>;
  contextPackNotes: Map<string, MarkdownDoc>;
  projectedArticleNotes: MarkdownDoc[];
  artifactNotes: Map<string, MarkdownDoc>;
  sourceCorpusFiles: string[];
  summaryFiles: string[];
  reviewApprovedFiles: string[];
  reviewRejectedFiles: string[];
  auditFiles: string[];
  archivedAnswerCount: number;
  auditModeCount: number;
  surfaceTitles: {
    indexTitle: string;
    readingPathsTitle: string;
    currentTensionsTitle: string;
    openQuestionsTitle: string;
    maintenanceWatchpointsTitle: string;
    maintenanceRhythmTitle: string;
    operationalNoteTitle: string;
  };
  contextPackTitles: string[];
  hasManifest: boolean;
  hasBaseline: boolean;
  hasReferenceMode: boolean;
  hasLiveMode: boolean;
  hasRenderedRoute: boolean;
  renderedRoute: string | null;
  officialExample: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function countWords(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_\-\[\]\(\)`]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function stripFrontmatter(raw: string) {
  return raw.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function extractHeadings(raw: string) {
  const matches = raw.matchAll(/^##+\s+(.+)$/gm);
  return [...matches].map((match) => match[1]?.trim() ?? "").filter(Boolean);
}

function extractWikiLinkCount(raw: string) {
  return [...raw.matchAll(/\[\[[^[\]]+\]\]/g)].length;
}

function countBullets(raw: string) {
  return [...raw.matchAll(/^\s*-\s+/gm)].length;
}

function countOrdered(raw: string) {
  return [...raw.matchAll(/^\s*\d+\.\s+/gm)].length;
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(targetPath: string) {
  return JSON.parse(await fs.readFile(targetPath, "utf8")) as T;
}

async function listMarkdownFiles(root: string) {
  if (!(await pathExists(root))) {
    return [];
  }

  const entries = await fs.readdir(root, { withFileTypes: true });
  const results: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      results.push(...(await listMarkdownFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(absolutePath);
    }
  }

  return results;
}

function buildMarkdownDoc(params: {
  absolutePath: string;
  rootPath: string;
  title: string;
  raw: string;
  body?: string;
}) {
  const content = params.body ?? stripFrontmatter(params.raw);

  return {
    title: params.title,
    absolutePath: params.absolutePath,
    relativePath: path.relative(params.rootPath, params.absolutePath).split(path.sep).join("/"),
    raw: normalizeText(params.raw),
    body: normalizeText(content),
    wordCount: countWords(content),
    sectionHeadings: extractHeadings(content),
    wikiLinkCount: extractWikiLinkCount(content),
    bulletCount: countBullets(content),
    orderedCount: countOrdered(content),
  } satisfies MarkdownDoc;
}

async function readWikiDoc(rootPath: string, workspaceRoot: string, relativePath: string) {
  const absolutePath = path.join(workspaceRoot, relativePath);
  const raw = await fs.readFile(absolutePath, "utf8");
  const parsed = parseWikiDocument({
    rawContent: raw,
    relativePath,
  });

  return {
    ...buildMarkdownDoc({
      absolutePath,
      rootPath,
      title: parsed.frontmatter.title,
      raw,
      body: parsed.body,
    }),
    frontmatter: parsed.frontmatter,
  } satisfies WikiDoc;
}

async function readMarkdownDoc(rootPath: string, absolutePath: string) {
  const raw = await fs.readFile(absolutePath, "utf8");
  const title =
    raw.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
    path.basename(absolutePath, ".md");

  return buildMarkdownDoc({
    absolutePath,
    rootPath,
    title,
    raw,
  });
}

function scoreStatus(score: number): TopicEvaluationStatus {
  if (score <= 0.1) {
    return "missing";
  }

  if (score < 3) {
    return "weak";
  }

  if (score < 4.2) {
    return "adequate";
  }

  return "strong";
}

function toPercent(score: number) {
  return Math.round((score / 5) * 100);
}

function roundScore(score: number) {
  return Math.round(score * 10) / 10;
}

function buildDocScore(params: {
  doc: MarkdownDoc | null;
  expectedHeadings: string[];
  minWordCount: number;
  minLinkCount: number;
  minBulletCount?: number;
  minOrderedCount?: number;
  maxLinkCount?: number;
}) {
  if (!params.doc) {
    return {
      score: 0,
      evidence: ["Missing required surface."],
      issues: ["The surface does not exist."],
    };
  }

  const matchedHeadings = params.expectedHeadings.filter((heading) =>
    params.doc?.sectionHeadings.some((candidate) => normalizeTitle(candidate) === normalizeTitle(heading)),
  );
  const headingScore =
    params.expectedHeadings.length === 0
      ? 1.5
      : 1.5 * (matchedHeadings.length / params.expectedHeadings.length);
  const wordScore = clamp(params.doc.wordCount / params.minWordCount, 0, 1);
  const linkRatioBase =
    params.minLinkCount === 0 ? 1 : clamp(params.doc.wikiLinkCount / params.minLinkCount, 0, 1);
  const linkPenalty =
    params.maxLinkCount && params.doc.wikiLinkCount > params.maxLinkCount ? 0.2 : 0;
  const linkScore = clamp(linkRatioBase - linkPenalty, 0, 1);
  const bulletThreshold = params.minBulletCount ?? 0;
  const bulletScore =
    bulletThreshold === 0 ? 0.75 : 0.75 * clamp(params.doc.bulletCount / bulletThreshold, 0, 1);
  const orderedThreshold = params.minOrderedCount ?? 0;
  const orderedScore =
    orderedThreshold === 0 ? 0.75 : 0.75 * clamp(params.doc.orderedCount / orderedThreshold, 0, 1);
  const score = roundScore(headingScore + wordScore + linkScore + bulletScore + orderedScore);
  const evidence = [
    `${matchedHeadings.length}/${params.expectedHeadings.length || 1} expected headings matched.`,
    `${params.doc.wordCount} body words.`,
    `${params.doc.wikiLinkCount} wiki links.`,
    `${params.doc.bulletCount} bullet items and ${params.doc.orderedCount} ordered steps.`,
  ];
  const issues: string[] = [];

  if (matchedHeadings.length < params.expectedHeadings.length) {
    const missing = params.expectedHeadings.filter(
      (heading) => !matchedHeadings.some((candidate) => normalizeTitle(candidate) === normalizeTitle(heading)),
    );
    issues.push(`Missing expected headings: ${missing.join(", ")}.`);
  }

  if (params.doc.wordCount < params.minWordCount) {
    issues.push(`Surface is thinner than the expected minimum of ${params.minWordCount} words.`);
  }

  if (params.doc.wikiLinkCount < params.minLinkCount) {
    issues.push(`Surface links fewer than ${params.minLinkCount} other notes/pages.`);
  }

  if (bulletThreshold > 0 && params.doc.bulletCount < bulletThreshold) {
    issues.push(`Surface has fewer than ${bulletThreshold} bullet items.`);
  }

  if (orderedThreshold > 0 && params.doc.orderedCount < orderedThreshold) {
    issues.push(`Surface has fewer than ${orderedThreshold} ordered steps.`);
  }

  if (params.maxLinkCount && params.doc.wikiLinkCount > params.maxLinkCount) {
    issues.push(`Surface may be too broad for quick use at ${params.doc.wikiLinkCount} links.`);
  }

  return {
    score,
    evidence,
    issues,
  };
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function getStageStatus(score: number) {
  return scoreStatus(score);
}

async function loadTopicSubject(slug: string) {
  const rootPath = path.join(TOPICS_ROOT, slug);
  const configPath = path.join(rootPath, "topic.json");
  const manifestPath = path.join(rootPath, "manifest.json");
  const baselinePath = path.join(rootPath, "starter-baseline.json");
  const workspaceRoot = path.join(rootPath, "workspace");
  const obsidianVaultRoot = path.join(rootPath, "obsidian-vault");
  const evaluationRoot = path.join(rootPath, "evaluation");
  const config = topicBootstrapConfigSchema.parse(
    await readJson<TopicBootstrapConfig>(configPath),
  );
  const manifest = topicBootstrapManifestSchema.parse(
    await readJson<TopicBootstrapManifest>(manifestPath),
  );
  const pages = await Promise.all(
    manifest.pages.map((page) => readWikiDoc(rootPath, workspaceRoot, page.path)),
  );
  const pageByTitle = new Map(pages.map((page) => [normalizeTitle(page.title), page]));
  const atlasNotes = new Map<string, MarkdownDoc>();
  const contextPackNotes = new Map<string, MarkdownDoc>();
  const artifactNotes = new Map<string, MarkdownDoc>();
  const projectedArticleNotes: MarkdownDoc[] = [];

  for (const absolutePath of await listMarkdownFiles(path.join(obsidianVaultRoot, "00 Atlas"))) {
    const doc = await readMarkdownDoc(rootPath, absolutePath);
    atlasNotes.set(normalizeTitle(doc.title), doc);
  }

  for (const absolutePath of await listMarkdownFiles(path.join(obsidianVaultRoot, "05 Context Packs"))) {
    const doc = await readMarkdownDoc(rootPath, absolutePath);
    contextPackNotes.set(normalizeTitle(doc.title), doc);
  }

  for (const absolutePath of await listMarkdownFiles(path.join(obsidianVaultRoot, "10 Articles"))) {
    projectedArticleNotes.push(await readMarkdownDoc(rootPath, absolutePath));
  }

  for (const folder of ["20 Sources", "25 Normalized Sources", "30 Summaries", "40 Reviews", "50 Audits"]) {
    for (const absolutePath of await listMarkdownFiles(path.join(obsidianVaultRoot, folder))) {
      const doc = await readMarkdownDoc(rootPath, absolutePath);
      artifactNotes.set(normalizeTitle(doc.title), doc);
    }
  }

  const sourceCorpusFiles = config.corpus.files.map((file) =>
    path.posix.join(config.corpus.root, file.fileName),
  );
  const summaryFiles = (
    await listMarkdownFiles(path.join(workspaceRoot, "raw", "processed", "summaries"))
  ).filter((absolutePath) => absolutePath.endsWith(".md"));
  const reviewApprovedFiles = (
    await listMarkdownFiles(path.join(workspaceRoot, "reviews", "approved"))
  ).filter((absolutePath) => absolutePath.endsWith(".md"));
  const reviewRejectedFiles = (
    await listMarkdownFiles(path.join(workspaceRoot, "reviews", "rejected"))
  ).filter((absolutePath) => absolutePath.endsWith(".md"));
  const auditFiles = (
    await listMarkdownFiles(path.join(workspaceRoot, "audits"))
  ).filter((absolutePath) => absolutePath.endsWith(".md"));

  return {
    kind: "topic" as const,
    id: slug,
    title: config.topic.title,
    rootPath,
    workspaceRoot,
    obsidianVaultRoot,
    evaluationRoot,
    reportPaths: {
      json: path.join(evaluationRoot, "topic-evaluation.json"),
      markdown: path.join(evaluationRoot, "topic-evaluation.md"),
    },
    manifestPath,
    baselinePath,
    configPath,
    pages,
    pageByTitle,
    atlasNotes,
    contextPackNotes,
    projectedArticleNotes,
    artifactNotes,
    sourceCorpusFiles,
    summaryFiles,
    reviewApprovedFiles,
    reviewRejectedFiles,
    auditFiles,
    archivedAnswerCount: 0,
    auditModeCount: 0,
    surfaceTitles: {
      indexTitle: config.surfaces.indexTitle,
      readingPathsTitle: config.surfaces.readingPaths.title,
      currentTensionsTitle: config.surfaces.currentTensions.title,
      openQuestionsTitle: config.surfaces.openQuestions.title,
      maintenanceWatchpointsTitle: config.surfaces.maintenanceWatchpoints.title,
      maintenanceRhythmTitle: config.surfaces.maintenanceRhythm.title,
      operationalNoteTitle: config.surfaces.operationalNote.title,
    },
    contextPackTitles: config.contextPacks.map((pack) => pack.title),
    hasManifest: true,
    hasBaseline: true,
    hasReferenceMode: true,
    hasLiveMode: false,
    hasRenderedRoute: false,
    renderedRoute: null,
    officialExample: false,
  } satisfies EvaluationSubject;
}

async function loadOpenClawSubject() {
  const rootPath = OPENCLAW_EXAMPLE_ROOT;
  const manifestPath = path.join(rootPath, "manifest.json");
  const baselinePath = path.join(rootPath, "reference-baseline.json");
  const pipelinePath = path.join(rootPath, "pipeline.json");
  const workspaceRoot = path.join(rootPath, "workspace");
  const obsidianVaultRoot = path.join(rootPath, "obsidian-vault");
  const evaluationRoot = path.join(rootPath, "evaluation");
  const manifest = openClawExampleManifestSchema.parse(
    await readJson<OpenClawExampleManifest>(manifestPath),
  );
  const pipeline = openClawExamplePipelineConfigSchema.parse(
    await readJson<OpenClawExamplePipelineConfig>(pipelinePath),
  );
  const pages = await Promise.all(
    manifest.pages.map((page) => readWikiDoc(rootPath, workspaceRoot, page.path)),
  );
  const pageByTitle = new Map(pages.map((page) => [normalizeTitle(page.title), page]));
  const atlasNotes = new Map<string, MarkdownDoc>();
  const contextPackNotes = new Map<string, MarkdownDoc>();
  const artifactNotes = new Map<string, MarkdownDoc>();
  const projectedArticleNotes: MarkdownDoc[] = [];

  for (const absolutePath of await listMarkdownFiles(path.join(obsidianVaultRoot, "00 Atlas"))) {
    const doc = await readMarkdownDoc(rootPath, absolutePath);
    atlasNotes.set(normalizeTitle(doc.title), doc);
  }

  for (const absolutePath of await listMarkdownFiles(path.join(obsidianVaultRoot, "05 Context Packs"))) {
    const doc = await readMarkdownDoc(rootPath, absolutePath);
    contextPackNotes.set(normalizeTitle(doc.title), doc);
  }

  for (const absolutePath of await listMarkdownFiles(path.join(obsidianVaultRoot, "10 Articles"))) {
    projectedArticleNotes.push(await readMarkdownDoc(rootPath, absolutePath));
  }

  for (const folder of ["20 Sources", "25 Normalized Sources", "30 Summaries", "40 Reviews", "50 Audits"]) {
    for (const absolutePath of await listMarkdownFiles(path.join(obsidianVaultRoot, folder))) {
      const doc = await readMarkdownDoc(rootPath, absolutePath);
      artifactNotes.set(normalizeTitle(doc.title), doc);
    }
  }

  const sourceCorpusFiles = pipeline.corpusFiles.map((file) =>
    path.posix.join("source-corpus", file.fileName),
  );
  const summaryFiles = (
    await listMarkdownFiles(path.join(workspaceRoot, "raw", "processed", "summaries"))
  ).filter((absolutePath) => absolutePath.endsWith(".summary.md"));
  const reviewApprovedFiles = (
    await listMarkdownFiles(path.join(workspaceRoot, "reviews", "approved"))
  ).filter((absolutePath) => absolutePath.endsWith(".proposal.md"));
  const reviewRejectedFiles = (
    await listMarkdownFiles(path.join(workspaceRoot, "reviews", "rejected"))
  ).filter((absolutePath) => absolutePath.endsWith(".proposal.md"));
  const auditFiles = (
    await listMarkdownFiles(path.join(workspaceRoot, "audits"))
  ).filter((absolutePath) => absolutePath.endsWith(".md"));

  return {
    kind: "example" as const,
    id: "openclaw",
    title: "OpenClaw example wiki",
    rootPath,
    workspaceRoot,
    obsidianVaultRoot,
    evaluationRoot,
    reportPaths: {
      json: path.join(evaluationRoot, "topic-evaluation.json"),
      markdown: path.join(evaluationRoot, "topic-evaluation.md"),
    },
    manifestPath,
    baselinePath,
    pages,
    pageByTitle,
    atlasNotes,
    contextPackNotes,
    projectedArticleNotes,
    artifactNotes,
    sourceCorpusFiles,
    summaryFiles,
    reviewApprovedFiles,
    reviewRejectedFiles,
    auditFiles,
    archivedAnswerCount: manifest.answers.filter((answer) => answer.archivedPagePath).length,
    auditModeCount: unique(manifest.audits.map((audit) => audit.mode)).length,
    surfaceTitles: {
      indexTitle: openClawKnowledgeMethodData.indexTitle,
      readingPathsTitle: openClawKnowledgeMethodData.readingPathsTitle,
      currentTensionsTitle: openClawKnowledgeMethodData.currentTensionsTitle,
      openQuestionsTitle: openClawKnowledgeMethodData.openQuestionsTitle,
      maintenanceWatchpointsTitle: openClawKnowledgeMethodData.maintenanceWatchpointsTitle,
      maintenanceRhythmTitle: openClawKnowledgeMethodData.maintenanceRhythmTitle,
      operationalNoteTitle: openClawKnowledgeMethodData.archivedNoteTitle,
    },
    contextPackTitles: openClawKnowledgeMethodData.contextPacks.map((pack) => pack.title),
    hasManifest: true,
    hasBaseline: true,
    hasReferenceMode: true,
    hasLiveMode: pipeline.modes.live.requiredEnvVars.length > 0,
    hasRenderedRoute: Boolean(pipeline.renderedRoute),
    renderedRoute: pipeline.renderedRoute,
    officialExample: true,
  } satisfies EvaluationSubject;
}

function surfaceSummary(label: string, score: number, issues: string[]) {
  if (score <= 0.1) {
    return `${label} is missing.`;
  }

  if (issues.length === 0) {
    return `${label} is doing its job cleanly.`;
  }

  if (score < 3) {
    return `${label} exists but is still weak or underpowered.`;
  }

  return `${label} is usable, but it still has room to tighten.`;
}

function getWikiPage(subject: EvaluationSubject, title: string) {
  return subject.pageByTitle.get(normalizeTitle(title)) ?? null;
}

function getAtlasNote(subject: EvaluationSubject, title: string) {
  return subject.atlasNotes.get(normalizeTitle(title)) ?? null;
}

function getContextPackNote(subject: EvaluationSubject, title: string) {
  return subject.contextPackNotes.get(normalizeTitle(title)) ?? null;
}

function getArtifactNote(subject: EvaluationSubject, title: string) {
  return subject.artifactNotes.get(normalizeTitle(title)) ?? null;
}

function buildSurfaceEvaluation(params: {
  id: string;
  label: string;
  kind: TopicSurfaceEvaluation["kind"];
  score: number;
  paths: string[];
  evidence: string[];
  issues: string[];
}) {
  const roundedScore = roundScore(clamp(params.score, 0, 5));

  return {
    id: params.id,
    label: params.label,
    kind: params.kind,
    paths: params.paths,
    score: roundedScore,
    maxScore: 5,
    percent: toPercent(roundedScore),
    status: getStageStatus(roundedScore),
    summary: surfaceSummary(params.label, roundedScore, params.issues),
    evidence: params.evidence,
    issues: params.issues,
  } satisfies TopicSurfaceEvaluation;
}

function evaluateStartHere(subject: EvaluationSubject) {
  const doc = getAtlasNote(subject, "Start Here");
  const docScore = buildDocScore({
    doc,
    expectedHeadings: ["What this vault is", "Primary reading path", "Artifact ladder", "Daily habits"],
    minWordCount: 90,
    minLinkCount: 6,
    minBulletCount: 6,
  });

  return buildSurfaceEvaluation({
    id: "start-here",
    label: "Start Here",
    kind: "navigation",
    score: docScore.score,
    paths: doc ? [doc.relativePath] : [],
    evidence: docScore.evidence,
    issues: docScore.issues,
  });
}

function evaluateTopicMap(subject: EvaluationSubject) {
  const doc = getAtlasNote(subject, "Topic Map");
  const docScore = buildDocScore({
    doc,
    expectedHeadings: ["Canonical entries", "Working surfaces", "Monitoring surfaces", "Artifact surfaces"],
    minWordCount: 50,
    minLinkCount: 8,
    minBulletCount: 8,
  });

  return buildSurfaceEvaluation({
    id: "topic-map",
    label: "Topic Map",
    kind: "navigation",
    score: docScore.score,
    paths: doc ? [doc.relativePath] : [],
    evidence: docScore.evidence,
    issues: docScore.issues,
  });
}

function evaluateKeyPages(subject: EvaluationSubject) {
  const doc = getAtlasNote(subject, "Key Pages");
  const docScore = buildDocScore({
    doc,
    expectedHeadings: ["Read these first", "Read these when operating", "Read these when checking provenance"],
    minWordCount: 70,
    minLinkCount: 6,
    minBulletCount: 6,
  });

  return buildSurfaceEvaluation({
    id: "key-pages",
    label: "Key Pages",
    kind: "navigation",
    score: docScore.score,
    paths: doc ? [doc.relativePath] : [],
    evidence: docScore.evidence,
    issues: docScore.issues,
  });
}

function evaluateReadingPaths(subject: EvaluationSubject) {
  const wikiDoc = getWikiPage(subject, subject.surfaceTitles.readingPathsTitle);
  const atlasDoc = getAtlasNote(subject, "Reading Paths");
  const wikiScore = buildDocScore({
    doc: wikiDoc,
    expectedHeadings: ["Overview", "Feed to the model", "Related pages"],
    minWordCount: 170,
    minLinkCount: 8,
    minBulletCount: 4,
    minOrderedCount: 3,
  });
  const atlasScore = buildDocScore({
    doc: atlasDoc,
    expectedHeadings: [],
    minWordCount: 80,
    minLinkCount: 6,
    minOrderedCount: 3,
  });
  const score = average([wikiScore.score, atlasScore.score]);

  return buildSurfaceEvaluation({
    id: "reading-paths",
    label: "Reading Paths",
    kind: "navigation",
    score,
    paths: [wikiDoc?.relativePath, atlasDoc?.relativePath].filter(Boolean) as string[],
    evidence: [...wikiScore.evidence, ...atlasScore.evidence],
    issues: [...wikiScore.issues, ...atlasScore.issues],
  });
}

function evaluateOpenQuestions(subject: EvaluationSubject) {
  const wikiDoc = getWikiPage(subject, subject.surfaceTitles.openQuestionsTitle);
  const atlasDoc = getAtlasNote(subject, "Open Questions");
  const wikiScore = buildDocScore({
    doc: wikiDoc,
    expectedHeadings: [
      "Summary",
      "Questions",
      "What would resolve them",
      "Published syntheses",
      "Reopened by evidence change",
    ],
    minWordCount: 140,
    minLinkCount: 5,
    minBulletCount: 5,
  });
  const atlasScore = buildDocScore({
    doc: atlasDoc,
    expectedHeadings: [
      "Highest-leverage open questions",
      "What would reduce uncertainty",
      "What might become a synthesis next",
      "Published syntheses",
      "Reopened by evidence change",
    ],
    minWordCount: 70,
    minLinkCount: 3,
    minBulletCount: 4,
  });

  return buildSurfaceEvaluation({
    id: "open-questions",
    label: "Open Questions",
    kind: "maintenance",
    score: average([wikiScore.score, atlasScore.score]),
    paths: [wikiDoc?.relativePath, atlasDoc?.relativePath].filter(Boolean) as string[],
    evidence: [...wikiScore.evidence, ...atlasScore.evidence],
    issues: [...wikiScore.issues, ...atlasScore.issues],
  });
}

function evaluateCurrentTensions(subject: EvaluationSubject) {
  const wikiDoc = getWikiPage(subject, subject.surfaceTitles.currentTensionsTitle);
  const atlasDoc = getAtlasNote(subject, "Current Tensions");
  const wikiScore = buildDocScore({
    doc: wikiDoc,
    expectedHeadings: ["Summary", "Current tensions", "Why they matter", "What might become synthesis next"],
    minWordCount: 150,
    minLinkCount: 4,
    minBulletCount: 4,
  });
  const atlasScore = buildDocScore({
    doc: atlasDoc,
    expectedHeadings: ["Main tensions", "Where to inspect them", "What should become synthesis next"],
    minWordCount: 70,
    minLinkCount: 4,
    minBulletCount: 3,
  });

  return buildSurfaceEvaluation({
    id: "current-tensions",
    label: "Current Tensions",
    kind: "maintenance",
    score: average([wikiScore.score, atlasScore.score]),
    paths: [wikiDoc?.relativePath, atlasDoc?.relativePath].filter(Boolean) as string[],
    evidence: [...wikiScore.evidence, ...atlasScore.evidence],
    issues: [...wikiScore.issues, ...atlasScore.issues],
  });
}

function evaluateMonitoring(subject: EvaluationSubject) {
  const wikiDoc = getWikiPage(subject, subject.surfaceTitles.maintenanceWatchpointsTitle);
  const atlasDoc = getAtlasNote(subject, "Monitoring");
  const noteDoc = getWikiPage(subject, subject.surfaceTitles.operationalNoteTitle);
  const wikiScore = buildDocScore({
    doc: wikiDoc,
    expectedHeadings: ["Thesis", "Watchpoints", "Refresh triggers", "Action path"],
    minWordCount: 150,
    minLinkCount: 5,
    minBulletCount: 5,
  });
  const atlasScore = buildDocScore({
    doc: atlasDoc,
    expectedHeadings: ["What to monitor", "Refresh triggers", "Escalation path"],
    minWordCount: 70,
    minLinkCount: 4,
    minBulletCount: 4,
  });
  const noteScore = buildDocScore({
    doc: noteDoc,
    expectedHeadings: [],
    minWordCount: 80,
    minLinkCount: 3,
    minBulletCount: 3,
  });

  return buildSurfaceEvaluation({
    id: "monitoring-watchpoints",
    label: "Monitoring / Watchpoints",
    kind: "maintenance",
    score: wikiScore.score * 0.45 + atlasScore.score * 0.35 + noteScore.score * 0.2,
    paths: [wikiDoc?.relativePath, atlasDoc?.relativePath, noteDoc?.relativePath].filter(Boolean) as string[],
    evidence: [...wikiScore.evidence, ...atlasScore.evidence, ...noteScore.evidence],
    issues: [...wikiScore.issues, ...atlasScore.issues, ...noteScore.issues],
  });
}

function evaluateMaintenanceRhythm(subject: EvaluationSubject) {
  const wikiDoc = getWikiPage(subject, subject.surfaceTitles.maintenanceRhythmTitle);
  const atlasDoc = getAtlasNote(subject, "Maintenance Rhythm");
  const wikiScore = buildDocScore({
    doc: wikiDoc,
    expectedHeadings: [
      "Summary",
      "Review cadence",
      "Revisit next",
      "Synthesis decisions",
      "Evidence changes to triage",
      "Context packs to refresh",
      "Synthesis candidates",
      "Audit to action",
    ],
    minWordCount: 190,
    minLinkCount: 6,
    minBulletCount: 7,
  });
  const atlasScore = buildDocScore({
    doc: atlasDoc,
    expectedHeadings: [
      "Start a pass here",
      "Revisit next",
      "Synthesis decisions",
      "Evidence changes to triage",
      "Context packs to refresh",
      "Synthesis candidates",
    ],
    minWordCount: 90,
    minLinkCount: 4,
    minBulletCount: 5,
  });

  return buildSurfaceEvaluation({
    id: "maintenance-rhythm",
    label: "Maintenance Rhythm",
    kind: "maintenance",
    score: average([wikiScore.score, atlasScore.score]),
    paths: [wikiDoc?.relativePath, atlasDoc?.relativePath].filter(Boolean) as string[],
    evidence: [...wikiScore.evidence, ...atlasScore.evidence],
    issues: [...wikiScore.issues, ...atlasScore.issues],
  });
}

function scoreContextPackDoc(
  subject: EvaluationSubject,
  title: string,
  doc: MarkdownDoc | null,
) {
  const base = buildDocScore({
    doc,
    expectedHeadings: ["Use this pack when", "Load these notes"],
    minWordCount: 60,
    minLinkCount: 2,
    minBulletCount: 2,
    maxLinkCount: 8,
  });

  let score = base.score;
  const issues = [...base.issues];
  const evidence = [...base.evidence];

  if (!doc) {
    return { score: 0, issues, evidence };
  }

  if (title === "Provenance And Review") {
    const populatedLayers =
      (subject.summaryFiles.length > 0 ? 1 : 0) +
      (subject.reviewApprovedFiles.length + subject.reviewRejectedFiles.length > 0 ? 1 : 0) +
      (subject.auditFiles.length > 0 ? 1 : 0);
    const artifactSupport = populatedLayers / 3;
    score = roundScore(score * 0.8 + artifactSupport);
    evidence.push(`${populatedLayers}/3 provenance layers behind this pack are populated.`);

    if (artifactSupport < 0.5) {
      issues.push("This pack points at workflow layers that are still mostly empty.");
    }
  }

  return { score, issues, evidence };
}

function evaluateLlmContextPacks(subject: EvaluationSubject) {
  const hubDoc = getAtlasNote(subject, "LLM Context Pack");
  const hubScore = buildDocScore({
    doc: hubDoc,
    expectedHeadings: ["Working principle", "Available packs", "When to reopen the pack list"],
    minWordCount: 80,
    minLinkCount: 3,
    minBulletCount: 3,
  });
  const packScores = subject.contextPackTitles.map((title) =>
    scoreContextPackDoc(subject, title, getContextPackNote(subject, title)),
  );
  const averagePackScore = average(packScores.map((result) => result.score));
  const countFactor = clamp(subject.contextPackTitles.length / 4, 0, 1) * 0.5;
  const score = roundScore(hubScore.score * 0.35 + averagePackScore * 0.55 + countFactor);

  return buildSurfaceEvaluation({
    id: "llm-context-packs",
    label: "LLM Context Packs",
    kind: "context-pack",
    score,
    paths: [
      hubDoc?.relativePath,
      ...subject.contextPackTitles
        .map((title) => getContextPackNote(subject, title)?.relativePath ?? null)
        .filter(Boolean),
    ] as string[],
    evidence: [
      ...hubScore.evidence,
      `${subject.contextPackTitles.length} context packs are available.`,
      `Average individual pack score: ${roundScore(averagePackScore)}/5.`,
    ],
    issues: [...hubScore.issues, ...packScores.flatMap((result) => result.issues)],
  });
}

function evaluateArtifactMap(subject: EvaluationSubject) {
  const hubDoc = getAtlasNote(subject, "Artifact Map");
  const hubScore = buildDocScore({
    doc: hubDoc,
    expectedHeadings: [
      "Read the compiled wiki first",
      "Then inspect the artifact trail",
      "Where unresolved items should land",
    ],
    minWordCount: 80,
    minLinkCount: 5,
    minBulletCount: 4,
  });
  const artifactDocs = [
    "Corpus Atlas",
    "Processed Source Atlas",
    "Summary Atlas",
    "Review History",
    "Audit Atlas",
  ]
    .map((title) => getArtifactNote(subject, title))
    .filter((doc): doc is MarkdownDoc => doc !== null);
  const artifactScores = artifactDocs.map((doc) =>
    buildDocScore({
      doc,
      expectedHeadings: ["What this layer is for"],
      minWordCount: 50,
      minLinkCount: 1,
      minBulletCount: 2,
    }),
  );
  const artifactAverage = average(artifactScores.map((result) => result.score));
  const populatedLayers =
    (subject.summaryFiles.length > 0 ? 1 : 0) +
    (subject.reviewApprovedFiles.length + subject.reviewRejectedFiles.length > 0 ? 1 : 0) +
    (subject.auditFiles.length > 0 ? 1 : 0);
  const populationScore = 1.5 * (populatedLayers / 3);
  const score = roundScore(hubScore.score * 0.45 + artifactAverage * 0.35 + populationScore);
  const issues = [...hubScore.issues, ...artifactScores.flatMap((result) => result.issues)];

  if (populatedLayers < 3) {
    issues.push("One or more downstream artifact layers are still empty, so this surface is partly anticipatory.");
  }

  return buildSurfaceEvaluation({
    id: "artifact-map",
    label: "Artifact Map",
    kind: "artifact",
    score,
    paths: [
      hubDoc?.relativePath,
      ...artifactDocs.map((doc) => doc.relativePath),
    ].filter(Boolean) as string[],
    evidence: [
      ...hubScore.evidence,
      `${artifactDocs.length}/5 artifact bridge notes are present.`,
      `${populatedLayers}/3 downstream artifact layers are populated.`,
    ],
    issues,
  });
}

function evaluateCanonicalWikiPages(subject: EvaluationSubject) {
  const docs = subject.pages.filter((page) => page.frontmatter.type !== "index");
  const articleLikeDocs = docs.filter((page) =>
    ["topic", "entity", "concept", "timeline"].includes(page.frontmatter.type),
  );
  const synthesisDocs = docs.filter((page) => page.frontmatter.type === "synthesis");
  const pageScores = docs.map((doc) => {
    const headingMinimum =
      doc.frontmatter.type === "note" ? 2 : doc.frontmatter.type === "synthesis" ? 3 : 3;

    const structure = buildDocScore({
      doc,
      expectedHeadings: [],
      minWordCount: doc.frontmatter.type === "note" ? 90 : 130,
      minLinkCount: 2,
      minBulletCount: 1,
    });
    const headingBonus = clamp(doc.sectionHeadings.length / headingMinimum, 0, 1);
    const sourceRefScore = clamp(doc.frontmatter.source_refs.length / 2, 0, 1);
    const score = roundScore(structure.score * 0.65 + headingBonus + sourceRefScore);

    return {
      score,
      doc,
    };
  });
  const averagePageScore = average(pageScores.map((entry) => entry.score));
  const breadthScore = clamp(docs.length / 6, 0, 1);
  const groundingScore = docs.some((doc) =>
    doc.frontmatter.source_refs.some((ref) => !ref.startsWith("corpus:")),
  )
    ? 1
    : 0.4;
  const score = roundScore(averagePageScore * 0.6 + breadthScore + groundingScore);
  const issues: string[] = [];

  if (articleLikeDocs.length < 2) {
    issues.push("The topic still has a thin durable article layer.");
  }

  if (synthesisDocs.length < 1) {
    issues.push("The topic does not yet have a durable synthesis layer.");
  }

  if (groundingScore < 1) {
    issues.push("Canonical pages are still grounded only in starter corpus references, not richer compiled workflow artifacts.");
  }

  return buildSurfaceEvaluation({
    id: "canonical-wiki-pages",
    label: "Canonical wiki pages",
    kind: "canonical",
    score,
    paths: docs.map((doc) => doc.relativePath),
    evidence: [
      `${docs.length} non-index canonical pages are present.`,
      `${articleLikeDocs.length} article-like pages and ${synthesisDocs.length} syntheses are present.`,
      `Average non-index page quality score: ${roundScore(averagePageScore)}/5.`,
    ],
    issues,
  });
}

function evaluateProjectionUtility(subject: EvaluationSubject) {
  const atlasAverage = average(
    REQUIRED_ATLAS_NOTES.map((title) =>
      buildDocScore({
        doc: getAtlasNote(subject, title),
        expectedHeadings: [],
        minWordCount: 40,
        minLinkCount: 2,
      }).score,
    ),
  );
  const projectedAverage = average(
    subject.projectedArticleNotes.map((doc) =>
      buildDocScore({
        doc,
        expectedHeadings: [],
        minWordCount: 80,
        minLinkCount: 2,
      }).score,
    ),
  );
  const coverageFactor = clamp(
    subject.projectedArticleNotes.length / Math.max(subject.pages.length, 1),
    0,
    1,
  ) * 0.5;
  const score = roundScore(atlasAverage * 0.55 + projectedAverage * 0.35 + coverageFactor);
  const issues: string[] = [];

  if (subject.projectedArticleNotes.length < subject.pages.length) {
    issues.push("Not every canonical page has a clear projected article counterpart.");
  }

  return buildSurfaceEvaluation({
    id: "obsidian-projection",
    label: "Obsidian projection",
    kind: "projection",
    score,
    paths: [
      ...[...subject.atlasNotes.values()].map((doc) => doc.relativePath),
      ...subject.projectedArticleNotes.map((doc) => doc.relativePath),
    ],
    evidence: [
      `${subject.atlasNotes.size} atlas notes are present.`,
      `${subject.projectedArticleNotes.length} projected article notes are present.`,
      `Average atlas note score: ${roundScore(atlasAverage)}/5.`,
    ],
    issues,
  });
}

function buildDimension(params: {
  id: TopicQualityDimension;
  score: number;
  summary: string;
  evidence: string[];
  recommendedAction?: string | null;
}) {
  const roundedScore = roundScore(clamp(params.score, 0, 5));

  return {
    id: params.id,
    label: SURFACE_LABELS[params.id],
    score: roundedScore,
    maxScore: 5,
    percent: toPercent(roundedScore),
    status: getStageStatus(roundedScore),
    summary: params.summary,
    evidence: params.evidence,
    recommendedAction: params.recommendedAction ?? null,
  } satisfies TopicDimensionScore;
}

function evaluateDimensions(subject: EvaluationSubject, surfaces: TopicSurfaceEvaluation[]) {
  const getSurface = (id: string) => surfaces.find((surface) => surface.id === id)!;
  const populatedWorkflowLayers =
    (subject.summaryFiles.length > 0 ? 1 : 0) +
    (subject.reviewApprovedFiles.length + subject.reviewRejectedFiles.length > 0 ? 1 : 0) +
    (subject.auditFiles.length > 0 ? 1 : 0) +
    (subject.archivedAnswerCount > 0 ? 1 : 0);
  const completenessChecks = [
    getSurface("start-here").score > 0,
    getSurface("topic-map").score > 0,
    getSurface("key-pages").score > 0,
    getSurface("reading-paths").score > 0,
    getSurface("open-questions").score > 0,
    getSurface("current-tensions").score > 0,
    getSurface("monitoring-watchpoints").score > 0,
    getSurface("maintenance-rhythm").score > 0,
    getSurface("llm-context-packs").score > 0,
    getSurface("artifact-map").score > 0,
    getSurface("canonical-wiki-pages").score > 0,
    getSurface("obsidian-projection").score > 0,
    subject.contextPackTitles.length > 0,
    subject.hasManifest,
    subject.hasBaseline,
  ];
  const completenessScore = 5 * (completenessChecks.filter(Boolean).length / completenessChecks.length);
  const navigationScore = average([
    getSurface("start-here").score,
    getSurface("topic-map").score,
    getSurface("key-pages").score,
    getSurface("reading-paths").score,
  ]);
  const maintenanceScore = average([
    getSurface("open-questions").score,
    getSurface("current-tensions").score,
    getSurface("monitoring-watchpoints").score,
    getSurface("maintenance-rhythm").score,
  ]);
  const contextScore = getSurface("llm-context-packs").score;
  const canonicalScore = getSurface("canonical-wiki-pages").score;
  const projectionScore = getSurface("obsidian-projection").score;
  const workflowScore = roundScore(
    (subject.hasManifest ? 0.75 : 0) +
      (subject.hasBaseline ? 0.75 : 0) +
      (subject.sourceCorpusFiles.length > 0 ? 0.75 : 0) +
      (subject.summaryFiles.length > 0 ? 0.75 : 0) +
      (subject.reviewApprovedFiles.length + subject.reviewRejectedFiles.length > 0 ? 0.75 : 0) +
      (subject.auditFiles.length > 0 ? 0.5 : 0) +
      (subject.archivedAnswerCount > 0 ? 0.5 : 0) +
      (subject.hasReferenceMode ? 0.5 : 0) +
      (subject.hasLiveMode ? 0.5 : 0),
  );

  const dimensions: TopicDimensionScore[] = [
    buildDimension({
      id: "surface_completeness",
      score: completenessScore,
      summary:
        completenessScore >= 4.8
          ? "The expected surfaces are present and the topic is structurally complete."
          : "The topic is still missing part of the expected surface set.",
      evidence: [
        `${completenessChecks.filter(Boolean).length}/${completenessChecks.length} required structural checks passed.`,
        `${subject.contextPackTitles.length} context packs are available.`,
      ],
      recommendedAction:
        completenessScore >= 4.8 ? null : "Add the missing required surfaces before deepening the topic.",
    }),
    buildDimension({
      id: "navigation",
      score: navigationScore,
      summary:
        navigationScore >= 4.2
          ? "The navigation layer is calm, high-signal, and immediately usable."
          : "The navigation layer exists, but it still needs sharper routing or denser wayfinding.",
      evidence: [
        `Start Here scored ${getSurface("start-here").score}/5.`,
        `Topic Map scored ${getSurface("topic-map").score}/5.`,
        `Reading Paths scored ${getSurface("reading-paths").score}/5.`,
      ],
      recommendedAction:
        navigationScore >= 4.2
          ? null
          : "Tighten Start Here, Topic Map, and Reading Paths so they change what a reader opens next.",
    }),
    buildDimension({
      id: "canonical_depth",
      score: canonicalScore,
      summary:
        canonicalScore >= 4.2
          ? "The canonical wiki has enough durable depth to act like a serious knowledge layer."
          : "The canonical wiki exists, but it still needs stronger depth or grounding.",
      evidence: [
        `${subject.pages.filter((page) => page.frontmatter.type !== "index").length} non-index pages are present.`,
        `${subject.pages.filter((page) => page.frontmatter.type === "synthesis").length} synthesis pages are present.`,
      ],
      recommendedAction:
        canonicalScore >= 4.2
          ? null
          : "Deepen the canonical pages with stronger syntheses, denser links, and more grounded evidence.",
    }),
    buildDimension({
      id: "maintenance_readiness",
      score: maintenanceScore,
      summary:
        maintenanceScore >= 4.2
          ? "The maintenance loop is explicit and actionable."
          : "Maintenance surfaces exist, but they still need to become more operational.",
      evidence: [
        `Current Tensions scored ${getSurface("current-tensions").score}/5.`,
        `Maintenance Rhythm scored ${getSurface("maintenance-rhythm").score}/5.`,
        `${subject.auditFiles.length} audit reports are currently present.`,
      ],
      recommendedAction:
        maintenanceScore >= 4.2
          ? null
          : "Sharpen tensions, open questions, watchpoints, and revisit order so the topic is easier to resume.",
    }),
    buildDimension({
      id: "context_pack_quality",
      score: contextScore,
      summary:
        contextScore >= 4.2
          ? "Context packs are compact, purposeful, and ready for daily use."
          : "Context packs exist, but they still need tighter scope or clearer task fit.",
      evidence: [
        `${subject.contextPackTitles.length} context packs are available.`,
        `The hub note scored ${getSurface("llm-context-packs").score}/5.`,
      ],
      recommendedAction:
        contextScore >= 4.2
          ? null
          : "Split or tighten context packs until each one clearly earns its place.",
    }),
    buildDimension({
      id: "workflow_provenance",
      score: workflowScore,
      summary:
        workflowScore >= 4.2
          ? "The topic shows a real knowledge workflow: bounded inputs, visible artifacts, review history, and maintenance evidence."
          : "The topic still lacks enough populated workflow layers to feel fully matured.",
      evidence: [
        `${subject.sourceCorpusFiles.length} corpus files are explicit.`,
        `${subject.summaryFiles.length} summary notes, ${subject.reviewApprovedFiles.length + subject.reviewRejectedFiles.length} review notes, ${subject.auditFiles.length} audit notes, ${subject.archivedAnswerCount} archived answers.`,
        `${populatedWorkflowLayers}/4 downstream workflow layers are populated.`,
      ],
      recommendedAction:
        workflowScore >= 4.2
          ? null
          : "Run real summarize, review, archive, and audit loops so the topic stops behaving like a static starter scaffold.",
    }),
    buildDimension({
      id: "projection_utility",
      score: projectionScore,
      summary:
        projectionScore >= 4.2
          ? "The Obsidian projection is useful as a real daily working layer."
          : "The projection exists, but it still needs stronger daily-use value.",
      evidence: [
        `${subject.atlasNotes.size} atlas notes and ${subject.projectedArticleNotes.length} article projections are present.`,
        `Artifact Map scored ${getSurface("artifact-map").score}/5.`,
      ],
      recommendedAction:
        projectionScore >= 4.2
          ? null
          : "Improve atlas clarity or article projections until the Obsidian layer changes how the topic is actually used.",
    }),
  ];

  return dimensions;
}

function buildStageAssessments(
  subject: EvaluationSubject,
  dimensions: TopicDimensionScore[],
  surfaces: TopicSurfaceEvaluation[],
  overallScore: number,
) {
  const byId = new Map(dimensions.map((dimension) => [dimension.id, dimension]));
  const weakSurfaceCount = surfaces.filter((surface) => surface.status === "weak" || surface.status === "missing").length;
  const synthesisCount = subject.pages.filter((page) => page.frontmatter.type === "synthesis").length;
  const nonIndexPageCount = subject.pages.filter((page) => page.frontmatter.type !== "index").length;
  const contextPackCount = subject.contextPackTitles.length;
  const auditCount = subject.auditFiles.length;
  const downstreamWorkflowLayerCount =
    (subject.summaryFiles.length > 0 ? 1 : 0) +
    (subject.reviewApprovedFiles.length + subject.reviewRejectedFiles.length > 0 ? 1 : 0) +
    (subject.auditFiles.length > 0 ? 1 : 0) +
    (subject.archivedAnswerCount > 0 ? 1 : 0);
  const compiledGroundedPageCount = subject.pages.filter((page) =>
    page.frontmatter.source_refs.some((ref) => !ref.startsWith("corpus:")),
  ).length;
  const starterCriteria: TopicEvaluationCriterion[] = [
    {
      label: "Required starter surfaces exist",
      satisfied: byId.get("surface_completeness")!.score >= 4,
      details: `${byId.get("surface_completeness")!.score}/5 surface completeness.`,
    },
    {
      label: "At least one context pack exists",
      satisfied: contextPackCount >= 1,
      details: `${contextPackCount} context packs found.`,
    },
    {
      label: "A deterministic validation artifact exists",
      satisfied: subject.hasManifest && subject.hasBaseline,
      details: subject.hasManifest && subject.hasBaseline ? "Manifest and baseline are present." : "Manifest or baseline is missing.",
    },
    {
      label: "The corpus is explicit",
      satisfied: subject.sourceCorpusFiles.length > 0,
      details: `${subject.sourceCorpusFiles.length} corpus files found.`,
    },
  ];
  const developingCriteria: TopicEvaluationCriterion[] = [
    {
      label: "Starter stage is achieved",
      satisfied: starterCriteria.every((criterion) => criterion.satisfied),
      details: starterCriteria.every((criterion) => criterion.satisfied)
        ? "Starter requirements are satisfied."
        : "Starter requirements are still incomplete.",
    },
    {
      label: "At least two downstream workflow layers are populated",
      satisfied: downstreamWorkflowLayerCount >= 2,
      details: `${downstreamWorkflowLayerCount}/4 downstream workflow layers are populated.`,
    },
    {
      label: "Workflow and provenance are no longer just starter-grade",
      satisfied: byId.get("workflow_provenance")!.score >= 3,
      details: `${byId.get("workflow_provenance")!.score}/5 workflow and provenance score.`,
    },
    {
      label: "Canonical pages are grounded in compiled artifacts, not only starter corpus refs",
      satisfied: compiledGroundedPageCount >= 1,
      details: `${compiledGroundedPageCount} canonical pages cite non-corpus workflow artifacts.`,
    },
    {
      label: "The canonical layer extends beyond the bare starter minimum",
      satisfied: nonIndexPageCount >= 4,
      details: `${nonIndexPageCount} non-index pages found.`,
    },
    {
      label: "The topic has at least one synthesis",
      satisfied: synthesisCount >= 1,
      details: `${synthesisCount} syntheses found.`,
    },
    {
      label: "Navigation is already useful",
      satisfied: byId.get("navigation")!.score >= 3.5,
      details: `${byId.get("navigation")!.score}/5 navigation score.`,
    },
  ];
  const maintainedCriteria: TopicEvaluationCriterion[] = [
    {
      label: "Developing stage is achieved",
      satisfied: developingCriteria.every((criterion) => criterion.satisfied),
      details: developingCriteria.every((criterion) => criterion.satisfied)
        ? "Developing requirements are satisfied."
        : "Developing requirements are still incomplete.",
    },
    {
      label: "Maintenance surfaces are operational",
      satisfied: byId.get("maintenance_readiness")!.score >= 3.5,
      details: `${byId.get("maintenance_readiness")!.score}/5 maintenance readiness score.`,
    },
    {
      label: "Context packs are high-signal enough for repeated use",
      satisfied: byId.get("context_pack_quality")!.score >= 3.5,
      details: `${byId.get("context_pack_quality")!.score}/5 context-pack score.`,
    },
    {
      label: "At least one audit report exists",
      satisfied: auditCount >= 1,
      details: `${auditCount} audit reports found.`,
    },
    {
      label: "A stable validation path exists",
      satisfied: subject.hasBaseline,
      details: subject.hasBaseline ? "Validation artifact is present." : "Validation artifact is missing.",
    },
  ];
  const matureCriteria: TopicEvaluationCriterion[] = [
    {
      label: "Maintained stage is achieved",
      satisfied: maintainedCriteria.every((criterion) => criterion.satisfied),
      details: maintainedCriteria.every((criterion) => criterion.satisfied)
        ? "Maintained requirements are satisfied."
        : "Maintained requirements are still incomplete.",
    },
    {
      label: "Overall quality is consistently high",
      satisfied: overallScore >= 4,
      details: `${roundScore(overallScore)}/5 overall score.`,
    },
    {
      label: "Canonical depth is strong",
      satisfied: byId.get("canonical_depth")!.score >= 4,
      details: `${byId.get("canonical_depth")!.score}/5 canonical depth score.`,
    },
    {
      label: "Workflow and provenance are strongly integrated",
      satisfied: byId.get("workflow_provenance")!.score >= 4,
      details: `${byId.get("workflow_provenance")!.score}/5 workflow and provenance score.`,
    },
    {
      label: "Projection utility is strong",
      satisfied: byId.get("projection_utility")!.score >= 4,
      details: `${byId.get("projection_utility")!.score}/5 projection utility score.`,
    },
  ];
  const flagshipCriteria: TopicEvaluationCriterion[] = [
    {
      label: "Mature stage is achieved",
      satisfied: matureCriteria.every((criterion) => criterion.satisfied),
      details: matureCriteria.every((criterion) => criterion.satisfied)
        ? "Mature requirements are satisfied."
        : "Mature requirements are still incomplete.",
    },
    {
      label: "This topic is an official showcase or reference example",
      satisfied: subject.officialExample,
      details: subject.officialExample ? "The topic is a designated official example." : "The topic is not designated as an official example.",
    },
    {
      label: "Reference and live modes are explicit",
      satisfied: subject.hasReferenceMode && subject.hasLiveMode,
      details:
        subject.hasReferenceMode && subject.hasLiveMode
          ? "Reference and live workflow modes are both present."
          : "One or both showcase workflow modes are missing.",
    },
    {
      label: "The product has a clear showcase entry path",
      satisfied: subject.hasRenderedRoute,
      details: subject.hasRenderedRoute
        ? `Rendered route: ${subject.renderedRoute}.`
        : "No rendered showcase route is defined.",
    },
    {
      label: "The topic no longer has obvious weak surfaces",
      satisfied: weakSurfaceCount === 0,
      details:
        weakSurfaceCount === 0
          ? "No weak surfaces were detected."
          : `${weakSurfaceCount} weak or missing surfaces remain.`,
    },
    {
      label: "Overall quality clears the flagship bar",
      satisfied: overallScore >= 4.5,
      details: `${roundScore(overallScore)}/5 overall score.`,
    },
  ];

  return [
    {
      stage: "starter",
      achieved: starterCriteria.every((criterion) => criterion.satisfied),
      criteria: starterCriteria,
    },
    {
      stage: "developing",
      achieved: developingCriteria.every((criterion) => criterion.satisfied),
      criteria: developingCriteria,
    },
    {
      stage: "maintained",
      achieved: maintainedCriteria.every((criterion) => criterion.satisfied),
      criteria: maintainedCriteria,
    },
    {
      stage: "mature",
      achieved: matureCriteria.every((criterion) => criterion.satisfied),
      criteria: matureCriteria,
    },
    {
      stage: "flagship",
      achieved: flagshipCriteria.every((criterion) => criterion.satisfied),
      criteria: flagshipCriteria,
    },
  ] satisfies TopicStageAssessment[];
}

function resolveStage(stageAssessments: TopicStageAssessment[]) {
  const achieved = stageAssessments.filter((assessment) => assessment.achieved);
  const stage = achieved.at(-1)?.stage ?? "starter";
  const nextStage = TOPIC_MATURITY_STAGES.find((candidate) => {
    const currentIndex = TOPIC_MATURITY_STAGES.indexOf(stage);
    return TOPIC_MATURITY_STAGES.indexOf(candidate) === currentIndex + 1;
  }) ?? null;

  return {
    stage,
    nextStage,
  };
}

function buildMaturitySummary(stage: TopicMaturityStage, subject: EvaluationSubject) {
  switch (stage) {
    case "starter":
      return `${subject.title} has a credible starter surface set, but it still behaves like a starter because real summarize, review, archive, and audit evidence has not populated enough of the workflow yet.`;
    case "developing":
      return `${subject.title} has moved beyond a bare starter and is beginning to accumulate real workflow evidence, but it still needs stronger maintenance and provenance depth.`;
    case "maintained":
      return `${subject.title} behaves like a real maintained topic: the maintenance loop is visible, workflow artifacts exist, and the workspace is usable over time.`;
    case "mature":
      return `${subject.title} is now a mature knowledge workspace with strong canonical, maintenance, workflow, and projection layers.`;
    case "flagship":
      return `${subject.title} is operating at flagship quality: strong workflow completeness, strong daily-use surfaces, and a clear showcase path.`;
  }
}

function buildPromotionReadiness(
  stageAssessments: TopicStageAssessment[],
) {
  const nextStage = resolveStage(stageAssessments).nextStage;

  if (!nextStage) {
    return {
      targetStage: null,
      satisfiedCriteria: 0,
      totalCriteria: 0,
      percent: 100,
      summary: "This topic already clears the highest maturity bar currently defined in the system.",
      blockers: [],
    };
  }

  const targetAssessment = stageAssessments.find((assessment) => assessment.stage === nextStage);

  if (!targetAssessment) {
    return {
      targetStage: nextStage,
      satisfiedCriteria: 0,
      totalCriteria: 0,
      percent: 0,
      summary: `No assessment was available for the next stage (${nextStage}).`,
      blockers: [],
    };
  }

  const satisfiedCriteria = targetAssessment.criteria.filter((criterion) => criterion.satisfied).length;
  const totalCriteria = targetAssessment.criteria.length;
  const percent =
    totalCriteria === 0 ? 0 : Math.round((satisfiedCriteria / totalCriteria) * 100);
  const blockers = targetAssessment.criteria.filter((criterion) => !criterion.satisfied);

  return {
    targetStage: nextStage,
    satisfiedCriteria,
    totalCriteria,
    percent,
    summary:
      blockers.length === 0
        ? `This topic is ready to be promoted into ${nextStage}.`
        : `${satisfiedCriteria}/${totalCriteria} criteria for ${nextStage} are already satisfied. The remaining blockers define the highest-leverage upgrade path.`,
    blockers,
  };
}

function buildActionPathHints(
  surfaces: TopicSurfaceEvaluation[],
  surfaceIds: string[],
  fallbackPaths: string[] = [],
) {
  return unique([
    ...surfaceIds.flatMap((surfaceId) => surfaces.find((surface) => surface.id === surfaceId)?.paths ?? []),
    ...fallbackPaths,
  ]).slice(0, 4);
}

function buildNextActions(params: {
  subject: EvaluationSubject;
  stage: TopicMaturityStage;
  stageAssessments: TopicStageAssessment[];
  dimensions: TopicDimensionScore[];
  surfaces: TopicSurfaceEvaluation[];
}): TopicEvaluationAction[] {
  const { subject, stage, stageAssessments, dimensions, surfaces } = params;
  const nextStage = resolveStage(stageAssessments).nextStage;
  const nextStageAssessment = nextStage
    ? stageAssessments.find((assessment) => assessment.stage === nextStage)
    : null;
  const blockers = nextStageAssessment?.criteria.filter((criterion) => !criterion.satisfied) ?? [];
  const actions: TopicEvaluationAction[] = [];
  const dimensionsById = new Map(dimensions.map((dimension) => [dimension.id, dimension]));

  const pushAction = (action: TopicEvaluationAction) => {
    if (actions.some((existing) => existing.title === action.title)) {
      return;
    }

    actions.push(action);
  };

  const hasWorkflowBlocker = blockers.some((criterion) =>
    [
      "At least two downstream workflow layers are populated",
      "Workflow and provenance are no longer just starter-grade",
      "At least one audit report exists",
      "Workflow and provenance are strongly integrated",
    ].includes(criterion.label),
  );

  if (hasWorkflowBlocker) {
    pushAction({
      id: "workflow-density",
      priority: "high",
      category: "workflow",
      title: "Populate the next real workflow layers",
      summary:
        stage === "starter"
          ? "Run the first real summarize, review, archive, or audit pass so the topic stops behaving like a polished starter shell."
          : "Increase downstream workflow density so the topic is supported by visible summaries, review history, archived answers, or audits instead of relying mostly on structure.",
      whyNow:
        "Workflow and provenance are the clearest blockers between the current topic state and the next maturity stage.",
      targetStage: nextStage ?? stage,
      relatedSurfaceIds: ["artifact-map", "llm-context-packs", "canonical-wiki-pages"],
      pathHints: buildActionPathHints(surfaces, ["artifact-map", "maintenance-rhythm"]),
    });
  }

  const hasCanonicalBlocker = blockers.some((criterion) =>
    [
      "Canonical pages are grounded in compiled artifacts, not only starter corpus refs",
      "Canonical depth is strong",
      "The topic has at least one synthesis",
    ].includes(criterion.label),
  );

  if (
    hasCanonicalBlocker ||
    (dimensionsById.get("canonical_depth")?.score ?? 0) < 4.2
  ) {
    pushAction({
      id: "canonical-grounding",
      priority: "high",
      category: "canonical",
      title: "Deepen the canonical layer with grounded synthesis",
      summary:
        "Promote the strongest recurring topic pressure into a better-grounded synthesis or update so important pages cite compiled workflow artifacts, not only starter corpus references.",
      whyNow:
        "Canonical strength should be durable evidence, not just well-written starter pages.",
      targetStage: nextStage ?? stage,
      relatedSurfaceIds: ["canonical-wiki-pages", "current-tensions", "open-questions"],
      pathHints: buildActionPathHints(surfaces, ["canonical-wiki-pages", "current-tensions", "open-questions"]),
    });
  }

  if (
    blockers.some((criterion) =>
      ["Maintenance surfaces are operational", "Developing stage is achieved"].includes(criterion.label),
    ) ||
    (dimensionsById.get("maintenance_readiness")?.score ?? 0) < 4.2
  ) {
    pushAction({
      id: "maintenance-operations",
      priority: "medium",
      category: "maintenance",
      title: "Turn maintenance surfaces into repeated operating habits",
      summary:
        "Use maintenance rhythm, tensions, open questions, and watchpoints as a genuine revisit loop so the topic is easier to resume without rereading everything.",
      whyNow:
        "A topic becomes maintained when these surfaces decide what gets reopened next instead of just documenting possibilities.",
      targetStage: nextStage ?? stage,
      relatedSurfaceIds: ["maintenance-rhythm", "current-tensions", "open-questions", "monitoring-watchpoints"],
      pathHints: buildActionPathHints(surfaces, ["maintenance-rhythm", "current-tensions", "open-questions", "monitoring-watchpoints"]),
    });
  }

  if (
    blockers.some((criterion) =>
      ["Context packs are high-signal enough for repeated use"].includes(criterion.label),
    ) ||
    (dimensionsById.get("context_pack_quality")?.score ?? 0) < 4.2
  ) {
    pushAction({
      id: "context-pack-tightening",
      priority: "medium",
      category: "context-pack",
      title: "Tighten context packs around real work bundles",
      summary:
        "Reduce each pack to the smallest bundle that truly helps orientation, maintenance, provenance tracing, or synthesis work.",
      whyNow:
        "Context packs should change what a human or model loads first, not just mirror the atlas.",
      targetStage: nextStage ?? stage,
      relatedSurfaceIds: ["llm-context-packs", "reading-paths"],
      pathHints: buildActionPathHints(surfaces, ["llm-context-packs", "reading-paths"]),
    });
  }

  if (
    blockers.some((criterion) => ["Navigation is already useful"].includes(criterion.label)) ||
    (dimensionsById.get("navigation")?.score ?? 0) < 4.2
  ) {
    pushAction({
      id: "navigation-clarity",
      priority: "medium",
      category: "navigation",
      title: "Sharpen route-setting surfaces",
      summary:
        "Make Start Here, Topic Map, Key Pages, and Reading Paths more decisive about what should be opened first, second, and only if needed.",
      whyNow:
        "Navigation should compress re-entry time, especially once more sources and syntheses begin to accumulate.",
      targetStage: nextStage ?? stage,
      relatedSurfaceIds: ["start-here", "topic-map", "key-pages", "reading-paths"],
      pathHints: buildActionPathHints(surfaces, ["start-here", "topic-map", "key-pages", "reading-paths"]),
    });
  }

  if (
    blockers.some((criterion) =>
      [
        "Reference and live modes are explicit",
        "The product has a clear showcase entry path",
      ].includes(criterion.label),
    ) ||
    (stage === "flagship" && subject.auditModeCount < 2)
  ) {
    pushAction({
      id: "showcase-hardening",
      priority: stage === "mature" ? "high" : "medium",
      category: "showcase",
      title: "Broaden showcase-grade maintenance evidence",
      summary:
        subject.officialExample
          ? "Expand audit variety and long-horizon maintenance signals so flagship quality stays deserved over time."
          : "Add the explicit showcase scaffolding that would be required before this topic could be treated as a flagship example.",
      whyNow:
        "Flagship status requires more than strong content. It also needs reproducible product entry points and visible long-horizon maintenance signals.",
      targetStage: nextStage ?? stage,
      relatedSurfaceIds: ["artifact-map", "maintenance-rhythm"],
      pathHints: buildActionPathHints(surfaces, ["artifact-map", "maintenance-rhythm"]),
    });
  }

  if (actions.length === 0) {
    pushAction({
      id: "regression-guard",
      priority: "low",
      category: "showcase",
      title: "Use evaluation as a regression guard",
      summary:
        "Re-run the evaluator whenever the topic workflow, wiki structure, or daily-use surfaces change materially.",
      whyNow:
        "This topic already clears the current stage bar, so the highest-value move is to keep that quality from slipping.",
      targetStage: nextStage ?? stage,
      relatedSurfaceIds: [],
      pathHints: [],
    });
  }

  return actions.slice(0, 5);
}

function buildRecommendedNextSteps(actions: TopicEvaluationAction[]) {
  return actions.map((action) => `${action.title}: ${action.summary}`);
}

function buildStrengths(
  dimensions: TopicDimensionScore[],
  surfaces: TopicSurfaceEvaluation[],
  subject: EvaluationSubject,
) {
  const strengths = [
    ...dimensions
      .filter((dimension) => dimension.score >= 4.2)
      .map((dimension) => `${dimension.label} is strong: ${dimension.summary}`),
    ...surfaces
      .filter((surface) => surface.score >= 4.2)
      .slice(0, 4)
      .map((surface) => `${surface.label} is strong and immediately useful.`),
  ];

  if (subject.officialExample && subject.hasReferenceMode && subject.hasLiveMode) {
    strengths.push("The topic preserves both reproducible reference mode and real live mode.");
  }

  return unique(strengths).slice(0, 6);
}

function buildMissingSurfaceList(surfaces: TopicSurfaceEvaluation[]) {
  return surfaces.filter((surface) => surface.status === "missing").map((surface) => surface.label);
}

function buildWeakSurfaceList(surfaces: TopicSurfaceEvaluation[]) {
  return surfaces
    .filter((surface) => surface.status === "weak" || surface.status === "missing")
    .map((surface) => surface.label);
}

function computeOverallScore(dimensions: TopicDimensionScore[]) {
  const weightedSum = dimensions.reduce(
    (sum, dimension) => sum + dimension.score * DIMENSION_WEIGHTS[dimension.id],
    0,
  );
  const weightTotal = dimensions.reduce(
    (sum, dimension) => sum + DIMENSION_WEIGHTS[dimension.id],
    0,
  );

  return roundScore(clamp(weightedSum / weightTotal, 0, 5));
}

export async function evaluateTopicQuality(
  args: EvaluationTargetArgs,
): Promise<TopicEvaluationReport> {
  const generatedAt = new Date().toISOString();
  const subject = args.slug
    ? await loadTopicSubject(args.slug)
    : await loadOpenClawSubject();
  const surfaces = [
    evaluateStartHere(subject),
    evaluateTopicMap(subject),
    evaluateKeyPages(subject),
    evaluateReadingPaths(subject),
    evaluateOpenQuestions(subject),
    evaluateCurrentTensions(subject),
    evaluateMonitoring(subject),
    evaluateMaintenanceRhythm(subject),
    evaluateLlmContextPacks(subject),
    evaluateArtifactMap(subject),
    evaluateCanonicalWikiPages(subject),
    evaluateProjectionUtility(subject),
  ];
  const dimensions = evaluateDimensions(subject, surfaces);
  const overallScore = computeOverallScore(dimensions);
  const stageAssessments = buildStageAssessments(subject, dimensions, surfaces, overallScore);
  const { stage, nextStage } = resolveStage(stageAssessments);
  const promotionReadiness = buildPromotionReadiness(stageAssessments);
  const nextActions = buildNextActions({
    subject,
    stage,
    stageAssessments,
    dimensions,
    surfaces,
  });
  const report = topicEvaluationReportSchema.parse({
    schemaVersion: 1,
    generatedAt,
    target: {
      kind: subject.kind,
      id: subject.id,
      title: subject.title,
      rootPath: subject.rootPath,
      workspaceRoot: subject.workspaceRoot,
      obsidianVaultRoot: subject.obsidianVaultRoot,
    },
    maturity: {
      stage,
      nextStage,
      summary: buildMaturitySummary(stage, subject),
      stageAssessments,
    },
    overall: {
      score: overallScore,
      maxScore: 5,
      percent: toPercent(overallScore),
      status: getStageStatus(overallScore),
    },
    dimensions,
    surfaces,
    strengths: buildStrengths(dimensions, surfaces, subject),
    weakSurfaces: buildWeakSurfaceList(surfaces),
    missingSurfaces: buildMissingSurfaceList(surfaces),
    promotionReadiness,
    nextActions,
    recommendedNextSteps: buildRecommendedNextSteps(nextActions),
    reportPaths: {
      json: path.relative(subject.rootPath, subject.reportPaths.json).split(path.sep).join("/"),
      markdown: path.relative(subject.rootPath, subject.reportPaths.markdown).split(path.sep).join("/"),
    },
  });

  if (args.writeReport !== false) {
    await fs.mkdir(subject.evaluationRoot, { recursive: true });
    await fs.writeFile(subject.reportPaths.json, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await fs.writeFile(subject.reportPaths.markdown, renderTopicEvaluationMarkdown(report), "utf8");
  }

  return report;
}

export function renderTopicEvaluationMarkdown(report: TopicEvaluationReport) {
  const stageTable = report.maturity.stageAssessments
    .map((assessment) => {
      const status = assessment.achieved ? "Achieved" : "Not yet";
      return `## ${assessment.stage}\n\n- Status: ${status}\n${assessment.criteria
        .map((criterion) => `- ${criterion.satisfied ? "[x]" : "[ ]"} ${criterion.label}: ${criterion.details}`)
        .join("\n")}`;
    })
    .join("\n\n");
  const dimensionTable = [
    "| Dimension | Score | Status | Summary |",
    "| --- | --- | --- | --- |",
    ...report.dimensions.map(
      (dimension) =>
        `| ${dimension.label} | ${dimension.score}/5 | ${dimension.status} | ${dimension.summary} |`,
    ),
  ].join("\n");
  const surfaceTable = [
    "| Surface | Score | Status | Notes |",
    "| --- | --- | --- | --- |",
    ...report.surfaces.map(
      (surface) =>
        `| ${surface.label} | ${surface.score}/5 | ${surface.status} | ${surface.summary} |`,
    ),
  ].join("\n");
  const readinessBlock =
    report.promotionReadiness.targetStage === null
      ? "- This topic already clears the highest defined stage.\n- Promotion blockers: none."
      : `- Target stage: **${report.promotionReadiness.targetStage}**
- Readiness: **${report.promotionReadiness.percent}%** (${report.promotionReadiness.satisfiedCriteria}/${report.promotionReadiness.totalCriteria} criteria)
- Summary: ${report.promotionReadiness.summary}
- Blockers:
${report.promotionReadiness.blockers.map((criterion) => `  - ${criterion.label}: ${criterion.details}`).join("\n") || "  - None"}`;
  const actionTable = [
    "| Priority | Category | Action | Why now |",
    "| --- | --- | --- | --- |",
    ...report.nextActions.map(
      (action) =>
        `| ${action.priority} | ${action.category} | ${action.title} | ${action.whyNow} |`,
    ),
  ].join("\n");

  return `# Topic Evaluation: ${report.target.title}

## Overview

- Target: ${report.target.kind} \`${report.target.id}\`
- Generated: ${report.generatedAt}
- Maturity stage: **${report.maturity.stage}**
- Overall score: **${report.overall.score}/5** (${report.overall.percent}%)
- Next stage: ${report.maturity.nextStage ?? "none"}

${report.maturity.summary}

## Promotion readiness

${readinessBlock}

## Dimension scorecard

${dimensionTable}

## Strongest signals

${report.strengths.map((item) => `- ${item}`).join("\n")}

## Weak surfaces

${report.weakSurfaces.length > 0 ? report.weakSurfaces.map((item) => `- ${item}`).join("\n") : "- None"}

## Missing surfaces

${report.missingSurfaces.length > 0 ? report.missingSurfaces.map((item) => `- ${item}`).join("\n") : "- None"}

## Recommended next improvements

${report.recommendedNextSteps.map((item) => `1. ${item}`).join("\n")}

## Action queue

${actionTable}

## Surface evaluation

${surfaceTable}

## Maturity ladder

${stageTable}
`;
}
