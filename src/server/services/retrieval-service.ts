import path from "node:path";

import { eq, inArray } from "drizzle-orm";

import { sourceSummaryArtifactSchema } from "@/lib/contracts/source-summary";
import { getWorkspaceDatabase } from "@/server/db/client";
import { sourceChunks, sourceDocuments, wikiPages } from "@/server/db/schema";
import { readWikiMarkdownFile } from "@/server/services/wiki-file-service";
import { parseWikiDocument } from "@/server/services/wiki-frontmatter-service";
import { readSourceSummaryArtifactJson } from "@/server/services/source-summary-file-service";
import { refreshWikiPageSearchIndex } from "@/server/services/candidate-page-recall-service";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";

export type RetrievedWikiPage = {
  referenceId: string;
  pageId: string;
  title: string;
  slug: string;
  path: string;
  type: string;
  score: number;
  excerpt: string;
  sourceRefs: string[];
  pageRefs: string[];
};

export type RetrievedSourceSummary = {
  referenceId: string;
  sourceId: string;
  sourceTitle: string;
  score: number;
  conciseSummary: string;
  claims: string[];
  normalizedPath: string | null;
};

export type RetrievedRawChunk = {
  referenceId: string;
  chunkId: string;
  sourceId: string;
  sourceTitle: string;
  chunkIndex: number;
  score: number;
  content: string;
  startOffset: number | null;
  endOffset: number | null;
};

export type RetrievalResult = {
  question: string;
  wikiPages: RetrievedWikiPage[];
  sourceSummaries: RetrievedSourceSummary[];
  rawChunks: RetrievedRawChunk[];
  policy: {
    order: ["wiki_pages", "source_summaries", "raw_chunks"];
    usedSummaryFallback: boolean;
    usedChunkFallback: boolean;
  };
};

const MAX_WIKI_RESULTS = 4;
const MAX_SUMMARY_RESULTS = 4;
const MAX_CHUNK_RESULTS = 4;
const QUESTION_STOPWORDS = new Set([
  "what",
  "when",
  "where",
  "why",
  "how",
  "does",
  "did",
  "done",
  "doing",
  "which",
  "who",
  "whom",
  "whose",
  "could",
  "should",
  "would",
  "about",
  "into",
  "from",
  "with",
  "that",
  "this",
  "these",
  "those",
  "there",
  "their",
  "have",
  "has",
  "had",
  "were",
  "was",
  "will",
]);

function normalizeValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeValue(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function computeTokenOverlap(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function buildSearchTerms(question: string) {
  const tokens = uniqueValues(
    tokenize(question).filter(
      (token) => token.length >= 4 && !QUESTION_STOPWORDS.has(token),
    ),
  );

  return tokens.length > 0 ? tokens : [normalizeValue(question)];
}

function countMatchedTerms(terms: string[], text: string) {
  if (terms.length === 0) {
    return 0;
  }

  const textTokens = new Set(tokenize(text));

  return terms.reduce((count, term) => {
    return textTokens.has(term) ? count + 1 : count;
  }, 0);
}

function escapeFtsPhrase(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildExcerpt(text: string, question: string, maxLength = 420) {
  const normalizedText = text.replace(/\s+/g, " ").trim();

  if (!normalizedText) {
    return "";
  }

  const terms = buildSearchTerms(question);
  const matchTerm = terms.find((term) => normalizeValue(normalizedText).includes(term));

  if (!matchTerm || normalizedText.length <= maxLength) {
    return normalizedText.slice(0, maxLength).trimEnd();
  }

  const lowerText = normalizedText.toLowerCase();
  const index = lowerText.indexOf(matchTerm.toLowerCase());

  if (index === -1) {
    return normalizedText.slice(0, maxLength).trimEnd();
  }

  const start = Math.max(0, index - Math.floor(maxLength / 3));
  const end = Math.min(normalizedText.length, start + maxLength);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < normalizedText.length ? "..." : "";

  return `${prefix}${normalizedText.slice(start, end).trim()}${suffix}`;
}

async function retrieveWikiPages(workspaceRoot: string, question: string) {
  await refreshWikiPageSearchIndex(workspaceRoot);

  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } =
    await getWorkspaceContext(workspaceRoot);
  const dbPath = path.join(normalizedWorkspaceRoot, ".research-wiki", "app.db");
  const { sqlite } = getWorkspaceDatabase(dbPath);
  const candidateScores = new Map<string, number>();
  const searchTerms = buildSearchTerms(question);

  const searchStatement = sqlite.prepare(`
    SELECT page_id as pageId, bm25(wiki_pages_fts, 2.0, 1.7, 1.5, 1.2, 1.0, 0.8, 0.6, 0.5) as rank
    FROM wiki_pages_fts
    WHERE wiki_pages_fts MATCH ? AND workspace_id = ?
    ORDER BY rank
    LIMIT 10
  `);

  for (const term of searchTerms) {
    const rows = searchStatement.all(
      escapeFtsPhrase(term),
      workspace.id,
    ) as Array<{ pageId: string; rank: number }>;

    rows.forEach((row, index) => {
      const rankScore = Number((Math.max(1.1, 4 - index * 0.45)).toFixed(2));
      candidateScores.set(row.pageId, (candidateScores.get(row.pageId) ?? 0) + rankScore);
    });
  }

  if (candidateScores.size === 0) {
    return [] as RetrievedWikiPage[];
  }

  const candidateIds = [...candidateScores.keys()];
  const pages = await db.query.wikiPages.findMany({
    where: inArray(wikiPages.id, candidateIds),
  });

  const scoredPages = await Promise.all(
    pages.map(async (page) => {
      const rawContent = await readWikiMarkdownFile(normalizedWorkspaceRoot, page.path);
      const parsed = parseWikiDocument({
        rawContent,
        relativePath: page.path,
      });
      const matchedTerms = countMatchedTerms(
        searchTerms,
        [
          page.title,
          page.canonicalTitle,
          page.slug.replace(/-/g, " "),
          ...page.aliasesJson,
          parsed.body,
        ].join(" "),
      );
      const requiredMatchedTerms = Math.min(page.type === "index" ? 4 : 3, searchTerms.length);
      const titleMatchScore = computeTokenOverlap(
        question,
        [page.title, page.canonicalTitle, page.slug.replace(/-/g, " "), ...page.aliasesJson].join(
          " ",
        ),
      );
      const contentScore = computeTokenOverlap(question, `${page.title} ${parsed.body}`);
      const totalScore = Number(
        ((candidateScores.get(page.id) ?? 0) + contentScore * 4).toFixed(2),
      );

      return {
        referenceId: `wiki_page:${page.id}`,
        pageId: page.id,
        title: page.title,
        slug: page.slug,
        path: page.path,
        type: page.type,
        score: totalScore,
        matchedTerms,
        requiredMatchedTerms,
        titleMatchScore,
        excerpt: buildExcerpt(parsed.body, question),
        sourceRefs: page.sourceRefsJson,
        pageRefs: page.pageRefsJson,
      };
    }),
  );

  return scoredPages
    .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
    .slice(0, MAX_WIKI_RESULTS)
    .filter((page) => {
      const hasEnoughTermCoverage = page.matchedTerms >= page.requiredMatchedTerms;
      const hasStrongTitleMatch = page.titleMatchScore >= 0.5;

      return page.score >= 1.5 && (hasEnoughTermCoverage || hasStrongTitleMatch);
    })
    .map((page) => ({
      referenceId: page.referenceId,
      pageId: page.pageId,
      title: page.title,
      slug: page.slug,
      path: page.path,
      type: page.type,
      score: page.score,
      excerpt: page.excerpt,
      sourceRefs: page.sourceRefs,
      pageRefs: page.pageRefs,
    }));
}

async function loadSummarySearchRows(workspaceRoot: string) {
  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } =
    await getWorkspaceContext(workspaceRoot);
  const sources = await db.query.sourceDocuments.findMany({
    where: eq(sourceDocuments.workspaceId, workspace.id),
    orderBy: (table, { asc }) => [asc(table.title)],
  });

  const rows = await Promise.all(
    sources
      .filter((source) => source.summaryStatus === "completed" && source.summaryJsonPath)
      .map(async (source) => {
        const rawArtifact = await readSourceSummaryArtifactJson(
          normalizedWorkspaceRoot,
          source.summaryJsonPath,
        );

        if (!rawArtifact) {
          return null;
        }

        const artifact = sourceSummaryArtifactSchema.parse(rawArtifact);

        return {
          sourceId: source.id,
          sourceTitle: source.title,
          normalizedPath: source.normalizedPath,
          searchText: normalizeValue(
            [
              source.title,
              artifact.content.conciseSummary,
              ...artifact.content.keyEntities.map((entity) => entity.name),
              ...artifact.content.keyConcepts.map((concept) => concept.name),
              ...artifact.content.majorClaims.map((claim) => claim.text),
            ].join(" "),
          ),
          conciseSummary: artifact.content.conciseSummary,
          claims: artifact.content.majorClaims.map((claim) => claim.text),
        };
      }),
  );

  return {
    db,
    workspace,
    workspaceRoot: normalizedWorkspaceRoot,
    rows: rows.filter((row): row is NonNullable<typeof row> => Boolean(row)),
  };
}

function rebuildSummaryFtsIndex(params: {
  workspaceRoot: string;
  workspaceId: string;
  rows: Array<{
    sourceId: string;
    sourceTitle: string;
    searchText: string;
    conciseSummary: string;
    claims: string[];
  }>;
}) {
  const dbPath = path.join(params.workspaceRoot, ".research-wiki", "app.db");
  const { sqlite } = getWorkspaceDatabase(dbPath);

  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS source_summaries_fts
    USING fts5(
      workspace_id UNINDEXED,
      source_id UNINDEXED,
      title,
      summary,
      claims,
      search_text
    );
  `);

  const deleteStatement = sqlite.prepare("DELETE FROM source_summaries_fts WHERE workspace_id = ?");
  const insertStatement = sqlite.prepare(`
    INSERT INTO source_summaries_fts (
      workspace_id,
      source_id,
      title,
      summary,
      claims,
      search_text
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transaction = sqlite.transaction(() => {
    deleteStatement.run(params.workspaceId);

    for (const row of params.rows) {
      insertStatement.run(
        params.workspaceId,
        row.sourceId,
        row.sourceTitle,
        row.conciseSummary,
        row.claims.join(" "),
        row.searchText,
      );
    }
  });

  transaction();

  return sqlite;
}

async function retrieveSourceSummaries(
  workspaceRoot: string,
  question: string,
  preferredSourceIds: string[],
  wikiPages: RetrievedWikiPage[],
) {
  const context = await loadSummarySearchRows(workspaceRoot);

  if (context.rows.length === 0) {
    return [] as RetrievedSourceSummary[];
  }

  const sqlite = rebuildSummaryFtsIndex({
    workspaceRoot: context.workspaceRoot,
    workspaceId: context.workspace.id,
    rows: context.rows,
  });
  const searchTerms = buildSearchTerms(question);
  const candidateScores = new Map<string, number>();
  const preferredSet = new Set(preferredSourceIds);
  const linkedSet = new Set(wikiPages.flatMap((page) => page.sourceRefs));
  const searchStatement = sqlite.prepare(`
    SELECT source_id as sourceId, bm25(source_summaries_fts, 2.0, 1.5, 1.2, 0.9) as rank
    FROM source_summaries_fts
    WHERE source_summaries_fts MATCH ? AND workspace_id = ?
    ORDER BY rank
    LIMIT 10
  `);

  for (const term of searchTerms) {
    const rows = searchStatement.all(
      escapeFtsPhrase(term),
      context.workspace.id,
    ) as Array<{ sourceId: string; rank: number }>;

    rows.forEach((row, index) => {
      const rankScore = Number((Math.max(1, 3.6 - index * 0.4)).toFixed(2));
      candidateScores.set(row.sourceId, (candidateScores.get(row.sourceId) ?? 0) + rankScore);
    });
  }

  const scored = context.rows.map((row) => {
    const overlapScore = computeTokenOverlap(question, row.searchText) * 4;
    const preferredBoost = preferredSet.has(row.sourceId) ? 1.6 : linkedSet.has(row.sourceId) ? 1 : 0;
    const totalScore = Number(
      ((candidateScores.get(row.sourceId) ?? 0) + overlapScore + preferredBoost).toFixed(2),
    );

    return {
      referenceId: `source_summary:${row.sourceId}`,
      sourceId: row.sourceId,
      sourceTitle: row.sourceTitle,
      score: totalScore,
      conciseSummary: row.conciseSummary,
      claims: row.claims,
      normalizedPath: row.normalizedPath,
    } satisfies RetrievedSourceSummary;
  });

  return scored
    .sort((left, right) => right.score - left.score || left.sourceTitle.localeCompare(right.sourceTitle))
    .slice(0, MAX_SUMMARY_RESULTS)
    .filter((summary) => summary.score >= 1.25);
}

async function loadChunkSearchRows(workspaceRoot: string) {
  const { db, workspace } = await getWorkspaceContext(workspaceRoot);
  const documents = await db.query.sourceDocuments.findMany({
    where: eq(sourceDocuments.workspaceId, workspace.id),
  });
  const processedDocuments = documents.filter((document) => document.status === "processed");

  if (processedDocuments.length === 0) {
    return {
      workspaceId: workspace.id,
      workspaceRoot,
      rows: [] as Array<{
        chunkId: string;
        sourceId: string;
        sourceTitle: string;
        chunkIndex: number;
        content: string;
        startOffset: number | null;
        endOffset: number | null;
      }>,
    };
  }

  const documentIds = processedDocuments.map((document) => document.id);
  const documentMap = new Map(processedDocuments.map((document) => [document.id, document]));
  const chunks = await db.query.sourceChunks.findMany({
    where: inArray(sourceChunks.documentId, documentIds),
    orderBy: (table, { asc }) => [asc(table.chunkIndex)],
  });

  return {
    workspaceId: workspace.id,
    workspaceRoot,
    rows: chunks
      .map((chunk) => {
        const source = documentMap.get(chunk.documentId);

        if (!source) {
          return null;
        }

        return {
          chunkId: chunk.id,
          sourceId: chunk.documentId,
          sourceTitle: source.title,
          chunkIndex: chunk.chunkIndex,
          content: chunk.content,
          startOffset: chunk.startOffset,
          endOffset: chunk.endOffset,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  };
}

function rebuildChunkFtsIndex(params: {
  workspaceRoot: string;
  workspaceId: string;
  rows: Array<{
    chunkId: string;
    sourceId: string;
    sourceTitle: string;
    content: string;
  }>;
}) {
  const dbPath = path.join(params.workspaceRoot, ".research-wiki", "app.db");
  const { sqlite } = getWorkspaceDatabase(dbPath);

  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS source_chunks_fts
    USING fts5(
      workspace_id UNINDEXED,
      chunk_id UNINDEXED,
      source_id UNINDEXED,
      source_title,
      content
    );
  `);

  const deleteStatement = sqlite.prepare("DELETE FROM source_chunks_fts WHERE workspace_id = ?");
  const insertStatement = sqlite.prepare(`
    INSERT INTO source_chunks_fts (
      workspace_id,
      chunk_id,
      source_id,
      source_title,
      content
    ) VALUES (?, ?, ?, ?, ?)
  `);

  const transaction = sqlite.transaction(() => {
    deleteStatement.run(params.workspaceId);

    for (const row of params.rows) {
      insertStatement.run(
        params.workspaceId,
        row.chunkId,
        row.sourceId,
        row.sourceTitle,
        row.content,
      );
    }
  });

  transaction();

  return sqlite;
}

async function retrieveRawChunks(
  workspaceRoot: string,
  question: string,
  preferredSourceIds: string[],
) {
  const context = await loadChunkSearchRows(workspaceRoot);

  if (context.rows.length === 0) {
    return [] as RetrievedRawChunk[];
  }

  const sqlite = rebuildChunkFtsIndex({
    workspaceRoot: context.workspaceRoot,
    workspaceId: context.workspaceId,
    rows: context.rows,
  });
  const searchTerms = buildSearchTerms(question);
  const candidateScores = new Map<string, number>();
  const preferredSet = new Set(preferredSourceIds);
  const searchStatement = sqlite.prepare(`
    SELECT chunk_id as chunkId, bm25(source_chunks_fts, 1.6, 1.2) as rank
    FROM source_chunks_fts
    WHERE source_chunks_fts MATCH ? AND workspace_id = ?
    ORDER BY rank
    LIMIT 12
  `);

  for (const term of searchTerms) {
    const rows = searchStatement.all(
      escapeFtsPhrase(term),
      context.workspaceId,
    ) as Array<{ chunkId: string; rank: number }>;

    rows.forEach((row, index) => {
      const rankScore = Number((Math.max(0.8, 3.2 - index * 0.35)).toFixed(2));
      candidateScores.set(row.chunkId, (candidateScores.get(row.chunkId) ?? 0) + rankScore);
    });
  }

  const scored = context.rows.map((row) => {
    const overlapScore = computeTokenOverlap(question, row.content) * 4;
    const preferredBoost = preferredSet.has(row.sourceId) ? 1.1 : 0;
    const totalScore = Number(
      ((candidateScores.get(row.chunkId) ?? 0) + overlapScore + preferredBoost).toFixed(2),
    );

    return {
      referenceId: `raw_chunk:${row.chunkId}`,
      chunkId: row.chunkId,
      sourceId: row.sourceId,
      sourceTitle: row.sourceTitle,
      chunkIndex: row.chunkIndex,
      score: totalScore,
      content: buildExcerpt(row.content, question, 380),
      startOffset: row.startOffset,
      endOffset: row.endOffset,
    } satisfies RetrievedRawChunk;
  });

  return scored
    .sort((left, right) => right.score - left.score || left.chunkIndex - right.chunkIndex)
    .slice(0, MAX_CHUNK_RESULTS)
    .filter((chunk) => chunk.score >= 1.2);
}

function shouldUseChunkFallback(
  wikiPages: RetrievedWikiPage[],
  sourceSummaries: RetrievedSourceSummary[],
) {
  const topWikiScore = wikiPages[0]?.score ?? 0;
  const topSummaryScore = sourceSummaries[0]?.score ?? 0;

  return topWikiScore < 3.4 && topSummaryScore < 2.6;
}

export async function retrieveAskContext(
  workspaceRoot: string,
  question: string,
): Promise<RetrievalResult> {
  const wikiPages = await retrieveWikiPages(workspaceRoot, question);
  const preferredSourceIds = uniqueValues(wikiPages.flatMap((page) => page.sourceRefs));
  const sourceSummaries = await retrieveSourceSummaries(
    workspaceRoot,
    question,
    preferredSourceIds,
    wikiPages,
  );
  const usedSummaryFallback = wikiPages.length === 0 && sourceSummaries.length > 0;
  const rawChunks = shouldUseChunkFallback(wikiPages, sourceSummaries)
    ? await retrieveRawChunks(
        workspaceRoot,
        question,
        uniqueValues([...preferredSourceIds, ...sourceSummaries.map((summary) => summary.sourceId)]),
      )
    : [];

  return {
    question,
    wikiPages,
    sourceSummaries,
    rawChunks,
    policy: {
      order: ["wiki_pages", "source_summaries", "raw_chunks"],
      usedSummaryFallback,
      usedChunkFallback: rawChunks.length > 0,
    },
  };
}
