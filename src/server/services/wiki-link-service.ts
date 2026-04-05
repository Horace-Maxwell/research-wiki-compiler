import type { WikiPageSummary, WikilinkToken } from "@/lib/contracts/wiki";

const wikilinkPattern = /\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g;

type ResolveCandidate = Pick<
  WikiPageSummary,
  "id" | "title" | "canonicalTitle" | "slug" | "aliases"
>;

export function parseWikilinks(markdown: string): WikilinkToken[] {
  const tokens: WikilinkToken[] = [];

  for (const match of markdown.matchAll(wikilinkPattern)) {
    const raw = match[0];
    const target = match[1]?.trim() ?? "";
    const alias = match[2]?.trim() ?? null;

    if (!raw || !target || match.index === undefined) {
      continue;
    }

    tokens.push({
      raw,
      target,
      alias,
      displayText: alias ?? target,
      start: match.index,
      end: match.index + raw.length,
    });
  }

  return tokens;
}

function normalizeLookupValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildWikiHref(workspaceRoot: string, pageId: string) {
  const params = new URLSearchParams({
    workspaceRoot,
    pageId,
  });

  return `/wiki?${params.toString()}`;
}

function resolveByField(
  target: string,
  pages: ResolveCandidate[],
  selector: (page: ResolveCandidate) => string | string[],
) {
  const normalizedTarget = normalizeLookupValue(target);

  const matches = pages.filter((page) => {
    const values = selector(page);

    if (Array.isArray(values)) {
      return values.some((value) => normalizeLookupValue(value) === normalizedTarget);
    }

    return normalizeLookupValue(values) === normalizedTarget;
  });

  return matches.length === 1 ? matches[0] : null;
}

export function resolveWikiLinkTarget(
  target: string,
  pages: ResolveCandidate[],
  workspaceRoot: string,
) {
  const titleMatch = resolveByField(target, pages, (page) => [page.title, page.canonicalTitle]);

  if (titleMatch) {
    return {
      targetPageId: titleMatch.id,
      targetTitle: titleMatch.title,
      resolutionKind: "title" as const,
      href: buildWikiHref(workspaceRoot, titleMatch.id),
    };
  }

  const slugMatch = resolveByField(target, pages, (page) => page.slug);

  if (slugMatch) {
    return {
      targetPageId: slugMatch.id,
      targetTitle: slugMatch.title,
      resolutionKind: "slug" as const,
      href: buildWikiHref(workspaceRoot, slugMatch.id),
    };
  }

  const aliasMatches = pages.filter((page) =>
    page.aliases.some((alias) => normalizeLookupValue(alias) === normalizeLookupValue(target)),
  );

  if (aliasMatches.length === 1) {
    return {
      targetPageId: aliasMatches[0].id,
      targetTitle: aliasMatches[0].title,
      resolutionKind: "alias" as const,
      href: buildWikiHref(workspaceRoot, aliasMatches[0].id),
    };
  }

  return aliasMatches.length > 1 ? { reason: "ambiguous" as const } : { reason: "missing" as const };
}

