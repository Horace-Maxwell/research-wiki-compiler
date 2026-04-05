import path from "node:path";

import { eq } from "drizzle-orm";

import type {
  CandidateRecallPage,
  CandidateRecallReason,
  CandidateRecallResult,
} from "@/lib/contracts/review";
import { candidateRecallResultSchema } from "@/lib/contracts/review";
import { AppError } from "@/server/lib/errors";
import { getWorkspaceDatabase } from "@/server/db/client";
import { pageLinks, wikiPages } from "@/server/db/schema";
import { readWikiMarkdownFile } from "@/server/services/wiki-file-service";
import { parseWikiDocument } from "@/server/services/wiki-frontmatter-service";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";
import { syncWikiIndex } from "@/server/services/wiki-page-service";
import { getSourceDetail } from "@/server/services/source-service";

const MAX_RECALL_RESULTS = 8;
const MIN_RECALL_SCORE = 2.5;

type PageContext = {
  id: string;
  title: string;
  canonicalTitle: string;
  slug: string;
  type: CandidateRecallPage["type"];
  path: string;
  aliases: string[];
  tags: string[];
  sourceRefs: string[];
  pageRefs: string[];
  importanceScore: number;
  updatedAt: Date;
  body: string;
  searchText: string;
};

type CandidateAccumulator = {
  page: PageContext;
  score: number;
  reasons: CandidateRecallReason[];
};

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

function uniqueTerms(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const collected: string[] = [];

  for (const value of values) {
    const normalized = normalizeValue(value ?? "");

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    collected.push(value!.trim());
  }

  return collected;
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

function computeFuzzySimilarity(left: string, right: string) {
  const normalizedLeft = normalizeValue(left);
  const normalizedRight = normalizeValue(right);

  if (!normalizedLeft || !normalizedRight || normalizedLeft === normalizedRight) {
    return 0;
  }

  if (
    Math.min(normalizedLeft.length, normalizedRight.length) >= 6 &&
    (normalizedLeft.includes(normalizedRight) || normalizedRight.includes(normalizedLeft))
  ) {
    return 0.78;
  }

  return computeTokenOverlap(normalizedLeft, normalizedRight);
}

function escapeFtsPhrase(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function buildPageSearchText(page: {
  title: string;
  canonicalTitle: string;
  slug: string;
  aliases: string[];
  tags: string[];
  sourceRefs: string[];
  pageRefs: string[];
  body: string;
}) {
  return normalizeValue(
    [
      page.title,
      page.canonicalTitle,
      page.slug.replace(/-/g, " "),
      ...page.aliases,
      ...page.tags,
      ...page.sourceRefs,
      ...page.pageRefs,
      page.body,
    ].join(" "),
  );
}

function addReason(
  candidates: Map<string, CandidateAccumulator>,
  page: PageContext,
  reason: CandidateRecallReason,
) {
  const existing = candidates.get(page.id) ?? {
    page,
    score: 0,
    reasons: [],
  };

  existing.score += reason.score;
  existing.reasons.push(reason);
  candidates.set(page.id, existing);
}

function rebuildWikiPagesFtsIndex(params: {
  workspaceRoot: string;
  workspaceId: string;
  pages: PageContext[];
}) {
  const dbPath = path.join(params.workspaceRoot, ".research-wiki", "app.db");
  const { sqlite } = getWorkspaceDatabase(dbPath);

  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS wiki_pages_fts
    USING fts5(
      workspace_id UNINDEXED,
      page_id UNINDEXED,
      title,
      canonical_title,
      slug,
      aliases,
      tags,
      body,
      page_refs,
      source_refs
    );
  `);

  const deleteStatement = sqlite.prepare("DELETE FROM wiki_pages_fts WHERE workspace_id = ?");
  const insertStatement = sqlite.prepare(`
    INSERT INTO wiki_pages_fts (
      workspace_id,
      page_id,
      title,
      canonical_title,
      slug,
      aliases,
      tags,
      body,
      page_refs,
      source_refs
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = sqlite.transaction((pages: PageContext[]) => {
    deleteStatement.run(params.workspaceId);

    for (const page of pages) {
      insertStatement.run(
        params.workspaceId,
        page.id,
        page.title,
        page.canonicalTitle,
        page.slug.replace(/-/g, " "),
        page.aliases.join(" "),
        page.tags.join(" "),
        page.body,
        page.pageRefs.join(" "),
        page.sourceRefs.join(" "),
      );
    }
  });

  transaction(params.pages);

  return sqlite;
}

async function loadWikiPageContexts(workspaceRoot: string) {
  await syncWikiIndex(workspaceRoot);

  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } =
    await getWorkspaceContext(workspaceRoot);
  const pages = await db.query.wikiPages.findMany({
    where: eq(wikiPages.workspaceId, workspace.id),
    orderBy: (table, { asc }) => [asc(table.title)],
  });
  const pageContexts = await Promise.all(
    pages.map(async (page) => {
      const rawContent = await readWikiMarkdownFile(normalizedWorkspaceRoot, page.path);
      const parsed = parseWikiDocument({
        rawContent,
        relativePath: page.path,
      });

      const context: PageContext = {
        id: page.id,
        title: page.title,
        canonicalTitle: page.canonicalTitle,
        slug: page.slug,
        type: page.type as CandidateRecallPage["type"],
        path: page.path,
        aliases: page.aliasesJson,
        tags: page.tagsJson,
        sourceRefs: page.sourceRefsJson,
        pageRefs: page.pageRefsJson,
        importanceScore: page.importanceScore,
        updatedAt: page.updatedAt,
        body: parsed.body,
        searchText: "",
      };

      context.searchText = buildPageSearchText(context);

      return context;
    }),
  );

  return {
    db,
    workspace,
    workspaceRoot: normalizedWorkspaceRoot,
    pageContexts,
  };
}

export async function refreshWikiPageSearchIndex(workspaceRoot: string) {
  const context = await loadWikiPageContexts(workspaceRoot);

  rebuildWikiPagesFtsIndex({
    workspaceRoot: context.workspaceRoot,
    workspaceId: context.workspace.id,
    pages: context.pageContexts,
  });
}

function searchWikiPagesByFts(params: {
  sqlite: ReturnType<typeof getWorkspaceDatabase>["sqlite"];
  workspaceId: string;
  term: string;
}) {
  const normalizedTerm = normalizeValue(params.term);

  if (!normalizedTerm) {
    return [] as Array<{ pageId: string; rank: number }>;
  }

  const query = params.sqlite.prepare(`
    SELECT page_id as pageId, bm25(wiki_pages_fts, 2.0, 1.7, 1.5, 1.2, 1.0, 0.8, 0.6, 0.5) as rank
    FROM wiki_pages_fts
    WHERE wiki_pages_fts MATCH ? AND workspace_id = ?
    ORDER BY rank
    LIMIT 6
  `);

  return query.all(escapeFtsPhrase(normalizedTerm), params.workspaceId) as Array<{
    pageId: string;
    rank: number;
  }>;
}

function buildSuggestedTerms(source: Awaited<ReturnType<typeof getSourceDetail>>) {
  const artifact = source.summary.artifact;

  if (!artifact) {
    return {
      sourceTitle: "",
      hintTerms: [] as string[],
      entityTerms: [] as string[],
      conceptTerms: [] as string[],
    };
  }

  return {
    sourceTitle: source.title,
    hintTerms: uniqueTerms(artifact.content.possibleTargetPageHints.map((hint) => hint.title)),
    entityTerms: uniqueTerms(
      artifact.content.keyEntities.flatMap((entity) => [entity.name, ...entity.aliases]),
    ),
    conceptTerms: uniqueTerms(artifact.content.keyConcepts.map((concept) => concept.name)),
  };
}

function scoreIdentityMatches(params: {
  pages: PageContext[];
  candidates: Map<string, CandidateAccumulator>;
  terms: string[];
  exactKind: "title_exact" | "hint_exact";
  fuzzyKind: "title_fuzzy" | "hint_fuzzy";
  labelPrefix: string;
}) {
  for (const term of params.terms) {
    const normalizedTerm = normalizeValue(term);

    if (!normalizedTerm) {
      continue;
    }

    for (const page of params.pages) {
      const normalizedTitle = normalizeValue(page.title);
      const normalizedCanonical = normalizeValue(page.canonicalTitle);
      const normalizedSlug = normalizeValue(page.slug.replace(/-/g, " "));
      const normalizedAliases = page.aliases.map((alias) => normalizeValue(alias));

      if (normalizedTitle === normalizedTerm || normalizedCanonical === normalizedTerm) {
        addReason(params.candidates, page, {
          kind: params.exactKind,
          label: `Exact ${params.labelPrefix} match for "${term}"`,
          score: 7,
          matchedValue: term,
        });
        continue;
      }

      if (normalizedSlug === normalizedTerm) {
        addReason(params.candidates, page, {
          kind: "slug_exact",
          label: `Exact slug match for "${term}"`,
          score: 5,
          matchedValue: term,
        });
      }

      if (normalizedAliases.includes(normalizedTerm)) {
        addReason(params.candidates, page, {
          kind: "alias_exact",
          label: `Exact alias match for "${term}"`,
          score: 5,
          matchedValue: term,
        });
      }

      const fuzzyValues = [page.title, page.canonicalTitle, ...page.aliases];
      const bestSimilarity = Math.max(...fuzzyValues.map((value) => computeFuzzySimilarity(term, value)));

      if (bestSimilarity >= 0.55) {
        addReason(params.candidates, page, {
          kind: params.fuzzyKind,
          label: `Fuzzy ${params.labelPrefix} similarity for "${term}"`,
          score: Number((bestSimilarity * 4).toFixed(2)),
          matchedValue: term,
        });
      }
    }
  }
}

function scoreTermOverlap(params: {
  kind: "entity_overlap" | "concept_overlap";
  labelPrefix: string;
  pages: PageContext[];
  candidates: Map<string, CandidateAccumulator>;
  terms: string[];
  score: number;
}) {
  for (const term of params.terms) {
    const normalizedTerm = normalizeValue(term);

    if (!normalizedTerm || normalizedTerm.length < 3) {
      continue;
    }

    for (const page of params.pages) {
      if (!page.searchText.includes(normalizedTerm)) {
        continue;
      }

      addReason(params.candidates, page, {
        kind: params.kind,
        label: `${params.labelPrefix} overlap for "${term}"`,
        score: params.score,
        matchedValue: term,
      });
    }
  }
}

function scoreFtsMatches(params: {
  sqlite: ReturnType<typeof getWorkspaceDatabase>["sqlite"];
  workspaceId: string;
  pages: PageContext[];
  candidates: Map<string, CandidateAccumulator>;
  terms: string[];
}) {
  const pageMap = new Map(params.pages.map((page) => [page.id, page]));

  for (const term of params.terms) {
    const results = searchWikiPagesByFts({
      sqlite: params.sqlite,
      workspaceId: params.workspaceId,
      term,
    });

    results.forEach((result, index) => {
      const page = pageMap.get(result.pageId);

      if (!page) {
        return;
      }

      addReason(params.candidates, page, {
        kind: "fts",
        label: `FTS match for "${term}"`,
        score: Number((Math.max(1.2, 4 - index * 0.6)).toFixed(2)),
        matchedValue: term,
      });
    });
  }
}

function scoreNeighborhood(params: {
  pages: PageContext[];
  links: Array<{ sourcePageId: string; targetPageId: string | null }>;
  candidates: Map<string, CandidateAccumulator>;
}) {
  const pageMap = new Map(params.pages.map((page) => [page.id, page]));
  const seeds = [...params.candidates.values()]
    .filter((candidate) => candidate.score >= 8)
    .map((candidate) => candidate.page.id);

  const seenSeeds = new Set(seeds);

  for (const link of params.links) {
    if (!link.targetPageId) {
      continue;
    }

    if (seenSeeds.has(link.sourcePageId) && !seenSeeds.has(link.targetPageId)) {
      const target = pageMap.get(link.targetPageId);

      if (target) {
        addReason(params.candidates, target, {
          kind: "link_neighborhood",
          label: "Linked from a higher-scoring candidate page",
          score: 1.25,
          matchedValue: link.sourcePageId,
        });
      }
    }

    if (seenSeeds.has(link.targetPageId) && !seenSeeds.has(link.sourcePageId)) {
      const source = pageMap.get(link.sourcePageId);

      if (source) {
        addReason(params.candidates, source, {
          kind: "backlink_neighborhood",
          label: "Backlinks into a higher-scoring candidate page",
          score: 1.25,
          matchedValue: link.targetPageId,
        });
      }
    }
  }
}

function scoreRecencyAndImportance(candidates: Map<string, CandidateAccumulator>) {
  const now = Date.now();

  for (const candidate of candidates.values()) {
    const ageDays = (now - candidate.page.updatedAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays <= 30) {
      candidate.score += 0.5;
      candidate.reasons.push({
        kind: "recency",
        label: "Recently updated wiki page",
        score: 0.5,
        matchedValue: null,
      });
    } else if (ageDays <= 90) {
      candidate.score += 0.25;
      candidate.reasons.push({
        kind: "recency",
        label: "Moderately recent wiki page",
        score: 0.25,
        matchedValue: null,
      });
    }

    if (candidate.page.importanceScore > 0) {
      const importanceScore = Number(Math.min(candidate.page.importanceScore, 2).toFixed(2));

      candidate.score += importanceScore;
      candidate.reasons.push({
        kind: "importance",
        label: "Importance score boost",
        score: importanceScore,
        matchedValue: null,
      });
    }
  }
}

function mapCandidates(candidates: Map<string, CandidateAccumulator>) {
  return [...candidates.values()]
    .filter((candidate) => candidate.score >= MIN_RECALL_SCORE)
    .map((candidate) => ({
      pageId: candidate.page.id,
      title: candidate.page.title,
      canonicalTitle: candidate.page.canonicalTitle,
      slug: candidate.page.slug,
      type: candidate.page.type,
      path: candidate.page.path,
      score: Number(candidate.score.toFixed(2)),
      reasons: [...candidate.reasons].sort((left, right) => right.score - left.score),
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.title.localeCompare(right.title);
    });
}

export async function recallCandidatePages(
  workspaceRoot: string,
  sourceId: string,
): Promise<CandidateRecallResult> {
  const source = await getSourceDetail(workspaceRoot, sourceId);

  if (source.summary.status !== "completed" || !source.summary.artifact) {
    throw new AppError(
      "Only summarized sources can generate candidate wiki recall.",
      400,
      "source_summary_required",
    );
  }

  const {
    db,
    workspace,
    workspaceRoot: normalizedWorkspaceRoot,
    pageContexts,
  } = await loadWikiPageContexts(workspaceRoot);
  const links = await db
    .select({
      sourcePageId: pageLinks.sourcePageId,
      targetPageId: pageLinks.targetPageId,
    })
    .from(pageLinks)
    .where(eq(pageLinks.workspaceId, workspace.id));
  const terms = buildSuggestedTerms(source);
  const candidateMap = new Map<string, CandidateAccumulator>();
  const sqlite = rebuildWikiPagesFtsIndex({
    workspaceRoot: normalizedWorkspaceRoot,
    workspaceId: workspace.id,
    pages: pageContexts,
  });

  scoreIdentityMatches({
    pages: pageContexts,
    candidates: candidateMap,
    terms: [terms.sourceTitle],
    exactKind: "title_exact",
    fuzzyKind: "title_fuzzy",
    labelPrefix: "source title",
  });
  scoreIdentityMatches({
    pages: pageContexts,
    candidates: candidateMap,
    terms: terms.hintTerms,
    exactKind: "hint_exact",
    fuzzyKind: "hint_fuzzy",
    labelPrefix: "page hint",
  });
  scoreTermOverlap({
    kind: "entity_overlap",
    labelPrefix: "Entity",
    pages: pageContexts,
    candidates: candidateMap,
    terms: terms.entityTerms,
    score: 2,
  });
  scoreTermOverlap({
    kind: "concept_overlap",
    labelPrefix: "Concept",
    pages: pageContexts,
    candidates: candidateMap,
    terms: terms.conceptTerms,
    score: 1.75,
  });
  scoreFtsMatches({
    sqlite,
    workspaceId: workspace.id,
    pages: pageContexts,
    candidates: candidateMap,
    terms: uniqueTerms([terms.sourceTitle, ...terms.hintTerms, ...terms.entityTerms, ...terms.conceptTerms]),
  });
  scoreNeighborhood({
    pages: pageContexts,
    links,
    candidates: candidateMap,
  });
  scoreRecencyAndImportance(candidateMap);

  const ranked = mapCandidates(candidateMap);
  const primaryCandidates = ranked.slice(0, MAX_RECALL_RESULTS);

  return candidateRecallResultSchema.parse({
    sourceId: source.id,
    sourceTitle: source.title,
    generatedAt: new Date().toISOString(),
    candidates: primaryCandidates,
    omittedCandidateCount: Math.max(0, ranked.length - primaryCandidates.length),
  });
}
