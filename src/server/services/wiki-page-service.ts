import crypto from "node:crypto";
import path from "node:path";

import { and, eq, inArray } from "drizzle-orm";

import type { WikiPageDetail, WikiPageSummary, WikiPageType } from "@/lib/contracts/wiki";
import { AppError } from "@/server/lib/errors";
import { runWorkspaceMigrations } from "@/server/db/client";
import { pageLinks, wikiPages } from "@/server/db/schema";
import { normalizeWorkspaceRoot } from "@/server/lib/path-safety";
import { getWikiFolderFromPath } from "@/server/lib/wiki-paths";
import { parseWikilinks, resolveWikiLinkTarget } from "@/server/services/wiki-link-service";
import {
  createWikiPageFromTemplate,
  discoverWikiMarkdownFiles,
  readWikiMarkdownFile,
  writeWikiMarkdownFile,
} from "@/server/services/wiki-file-service";
import {
  assertWikiDocumentMatchesPath,
  parseWikiDocument,
  serializeWikiDocument,
} from "@/server/services/wiki-frontmatter-service";
import { renderMarkdownToHtml } from "@/server/services/markdown-render-service";
import { requireWorkspaceRecord } from "@/server/services/workspace-service";

function createWikiPageId(workspaceId: string, relativePath: string) {
  return `page_${crypto
    .createHash("sha1")
    .update(`${workspaceId}:${relativePath}`)
    .digest("hex")
    .slice(0, 32)}`;
}

function createWikiLinkId(sourcePageId: string, tokenIndex: number) {
  return `plink_${crypto
    .createHash("sha1")
    .update(`${sourcePageId}:${tokenIndex}`)
    .digest("hex")
    .slice(0, 32)}`;
}

type ParsedIndexedPage = {
  id: string;
  workspaceId: string;
  path: string;
  folder: string;
  title: string;
  canonicalTitle: string;
  slug: string;
  type: WikiPageType;
  aliases: string[];
  tags: string[];
  sourceRefs: string[];
  pageRefs: string[];
  confidence: number;
  status: string;
  reviewStatus: string;
  createdAt: Date;
  updatedAt: Date;
  lastIndexedAt: Date;
  rawContent: string;
  body: string;
};

function mapPageToSummary(
  page: {
    id: string;
    title: string;
    canonicalTitle: string;
    slug: string;
    type: string;
    path: string;
    folder: string;
    aliasesJson: string[];
    tagsJson: string[];
    sourceRefsJson: string[];
    pageRefsJson: string[];
    confidence: number;
    status: string;
    reviewStatus: string;
    updatedAt: Date;
    lastIndexedAt: Date;
  },
  unresolvedOutgoingCount = 0,
): WikiPageSummary {
  return {
    id: page.id,
    title: page.title,
    canonicalTitle: page.canonicalTitle,
    slug: page.slug,
    type: page.type as WikiPageType,
    path: page.path,
    folder: page.folder,
    aliases: page.aliasesJson,
    tags: page.tagsJson,
    sourceRefs: page.sourceRefsJson,
    pageRefs: page.pageRefsJson,
    confidence: page.confidence,
    status: page.status,
    reviewStatus: page.reviewStatus,
    updatedAt: page.updatedAt.toISOString(),
    lastIndexedAt: page.lastIndexedAt.toISOString(),
    unresolvedOutgoingCount,
  };
}

async function getWorkspaceDbContext(workspaceRoot: string) {
  const normalizedWorkspaceRoot = normalizeWorkspaceRoot(workspaceRoot);
  const workspace = await requireWorkspaceRecord(normalizedWorkspaceRoot);
  const dbPath = path.join(normalizedWorkspaceRoot, ".research-wiki", "app.db");
  const db = runWorkspaceMigrations(dbPath);

  return {
    db,
    workspace,
    workspaceRoot: normalizedWorkspaceRoot,
  };
}

async function parseIndexedPages(workspaceRoot: string, workspaceId: string) {
  const relativePaths = await discoverWikiMarkdownFiles(workspaceRoot);
  const indexedAt = new Date();
  const parsedPages: ParsedIndexedPage[] = [];

  for (const relativePath of relativePaths) {
    const rawContent = await readWikiMarkdownFile(workspaceRoot, relativePath);
    const parsed = parseWikiDocument({
      rawContent,
      relativePath,
    });

    parsedPages.push({
      id: createWikiPageId(workspaceId, relativePath),
      workspaceId,
      path: relativePath,
      folder: getWikiFolderFromPath(relativePath),
      title: parsed.frontmatter.title,
      canonicalTitle: parsed.frontmatter.title,
      slug: parsed.frontmatter.slug,
      type: parsed.frontmatter.type,
      aliases: parsed.frontmatter.aliases,
      tags: parsed.frontmatter.tags,
      sourceRefs: parsed.frontmatter.source_refs,
      pageRefs: parsed.frontmatter.page_refs,
      confidence: parsed.frontmatter.confidence,
      status: parsed.frontmatter.status,
      reviewStatus: parsed.frontmatter.review_status,
      createdAt: new Date(parsed.frontmatter.created_at),
      updatedAt: new Date(parsed.frontmatter.updated_at),
      lastIndexedAt: indexedAt,
      rawContent,
      body: parsed.body,
    });
  }

  return parsedPages;
}

export async function syncWikiIndex(workspaceRoot: string) {
  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } = await getWorkspaceDbContext(
    workspaceRoot,
  );
  const parsedPages = await parseIndexedPages(normalizedWorkspaceRoot, workspace.id);
  const existingPages = await db
    .select({
      id: wikiPages.id,
      path: wikiPages.path,
    })
    .from(wikiPages)
    .where(eq(wikiPages.workspaceId, workspace.id));

  const nextPaths = new Set(parsedPages.map((page) => page.path));
  const stalePageIds = existingPages
    .filter((page) => !nextPaths.has(page.path))
    .map((page) => page.id);

  if (stalePageIds.length > 0) {
    await db.delete(wikiPages).where(inArray(wikiPages.id, stalePageIds));
  }

  for (const page of parsedPages) {
    await db
      .insert(wikiPages)
      .values({
        id: page.id,
        workspaceId: page.workspaceId,
        title: page.title,
        canonicalTitle: page.canonicalTitle,
        slug: page.slug,
        type: page.type,
        path: page.path,
        folder: page.folder,
        aliasesJson: page.aliases,
        tagsJson: page.tags,
        sourceRefsJson: page.sourceRefs,
        pageRefsJson: page.pageRefs,
        confidence: page.confidence,
        importanceScore: 0,
        qualityScore: 0,
        sourceCoverageScore: 0,
        reviewStatus: page.reviewStatus,
        status: page.status,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
        lastIndexedAt: page.lastIndexedAt,
      })
      .onConflictDoUpdate({
        target: [wikiPages.workspaceId, wikiPages.path],
        set: {
          id: page.id,
          title: page.title,
          canonicalTitle: page.canonicalTitle,
          slug: page.slug,
          type: page.type,
          folder: page.folder,
          aliasesJson: page.aliases,
          tagsJson: page.tags,
          sourceRefsJson: page.sourceRefs,
          pageRefsJson: page.pageRefs,
          confidence: page.confidence,
          reviewStatus: page.reviewStatus,
          status: page.status,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          lastIndexedAt: page.lastIndexedAt,
        },
      });
  }

  await db.delete(pageLinks).where(eq(pageLinks.workspaceId, workspace.id));

  const pageSummaries = parsedPages.map((page) => ({
    id: page.id,
    title: page.title,
    canonicalTitle: page.canonicalTitle,
    slug: page.slug,
    type: page.type,
    path: page.path,
    folder: page.folder,
    aliases: page.aliases,
    tags: page.tags,
    sourceRefs: page.sourceRefs,
    pageRefs: page.pageRefs,
    confidence: page.confidence,
    status: page.status,
    reviewStatus: page.reviewStatus,
    updatedAt: page.updatedAt.toISOString(),
    lastIndexedAt: page.lastIndexedAt.toISOString(),
    unresolvedOutgoingCount: 0,
  }));

  const linkValues = parsedPages.flatMap((page) => {
    const tokens = parseWikilinks(page.body);

    return tokens.map((token, index) => {
      const resolved = resolveWikiLinkTarget(
        token.target,
        pageSummaries,
        normalizedWorkspaceRoot,
      );

      return {
        id: createWikiLinkId(page.id, index),
        workspaceId: workspace.id,
        sourcePageId: page.id,
        targetPageId: "targetPageId" in resolved ? resolved.targetPageId : null,
        targetTitle: token.target,
        linkText: token.displayText,
        resolutionKind: "resolutionKind" in resolved ? resolved.resolutionKind : null,
        createdAt: new Date(),
      };
    });
  });

  if (linkValues.length > 0) {
    await db.insert(pageLinks).values(linkValues);
  }
}

async function listWikiPagesAfterSync(workspaceRoot: string) {
  const { db, workspace } = await getWorkspaceDbContext(workspaceRoot);
  const pages = await db
    .select()
    .from(wikiPages)
    .where(eq(wikiPages.workspaceId, workspace.id))
    .orderBy(wikiPages.type, wikiPages.title);
  const links = await db
    .select({
      sourcePageId: pageLinks.sourcePageId,
      targetPageId: pageLinks.targetPageId,
    })
    .from(pageLinks)
    .where(eq(pageLinks.workspaceId, workspace.id));
  const unresolvedCounts = new Map<string, number>();

  for (const link of links) {
    if (!link.targetPageId) {
      unresolvedCounts.set(
        link.sourcePageId,
        (unresolvedCounts.get(link.sourcePageId) ?? 0) + 1,
      );
    }
  }

  return pages.map((page) => mapPageToSummary(page, unresolvedCounts.get(page.id) ?? 0));
}

export async function listWikiPages(workspaceRoot: string) {
  await syncWikiIndex(workspaceRoot);
  return listWikiPagesAfterSync(workspaceRoot);
}

export async function getWikiPageDetail(workspaceRoot: string, pageId: string): Promise<WikiPageDetail> {
  await syncWikiIndex(workspaceRoot);

  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } =
    await getWorkspaceDbContext(workspaceRoot);
  const page = await db.query.wikiPages.findFirst({
    where: and(eq(wikiPages.workspaceId, workspace.id), eq(wikiPages.id, pageId)),
  });

  if (!page) {
    throw new AppError("Wiki page not found.", 404, "wiki_page_not_found");
  }

  const rawContent = await readWikiMarkdownFile(workspaceRoot, page.path);
  const parsed = parseWikiDocument({
    rawContent,
    relativePath: page.path,
  });
  const allPages = await listWikiPagesAfterSync(normalizedWorkspaceRoot);
  const outgoingRows = await db
    .select()
    .from(pageLinks)
    .where(and(eq(pageLinks.workspaceId, workspace.id), eq(pageLinks.sourcePageId, pageId)));
  const backlinkRows = await db
    .select({
      sourcePageId: pageLinks.sourcePageId,
      sourceTitle: wikiPages.title,
      sourcePath: wikiPages.path,
    })
    .from(pageLinks)
    .innerJoin(wikiPages, eq(pageLinks.sourcePageId, wikiPages.id))
    .where(and(eq(pageLinks.workspaceId, workspace.id), eq(pageLinks.targetPageId, pageId)));

  const outgoingLinks = outgoingRows
    .filter((row) => row.targetPageId)
    .map((row) => {
      const targetPage = allPages.find((candidate) => candidate.id === row.targetPageId);

      if (!targetPage) {
        return null;
      }

      return {
        id: row.id,
        sourcePageId: row.sourcePageId,
        targetPageId: row.targetPageId!,
        targetTitle: targetPage.title,
        displayText: row.linkText ?? row.targetTitle,
        resolutionKind: (row.resolutionKind ?? "title") as
          | "title"
          | "canonicalTitle"
          | "slug"
          | "alias",
        href: `/wiki?${new URLSearchParams({
          workspaceRoot: normalizedWorkspaceRoot,
          pageId: row.targetPageId!,
        }).toString()}`,
      };
    })
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  const unresolvedLinks = outgoingRows
    .filter((row) => !row.targetPageId)
    .map((row) => {
      const resolution = resolveWikiLinkTarget(
        row.targetTitle,
        allPages,
        normalizedWorkspaceRoot,
      );

      return {
        id: row.id,
        sourcePageId: row.sourcePageId,
        target: row.targetTitle,
        displayText: row.linkText ?? row.targetTitle,
        reason: ("reason" in resolution ? resolution.reason : "missing") ?? "missing",
      };
    });

  const renderedHtml = await renderMarkdownToHtml(
    parsed.body,
    allPages,
    normalizedWorkspaceRoot,
  );
  const backlinks = Array.from(
    new Map(
      backlinkRows.map((row) => [
        row.sourcePageId,
        {
          sourcePageId: row.sourcePageId,
          sourceTitle: row.sourceTitle,
          sourcePath: row.sourcePath,
          href: `/wiki?${new URLSearchParams({
            workspaceRoot: normalizedWorkspaceRoot,
            pageId: row.sourcePageId,
          }).toString()}`,
        },
      ]),
    ).values(),
  );

  return {
    ...mapPageToSummary(page, unresolvedLinks.length),
    rawContent,
    renderedHtml,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
    outgoingLinks,
    backlinks,
    unresolvedLinks,
  };
}

export async function createWikiPage(input: {
  workspaceRoot: string;
  type: Exclude<WikiPageType, "index">;
  title: string;
  slug?: string;
  aliases?: string[];
  tags?: string[];
}) {
  const { workspace, workspaceRoot } = await getWorkspaceDbContext(input.workspaceRoot);
  const created = await createWikiPageFromTemplate({
    ...input,
    workspaceRoot,
  });
  const pageId = createWikiPageId(workspace.id, created.relativePath);

  return getWikiPageDetail(workspaceRoot, pageId);
}

export async function updateWikiPage(input: {
  workspaceRoot: string;
  pageId: string;
  rawContent: string;
}) {
  const { db, workspace, workspaceRoot } = await getWorkspaceDbContext(input.workspaceRoot);
  const existingPage = await db.query.wikiPages.findFirst({
    where: and(eq(wikiPages.workspaceId, workspace.id), eq(wikiPages.id, input.pageId)),
  });

  if (!existingPage) {
    throw new AppError("Wiki page not found.", 404, "wiki_page_not_found");
  }

  const parsed = parseWikiDocument({
    rawContent: input.rawContent,
    relativePath: existingPage.path,
  });

  assertWikiDocumentMatchesPath(existingPage.path, parsed.frontmatter);

  const nextFrontmatter = {
    ...parsed.frontmatter,
    updated_at: new Date().toISOString(),
  };
  const normalizedRawContent = serializeWikiDocument(nextFrontmatter, parsed.body);

  await writeWikiMarkdownFile(workspaceRoot, existingPage.path, normalizedRawContent);

  return getWikiPageDetail(workspaceRoot, input.pageId);
}

export async function refreshWikiPageLinks(workspaceRoot: string, pageId: string) {
  await syncWikiIndex(workspaceRoot);
  return getWikiPageDetail(workspaceRoot, pageId);
}
