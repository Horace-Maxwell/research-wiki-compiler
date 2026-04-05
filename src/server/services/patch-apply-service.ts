import type { WikiFrontmatter } from "@/lib/contracts/wiki";
import type { ReviewProposalDetail, PatchHunkArtifact } from "@/lib/contracts/review";
import { AppError } from "@/server/lib/errors";
import { parseWikiDocument, serializeWikiDocument } from "@/server/services/wiki-frontmatter-service";
import {
  getWikiPageDetail,
  syncWikiIndex,
  updateWikiPage,
} from "@/server/services/wiki-page-service";
import { refreshWikiPageSearchIndex } from "@/server/services/candidate-page-recall-service";
import {
  renderWikiPageTemplate,
  writeWikiMarkdownFile,
} from "@/server/services/wiki-file-service";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";
import { wikiPages } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";

type SectionRange = {
  title: string;
  level: number;
  headingStart: number;
  headingEnd: number;
  contentStart: number;
  end: number;
};

export type PatchApplyResult = {
  appliedPageId: string;
  appliedPagePath: string;
  affectedPaths: string[];
};

function normalizeHeading(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeBlock(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}

function uniqueValues(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function listSections(body: string) {
  const headingRegex = /^(#{2,6})\s+(.+?)\s*$/gm;
  const sections: SectionRange[] = [];
  const matches = [...body.matchAll(headingRegex)];

  matches.forEach((match, index) => {
    if (match.index === undefined) {
      return;
    }

    const headingStart = match.index;
    const headingText = match[2]?.trim() ?? "";
    const level = match[1]?.length ?? 2;
    const lineBreakIndex = body.indexOf("\n", headingStart);
    const headingEnd = lineBreakIndex === -1 ? body.length : lineBreakIndex;
    const contentStart = Math.min(headingEnd + 1, body.length);
    const nextHeadingStart = matches[index + 1]?.index ?? body.length;

    sections.push({
      title: headingText,
      level,
      headingStart,
      headingEnd,
      contentStart,
      end: nextHeadingStart,
    });
  });

  return sections;
}

function findSection(body: string, sectionHeading: string | null) {
  if (!sectionHeading) {
    return null;
  }

  const normalizedTarget = normalizeHeading(sectionHeading);

  return (
    listSections(body).find((section) => normalizeHeading(section.title) === normalizedTarget) ?? null
  );
}

function ensureSeparatedContent(text: string) {
  const normalized = normalizeBlock(text);

  return normalized ? `${normalized}\n` : "";
}

function appendNewSection(body: string, heading: string, content: string) {
  const trimmedBody = body.replace(/\s+$/, "");
  const prefix = trimmedBody ? `${trimmedBody}\n\n` : "";

  return `${prefix}## ${heading}\n\n${ensureSeparatedContent(content)}`;
}

function replaceExact(source: string, target: string, replacement: string) {
  const index = source.indexOf(target);

  if (index === -1) {
    return null;
  }

  return `${source.slice(0, index)}${replacement}${source.slice(index + target.length)}`;
}

function applyAppend(body: string, hunk: PatchHunkArtifact) {
  const nextContent = ensureSeparatedContent(hunk.afterText);
  const section = findSection(body, hunk.sectionHeading);

  if (!section) {
    if (!hunk.sectionHeading) {
      return `${body.replace(/\s+$/, "")}\n\n${nextContent}`;
    }

    return appendNewSection(body, hunk.sectionHeading, hunk.afterText);
  }

  const sectionContent = body.slice(section.contentStart, section.end);

  if (normalizeBlock(sectionContent).includes(normalizeBlock(hunk.afterText))) {
    return body;
  }

  const insertion = sectionContent.replace(/\s+$/, "");
  const nextSectionContent = insertion
    ? `${insertion}\n\n${nextContent}`
    : `\n${nextContent}`;

  return `${body.slice(0, section.contentStart)}${nextSectionContent}${body.slice(section.end)}`;
}

function applyInsert(body: string, hunk: PatchHunkArtifact) {
  const nextContent = ensureSeparatedContent(hunk.afterText);
  const section = findSection(body, hunk.sectionHeading);

  if (!section) {
    throw new AppError(
      `Cannot insert into missing section "${hunk.sectionHeading ?? "document"}".`,
      409,
      "patch_insert_section_missing",
    );
  }

  const sectionContent = body.slice(section.contentStart, section.end);

  if (normalizeBlock(sectionContent).includes(normalizeBlock(hunk.afterText))) {
    return body;
  }

  if (hunk.beforeText) {
    const replaced = replaceExact(
      sectionContent,
      hunk.beforeText,
      `${nextContent}${hunk.beforeText}`,
    );

    if (!replaced) {
      throw new AppError(
        `Could not find local anchor text for insert in section "${hunk.sectionHeading ?? "document"}".`,
        409,
        "patch_insert_anchor_missing",
      );
    }

    return `${body.slice(0, section.contentStart)}${replaced}${body.slice(section.end)}`;
  }

  const nextSectionContent = `${nextContent}${sectionContent.replace(/^\n*/, "")}`;

  return `${body.slice(0, section.contentStart)}${nextSectionContent}${body.slice(section.end)}`;
}

function applyReplace(body: string, hunk: PatchHunkArtifact) {
  if (!hunk.beforeText) {
    throw new AppError(
      "Replace operations require beforeText.",
      409,
      "patch_replace_missing_before_text",
    );
  }

  const section = findSection(body, hunk.sectionHeading);
  const scopeStart = section ? section.contentStart : 0;
  const scopeEnd = section ? section.end : body.length;
  const scope = body.slice(scopeStart, scopeEnd);
  const replaced = replaceExact(scope, hunk.beforeText, ensureSeparatedContent(hunk.afterText).trimEnd());

  if (!replaced) {
    throw new AppError(
      `Could not find replace target in ${hunk.sectionHeading ? `section "${hunk.sectionHeading}"` : "document"}.`,
      409,
      "patch_replace_target_missing",
    );
  }

  return `${body.slice(0, scopeStart)}${replaced}${body.slice(scopeEnd)}`;
}

function applyCreateSection(body: string, hunk: PatchHunkArtifact) {
  const heading = hunk.sectionHeading ?? "Notes";
  const section = findSection(body, heading);

  if (section) {
    return applyAppend(body, {
      ...hunk,
      sectionHeading: heading,
    });
  }

  return appendNewSection(body, heading, hunk.afterText);
}

function applyConflictNote(body: string, hunk: PatchHunkArtifact) {
  return applyCreateSection(body, {
    ...hunk,
    sectionHeading: hunk.sectionHeading ?? "Counterpoints",
  });
}

export function applyPatchHunksToMarkdownBody(
  body: string,
  hunks: PatchHunkArtifact[],
) {
  let nextBody = body;

  for (const hunk of hunks) {
    switch (hunk.operation) {
      case "append":
        nextBody = applyAppend(nextBody, hunk);
        break;
      case "insert":
        nextBody = applyInsert(nextBody, hunk);
        break;
      case "replace":
        nextBody = applyReplace(nextBody, hunk);
        break;
      case "create_section":
        nextBody = applyCreateSection(nextBody, hunk);
        break;
      case "note_conflict":
        nextBody = applyConflictNote(nextBody, hunk);
        break;
      default:
        throw new AppError(
          `Unsupported patch operation: ${String(hunk.operation)}`,
          400,
          "unsupported_patch_operation",
        );
    }
  }

  return nextBody.replace(/\s+$/, "") + "\n";
}

function updateFrontmatterForApply(params: {
  frontmatter: WikiFrontmatter;
  proposal: ReviewProposalDetail;
  currentPageId: string | null;
}) {
  const relatedPageRefs = params.proposal.artifact?.targetPages
    .filter((page) => page.pageId !== params.currentPageId)
    .map((page) => page.title) ?? [];
  const sourceRefs = uniqueValues([
    ...params.frontmatter.source_refs,
    params.proposal.source?.id ?? "",
  ]);
  const pageRefs = uniqueValues([
    ...params.frontmatter.page_refs,
    ...relatedPageRefs,
  ]);

  return {
    ...params.frontmatter,
    status: params.frontmatter.status === "draft" ? "active" : params.frontmatter.status,
    review_status: "approved",
    source_refs: sourceRefs,
    page_refs: pageRefs,
    updated_at: new Date().toISOString(),
  } satisfies WikiFrontmatter;
}

export async function applyPatchProposal(
  workspaceRoot: string,
  proposal: ReviewProposalDetail,
): Promise<PatchApplyResult> {
  if (!proposal.artifact) {
    throw new AppError(
      "Patch proposal artifact is missing.",
      409,
      "review_artifact_missing",
    );
  }

  let targetPageId = proposal.targetPage?.id ?? null;
  let targetPagePath = proposal.targetPage?.path ?? null;
  let rawContentForApply: string | null = null;

  if (proposal.proposalType === "create_page") {
    if (!proposal.artifact.proposedPage) {
      throw new AppError(
        "Create-page proposals require proposed page metadata.",
        409,
        "create_page_metadata_missing",
      );
    }

    const renderedPage = await renderWikiPageTemplate({
      workspaceRoot,
      type: proposal.artifact.proposedPage.pageType,
      title: proposal.artifact.proposedPage.title,
    });

    targetPagePath = renderedPage.relativePath;
    rawContentForApply = renderedPage.rawContent;
  }

  if (!targetPagePath) {
    throw new AppError(
      "A target wiki page is required to apply this proposal.",
      409,
      "review_target_page_missing",
    );
  }

  const currentRawContent =
    rawContentForApply ??
    (targetPageId ? (await getWikiPageDetail(workspaceRoot, targetPageId)).rawContent : null);

  if (!currentRawContent) {
    throw new AppError(
      "No wiki content is available for patch apply.",
      409,
      "review_target_page_missing",
    );
  }

  const parsed = parseWikiDocument({
    rawContent: currentRawContent,
    relativePath: targetPagePath,
  });
  const nextBody = applyPatchHunksToMarkdownBody(parsed.body, proposal.hunks);
  const nextFrontmatter = updateFrontmatterForApply({
    frontmatter: parsed.frontmatter,
    proposal,
    currentPageId: targetPageId,
  });
  const nextRawContent = serializeWikiDocument(nextFrontmatter, nextBody);

  if (targetPageId) {
    await updateWikiPage({
      workspaceRoot,
      pageId: targetPageId,
      rawContent: nextRawContent,
    });
  } else {
    await writeWikiMarkdownFile(workspaceRoot, targetPagePath, nextRawContent);
    await syncWikiIndex(workspaceRoot);
    const { db, workspace } = await getWorkspaceContext(workspaceRoot);
    const createdPage = await db.query.wikiPages.findFirst({
      where: and(eq(wikiPages.workspaceId, workspace.id), eq(wikiPages.path, targetPagePath)),
    });

    if (!createdPage) {
      throw new AppError(
        "The newly created wiki page could not be indexed.",
        500,
        "wiki_page_index_missing",
      );
    }

    targetPageId = createdPage.id;
  }

  await refreshWikiPageSearchIndex(workspaceRoot);

  return {
    appliedPageId: targetPageId!,
    appliedPagePath: targetPagePath,
    affectedPaths: [targetPagePath],
  };
}
