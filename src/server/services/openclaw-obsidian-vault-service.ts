import fs from "node:fs/promises";
import path from "node:path";

import type {
  OpenClawExampleManifest,
  OpenClawExamplePipelineConfig,
} from "@/lib/contracts/openclaw-example";
import { REPO_ROOT } from "@/server/lib/repo-paths";
import {
  buildKnowledgeMethodPack,
  findKnowledgeSurface,
} from "@/server/services/knowledge-method-template-service";
import {
  openClawKnowledgeMethodData,
} from "@/server/services/openclaw-knowledge-method";
import {
  parseWikiDocument,
  serializeWikiDocument,
} from "@/server/services/wiki-frontmatter-service";

type BuildOpenClawObsidianVaultParams = {
  workspaceRoot: string;
  outputRoot: string;
  manifest: OpenClawExampleManifest;
  config: OpenClawExamplePipelineConfig;
};

type CopiedMarkdownNote = {
  stem: string;
  relativePath: string;
};

type ProjectedWikiNote = {
  title: string;
  relativePath: string;
};

const articleFolderName = "10 Articles";
const atlasFolderName = "00 Atlas";
const contextPackFolderName = "05 Context Packs";
const sourcesFolderName = "20 Sources";
const normalizedSourcesFolderName = "25 Normalized Sources";
const summariesFolderName = "30 Summaries";
const reviewsFolderName = "40 Reviews";
const auditsFolderName = "50 Audits";
const openClawMethodPack = buildKnowledgeMethodPack(openClawKnowledgeMethodData);

function uniqueValues(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function toSafeFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/\s+-\s+-\s+/g, " - ")
    .trim();
}

function toNoteStem(fileName: string) {
  return fileName.replace(/\.md$/i, "");
}

function toAnchor(heading: string) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function stripTopHeading(body: string) {
  return body.replace(/^#\s+.+?\n+/, "");
}

function extractSecondLevelHeadings(body: string) {
  return [...body.matchAll(/^##\s+(.+)$/gm)].map((match) => match[1]!.trim());
}

function extractSection(body: string, headingNames: string[]) {
  for (const heading of headingNames) {
    const pattern = new RegExp(
      `^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$\\n([\\s\\S]*?)(?=^##\\s+|\\Z)`,
      "m",
    );
    const match = body.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function extractFirstParagraph(markdown: string | null) {
  if (!markdown) {
    return null;
  }

  const blocks = markdown
    .trim()
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks[0] ?? null;
}

function extractWikiLinks(markdown: string) {
  return uniqueValues(
    [...markdown.matchAll(/\[\[([^[\]|]+?)(?:\|[^[\]]+?)?\]\]/g)].map((match) =>
      match[1]!.trim(),
    ),
  );
}

function buildObsidianAliases(title: string, existingAliases: string[]) {
  const aliases = [...existingAliases];

  if (title === "OpenClaw") {
    aliases.push("open claw");
  }

  if (title === "OpenClaw Example Index") {
    aliases.push("OpenClaw MOC", "OpenClaw map of content");
  }

  if (title.startsWith("Note: ")) {
    aliases.push(title.replace(/^Note:\s*/, ""));
  }

  return uniqueValues(aliases);
}

function readStringFrontmatterValue(frontmatter: Record<string, unknown>, key: string) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readStringArrayFrontmatterValue(frontmatter: Record<string, unknown>, key: string) {
  const value = frontmatter[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim());
}

function buildObsidianTags(params: {
  title: string;
  type: string;
  status: string;
  reviewStatus: string;
  existingTags: string[];
}) {
  const tags = [
    ...params.existingTags,
    "compiled-wiki",
    "openclaw-example",
    `type/${params.type}`,
    `status/${params.status}`,
    `review/${params.reviewStatus}`,
  ];

  if (params.title.toLowerCase().includes("openclaw")) {
    tags.push("topic/openclaw");
  }

  if (params.type === "note") {
    tags.push("workflow/ask-archive");
  }

  if (params.type === "synthesis") {
    tags.push("workflow/synthesis");
  }

  return uniqueValues(tags).sort((left, right) => left.localeCompare(right));
}

function formatTypeLabel(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function describeWorkingUse(title: string, type: string) {
  switch (title) {
    case "OpenClaw":
      return "Load this first when you need the shortest durable statement of what the corpus says OpenClaw is.";
    case "OpenClaw maintenance watchpoints":
      return "Load this when you need the compact operational checklist rather than the full article graph.";
    case "OpenClaw current tensions":
      return "Load this when you want the active trade-offs and risks, not just the neutral article layer.";
    case "OpenClaw maintenance rhythm":
      return "Load this when you want to resume maintenance quickly, refresh the right context pack, and decide what should become synthesis next.";
    case "OpenClaw reading paths":
      return "Load this when you want a small note bundle for orientation, maintenance review, or provenance tracing.";
    case "OpenClaw open questions":
      return "Load this when you want the unresolved questions that should drive the next pass of reading or source collection.";
    default:
      if (type === "note") {
        return "Load this when you want a durable answer artifact or a compact working note tied back into the wiki.";
      }

      if (type === "synthesis") {
        return "Load this when you want a compiled cross-page view instead of a single entry page.";
      }

      return "Load this when you want a compact durable article that can anchor a small context bundle.";
  }
}

function defaultConnectedNotes(title: string, type: string) {
  const base = ["Start Here", "Topic Map", "Reading Paths", "Maintenance Rhythm", "Artifact Map"];

  if (type === "synthesis") {
    base.push("Current Tensions", "Monitoring");
  }

  if (type === "note") {
    base.push("Open Questions", "Monitoring");
  }

  if (title === "OpenClaw") {
    base.push("Key Pages", "Current Tensions", "Open Questions");
  }

  if (title === "OpenClaw current tensions") {
    base.push("Open Questions", "Maintenance Rhythm");
  }

  if (title === "OpenClaw maintenance rhythm") {
    base.push("Monitoring", "LLM Context Pack", "Open Questions");
  }

  return uniqueValues(base);
}

function buildArticleProjectionBody(params: {
  title: string;
  relativePath: string;
  type: string;
  reviewStatus: string;
  confidence: number;
  sourceRefCount: number;
  knowledgeRole?: string | null;
  surfaceKind?: string | null;
  revisitCadence?: string | null;
  refreshTriggers?: string[];
  body: string;
}) {
  const leadHeadingNames =
    params.type === "synthesis"
      ? ["Thesis", "Summary"]
      : params.type === "note"
        ? ["Answer summary", "Summary"]
        : ["Summary", "Thesis"];
  const lead = extractFirstParagraph(extractSection(params.body, leadHeadingNames));
  const prompt = extractFirstParagraph(extractSection(params.body, ["Prompt"]));
  const headings = extractSecondLevelHeadings(stripTopHeading(params.body));
  const connectedNotes = uniqueValues([
    ...defaultConnectedNotes(params.title, params.type),
    ...extractWikiLinks(params.body),
  ])
    .filter((target) => target !== params.title)
    .slice(0, 8);
  const workingUse = describeWorkingUse(params.title, params.type);
  const articleBody = stripTopHeading(params.body).trim();

  const lines: string[] = [`# ${params.title}`, ""];

  if (prompt) {
    lines.push("> [!question]");
    lines.push(`> ${prompt}`);
    lines.push("");
  }

  if (lead) {
    lines.push("> [!abstract]");
    lines.push(`> ${lead}`);
    lines.push(">");
    lines.push(`> - **Type**: ${formatTypeLabel(params.type)}`);
    if (params.knowledgeRole) {
      lines.push(`> - **Role**: ${params.knowledgeRole}`);
    }
    if (params.surfaceKind) {
      lines.push(`> - **Surface**: ${params.surfaceKind}`);
    }
    lines.push(`> - **Review status**: ${params.reviewStatus}`);
    lines.push(`> - **Confidence**: ${params.confidence.toFixed(2)}`);
    lines.push(`> - **Source refs**: ${params.sourceRefCount}`);
    if (params.revisitCadence) {
      lines.push(`> - **Revisit cadence**: ${params.revisitCadence}`);
    }
    if (params.refreshTriggers && params.refreshTriggers.length > 0) {
      lines.push(`> - **Refresh triggers**: ${params.refreshTriggers.join("; ")}`);
    }
    lines.push(`> - **Canonical page**: \`${params.relativePath}\``);
    lines.push("> - **Vault companions**: [[Start Here]], [[Reading Paths]], [[Artifact Map]]");
    lines.push("");
  }

  if (workingUse) {
    lines.push("## Use this note when", "");
    lines.push(`- ${workingUse}`, "");
  }

  if (headings.length > 0) {
    lines.push("## Article map", "");
    lines.push(...headings.map((heading) => `- [${heading}](#${toAnchor(heading)})`), "");
  }

  if (connectedNotes.length > 0) {
    lines.push("## Connected notes", "");
    lines.push(...connectedNotes.map((target) => `- [[${target}]]`), "");
  }

  lines.push(articleBody);

  return `${lines.join("\n").trim()}\n`;
}

async function writeTextFile(targetPath: string, content: string) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content, "utf8");
}

async function listFilesRecursively(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(absolutePath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files.sort();
}

async function copyMarkdownTree(params: {
  sourceRoot: string;
  targetRoot: string;
  filter?: (filePath: string) => boolean;
}): Promise<CopiedMarkdownNote[]> {
  const sourceFiles = (await listFilesRecursively(params.sourceRoot)).filter((filePath) =>
    filePath.endsWith(".md") && (params.filter ? params.filter(filePath) : true),
  );
  const copied: CopiedMarkdownNote[] = [];

  for (const sourceFile of sourceFiles) {
    const relativePath = path.relative(params.sourceRoot, sourceFile);
    const targetPath = path.join(params.targetRoot, relativePath);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.cp(sourceFile, targetPath, { force: true });
    copied.push({
      stem: toNoteStem(path.basename(relativePath)),
      relativePath,
    });
  }

  return copied.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

async function buildProjectedWikiNotes(params: {
  workspaceRoot: string;
  outputRoot: string;
  manifest: OpenClawExampleManifest;
}) {
  const projectedNotes: ProjectedWikiNote[] = [];

  for (const page of params.manifest.pages) {
    const sourcePath = path.join(params.workspaceRoot, page.path);
    const raw = await fs.readFile(sourcePath, "utf8");
    const parsed = parseWikiDocument({
      rawContent: raw,
      relativePath: page.path,
    });
    const projectedFrontmatter = {
      ...parsed.frontmatter,
      aliases: buildObsidianAliases(page.title, parsed.frontmatter.aliases),
      tags: buildObsidianTags({
        title: page.title,
        type: parsed.frontmatter.type,
        status: parsed.frontmatter.status,
        reviewStatus: parsed.frontmatter.review_status,
        existingTags: parsed.frontmatter.tags,
      }),
    };
    const targetFileName = `${toSafeFileName(page.title)}.md`;
    const targetRelativePath = path.join(articleFolderName, targetFileName);
    const projectedBody = buildArticleProjectionBody({
      title: page.title,
      relativePath: page.path,
      type: parsed.frontmatter.type,
      reviewStatus: parsed.frontmatter.review_status,
      confidence: parsed.frontmatter.confidence,
      sourceRefCount: parsed.frontmatter.source_refs.length,
      knowledgeRole: readStringFrontmatterValue(parsed.frontmatter, "knowledge_role"),
      surfaceKind:
        readStringFrontmatterValue(parsed.frontmatter, "surface_kind") ??
        findKnowledgeSurface(openClawKnowledgeMethodData, page.title)?.surfaceKind ??
        null,
      revisitCadence: readStringFrontmatterValue(parsed.frontmatter, "revisit_cadence"),
      refreshTriggers: readStringArrayFrontmatterValue(parsed.frontmatter, "refresh_triggers"),
      body: parsed.body,
    });

    await writeTextFile(
      path.join(params.outputRoot, targetRelativePath),
      serializeWikiDocument(projectedFrontmatter, projectedBody),
    );

    projectedNotes.push({
      title: page.title,
      relativePath: targetRelativePath.split(path.sep).join("/"),
    });
  }

  return projectedNotes.sort((left, right) => left.title.localeCompare(right.title));
}

function buildCorpusAtlasNote(config: OpenClawExamplePipelineConfig) {
  const sourceLinks = config.corpusFiles.map((corpusFile) => {
    const stem = toNoteStem(corpusFile.fileName);
    return `- [[${stem}|${corpusFile.fileName.replace(/\.md$/, "")}]]\n  - Origin: \`${corpusFile.originPath}\``;
  });

  return `# Corpus Atlas

## Source notes

${sourceLinks.join("\n")}

## Why these sources matter

- They are the bounded, user-first corpus for the official example.
- They keep the OpenClaw case focused on releases, plugin surface changes, workflow churn, and provider risk.
- They are small enough to recombine into deliberate context packs without losing provenance.
`;
}

function buildSummaryAtlasNote(summaryNotes: CopiedMarkdownNote[]) {
  const summaryLinks = summaryNotes.map(
    (note) => `- [[${note.stem}|${note.relativePath.replace(/\.md$/, "")}]]`,
  );

  return `# Summary Atlas

## Summary notes

${summaryLinks.join("\n")}

## How to use them

- Use these after the article notes when you want the source-to-claim bridge.
- They are the cleanest place to inspect what the summarizer extracted before patch planning.
`;
}

function buildProcessedSourceAtlasNote(processedNotes: CopiedMarkdownNote[]) {
  const processedLinks = processedNotes.map(
    (note) => `- [[${note.stem}|${note.relativePath.replace(/\.md$/, "")}]]`,
  );

  return `# Processed Source Atlas

## Normalized notes

${processedLinks.join("\n")}

## How this layer helps

- This is the bridge between the bounded raw corpus and the summary layer.
- Use it when you want cleaned source text without jumping all the way back to the original digest excerpts.
`;
}

function buildReviewHistoryNote(params: {
  approvedNotes: CopiedMarkdownNote[];
  rejectedNotes: CopiedMarkdownNote[];
}) {
  const approvedLinks = params.approvedNotes.map(
    (note) => `- [[${note.stem}|${note.relativePath.replace(/\.md$/, "")}]]`,
  );
  const rejectedLinks = params.rejectedNotes.map(
    (note) => `- [[${note.stem}|${note.relativePath.replace(/\.md$/, "")}]]`,
  );

  return `# Review History

## Approved proposals

${approvedLinks.join("\n")}

## Rejected proposals

${rejectedLinks.join("\n")}

## How to read this layer

- Approved proposals show what actually mutated the wiki.
- Rejected proposals preserve counterfactuals and help explain why the final wiki stayed narrower or more cautious.
`;
}

function buildAuditAtlasNote(auditNotes: CopiedMarkdownNote[]) {
  const auditLinks = auditNotes.map(
    (note) => `- [[${note.stem}|${note.relativePath.replace(/\.md$/, "")}]]`,
  );

  return `# Audit Atlas

## Audit notes

${auditLinks.join("\n")}

## What to inspect

- Look here when a page feels thin, overconfident, or under-sourced.
- The audit layer is the fastest path for finding structural weakness after reading the compiled wiki.
`;
}

export async function buildOpenClawObsidianVault(
  params: BuildOpenClawObsidianVaultParams,
) {
  await fs.rm(params.outputRoot, { recursive: true, force: true });
  await fs.mkdir(params.outputRoot, { recursive: true });

  const corpusRoot = path.join(REPO_ROOT, params.config.paths.corpusRoot);
  const processedRoot = path.join(params.workspaceRoot, "raw", "processed");
  const summariesRoot = path.join(params.workspaceRoot, "raw", "processed", "summaries");
  const approvedReviewsRoot = path.join(params.workspaceRoot, "reviews", "approved");
  const rejectedReviewsRoot = path.join(params.workspaceRoot, "reviews", "rejected");
  const auditsRoot = path.join(params.workspaceRoot, "audits");

  await writeTextFile(path.join(params.outputRoot, ".gitignore"), ".obsidian/\n.trash/\n");
  await writeTextFile(path.join(params.outputRoot, "README.md"), openClawMethodPack.obsidian.readme);
  for (const [noteName, content] of Object.entries(openClawMethodPack.obsidian.atlas)) {
    await writeTextFile(path.join(params.outputRoot, atlasFolderName, `${noteName}.md`), content);
  }
  for (const [noteName, content] of Object.entries(openClawMethodPack.obsidian.contextPacks)) {
    await writeTextFile(
      path.join(params.outputRoot, contextPackFolderName, `${noteName}.md`),
      content,
    );
  }

  await buildProjectedWikiNotes({
    workspaceRoot: params.workspaceRoot,
    outputRoot: params.outputRoot,
    manifest: params.manifest,
  });

  const corpusNotes = await copyMarkdownTree({
    sourceRoot: corpusRoot,
    targetRoot: path.join(params.outputRoot, sourcesFolderName, "Corpus"),
  });
  const processedNotes = await copyMarkdownTree({
    sourceRoot: processedRoot,
    targetRoot: path.join(params.outputRoot, normalizedSourcesFolderName, "Processed"),
    filter: (filePath) => filePath.endsWith(".normalized.md"),
  });
  const summaryNotes = await copyMarkdownTree({
    sourceRoot: summariesRoot,
    targetRoot: path.join(params.outputRoot, summariesFolderName),
  });
  const approvedReviewNotes = await copyMarkdownTree({
    sourceRoot: approvedReviewsRoot,
    targetRoot: path.join(params.outputRoot, reviewsFolderName, "Approved"),
  });
  const rejectedReviewNotes = await copyMarkdownTree({
    sourceRoot: rejectedReviewsRoot,
    targetRoot: path.join(params.outputRoot, reviewsFolderName, "Rejected"),
  });
  const auditNotes = await copyMarkdownTree({
    sourceRoot: auditsRoot,
    targetRoot: path.join(params.outputRoot, auditsFolderName),
  });

  await writeTextFile(
    path.join(params.outputRoot, sourcesFolderName, "Corpus Atlas.md"),
    buildCorpusAtlasNote(params.config),
  );
  await writeTextFile(
    path.join(params.outputRoot, normalizedSourcesFolderName, "Processed Source Atlas.md"),
    buildProcessedSourceAtlasNote(processedNotes),
  );
  await writeTextFile(
    path.join(params.outputRoot, summariesFolderName, "Summary Atlas.md"),
    buildSummaryAtlasNote(summaryNotes),
  );
  await writeTextFile(
    path.join(params.outputRoot, reviewsFolderName, "Review History.md"),
    buildReviewHistoryNote({
      approvedNotes: approvedReviewNotes,
      rejectedNotes: rejectedReviewNotes,
    }),
  );
  await writeTextFile(
    path.join(params.outputRoot, auditsFolderName, "Audit Atlas.md"),
    buildAuditAtlasNote(auditNotes),
  );

  return {
    outputRoot: params.outputRoot,
    corpusNotes,
    processedNotes,
    summaryNotes,
    approvedReviewNotes,
    rejectedReviewNotes,
    auditNotes,
  };
}
