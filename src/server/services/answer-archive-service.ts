import { and, eq } from "drizzle-orm";

import type {
  AnswerArchiveType,
  AnswerArtifact,
  AnswerCitation,
} from "@/lib/contracts/answer";
import { answerArtifacts } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { slugifyTitle } from "@/server/lib/slug";
import { getWikiRelativePath } from "@/server/lib/wiki-paths";
import { logger } from "@/server/lib/logger";
import { refreshWikiPageSearchIndex } from "@/server/services/candidate-page-recall-service";
import { getAnswerArtifact } from "@/server/services/answer-service";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";
import {
  syncWikiIndex,
  createWikiPage,
  listWikiPages,
  updateWikiPage,
} from "@/server/services/wiki-page-service";
import {
  parseWikiDocument,
  serializeWikiDocument,
} from "@/server/services/wiki-frontmatter-service";

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeQuestionTitle(question: string) {
  const normalized = question.replace(/\s+/g, " ").trim().replace(/[?!.:]+$/, "");

  if (!normalized) {
    return "Archived answer";
  }

  return normalized.length > 120 ? `${normalized.slice(0, 117).trimEnd()}...` : normalized;
}

function buildBaseArchiveTitle(answer: AnswerArtifact, archiveType: AnswerArchiveType) {
  if (archiveType === "synthesis") {
    const anchorTitle = answer.basedOnPages[0]?.title;

    return anchorTitle
      ? `${anchorTitle} synthesis`
      : `Synthesis: ${normalizeQuestionTitle(answer.question)}`;
  }

  return `Note: ${normalizeQuestionTitle(answer.question)}`;
}

async function resolveArchiveIdentity(
  workspaceRoot: string,
  answer: AnswerArtifact,
  archiveType: AnswerArchiveType,
) {
  const existingPages = await listWikiPages(workspaceRoot);
  const existingPaths = new Set(existingPages.map((page) => page.path));
  const baseTitle = buildBaseArchiveTitle(answer, archiveType);
  const slugRoot =
    slugifyTitle(baseTitle) || `${archiveType}-archive-${answer.id.slice(-6).toLowerCase()}`;

  for (let attempt = 1; attempt <= 200; attempt += 1) {
    const title = attempt === 1 ? baseTitle : `${baseTitle} ${attempt}`;
    const slug = attempt === 1 ? slugRoot : `${slugRoot}-${attempt}`;
    const relativePath = getWikiRelativePath(archiveType, slug);

    if (!existingPaths.has(relativePath)) {
      return {
        title,
        slug,
      };
    }
  }

  throw new AppError(
    "Could not find a unique archive page path for this answer artifact.",
    409,
    "answer_archive_path_conflict",
  );
}

function collectSourceRefs(answer: AnswerArtifact) {
  return uniqueValues([
    ...answer.citations.map((citation) => citation.sourceId ?? ""),
    ...answer.metadata.retrieval.sourceIds,
  ]);
}

function collectPageRefs(answer: AnswerArtifact) {
  return uniqueValues([
    ...answer.basedOnPages.map((page) => page.title),
    ...answer.citations
      .filter((citation) => citation.layer === "wiki_page")
      .map((citation) => citation.pageTitle ?? ""),
  ]);
}

function computeArchiveConfidence(answer: AnswerArtifact) {
  const hasWikiCitation = answer.citations.some((citation) => citation.layer === "wiki_page");
  const hasSummaryCitation = answer.citations.some(
    (citation) => citation.layer === "source_summary",
  );
  const hasChunkCitation = answer.citations.some((citation) => citation.layer === "raw_chunk");

  if (hasWikiCitation && !hasChunkCitation) {
    return hasSummaryCitation ? 0.88 : 0.82;
  }

  if (hasSummaryCitation && !hasChunkCitation) {
    return 0.72;
  }

  return 0.64;
}

function formatCitation(citation: AnswerCitation) {
  if (citation.layer === "wiki_page") {
    const title = citation.pageTitle ? `[[${citation.pageTitle}]]` : citation.pageId ?? "Wiki page";
    const locator = citation.locator ? ` (${citation.locator})` : "";

    return `- ${title}${locator}: ${citation.note}`;
  }

  const sourceLabel = citation.sourceTitle ?? citation.sourceId ?? "Source";
  const locator = citation.locator ? ` (${citation.locator})` : "";
  const layerLabel = citation.layer === "source_summary" ? "source summary" : "raw chunk";

  return `- ${sourceLabel} [${layerLabel}]${locator}: ${citation.note}`;
}

function buildBulletSection(items: string[], emptyText: string) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${emptyText}`;
}

function buildArchiveBody(params: {
  answer: AnswerArtifact;
  title: string;
  archiveType: AnswerArchiveType;
  archivedAt: string;
}) {
  const promptHeading = params.archiveType === "synthesis" ? "Question" : "Prompt";
  const detailHeading =
    params.archiveType === "synthesis" ? "Detailed synthesis" : "Archived notes";
  const pageRefsSection = params.answer.basedOnPages.length
    ? params.answer.basedOnPages.map((page) => `- [[${page.title}]]`).join("\n")
    : "- No directly grounded wiki pages were attached to this answer artifact.";
  const caveatsSection = buildBulletSection(
    params.answer.caveats,
    "No caveats were recorded.",
  );
  const followUpsSection = buildBulletSection(
    params.answer.followUpQuestions,
    "No follow-up questions were recorded.",
  );

  return [
    `# ${params.title}`,
    "",
    `## ${promptHeading}`,
    "",
    params.answer.question,
    "",
    "## Answer summary",
    "",
    params.answer.shortAnswer,
    "",
    `## ${detailHeading}`,
    "",
    params.answer.detailedAnswer.trim(),
    "",
    "## Based-on pages",
    "",
    pageRefsSection,
    "",
    "## Citations",
    "",
    params.answer.citations.map(formatCitation).join("\n"),
    "",
    "## Caveats",
    "",
    caveatsSection,
    "",
    "## Follow-up questions",
    "",
    followUpsSection,
    "",
    "## Archive provenance",
    "",
    `- Answer artifact: \`${params.answer.id}\``,
    `- Archive kind: ${params.archiveType}`,
    `- Archived at: ${params.archivedAt}`,
    `- Retrieval order: ${params.answer.metadata.retrieval.order.join(" -> ")}`,
  ].join("\n");
}

function assertArchiveableAnswer(answer: AnswerArtifact) {
  if (answer.archivedPageId) {
    throw new AppError(
      "This answer artifact has already been archived into the wiki.",
      409,
      "answer_already_archived",
    );
  }

  if (answer.metadata.insufficientKnowledge || answer.citations.length === 0) {
    throw new AppError(
      "Only grounded answer artifacts with citations can be archived into the wiki.",
      422,
      "answer_not_archiveable",
    );
  }
}

export async function archiveAnswerArtifact(
  workspaceRoot: string,
  answerId: string,
  archiveType: AnswerArchiveType,
) {
  const answer = await getAnswerArtifact(workspaceRoot, answerId);

  assertArchiveableAnswer(answer);

  const archiveIdentity = await resolveArchiveIdentity(workspaceRoot, answer, archiveType);
  const createdPage = await createWikiPage({
    workspaceRoot,
    type: archiveType,
    title: archiveIdentity.title,
    slug: archiveIdentity.slug,
    tags: uniqueValues(["answer-archive", "ask", archiveType]),
  });
  const archivedAt = new Date().toISOString();
  const parsedCreatedPage = parseWikiDocument({
    rawContent: createdPage.rawContent,
    relativePath: createdPage.path,
  });
  const nextFrontmatter = {
    ...parsedCreatedPage.frontmatter,
    status: "active",
    review_status: "approved",
    tags: uniqueValues([
      ...parsedCreatedPage.frontmatter.tags,
      "answer-archive",
      "ask",
      archiveType,
    ]),
    source_refs: collectSourceRefs(answer),
    page_refs: collectPageRefs(answer),
    confidence: computeArchiveConfidence(answer),
    updated_at: archivedAt,
    answer_artifact_id: answer.id,
    archived_at: archivedAt,
    archived_from_question: answer.question,
    archive_kind: archiveType,
  };
  const archivedRawContent = serializeWikiDocument(
    nextFrontmatter,
    buildArchiveBody({
      answer,
      title: archiveIdentity.title,
      archiveType,
      archivedAt,
    }),
  );
  const updatedPage = await updateWikiPage({
    workspaceRoot,
    pageId: createdPage.id,
    rawContent: archivedRawContent,
  });
  const { db, workspace } = await getWorkspaceContext(workspaceRoot);

  await db
    .update(answerArtifacts)
    .set({
      archivedPageId: updatedPage.id,
      updatedAt: new Date(),
    })
    .where(and(eq(answerArtifacts.workspaceId, workspace.id), eq(answerArtifacts.id, answerId)));

  await syncWikiIndex(workspaceRoot);
  await refreshWikiPageSearchIndex(workspaceRoot);

  logger.info(
    {
      answerId,
      archivedPageId: updatedPage.id,
      archivedPagePath: updatedPage.path,
      archiveType,
    },
    "Answer artifact archived into the wiki.",
  );

  return getAnswerArtifact(workspaceRoot, answerId);
}
