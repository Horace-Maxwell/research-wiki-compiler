import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { WikiFrontmatter, WikiPageType } from "@/lib/contracts/wiki";
import type { ResearchQuestionSeed } from "@/lib/contracts/research-question";
import type { ResearchSessionSeed } from "@/lib/contracts/research-session";
import {
  TOPIC_BOOTSTRAP_QUALITY_FLAGS,
  topicBootstrapBaselineSchema,
  topicBootstrapConfigSchema,
  topicBootstrapManifestSchema,
  type TopicBootstrapBaseline,
  type TopicBootstrapConfig,
  type TopicBootstrapContextPack,
  type TopicBootstrapCorpusFile,
  type TopicBootstrapManifest,
  type TopicBootstrapManifestNote,
  type TopicBootstrapManifestPage,
  type TopicBootstrapPage,
  type TopicBootstrapQualityFlag,
  type TopicBootstrapSurface,
} from "@/lib/contracts/topic-bootstrap";
import { SOURCE_ALLOWED_TEXT_EXTENSIONS } from "@/lib/constants";
import { TOPICS_ROOT } from "@/server/lib/repo-paths";
import { slugifyTitle } from "@/server/lib/slug";
import { getWikiRelativePath } from "@/server/lib/wiki-paths";
import {
  buildKnowledgeMethodPack,
  type KnowledgeMethodTemplateData,
  type KnowledgeSurfaceTemplate,
} from "@/server/services/knowledge-method-template-service";
import { serializeWikiDocument } from "@/server/services/wiki-frontmatter-service";

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

const GENERATED_ARTIFACT_NOTES = [
  "Corpus Atlas",
  "Processed Source Atlas",
  "Summary Atlas",
  "Review History",
  "Audit Atlas",
] as const;

const STARTER_PLACEHOLDER_README = `# Source Corpus

Add one or more Markdown or text files here, then update \`topic.json\` so the \`corpus.files\` list matches the real files in this folder.
`;

type TopicBootstrapPaths = {
  topicsRoot: string;
  topicRoot: string;
  configPath: string;
  readmePath: string;
  manifestPath: string;
  baselinePath: string;
  sourceCorpusRoot: string;
  workspaceRoot: string;
  obsidianVaultRoot: string;
};

type ManagedWikiPage = {
  title: string;
  type: WikiPageType;
  managedRole: TopicBootstrapManifestPage["managedRole"];
  relativePath: string;
  rawContent: string;
};

type ManagedObsidianNote = {
  title: string;
  relativePath: string;
  content: string;
  kind: TopicBootstrapManifestNote["kind"];
};

type TopicBootstrapBuildArtifacts = {
  config: TopicBootstrapConfig;
  manifest: TopicBootstrapManifest;
  baseline: TopicBootstrapBaseline;
  pages: ManagedWikiPage[];
  obsidianNotes: ManagedObsidianNote[];
  paths: TopicBootstrapPaths;
};

export type TopicBootstrapBuildResult = TopicBootstrapBuildArtifacts;

export type TopicBootstrapValidationResult = {
  config: TopicBootstrapConfig;
  manifest: TopicBootstrapManifest;
  baseline: TopicBootstrapBaseline;
  topicRoot: string;
};

type CreateDefaultTopicBootstrapConfigInput = {
  slug: string;
  title: string;
  aliases?: string[];
  description?: string;
  seedTimestamp?: string;
  corpusFiles?: TopicBootstrapCorpusFile[];
};

type InitTopicBootstrapInput = {
  slug: string;
  title: string;
  aliases?: string[];
  description?: string;
  seedTimestamp?: string;
  copyCorpusFrom?: string | null;
  topicsRoot?: string;
  force?: boolean;
};

type BuildTopicBootstrapInput = {
  slug: string;
  topicsRoot?: string;
};

type ValidateTopicBootstrapInput = {
  slug: string;
  topicsRoot?: string;
};

function normalizeTextFileContent(value: string) {
  return value.replace(/\r\n/g, "\n");
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function obsidianFileName(title: string) {
  return title.replace(/[\\/:*?"<>|]/g, " - ").replace(/\s+/g, " ").trim();
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function wikiLink(title: string) {
  return `[[${title}]]`;
}

function corpusSourceRef(fileName: string) {
  return `corpus:${fileName.replace(/\\/g, "/")}`;
}

function ensureIsoTimestamp(value: string) {
  return new Date(value).toISOString();
}

function offsetIsoTimestamp(base: string, hours: number) {
  const date = new Date(base);
  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString();
}

function titleFromStem(stem: string) {
  return stem
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function extractWikiLinkTargets(markdown: string) {
  const matches = markdown.matchAll(/\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g);

  return unique(
    [...matches].map((match) => match[1]?.trim() ?? "").filter(Boolean),
  );
}

function headingExists(markdown: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^##\\s+${escaped}$`, "m").test(markdown);
}

function omitUndefined<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined),
  );
}

async function writeJsonFile(targetPath: string, value: unknown) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeTextFile(targetPath: string, value: string) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, normalizeTextFileContent(value), "utf8");
}

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursively(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.name === ".DS_Store") {
      continue;
    }

    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function collectHashEntries(params: {
  root: string;
  logicalPrefix: string;
}) {
  if (!(await pathExists(params.root))) {
    return [];
  }

  const files = await listFilesRecursively(params.root);

  return Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf8");

      return {
        logicalPath: path.posix.join(
          params.logicalPrefix,
          path.relative(params.root, filePath).split(path.sep).join("/"),
        ),
        sha256: sha256(normalizeTextFileContent(raw)),
      };
    }),
  );
}

async function collectSingleFileHashEntry(params: {
  filePath: string;
  logicalPath: string;
}) {
  const raw = await fs.readFile(params.filePath, "utf8");

  return {
    logicalPath: params.logicalPath,
    sha256: sha256(normalizeTextFileContent(raw)),
  };
}

async function collectSpecificHashEntries(params: {
  topicRoot: string;
  files: Array<{
    absolutePath: string;
    logicalPath: string;
  }>;
}) {
  const entries: TopicBootstrapBaseline["entries"] = [];

  for (const file of params.files) {
    if (!(await pathExists(file.absolutePath))) {
      throw new Error(
        `Missing managed bootstrap file: ${path.relative(params.topicRoot, file.absolutePath)}`,
      );
    }

    entries.push(
      await collectSingleFileHashEntry({
        filePath: file.absolutePath,
        logicalPath: file.logicalPath,
      }),
    );
  }

  return entries.sort((left, right) => left.logicalPath.localeCompare(right.logicalPath));
}

function compareEntrySets(params: {
  label: string;
  actual: TopicBootstrapBaseline["entries"];
  expected: TopicBootstrapBaseline["entries"];
}) {
  const actualMap = new Map(params.actual.map((entry) => [entry.logicalPath, entry.sha256]));
  const expectedMap = new Map(params.expected.map((entry) => [entry.logicalPath, entry.sha256]));
  const keys = new Set([...actualMap.keys(), ...expectedMap.keys()]);
  const diffs: string[] = [];

  for (const key of [...keys].sort()) {
    const actualHash = actualMap.get(key);
    const expectedHash = expectedMap.get(key);

    if (!actualHash) {
      diffs.push(`- missing ${key}`);
      continue;
    }

    if (!expectedHash) {
      diffs.push(`- unexpected ${key}`);
      continue;
    }

    if (actualHash !== expectedHash) {
      diffs.push(`- changed ${key}`);
    }
  }

  if (diffs.length > 0) {
    throw new Error(`${params.label} did not match the committed starter baseline.\n${diffs.join("\n")}`);
  }
}

async function copyDirectoryRecursive(sourceRoot: string, destinationRoot: string) {
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const destinationPath = path.join(destinationRoot, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(destinationPath, { recursive: true });
      await copyDirectoryRecursive(sourcePath, destinationPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.copyFile(sourcePath, destinationPath);
    }
  }
}

async function discoverCorpusFiles(root: string) {
  if (!(await pathExists(root))) {
    return [];
  }

  const files = await listFilesRecursively(root);

  return files
    .map((absolutePath) => path.relative(root, absolutePath).split(path.sep).join("/"))
    .filter((relativePath) => !relativePath.startsWith("."))
    .filter((relativePath) => relativePath !== "README.md")
    .filter((relativePath) =>
      SOURCE_ALLOWED_TEXT_EXTENSIONS.includes(
        path.extname(relativePath).toLowerCase() as (typeof SOURCE_ALLOWED_TEXT_EXTENSIONS)[number],
      ),
    )
    .sort();
}

function getTopicBootstrapPaths(slug: string, topicsRoot = TOPICS_ROOT): TopicBootstrapPaths {
  const topicRoot = path.join(topicsRoot, slug);

  return {
    topicsRoot,
    topicRoot,
    configPath: path.join(topicRoot, "topic.json"),
    readmePath: path.join(topicRoot, "README.md"),
    manifestPath: path.join(topicRoot, "manifest.json"),
    baselinePath: path.join(topicRoot, "starter-baseline.json"),
    sourceCorpusRoot: path.join(topicRoot, "source-corpus"),
    workspaceRoot: path.join(topicRoot, "workspace"),
    obsidianVaultRoot: path.join(topicRoot, "obsidian-vault"),
  };
}

function buildDefaultCorpusNotes(title: string, files: TopicBootstrapCorpusFile[]) {
  const count = files.length;

  if (count === 0) {
    return [
      `Add a bounded starter corpus for ${title} in \`source-corpus/\` before running the bootstrap build.`,
      "Keep the corpus small enough that the first canonical pages and context packs stay inspectable.",
    ];
  }

  return [
    `${count} starter corpus ${count === 1 ? "file" : "files"} define the first bounded reading set for ${title}.`,
    "The corpus is intentionally small so the initial atlas, working notes, and context packs stay compact and debuggable.",
  ];
}

function buildDefaultArtifactLadder(title: string) {
  return [
    "Source files enter through `source-corpus/` and remain the explicit input set for this topic.",
    "Future normalized files should land in `workspace/raw/processed/` once import and cleanup begin.",
    "Future source summaries should land in `workspace/raw/processed/summaries/`.",
    "Future review proposals should land in `workspace/reviews/approved/` and `workspace/reviews/rejected/`.",
    `Durable canonical knowledge for ${title} lives in \`workspace/wiki/\` and remains the source of truth.`,
    "The Obsidian vault is an additive projection for daily work, not a second truth layer.",
  ];
}

function buildRequiredContextPacks(title: string) {
  return [
    `Explain ${title}`,
    "Maintenance Triage",
    "Provenance And Review",
  ];
}

function buildManagedWorkspaceHelperFiles(paths: TopicBootstrapPaths) {
  return [
    {
      absolutePath: path.join(paths.workspaceRoot, "raw", "inbox", ".gitkeep"),
      logicalPath: "workspace/raw/inbox/.gitkeep",
    },
    {
      absolutePath: path.join(paths.workspaceRoot, "raw", "processed", ".gitkeep"),
      logicalPath: "workspace/raw/processed/.gitkeep",
    },
    {
      absolutePath: path.join(paths.workspaceRoot, "raw", "processed", "summaries", ".gitkeep"),
      logicalPath: "workspace/raw/processed/summaries/.gitkeep",
    },
    {
      absolutePath: path.join(paths.workspaceRoot, "reviews", "pending", ".gitkeep"),
      logicalPath: "workspace/reviews/pending/.gitkeep",
    },
    {
      absolutePath: path.join(paths.workspaceRoot, "reviews", "approved", ".gitkeep"),
      logicalPath: "workspace/reviews/approved/.gitkeep",
    },
    {
      absolutePath: path.join(paths.workspaceRoot, "reviews", "rejected", ".gitkeep"),
      logicalPath: "workspace/reviews/rejected/.gitkeep",
    },
    {
      absolutePath: path.join(paths.workspaceRoot, "audits", ".gitkeep"),
      logicalPath: "workspace/audits/.gitkeep",
    },
  ];
}

function buildDefaultConfigContextPacks(title: string, titles: ReturnType<typeof buildSurfaceTitleBundle>) {
  const explainPack: TopicBootstrapContextPack = {
    title: `Explain ${title}`,
    useWhen: `you want the smallest durable starter bundle that explains what ${title} is and what still feels unsettled`,
    load: [title, titles.currentTensions, titles.maintenanceWatchpoints],
    optional: [titles.readingPaths, titles.openQuestions],
    keepActive: [],
    walkOrder: [],
  };

  const provenancePack: TopicBootstrapContextPack = {
    title: "Provenance And Review",
    useWhen: "you want to inspect what entered the topic, where later summaries will land, and how future review output should be interpreted",
    load: [title, "Corpus Atlas", "Review History", "Audit Atlas"],
    optional: ["Processed Source Atlas", "Summary Atlas"],
    keepActive: [],
    walkOrder: [
      `Start at ${wikiLink(title)}.`,
      "Open [[Corpus Atlas]] to inspect the bounded corpus.",
      "Use [[Review History]] and [[Audit Atlas]] to understand where later maintenance work should land.",
    ],
  };

  const maintenancePack: TopicBootstrapContextPack = {
    title: "Maintenance Triage",
    useWhen: "you are resuming work and want the smallest bundle that tells you what to read, what to revisit, and what might deserve synthesis next",
    load: [
      titles.maintenanceRhythm,
      titles.currentTensions,
      titles.openQuestions,
      titles.operationalNote,
    ],
    optional: [titles.maintenanceWatchpoints, titles.readingPaths],
    keepActive: [
      "What changed enough to alter the next reading pass?",
      "Which context pack is stale or too broad?",
      "Which open question is closest to becoming a durable synthesis?",
    ],
    walkOrder: [],
  };

  return [explainPack, provenancePack, maintenancePack];
}

function buildDefaultResearchQuestions(
  title: string,
  titles: ReturnType<typeof buildSurfaceTitleBundle>,
): ResearchQuestionSeed[] {
  return [
    {
      id: slugifyTitle(`${title}-canonical-boundary`) || "canonical-boundary",
      question: `Which claims are already stable enough to keep in ${title}'s canonical pages instead of working notes?`,
      summary:
        "This question decides what can leave the working layer and become durable knowledge without overclaiming too early.",
      status: "active",
      priority: "high",
      whyNow:
        "It is the shortest path from starter scaffolding to a topic that actually carries stable knowledge.",
      contextPackTitle: `Explain ${title}`,
      supportingContextPackTitles: ["Provenance And Review"],
      relatedPages: [title, titles.currentTensions, titles.openQuestions, titles.readingPaths],
      relatedTensions: [
        "Fast orientation versus premature certainty.",
        "Durable canonical pages versus still-working assumptions.",
      ],
      relatedWatchpoints: [titles.maintenanceWatchpoints],
      evidenceToAdvance: [
        "A claim keeps reappearing across the bounded corpus with compatible framing.",
      ],
      sourceGaps: [],
      synthesizeInto: `${title} scope and boundary map`,
      canonicalTargetTitle: null,
      reopenTriggers: [
        "New source intake weakens the current canonical framing.",
      ],
      provenanceNotes: [
        "Start from the canonical entry page, then reopen Provenance And Review if the claim set still feels thin.",
      ],
    },
    {
      id: slugifyTitle(`${title}-monitoring-signals`) || "monitoring-signals",
      question: "Which monitoring signals should graduate from scattered concern into explicit watchpoints?",
      summary:
        "This question keeps the maintenance surface honest by forcing repeated operational concerns into visible watch logic.",
      status: "waiting-for-sources",
      priority: "medium",
      whyNow:
        "A topic becomes resumable only when monitoring signals stop living as vague anxiety inside prose.",
      contextPackTitle: "Maintenance Triage",
      supportingContextPackTitles: ["Provenance And Review"],
      relatedPages: [
        titles.maintenanceWatchpoints,
        titles.openQuestions,
        titles.maintenanceRhythm,
        titles.operationalNote,
      ],
      relatedTensions: ["Durable canonical pages versus still-working assumptions."],
      relatedWatchpoints: [titles.maintenanceWatchpoints],
      evidenceToAdvance: [
        "The same watchpoint keeps changing maintenance order and deserves durable synthesis treatment.",
      ],
      sourceGaps: [
        "The topic still needs repeated evidence that the same signal changes operator behavior more than once.",
      ],
      synthesizeInto: null,
      canonicalTargetTitle: null,
      reopenTriggers: [
        "A new audit or review pass changes what the topic should monitor next.",
      ],
      provenanceNotes: [
        "Use Maintenance Triage to see which signals keep returning before they become durable watchpoints.",
      ],
    },
    {
      id: slugifyTitle(`${title}-next-synthesis`) || "next-synthesis",
      question: "Which open question is closest to becoming a durable synthesis next?",
      summary:
        "This question keeps the topic moving by tying context packs, tensions, and watchpoints to the next real synthesis candidate.",
      status: "ready-for-synthesis",
      priority: "medium",
      whyNow:
        "Without an explicit promotion question, starter topics stay organized but fail to graduate into stronger knowledge objects.",
      contextPackTitle: "Maintenance Triage",
      supportingContextPackTitles: [`Explain ${title}`],
      relatedPages: [titles.maintenanceRhythm, titles.currentTensions, titles.openQuestions],
      relatedTensions: ["Compact context packs versus full provenance inspection."],
      relatedWatchpoints: [titles.maintenanceWatchpoints],
      evidenceToAdvance: [
        "A context pack can answer the same question reliably without reopening the full graph.",
      ],
      sourceGaps: [],
      synthesizeInto: `${title} maintenance triggers`,
      canonicalTargetTitle: null,
      reopenTriggers: [
        "Maintenance order changes enough that a different synthesis candidate becomes the best next move.",
      ],
      provenanceNotes: [
        "Use Maintenance Triage and the open-question page together to decide which synthesis candidate is really ready.",
      ],
    },
  ];
}

function buildDefaultResearchSessions(params: {
  title: string;
  titles: ReturnType<typeof buildSurfaceTitleBundle>;
  researchQuestions: ResearchQuestionSeed[];
  corpusFiles: TopicBootstrapCorpusFile[];
  seedTimestamp: string;
}): ResearchSessionSeed[] {
  const [boundaryQuestion, monitoringQuestion, synthesisQuestion] = params.researchQuestions;
  const sourceTitles = params.corpusFiles.map((file) => file.title);

  return [
    {
      id: slugifyTitle(`${params.title}-boundary-session`) || "boundary-session",
      questionId: boundaryQuestion?.id ?? "canonical-boundary",
      title: `Ground the canonical boundary for ${params.title}`,
      goal: "Decide which starter claims are stable enough to sit in the canonical layer without hiding live uncertainty.",
      summary:
        "This completed orientation pass tightened the durable story, linked it back to the tension surface, and left the still-provisional claims in the working layer instead of the entry page.",
      status: "completed",
      priority: boundaryQuestion?.priority ?? "high",
      sessionDate: offsetIsoTimestamp(params.seedTimestamp, 1),
      loadedContextPackTitles: [`Explain ${params.title}`],
      supportingContextPackTitles: ["Provenance And Review"],
      relevantPages: [
        params.title,
        params.titles.currentTensions,
        params.titles.openQuestions,
        params.titles.readingPaths,
      ],
      relevantSources: sourceTitles.slice(0, 2),
      draftConclusion:
        "The canonical entry can safely hold the shortest stable framing, but the uncertainty about operating pressure still belongs in the current-tensions and open-questions surfaces.",
      evidenceGained: [
        "The same durable framing already shows up across the starter corpus without direct conflict.",
        "The tension surface provides a cleaner place for unresolved trade-offs than the canonical entry page.",
      ],
      remainingUncertainty: [
        "The topic still needs a stronger scope-and-boundary synthesis before the first canonical page can become more specific.",
      ],
      recommendedNextStep:
        "Keep the canonical entry compact, then use the maintenance rhythm to decide which synthesis candidate should harden the next layer.",
      outcome: "updated-canonical",
      synthesisTitle: null,
      archiveTitle: null,
      canonicalUpdateTitle: params.title,
      maintenanceUpdateTitles: [params.titles.openQuestions, params.titles.maintenanceRhythm],
      questionStatusChange: boundaryQuestion
        ? {
            from: "open",
            to: boundaryQuestion.status,
            reason:
              "The first bounded pass produced a stable enough canonical framing to move this question from generic starter uncertainty into active canonical maintenance.",
          }
        : null,
      resumeNotes: [
        "If new source intake weakens the canonical boundary, reopen this question before editing the entry page directly.",
      ],
    },
    {
      id: slugifyTitle(`${params.title}-next-synthesis-session`) || "next-synthesis-session",
      questionId: synthesisQuestion?.id ?? "next-synthesis",
      title: `Promote the next synthesis for ${params.title}`,
      goal: "Use the smallest useful bundle to decide which unresolved thread is actually ready to become durable synthesis.",
      summary:
        "This active session keeps the next synthesis candidate narrow so the topic can advance without reopening the full graph every time.",
      status: "active",
      priority: synthesisQuestion?.priority ?? "medium",
      sessionDate: offsetIsoTimestamp(params.seedTimestamp, 5),
      loadedContextPackTitles: ["Maintenance Triage"],
      supportingContextPackTitles: [`Explain ${params.title}`],
      relevantPages: [
        params.titles.maintenanceRhythm,
        params.titles.currentTensions,
        params.titles.openQuestions,
      ],
      relevantSources: sourceTitles.slice(0, 1),
      draftConclusion:
        "The most likely next durable move is still a synthesis, but the pass should stay focused on the single highest-leverage candidate rather than broadening scope.",
      evidenceGained: [
        "The maintenance rhythm and open-question surfaces already converge on a small set of promotion candidates.",
      ],
      remainingUncertainty: [
        "The topic still needs one cleaner decision about which candidate should harden first.",
      ],
      recommendedNextStep:
        "Finish this pass by choosing one synthesis candidate, then update the maintenance rhythm and open-question note together.",
      outcome: null,
      synthesisTitle: synthesisQuestion?.synthesizeInto ?? null,
      archiveTitle: null,
      canonicalUpdateTitle: null,
      maintenanceUpdateTitles: [params.titles.maintenanceRhythm, params.titles.openQuestions],
      questionStatusChange: null,
      resumeNotes: [
        "Reload Maintenance Triage before reopening provenance.",
        "If the candidate still feels fuzzy after this pass, downgrade it instead of forcing synthesis prematurely.",
      ],
    },
    {
      id: slugifyTitle(`${params.title}-watchpoint-session`) || "watchpoint-session",
      questionId: monitoringQuestion?.id ?? "monitoring-signals",
      title: `Collect repeat watch signals for ${params.title}`,
      goal: "Decide whether repeated operational concerns deserve durable watchpoint treatment or should remain provisional.",
      summary:
        "This queued session keeps the monitoring question honest by waiting for repeated evidence instead of promoting every starter concern into a watchpoint too early.",
      status: "queued",
      priority: monitoringQuestion?.priority ?? "medium",
      sessionDate: offsetIsoTimestamp(params.seedTimestamp, 9),
      loadedContextPackTitles: ["Maintenance Triage"],
      supportingContextPackTitles: ["Provenance And Review"],
      relevantPages: [
        params.titles.maintenanceWatchpoints,
        params.titles.operationalNote,
        params.titles.maintenanceRhythm,
      ],
      relevantSources: sourceTitles.slice(1, 3),
      draftConclusion:
        "The topic should not yet promote scattered starter concerns into durable watchpoints without more repeated operating evidence.",
      evidenceGained: [],
      remainingUncertainty: [
        "The starter corpus is still too small to prove that the same signal changes operator behavior more than once.",
      ],
      recommendedNextStep:
        "Wait for another source, review, or audit pass, then revisit whether the same monitoring signal keeps reshaping next work.",
      outcome: null,
      synthesisTitle: null,
      archiveTitle: null,
      canonicalUpdateTitle: null,
      maintenanceUpdateTitles: [params.titles.maintenanceRhythm],
      questionStatusChange: null,
      resumeNotes: [
        "Do not promote this into a durable watchpoint until the same signal recurs across more than one pass.",
      ],
    },
  ];
}

function buildSurfaceTitleBundle(title: string) {
  return {
    index: `${title} Index`,
    readingPaths: `${title} reading paths`,
    currentTensions: `${title} current tensions`,
    openQuestions: `${title} open questions`,
    maintenanceWatchpoints: `${title} maintenance watchpoints`,
    maintenanceRhythm: `${title} maintenance rhythm`,
    operationalNote: `Note: What should I revisit next for ${title}`,
  };
}

export function createDefaultTopicBootstrapConfig({
  slug,
  title,
  aliases = [],
  description,
  seedTimestamp,
  corpusFiles = [],
}: CreateDefaultTopicBootstrapConfigInput): TopicBootstrapConfig {
  const normalizedTitle = title.trim();
  const normalizedSlug = slug.trim() || slugifyTitle(normalizedTitle);

  if (!normalizedSlug) {
    throw new Error("Could not derive a valid topic slug.");
  }

  const surfaceTitles = buildSurfaceTitleBundle(normalizedTitle);
  const sourceFileNames = corpusFiles.map((file) => file.fileName);
  const contextPacks = buildDefaultConfigContextPacks(normalizedTitle, surfaceTitles);
  const generatedAt = ensureIsoTimestamp(seedTimestamp ?? new Date().toISOString());
  const researchQuestions = buildDefaultResearchQuestions(normalizedTitle, surfaceTitles);
  const researchSessions = buildDefaultResearchSessions({
    title: normalizedTitle,
    titles: surfaceTitles,
    researchQuestions,
    corpusFiles,
    seedTimestamp: generatedAt,
  });
  const requiredContextPackTitles = buildRequiredContextPacks(normalizedTitle);

  return topicBootstrapConfigSchema.parse({
    schemaVersion: 1,
    topic: {
      slug: normalizedSlug,
      title: normalizedTitle,
      aliases,
      description:
        description ??
        `A structured starter knowledge workspace for ${normalizedTitle}.`,
      seedTimestamp: generatedAt,
    },
    layerModel: {
      canonical: {
        root: "workspace/wiki",
        role: "Durable canonical pages and maintenance syntheses live here. This remains the source-of-truth layer for the topic.",
      },
      working: {
        root: "workspace/wiki + workspace/reviews + workspace/audits",
        role: "Working notes, maintenance sequencing, review artifacts, and audit follow-ups stay visible here so the topic can be resumed without guesswork.",
      },
      projection: {
        root: "obsidian-vault",
        role: "The Obsidian projection is an additive working layer for maps of content, compact bundles, and day-to-day reading. It is not the truth layer.",
      },
    },
    corpus: {
      root: "source-corpus",
      notes: buildDefaultCorpusNotes(normalizedTitle, corpusFiles),
      files: corpusFiles,
    },
    surfaces: {
      indexTitle: surfaceTitles.index,
      starterPages: [
        {
          title: normalizedTitle,
          type: "topic",
          summary: `${normalizedTitle} is the canonical entry page for this topic bootstrap. Use it to record the shortest durable explanation of what the bounded corpus currently seems to say.`,
          purpose: "The canonical entry page for the topic bootstrap.",
          role: "The durable entry point for first-pass understanding.",
          aliases,
          tags: [normalizedSlug, "bootstrap", "entry-point", "topic"],
          sourceFiles: sourceFileNames,
          relatedPages: [
            surfaceTitles.currentTensions,
            surfaceTitles.openQuestions,
            surfaceTitles.maintenanceWatchpoints,
            surfaceTitles.maintenanceRhythm,
            surfaceTitles.readingPaths,
          ],
          nextSteps: [
            `Use ${wikiLink(surfaceTitles.currentTensions)} to keep live uncertainty visible instead of hiding it in the article layer.`,
            `Use ${wikiLink(surfaceTitles.readingPaths)} to keep the first note bundles compact and reusable.`,
          ],
          sections: [
            {
              heading: "Why this topic matters",
              lines: [
                `This page should become the shortest durable explanation of ${normalizedTitle} once the corpus has been reviewed and the strongest claims have stabilized.`,
              ],
            },
            {
              heading: "Starter boundaries",
              lines: [
                "Keep the first pass bounded. A small, explicit corpus produces better starter pages than a broad pile of undifferentiated intake.",
                "Treat this page as durable knowledge, not as the place where unresolved tensions or maintenance sequencing should accumulate.",
              ],
            },
            {
              heading: "Evidence to strengthen next",
              lines: [
                "Promote only the highest-confidence recurring claims into this page.",
                "Leave disputes, unresolved questions, and watch logic in the dedicated working surfaces until they stabilize.",
              ],
            },
          ],
        },
      ],
      readingPaths: {
        title: surfaceTitles.readingPaths,
        purpose: "A synthesis that organizes the smallest useful note bundles for orientation, maintenance, provenance tracing, and context loading.",
        role: "The bundle-selection guide.",
        revisitCadence: "Refresh whenever the smallest useful bundle changes.",
        refreshTriggers: [
          "A new canonical page becomes essential to first-pass understanding.",
          "A context pack grows stale or too broad.",
        ],
      },
      currentTensions: {
        title: surfaceTitles.currentTensions,
        purpose: "A synthesis that keeps active trade-offs visible instead of hiding them inside neutral articles.",
        role: "The live-uncertainty surface.",
        revisitCadence: "Refresh whenever new evidence changes practical risk or ambiguity.",
        refreshTriggers: [
          "A source file changes the current framing of the topic.",
          "A recurring disagreement belongs in a durable tension instead of scattered notes.",
        ],
      },
      openQuestions: {
        title: surfaceTitles.openQuestions,
        purpose: "A working note for unresolved questions that should drive the next reading pass.",
        role: "The unresolved-work queue.",
        revisitCadence: "Refresh after every new source batch, review pass, or audit.",
        refreshTriggers: [
          "A question becomes answerable enough to promote into synthesis.",
          "A new source exposes a gap in the current article set.",
        ],
      },
      maintenanceWatchpoints: {
        title: surfaceTitles.maintenanceWatchpoints,
        purpose: "A synthesis that turns the canonical pages into an operator-facing monitoring surface.",
        role: "The operational monitoring synthesis.",
        revisitCadence: "Refresh when maintenance posture, operating assumptions, or monitoring logic changes.",
        refreshTriggers: [
          "A recurring issue changes what needs routine monitoring.",
          "A context pack or reading path needs escalation into durable watch logic.",
        ],
      },
      maintenanceRhythm: {
        title: surfaceTitles.maintenanceRhythm,
        purpose: "A maintenance map that decides revisit order, context-pack refreshes, and synthesis candidates.",
        role: "The daily maintenance control surface.",
        revisitCadence: "Review at the start of each maintenance pass.",
        refreshTriggers: [
          "An audit finding changes revisit order.",
          "A context pack or open question becomes stale enough to reshape next work.",
        ],
      },
      operationalNote: {
        title: surfaceTitles.operationalNote,
        type: "note",
        summary: `This starter operational note keeps the next reading pass concrete. It should stay short, grounded, and closely tied to the maintenance loop for ${normalizedTitle}.`,
        purpose: "A working operational note that keeps the next-pass checklist visible.",
        role: "The small operational handoff note.",
        tags: [normalizedSlug, "bootstrap", "operational-note"],
        sourceFiles: sourceFileNames,
        relatedPages: [
          surfaceTitles.maintenanceWatchpoints,
          surfaceTitles.maintenanceRhythm,
          surfaceTitles.openQuestions,
        ],
        nextSteps: [
          `Refresh this note after updating ${wikiLink(surfaceTitles.maintenanceWatchpoints)}.`,
          `If the same checklist item keeps recurring, promote it into ${wikiLink(surfaceTitles.maintenanceRhythm)} or a durable synthesis candidate.`,
        ],
        sections: [
          {
            heading: "Current checklist",
            lines: [
              "Keep the next reading pass narrow and explicit.",
              "Check whether the bounded corpus still supports the current starter framing.",
              "Promote repeated operational concerns into maintenance watchpoints instead of letting them drift between notes.",
            ],
          },
        ],
      },
      artifactSurfaces: GENERATED_ARTIFACT_NOTES.map((title) => ({
        title,
        purpose:
          title === "Corpus Atlas"
            ? "The bounded source intake surface."
            : title === "Processed Source Atlas"
              ? "The normalized-source bridge between raw intake and later summaries."
              : title === "Summary Atlas"
                ? "The summary layer that will expose what the summarizer extracted before patch planning."
                : title === "Review History"
                  ? "The proposal and review layer that will preserve how the wiki mutated."
                  : "The audit layer that will expose structural weakness and freshness gaps.",
        role:
          title === "Corpus Atlas"
            ? "The raw source entry layer."
            : title === "Processed Source Atlas"
              ? "The cleaned-source layer."
              : title === "Summary Atlas"
                ? "The source-to-claim bridge."
                : title === "Review History"
                  ? "The mutation-gate history."
                  : "The maintenance-diagnostic layer.",
      })),
    },
    readingPasses: [
      {
        title: "Orientation pass",
        description: "Use this when you want the shortest durable explanation of the topic together with its live uncertainty.",
        steps: [normalizedTitle, surfaceTitles.currentTensions, surfaceTitles.maintenanceWatchpoints],
      },
      {
        title: "Maintenance pass",
        description: "Use this when deciding what should be revisited next without rereading the full topic.",
        steps: [
          surfaceTitles.maintenanceRhythm,
          surfaceTitles.openQuestions,
          surfaceTitles.operationalNote,
          surfaceTitles.maintenanceWatchpoints,
        ],
      },
      {
        title: "Provenance pass",
        description: "Use this when you need to inspect the bounded corpus and the future artifact trail instead of only reading the canonical pages.",
        steps: [normalizedTitle, "Corpus Atlas", "Processed Source Atlas", "Review History", "Audit Atlas"],
      },
    ],
    tensionsSummary:
      "The main starter tension is that a topic becomes most useful once the story has stabilized, but a bootstrap workspace must expose uncertainty honestly while the topic is still taking shape.",
    tensions: [
      "Fast orientation versus premature certainty.",
      "Compact context packs versus full provenance inspection.",
      "Durable canonical pages versus still-working assumptions.",
    ],
    tensionImportance: [
      "If uncertainty is hidden inside the canonical page, future readers will trust the article more than the evidence deserves.",
      "If every question requires reopening the whole graph, the workspace becomes too expensive to resume.",
      "If monitoring logic never graduates into durable syntheses, maintenance work dissolves into note sprawl.",
    ],
    openQuestionsSummary:
      "These are the starter questions that should guide the next reading pass and determine which pages deserve stronger durable treatment next.",
    openQuestions: [
      "Which claims are already stable enough to keep in the canonical entry page?",
      "Which bounded note bundle would reduce rereading the most?",
      "Which monitoring signals deserve promotion into a stronger synthesis next?",
    ],
    researchQuestions,
    researchSessions,
    resolutionSignals: [
      "A claim keeps reappearing across the bounded corpus with compatible framing.",
      "A context pack can answer the same question reliably without reopening the full graph.",
      "A watchpoint repeatedly changes the same decision and deserves durable synthesis treatment.",
    ],
    revisitQueue: [
      {
        title: surfaceTitles.currentTensions,
        why: "This is the fastest way to see whether the operating story moved.",
        trigger: "After any new source intake or recurring disagreement.",
      },
      {
        title: surfaceTitles.openQuestions,
        why: "This keeps unresolved work visible instead of dissolving into general backlog noise.",
        trigger: "After each reading pass or audit.",
      },
      {
        title: surfaceTitles.maintenanceRhythm,
        why: "This controls revisit order, context-pack refreshes, and next synthesis candidates.",
        trigger: "Before deciding what to reopen next.",
      },
    ],
    contextPackRefreshes: [
      {
        title: `Explain ${normalizedTitle}`,
        trigger: "the canonical entry page or tension framing changes",
        load: [normalizedTitle, surfaceTitles.currentTensions, surfaceTitles.maintenanceWatchpoints],
      },
      {
        title: "Maintenance Triage",
        trigger: "revisit order, open questions, or monitoring posture changes",
        load: [
          surfaceTitles.maintenanceRhythm,
          surfaceTitles.currentTensions,
          surfaceTitles.openQuestions,
          surfaceTitles.operationalNote,
        ],
      },
      {
        title: "Provenance And Review",
        trigger: "you need to inspect where future source summaries, reviews, or audits should land",
        load: [normalizedTitle, "Corpus Atlas", "Review History", "Audit Atlas"],
      },
    ],
    synthesisCandidates: [
      {
        title: `${normalizedTitle} scope and boundary map`,
        whyNow:
          "The starter corpus usually exposes what belongs inside the first durable story and what should remain outside it, but that boundary is not yet stable enough to stand alone.",
        load: [normalizedTitle, surfaceTitles.currentTensions, surfaceTitles.openQuestions],
      },
      {
        title: `${normalizedTitle} maintenance triggers`,
        whyNow:
          "Maintenance rhythm, watchpoints, and the operational note often imply a stronger reusable checklist before the topic has enough evidence for a durable synthesis.",
        load: [
          surfaceTitles.maintenanceRhythm,
          surfaceTitles.maintenanceWatchpoints,
          surfaceTitles.operationalNote,
        ],
      },
    ],
    auditActions: [
      {
        signal: "A coverage audit flags a thin or weakly linked area.",
        nextSurface: surfaceTitles.maintenanceRhythm,
        action: "decide whether the gap belongs in the revisit queue, the open-question note, or a new synthesis candidate.",
      },
      {
        signal: "A review concern keeps recurring across different additions.",
        nextSurface: surfaceTitles.currentTensions,
        action: "promote the disagreement into a durable tension instead of letting it disappear into proposal history.",
      },
      {
        signal: "A watchpoint repeatedly changes what you read next.",
        nextSurface: surfaceTitles.maintenanceWatchpoints,
        action: "rewrite the monitoring synthesis first, then update the operational note only if the checklist actually changed.",
      },
    ],
    contextPacks,
    artifactLadder: buildDefaultArtifactLadder(normalizedTitle),
    validation: {
      requiredStarterQualityBar: TOPIC_BOOTSTRAP_QUALITY_FLAGS,
      requiredAtlasNotes: [...REQUIRED_ATLAS_NOTES],
      requiredContextPackTitles,
      keyInspectionPaths: [
        "workspace/wiki/index.md",
        getWikiRelativePath("topic", slugifyTitle(normalizedTitle) || normalizedSlug),
        "obsidian-vault/00 Atlas/Start Here.md",
        "obsidian-vault/00 Atlas/Topic Map.md",
        "obsidian-vault/00 Atlas/Maintenance Rhythm.md",
      ],
    },
  });
}

function buildSurfaceTemplate(surface: TopicBootstrapSurface): KnowledgeSurfaceTemplate {
  return {
    title: surface.title,
    purpose: surface.purpose,
    role: surface.role,
    surfaceKind: "working",
    revisitCadence: surface.revisitCadence,
    refreshTriggers: surface.refreshTriggers,
  };
}

function buildKnowledgeMethodData(config: TopicBootstrapConfig): KnowledgeMethodTemplateData {
  const starterPages = config.surfaces.starterPages.map((page) => ({
    title: page.title,
    purpose: page.purpose,
    role: page.role,
    surfaceKind: "canonical" as const,
    revisitCadence: page.revisitCadence,
    refreshTriggers: page.refreshTriggers,
  }));

  return {
    workspaceFlavor: "starter-topic",
    topicTitle: config.topic.title,
    indexTitle: config.surfaces.indexTitle,
    readingPathsTitle: config.surfaces.readingPaths.title,
    currentTensionsTitle: config.surfaces.currentTensions.title,
    openQuestionsTitle: config.surfaces.openQuestions.title,
    maintenanceWatchpointsTitle: config.surfaces.maintenanceWatchpoints.title,
    maintenanceRhythmTitle: config.surfaces.maintenanceRhythm.title,
    archivedNoteTitle: config.surfaces.operationalNote.title,
    canonicalSurfaces: [
      ...starterPages,
      {
        title: config.surfaces.maintenanceWatchpoints.title,
        purpose: config.surfaces.maintenanceWatchpoints.purpose,
        role: config.surfaces.maintenanceWatchpoints.role,
        surfaceKind: "canonical",
        revisitCadence: config.surfaces.maintenanceWatchpoints.revisitCadence,
        refreshTriggers: config.surfaces.maintenanceWatchpoints.refreshTriggers,
      },
    ],
    workingSurfaces: [
      { ...buildSurfaceTemplate(config.surfaces.currentTensions), surfaceKind: "working" },
      { ...buildSurfaceTemplate(config.surfaces.openQuestions), surfaceKind: "working" },
      { ...buildSurfaceTemplate(config.surfaces.maintenanceRhythm), surfaceKind: "working" },
      { ...buildSurfaceTemplate(config.surfaces.readingPaths), surfaceKind: "working" },
    ],
    monitoringSurfaces: [
      {
        title: config.surfaces.maintenanceWatchpoints.title,
        purpose: config.surfaces.maintenanceWatchpoints.purpose,
        role: config.surfaces.maintenanceWatchpoints.role,
        surfaceKind: "monitoring",
        revisitCadence: config.surfaces.maintenanceWatchpoints.revisitCadence,
        refreshTriggers: config.surfaces.maintenanceWatchpoints.refreshTriggers,
      },
      {
        title: config.surfaces.operationalNote.title,
        purpose: config.surfaces.operationalNote.purpose,
        role: config.surfaces.operationalNote.role,
        surfaceKind: "monitoring",
        revisitCadence: config.surfaces.operationalNote.revisitCadence,
        refreshTriggers: config.surfaces.operationalNote.refreshTriggers,
      },
    ],
    artifactSurfaces: config.surfaces.artifactSurfaces.map((surface) => ({
      title: surface.title,
      purpose: surface.purpose,
      role: surface.role,
      surfaceKind: "artifact",
    })),
    readingPasses: config.readingPasses,
    tensionsSummary: config.tensionsSummary,
    tensions: config.tensions,
    tensionImportance: config.tensionImportance,
    openQuestionsSummary: config.openQuestionsSummary,
    openQuestions: config.openQuestions,
    researchQuestions: config.researchQuestions,
    researchSessions: config.researchSessions,
    resolutionSignals: config.resolutionSignals,
    revisitQueue: config.revisitQueue,
    contextPackRefreshes: config.contextPackRefreshes,
    synthesisCandidates: config.synthesisCandidates,
    auditActions: config.auditActions,
    contextPacks: config.contextPacks,
    corpusNotes: config.corpus.notes,
    artifactLadder: config.artifactLadder,
  };
}

function buildCorpusFileMap(config: TopicBootstrapConfig) {
  return new Map(config.corpus.files.map((file) => [file.fileName, file]));
}

function buildPageMarkdown(page: TopicBootstrapPage) {
  const lines = [`# ${page.title}`, "", "## Summary", "", page.summary, ""];

  for (const section of page.sections) {
    lines.push(`## ${section.heading}`, "", ...section.lines, "");
  }

  if (page.relatedPages.length > 0) {
    lines.push(
      "## Related pages",
      "",
      ...page.relatedPages.map((title) => `- ${wikiLink(title)}`),
      "",
    );
  }

  if (page.nextSteps.length > 0) {
    lines.push(
      "## Bootstrap next steps",
      "",
      ...page.nextSteps.map((step) => `- ${step}`),
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function buildManagedPage(params: {
  title: string;
  type: WikiPageType;
  body: string;
  aliases?: string[];
  tags?: string[];
  sourceRefs?: string[];
  knowledgeRole: string;
  surfaceKind: string;
  revisitCadence?: string;
  refreshTriggers?: string[];
  managedRole: TopicBootstrapManifestPage["managedRole"];
  seedTimestamp: string;
  topicSlug: string;
  status?: string;
  reviewStatus?: string;
  confidence?: number;
}) {
  const slug = params.type === "index" ? "index" : slugifyTitle(params.title);

  if (!slug) {
    throw new Error(`Could not derive a slug for ${params.title}.`);
  }

  const body = normalizeTextFileContent(params.body);
  const pageRefs = unique(extractWikiLinkTargets(body));
  const relativePath = getWikiRelativePath(params.type, slug);
  const frontmatter = omitUndefined({
    title: params.title,
    slug,
    type: params.type,
    created_at: params.seedTimestamp,
    updated_at: params.seedTimestamp,
    status: params.status ?? "active",
    aliases: params.aliases ?? [],
    tags: unique([...(params.tags ?? []), "bootstrap-managed"]),
    source_refs: unique(params.sourceRefs ?? []),
    page_refs: pageRefs,
    confidence: params.confidence ?? (params.type === "index" ? 1 : 0.55),
    review_status: params.reviewStatus ?? "bootstrap",
    knowledge_role: params.knowledgeRole,
    surface_kind: params.surfaceKind,
    revisit_cadence: params.revisitCadence,
    refresh_triggers: params.refreshTriggers ?? [],
    bootstrap_topic_slug: params.topicSlug,
    managed_by: "topic-bootstrap-v1",
  }) as WikiFrontmatter;
  const rawContent = serializeWikiDocument(
    frontmatter,
    body,
  );

  return {
    title: params.title,
    type: params.type,
    managedRole: params.managedRole,
    relativePath,
    rawContent,
  } satisfies ManagedWikiPage;
}

function buildStarterPages(config: TopicBootstrapConfig, methodPack: ReturnType<typeof buildKnowledgeMethodPack>) {
  const seedTimestamp = config.topic.seedTimestamp;
  const corpusFileMap = buildCorpusFileMap(config);
  const corpusRefsFor = (fileNames: string[]) =>
    unique(
      fileNames
        .filter((fileName) => corpusFileMap.has(fileName))
        .map((fileName) => corpusSourceRef(fileName)),
    );

  const pages: ManagedWikiPage[] = config.surfaces.starterPages.map((page) =>
    buildManagedPage({
      title: page.title,
      type: page.type,
      body: buildPageMarkdown(page),
      aliases: page.aliases,
      tags: page.tags,
      sourceRefs: corpusRefsFor(page.sourceFiles),
      knowledgeRole: page.role,
      surfaceKind: "canonical",
      revisitCadence: page.revisitCadence,
      refreshTriggers: page.refreshTriggers,
      managedRole: "canonical",
      seedTimestamp,
      topicSlug: config.topic.slug,
    }),
  );

  pages.push(
    buildManagedPage({
      title: config.surfaces.indexTitle,
      type: "index",
      body: methodPack.wiki.index,
      aliases: [
        `${config.topic.title} MOC`,
        `${config.topic.title} map of content`,
      ],
      tags: [config.topic.slug, "workspace", "navigation", "start-here"],
      sourceRefs: config.corpus.files.map((file) => corpusSourceRef(file.fileName)),
      knowledgeRole: "The atlas and start-here surface for the topic bootstrap.",
      surfaceKind: "navigation",
      revisitCadence: "Refresh when the recommended entry path, maintenance order, or key-page set changes.",
      refreshTriggers: [
        "A new working surface becomes part of the default path.",
        "Maintenance or context-pack guidance changes.",
      ],
      managedRole: "navigation",
      seedTimestamp,
      topicSlug: config.topic.slug,
      reviewStatus: "approved",
      confidence: 1,
    }),
  );

  pages.push(
    buildManagedPage({
      title: config.surfaces.readingPaths.title,
      type: "synthesis",
      body: methodPack.wiki.readingPaths,
      tags: [config.topic.slug, "reading-paths", "bootstrap"],
      sourceRefs: config.corpus.files.map((file) => corpusSourceRef(file.fileName)),
      knowledgeRole: config.surfaces.readingPaths.role,
      surfaceKind: "working",
      revisitCadence: config.surfaces.readingPaths.revisitCadence,
      refreshTriggers: config.surfaces.readingPaths.refreshTriggers,
      managedRole: "working",
      seedTimestamp,
      topicSlug: config.topic.slug,
    }),
  );

  pages.push(
    buildManagedPage({
      title: config.surfaces.currentTensions.title,
      type: "synthesis",
      body: methodPack.wiki.currentTensions,
      tags: [config.topic.slug, "tensions", "bootstrap"],
      sourceRefs: config.corpus.files.map((file) => corpusSourceRef(file.fileName)),
      knowledgeRole: config.surfaces.currentTensions.role,
      surfaceKind: "working",
      revisitCadence: config.surfaces.currentTensions.revisitCadence,
      refreshTriggers: config.surfaces.currentTensions.refreshTriggers,
      managedRole: "working",
      seedTimestamp,
      topicSlug: config.topic.slug,
    }),
  );

  pages.push(
    buildManagedPage({
      title: config.surfaces.openQuestions.title,
      type: "note",
      body: methodPack.wiki.openQuestions,
      tags: [config.topic.slug, "open-questions", "bootstrap"],
      sourceRefs: config.corpus.files.map((file) => corpusSourceRef(file.fileName)),
      knowledgeRole: config.surfaces.openQuestions.role,
      surfaceKind: "working",
      revisitCadence: config.surfaces.openQuestions.revisitCadence,
      refreshTriggers: config.surfaces.openQuestions.refreshTriggers,
      managedRole: "working",
      seedTimestamp,
      topicSlug: config.topic.slug,
    }),
  );

  pages.push(
    buildManagedPage({
      title: config.surfaces.maintenanceWatchpoints.title,
      type: "synthesis",
      body: methodPack.wiki.maintenanceWatchpoints,
      tags: [config.topic.slug, "watchpoints", "bootstrap"],
      sourceRefs: config.corpus.files.map((file) => corpusSourceRef(file.fileName)),
      knowledgeRole: config.surfaces.maintenanceWatchpoints.role,
      surfaceKind: "monitoring",
      revisitCadence: config.surfaces.maintenanceWatchpoints.revisitCadence,
      refreshTriggers: config.surfaces.maintenanceWatchpoints.refreshTriggers,
      managedRole: "monitoring",
      seedTimestamp,
      topicSlug: config.topic.slug,
    }),
  );

  pages.push(
    buildManagedPage({
      title: config.surfaces.maintenanceRhythm.title,
      type: "synthesis",
      body: methodPack.wiki.maintenanceRhythm,
      tags: [config.topic.slug, "maintenance-rhythm", "bootstrap"],
      sourceRefs: config.corpus.files.map((file) => corpusSourceRef(file.fileName)),
      knowledgeRole: config.surfaces.maintenanceRhythm.role,
      surfaceKind: "working",
      revisitCadence: config.surfaces.maintenanceRhythm.revisitCadence,
      refreshTriggers: config.surfaces.maintenanceRhythm.refreshTriggers,
      managedRole: "working",
      seedTimestamp,
      topicSlug: config.topic.slug,
    }),
  );

  pages.push(
    buildManagedPage({
      title: config.surfaces.operationalNote.title,
      type: "note",
      body: buildPageMarkdown(config.surfaces.operationalNote),
      aliases: config.surfaces.operationalNote.aliases,
      tags: config.surfaces.operationalNote.tags,
      sourceRefs: corpusRefsFor(config.surfaces.operationalNote.sourceFiles),
      knowledgeRole: config.surfaces.operationalNote.role,
      surfaceKind: "monitoring",
      revisitCadence: config.surfaces.operationalNote.revisitCadence,
      refreshTriggers: config.surfaces.operationalNote.refreshTriggers,
      managedRole: "monitoring",
      seedTimestamp,
      topicSlug: config.topic.slug,
    }),
  );

  return pages;
}

function buildProjectedArticleNote(page: ManagedWikiPage): ManagedObsidianNote {
  const encodedTitle = JSON.stringify(page.title);

  return {
    title: page.title,
    relativePath: path.posix.join("10 Articles", `${obsidianFileName(page.title)}.md`),
    content: page.rawContent.replace(
      /^aliases:\n((?:  - .*\n)*)/m,
      (_match, aliasesBlock: string) => {
        if (
          aliasesBlock.includes(`- ${encodedTitle}\n`) ||
          aliasesBlock.includes(`- ${page.title}\n`) ||
          obsidianFileName(page.title) === page.title
        ) {
          return `aliases:\n${aliasesBlock}`;
        }

        return `aliases:\n${aliasesBlock}  - ${encodedTitle}\n`;
      },
    ),
    kind: "article",
  };
}

function buildArtifactAtlasNote(params: {
  config: TopicBootstrapConfig;
  title: string;
}) {
  const corpusBullets = params.config.corpus.files.map(
    (file) => `- \`${file.fileName}\`: ${file.description}`,
  );

  switch (params.title) {
    case "Corpus Atlas":
      return `# Corpus Atlas

## What enters this topic

${corpusBullets.join("\n")}

## How to use the corpus

- Start from [[${params.config.topic.title}]] and [[${params.config.surfaces.readingPaths.title}]] before reopening the raw corpus.
- Keep the corpus bounded and explicit so later summaries and reviews stay inspectable.
`;
    case "Processed Source Atlas":
      return `# Processed Source Atlas

## What this layer is for

- \`workspace/raw/processed/\` is where cleaned source files should land once import and normalization begin.
- This starter topic does not pretend those files already exist. It reserves the slot so future work has a predictable home.

## Next action

- When raw inputs are normalized, link the resulting files back to [[Artifact Map]] and [[${params.config.surfaces.readingPaths.title}]].
`;
    case "Summary Atlas":
      return `# Summary Atlas

## What this layer is for

- \`workspace/raw/processed/summaries/\` should hold source-summary artifacts once the summarizer is run.
- Keep summaries visible and small so later patch planning remains inspectable.

## Next action

- When summaries exist, use them to decide which questions can leave [[${params.config.surfaces.openQuestions.title}]] and become durable synthesis candidates.
`;
    case "Review History":
      return `# Review History

## What this layer is for

- \`workspace/reviews/\` is the mutation gate for the canonical wiki.
- Approved and rejected proposals should remain visible so future maintainers can see why the topic changed or did not change.

## Next action

- If the same review concern keeps returning, promote it into [[${params.config.surfaces.currentTensions.title}]] or [[${params.config.surfaces.openQuestions.title}]].
`;
    case "Audit Atlas":
      return `# Audit Atlas

## What this layer is for

- \`workspace/audits/\` is where structural checks should land once the topic starts evolving.
- Audits are only useful if they route back into durable working surfaces.

## Next action

- Land uncertainty in [[${params.config.surfaces.openQuestions.title}]].
- Land recurring trade-offs in [[${params.config.surfaces.currentTensions.title}]].
- Land sequencing changes in [[${params.config.surfaces.maintenanceRhythm.title}]].
`;
    default:
      return `# ${params.title}\n`;
  }
}

function buildObsidianNotes(config: TopicBootstrapConfig, pages: ManagedWikiPage[]) {
  const methodPack = buildKnowledgeMethodPack(buildKnowledgeMethodData(config));
  const notes: ManagedObsidianNote[] = [
    {
      title: "README",
      relativePath: "README.md",
      content: methodPack.obsidian.readme,
      kind: "readme",
    },
  ];

  for (const [title, content] of Object.entries(methodPack.obsidian.atlas)) {
    notes.push({
      title,
      relativePath: path.posix.join("00 Atlas", `${obsidianFileName(title)}.md`),
      content,
      kind: "atlas",
    });
  }

  for (const [title, content] of Object.entries(methodPack.obsidian.contextPacks)) {
    notes.push({
      title,
      relativePath: path.posix.join("05 Context Packs", `${obsidianFileName(title)}.md`),
      content,
      kind: "context-pack",
    });
  }

  for (const page of pages) {
    notes.push(buildProjectedArticleNote(page));
  }

  for (const title of GENERATED_ARTIFACT_NOTES) {
    const folder =
      title === "Corpus Atlas"
        ? "20 Sources"
        : title === "Processed Source Atlas"
          ? "25 Normalized Sources"
          : title === "Summary Atlas"
            ? "30 Summaries"
            : title === "Review History"
              ? "40 Reviews"
              : "50 Audits";

    notes.push({
      title,
      relativePath: path.posix.join(folder, `${obsidianFileName(title)}.md`),
      content: buildArtifactAtlasNote({ config, title }),
      kind: "artifact",
    });
  }

  notes.push({
    title: ".gitignore",
    relativePath: ".gitignore",
    content: ".obsidian/\nworkspace.json\n",
    kind: "artifact",
  });

  return notes;
}

function buildTopicReadme(config: TopicBootstrapConfig, paths: TopicBootstrapPaths) {
  const entryPage = config.surfaces.starterPages[0];

  return `# ${config.topic.title} Topic Bootstrap

This directory is a deterministic starter knowledge workspace for ${config.topic.title}. It turns the OpenClaw-derived method into a reusable topic bootstrap contract: bounded corpus, canonical wiki surfaces, maintenance surfaces, an Obsidian projection, starter context packs, and validation targets.

## What lives here

- \`topic.json\`: the topic bootstrap contract for this topic.
- \`source-corpus/\`: the bounded starter corpus.
- \`workspace/\`: the canonical wiki and future artifact roots. This remains the source of truth.
- \`obsidian-vault/\`: an additive working projection for Obsidian usage.
- \`manifest.json\`: the generated manifest for the starter bootstrap.
- \`starter-baseline.json\`: the deterministic baseline used by validation.
- \`evaluation/\`: heuristic maturity and quality reports written by \`topic:evaluate\`.

## Layer model

- Canonical: \`${config.layerModel.canonical.root}\` — ${config.layerModel.canonical.role}
- Working: \`${config.layerModel.working.root}\` — ${config.layerModel.working.role}
- Projection: \`${config.layerModel.projection.root}\` — ${config.layerModel.projection.role}

## Commands

\`\`\`bash
npm run topic:build -- --slug ${config.topic.slug}
npm run topic:validate -- --slug ${config.topic.slug}
npm run topic:evaluate -- --slug ${config.topic.slug}
\`\`\`

Rendered topic home:

\`\`\`text
/topics/${config.topic.slug}
\`\`\`

## What to inspect first

- \`workspace/wiki/index.md\`
- \`${getWikiRelativePath(entryPage.type, slugifyTitle(entryPage.title) || config.topic.slug)}\`
- \`workspace/${getWikiRelativePath("synthesis", slugifyTitle(config.surfaces.maintenanceRhythm.title) || "maintenance-rhythm").replace(/^wiki\//, "wiki/")}\`
- \`obsidian-vault/00 Atlas/Start Here.md\`
- \`obsidian-vault/00 Atlas/Topic Map.md\`
- \`obsidian-vault/00 Atlas/Maintenance Rhythm.md\`

## How to evolve this topic

1. Keep the corpus bounded and explicit in \`${path.relative(paths.topicRoot, paths.sourceCorpusRoot)}\`.
2. Add or refine starter pages in \`topic.json\` instead of editing managed files directly.
3. Use the maintenance surfaces to decide what should become durable synthesis next.
4. Once the topic matures, run the broader compile / review / ask / audit loops against the same canonical workspace model.

## Evaluation expectation

This bootstrap is meant to begin as a strong \`starter\` topic, not to pretend it is already mature.

Use \`npm run topic:evaluate -- --slug ${config.topic.slug}\` to verify:

- the starter surfaces are structurally useful
- the topic has not been over-promoted beyond its real workflow evidence
- the next upgrades are clear before deeper summarize / review / archive / audit work begins
`;
}

async function ensureTopicDirectories(paths: TopicBootstrapPaths) {
  for (const relativePath of [
    "",
    "source-corpus",
    "workspace/raw/inbox",
    "workspace/raw/processed/summaries",
    "workspace/reviews/pending",
    "workspace/reviews/approved",
    "workspace/reviews/rejected",
    "workspace/audits",
    "workspace/wiki/topics",
    "workspace/wiki/entities",
    "workspace/wiki/concepts",
    "workspace/wiki/timelines",
    "workspace/wiki/syntheses",
    "workspace/wiki/notes",
    "obsidian-vault/00 Atlas",
    "obsidian-vault/05 Context Packs",
    "obsidian-vault/10 Articles",
    "obsidian-vault/20 Sources",
    "obsidian-vault/25 Normalized Sources",
    "obsidian-vault/30 Summaries",
    "obsidian-vault/40 Reviews",
    "obsidian-vault/50 Audits",
  ]) {
    await fs.mkdir(path.join(paths.topicRoot, relativePath), { recursive: true });
  }

  await writeTextFile(path.join(paths.workspaceRoot, "raw", "inbox", ".gitkeep"), "");
  await writeTextFile(path.join(paths.workspaceRoot, "raw", "processed", ".gitkeep"), "");
  await writeTextFile(
    path.join(paths.workspaceRoot, "raw", "processed", "summaries", ".gitkeep"),
    "",
  );
  await writeTextFile(path.join(paths.workspaceRoot, "reviews", "pending", ".gitkeep"), "");
  await writeTextFile(path.join(paths.workspaceRoot, "reviews", "approved", ".gitkeep"), "");
  await writeTextFile(path.join(paths.workspaceRoot, "reviews", "rejected", ".gitkeep"), "");
  await writeTextFile(path.join(paths.workspaceRoot, "audits", ".gitkeep"), "");
}

async function loadTopicBootstrapConfig(paths: TopicBootstrapPaths) {
  const raw = await fs.readFile(paths.configPath, "utf8");
  return topicBootstrapConfigSchema.parse(JSON.parse(raw));
}

function buildManifest(params: {
  config: TopicBootstrapConfig;
  paths: TopicBootstrapPaths;
  pages: ManagedWikiPage[];
  obsidianNotes: ManagedObsidianNote[];
}) {
  const manifest = topicBootstrapManifestSchema.parse({
    schemaVersion: 1,
    generatedAt: params.config.topic.seedTimestamp,
    slug: params.config.topic.slug,
    title: params.config.topic.title,
    description: params.config.topic.description,
    seedTimestamp: params.config.topic.seedTimestamp,
    topicRoot: path.relative(params.paths.topicsRoot, params.paths.topicRoot).split(path.sep).join("/"),
    managedPaths: {
      configPath: "topic.json",
      readmePath: "README.md",
      manifestPath: "manifest.json",
      baselinePath: "starter-baseline.json",
      sourceCorpusRoot: "source-corpus",
      workspaceRoot: "workspace",
      obsidianVaultRoot: "obsidian-vault",
    },
    layers: params.config.layerModel,
    qualityBar: params.config.validation,
    corpusFiles: params.config.corpus.files,
    pages: params.pages.map((page) => ({
      title: page.title,
      type: page.type,
      path: page.relativePath,
      managedRole: page.managedRole,
    })),
    obsidianNotes: params.obsidianNotes.map((note) => ({
      title: note.title,
      path: note.relativePath,
      kind: note.kind,
    })),
    notes: {
      bootstrapMode: "deterministic starter bootstrap",
      canonicalSourceOfTruth: "workspace/wiki",
      projectionRole: "obsidian-vault is a working projection and not the source of truth",
    },
  });

  return manifest;
}

async function collectGeneratedEntries(
  paths: TopicBootstrapPaths,
  manifest: TopicBootstrapManifest,
) {
  const files = [
    {
      absolutePath: paths.configPath,
      logicalPath: "topic.json",
    },
    {
      absolutePath: paths.readmePath,
      logicalPath: "README.md",
    },
    {
      absolutePath: paths.manifestPath,
      logicalPath: "manifest.json",
    },
    ...manifest.pages.map((page) => ({
      absolutePath: path.join(paths.workspaceRoot, page.path),
      logicalPath: `workspace/${page.path}`,
    })),
    ...manifest.obsidianNotes.map((note) => ({
      absolutePath: path.join(paths.obsidianVaultRoot, note.path),
      logicalPath: `obsidian-vault/${note.path}`,
    })),
    ...buildManagedWorkspaceHelperFiles(paths),
  ];

  return collectSpecificHashEntries({
    topicRoot: paths.topicRoot,
    files,
  });
}

async function collectCorpusEntries(paths: TopicBootstrapPaths) {
  return (
    await collectHashEntries({
      root: paths.sourceCorpusRoot,
      logicalPrefix: "source-corpus",
    })
  ).sort((left, right) => left.logicalPath.localeCompare(right.logicalPath));
}

async function buildBaseline(params: {
  config: TopicBootstrapConfig;
  paths: TopicBootstrapPaths;
  manifest: TopicBootstrapManifest;
}) {
  return topicBootstrapBaselineSchema.parse({
    schemaVersion: 1,
    generatedAt: params.config.topic.seedTimestamp,
    seedTimestamp: params.config.topic.seedTimestamp,
    manifestLogicalPath: "manifest.json",
    entries: await collectGeneratedEntries(params.paths, params.manifest),
    corpusEntries: await collectCorpusEntries(params.paths),
  });
}

async function assertCorpusMatchesConfig(config: TopicBootstrapConfig, paths: TopicBootstrapPaths) {
  const actualFiles = await discoverCorpusFiles(paths.sourceCorpusRoot);
  const expectedFiles = [...config.corpus.files.map((file) => file.fileName)].sort();

  if (expectedFiles.length === 0) {
    throw new Error(
      `Topic "${config.topic.slug}" has no corpus files listed in topic.json. Add files to source-corpus/ and update the contract before building.`,
    );
  }

  if (JSON.stringify(actualFiles) !== JSON.stringify(expectedFiles)) {
    throw new Error(
      `Corpus files for "${config.topic.slug}" do not match topic.json.\nExpected: ${expectedFiles.join(", ")}\nActual: ${actualFiles.join(", ")}`,
    );
  }
}

async function buildTopicArtifacts(params: {
  config: TopicBootstrapConfig;
  paths: TopicBootstrapPaths;
}) {
  const methodPack = buildKnowledgeMethodPack(buildKnowledgeMethodData(params.config));
  const pages = buildStarterPages(params.config, methodPack);
  const obsidianNotes = buildObsidianNotes(params.config, pages);
  const manifest = buildManifest({
    config: params.config,
    paths: params.paths,
    pages,
    obsidianNotes,
  });
  await ensureTopicDirectories(params.paths);
  await writeTextFile(
    path.join(params.paths.sourceCorpusRoot, "README.md"),
    STARTER_PLACEHOLDER_README,
  );

  for (const page of pages) {
    await writeTextFile(
      path.join(params.paths.workspaceRoot, page.relativePath.replace(/^wiki\//, "wiki/")),
      page.rawContent,
    );
  }

  for (const note of obsidianNotes) {
    await writeTextFile(path.join(params.paths.obsidianVaultRoot, note.relativePath), note.content);
  }

  await writeJsonFile(params.paths.configPath, params.config);
  await writeJsonFile(params.paths.manifestPath, manifest);
  await writeTextFile(params.paths.readmePath, buildTopicReadme(params.config, params.paths));

  const baseline = await buildBaseline({
    config: params.config,
    paths: params.paths,
    manifest,
  });

  await writeJsonFile(params.paths.baselinePath, baseline);

  return {
    config: params.config,
    manifest,
    baseline,
    pages,
    obsidianNotes,
    paths: params.paths,
  } satisfies TopicBootstrapBuildArtifacts;
}

async function validateHeadings(params: {
  config: TopicBootstrapConfig;
  paths: TopicBootstrapPaths;
  manifest: TopicBootstrapManifest;
}) {
  for (const page of params.manifest.pages) {
    const absolutePath = path.join(params.paths.workspaceRoot, page.path);
    const raw = await fs.readFile(absolutePath, "utf8");

    if (!raw.includes(`# ${page.title}`)) {
      throw new Error(`Expected ${page.path} to contain title heading "${page.title}".`);
    }
  }

  const headingExpectations = [
    {
      path: path.join(params.paths.workspaceRoot, "wiki", "index.md"),
      headings: [
        "Overview",
        "Start here",
        "How to use this wiki",
        "Key pages",
        "Maintenance surfaces",
        "Open fronts",
        "Corpus",
        "Artifact ladder",
        "Canonical vs working surfaces",
        "Reading path",
      ],
    },
    {
      path: path.join(
        params.paths.workspaceRoot,
        getWikiRelativePath("synthesis", slugifyTitle(params.config.surfaces.maintenanceRhythm.title) || "maintenance-rhythm"),
      ),
      headings: [
        "Summary",
        "Review cadence",
        "Revisit next",
        "Session queue",
        "Context packs to refresh",
        "Synthesis candidates",
        "Audit to action",
        "Canonical vs working surfaces",
      ],
    },
    {
      path: path.join(
        params.paths.workspaceRoot,
        getWikiRelativePath("note", slugifyTitle(params.config.surfaces.openQuestions.title) || "open-questions"),
      ),
      headings: ["Summary", "Questions", "What would resolve them", "Recent session outcomes"],
    },
  ];

  for (const expectation of headingExpectations) {
    const raw = await fs.readFile(expectation.path, "utf8");

    for (const heading of expectation.headings) {
      if (!headingExists(raw, heading)) {
        throw new Error(`Expected ${path.relative(params.paths.topicRoot, expectation.path)} to contain heading "${heading}".`);
      }
    }
  }
}

async function validateObsidianNotes(params: {
  config: TopicBootstrapConfig;
  paths: TopicBootstrapPaths;
}) {
  for (const atlasTitle of params.config.validation.requiredAtlasNotes) {
    const targetPath = path.join(
      params.paths.obsidianVaultRoot,
      "00 Atlas",
      `${obsidianFileName(atlasTitle)}.md`,
    );

    if (!(await pathExists(targetPath))) {
      throw new Error(`Missing required atlas note: ${atlasTitle}`);
    }
  }

  for (const contextPackTitle of params.config.validation.requiredContextPackTitles) {
    const targetPath = path.join(
      params.paths.obsidianVaultRoot,
      "05 Context Packs",
      `${obsidianFileName(contextPackTitle)}.md`,
    );

    if (!(await pathExists(targetPath))) {
      throw new Error(`Missing required context pack note: ${contextPackTitle}`);
    }
  }

  for (const artifactTitle of GENERATED_ARTIFACT_NOTES) {
    const folder =
      artifactTitle === "Corpus Atlas"
        ? "20 Sources"
        : artifactTitle === "Processed Source Atlas"
          ? "25 Normalized Sources"
          : artifactTitle === "Summary Atlas"
            ? "30 Summaries"
            : artifactTitle === "Review History"
              ? "40 Reviews"
              : "50 Audits";
    const targetPath = path.join(
      params.paths.obsidianVaultRoot,
      folder,
      `${obsidianFileName(artifactTitle)}.md`,
    );

    if (!(await pathExists(targetPath))) {
      throw new Error(`Missing required artifact note: ${artifactTitle}`);
    }
  }
}

async function validateStarterQualityBar(params: {
  config: TopicBootstrapConfig;
  paths: TopicBootstrapPaths;
}) {
  const checks: Record<TopicBootstrapQualityFlag, boolean> = {
    "canonical-index": await pathExists(path.join(params.paths.workspaceRoot, "wiki", "index.md")),
    "start-here": await pathExists(
      path.join(params.paths.obsidianVaultRoot, "00 Atlas", "Start Here.md"),
    ),
    "topic-map": await pathExists(
      path.join(params.paths.obsidianVaultRoot, "00 Atlas", "Topic Map.md"),
    ),
    "reading-paths": await pathExists(
      path.join(
        params.paths.workspaceRoot,
        getWikiRelativePath(
          "synthesis",
          slugifyTitle(params.config.surfaces.readingPaths.title) || "reading-paths",
        ),
      ),
    ),
    "open-questions": await pathExists(
      path.join(
        params.paths.workspaceRoot,
        getWikiRelativePath(
          "note",
          slugifyTitle(params.config.surfaces.openQuestions.title) || "open-questions",
        ),
      ),
    ),
    "current-tensions": await pathExists(
      path.join(
        params.paths.workspaceRoot,
        getWikiRelativePath(
          "synthesis",
          slugifyTitle(params.config.surfaces.currentTensions.title) || "current-tensions",
        ),
      ),
    ),
    "maintenance-watchpoints": await pathExists(
      path.join(
        params.paths.workspaceRoot,
        getWikiRelativePath(
          "synthesis",
          slugifyTitle(params.config.surfaces.maintenanceWatchpoints.title) || "maintenance-watchpoints",
        ),
      ),
    ),
    "maintenance-rhythm": await pathExists(
      path.join(
        params.paths.workspaceRoot,
        getWikiRelativePath(
          "synthesis",
          slugifyTitle(params.config.surfaces.maintenanceRhythm.title) || "maintenance-rhythm",
        ),
      ),
    ),
    "artifact-map": await pathExists(
      path.join(params.paths.obsidianVaultRoot, "00 Atlas", "Artifact Map.md"),
    ),
    "at-least-one-context-pack": params.config.contextPacks.length > 0,
    "starter-validation": await pathExists(params.paths.baselinePath),
  };

  for (const flag of params.config.validation.requiredStarterQualityBar) {
    if (!checks[flag]) {
      throw new Error(`Starter quality bar check failed for "${flag}".`);
    }
  }
}

async function buildToTemporaryRoot(config: TopicBootstrapConfig, sourcePaths: TopicBootstrapPaths) {
  const tempTopicsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-topic-bootstrap-"));
  const tempPaths = getTopicBootstrapPaths(config.topic.slug, tempTopicsRoot);
  await fs.mkdir(tempPaths.topicRoot, { recursive: true });
  await writeJsonFile(tempPaths.configPath, config);
  await copyDirectoryRecursive(sourcePaths.sourceCorpusRoot, tempPaths.sourceCorpusRoot);

  const artifacts = await buildTopicArtifacts({
    config,
    paths: tempPaths,
  });

  return {
    tempTopicsRoot,
    tempPaths,
    artifacts,
  };
}

export async function initTopicBootstrap({
  slug,
  title,
  aliases = [],
  description,
  seedTimestamp,
  copyCorpusFrom,
  topicsRoot = TOPICS_ROOT,
  force = false,
}: InitTopicBootstrapInput) {
  const normalizedSlug = slug.trim() || slugifyTitle(title);

  if (!normalizedSlug) {
    throw new Error("Topic init requires a valid --slug or --title.");
  }

  const paths = getTopicBootstrapPaths(normalizedSlug, topicsRoot);

  if ((await pathExists(paths.topicRoot)) && !force) {
    const existingEntries = await fs.readdir(paths.topicRoot);

    if (existingEntries.length > 0) {
      throw new Error(
        `Topic "${normalizedSlug}" already exists at ${paths.topicRoot}. Use --force only if you intend to regenerate it.`,
      );
    }
  }

  await fs.rm(paths.topicRoot, { recursive: true, force: true });
  await ensureTopicDirectories(paths);
  await writeTextFile(path.join(paths.sourceCorpusRoot, "README.md"), STARTER_PLACEHOLDER_README);

  let corpusFiles: TopicBootstrapCorpusFile[] = [];

  if (copyCorpusFrom) {
    const sourcePath = path.resolve(copyCorpusFrom);
    const sourceStats = await fs.stat(sourcePath);

    if (sourceStats.isDirectory()) {
      await copyDirectoryRecursive(sourcePath, paths.sourceCorpusRoot);
    } else if (sourceStats.isFile()) {
      await fs.copyFile(sourcePath, path.join(paths.sourceCorpusRoot, path.basename(sourcePath)));
    } else {
      throw new Error(`Unsupported corpus input: ${copyCorpusFrom}`);
    }

    const relativeFiles = await discoverCorpusFiles(paths.sourceCorpusRoot);
    corpusFiles = relativeFiles.map((fileName) => ({
      fileName,
      title: titleFromStem(path.basename(fileName, path.extname(fileName))),
      description: `Starter corpus file imported from ${sourcePath}.`,
      origin: sourcePath,
    }));
  }

  const config = createDefaultTopicBootstrapConfig({
    slug: normalizedSlug,
    title,
    aliases,
    description,
    seedTimestamp,
    corpusFiles,
  });

  await writeJsonFile(paths.configPath, config);

  return {
    config,
    paths,
  };
}

export async function buildTopicBootstrap({
  slug,
  topicsRoot = TOPICS_ROOT,
}: BuildTopicBootstrapInput): Promise<TopicBootstrapBuildResult> {
  const paths = getTopicBootstrapPaths(slug, topicsRoot);
  const config = await loadTopicBootstrapConfig(paths);

  await assertCorpusMatchesConfig(config, paths);
  const artifacts = await buildTopicArtifacts({
    config,
    paths,
  });

  return artifacts;
}

export async function validateTopicBootstrap({
  slug,
  topicsRoot = TOPICS_ROOT,
}: ValidateTopicBootstrapInput): Promise<TopicBootstrapValidationResult> {
  const paths = getTopicBootstrapPaths(slug, topicsRoot);
  const config = await loadTopicBootstrapConfig(paths);
  const baselineRaw = await fs.readFile(paths.baselinePath, "utf8");
  const manifestRaw = await fs.readFile(paths.manifestPath, "utf8");
  const baseline = topicBootstrapBaselineSchema.parse(JSON.parse(baselineRaw));
  const manifest = topicBootstrapManifestSchema.parse(JSON.parse(manifestRaw));

  await assertCorpusMatchesConfig(config, paths);

  compareEntrySets({
    label: "Committed generated starter output",
    actual: await collectGeneratedEntries(paths, manifest),
    expected: baseline.entries,
  });
  compareEntrySets({
    label: "Committed corpus",
    actual: await collectCorpusEntries(paths),
    expected: baseline.corpusEntries,
  });

  const tempBuild = await buildToTemporaryRoot(config, paths);

  try {
    compareEntrySets({
      label: "Rebuilt starter output",
      actual: await collectGeneratedEntries(tempBuild.tempPaths, tempBuild.artifacts.manifest),
      expected: baseline.entries,
    });
  } finally {
    await fs.rm(tempBuild.tempTopicsRoot, { recursive: true, force: true });
  }

  await validateStarterQualityBar({
    config,
    paths,
  });
  await validateHeadings({
    config,
    paths,
    manifest,
  });
  await validateObsidianNotes({
    config,
    paths,
  });

  return {
    config,
    manifest,
    baseline,
    topicRoot: paths.topicRoot,
  };
}
