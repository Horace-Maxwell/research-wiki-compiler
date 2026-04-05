import matter from "gray-matter";

import {
  type WikiFrontmatter,
  wikiFrontmatterSchema,
} from "@/lib/contracts/wiki";
import { AppError } from "@/server/lib/errors";
import { inferWikiPageTypeFromPath } from "@/server/lib/wiki-paths";

type ParseWikiDocumentInput = {
  rawContent: string;
  relativePath?: string;
};

type ParsedWikiDocument = {
  frontmatter: WikiFrontmatter;
  body: string;
};

const orderedFrontmatterKeys: Array<keyof WikiFrontmatter> = [
  "title",
  "slug",
  "type",
  "created_at",
  "updated_at",
  "status",
  "aliases",
  "tags",
  "source_refs",
  "page_refs",
  "confidence",
  "review_status",
];

function normalizeBody(body: string) {
  return body.replace(/\r\n/g, "\n").replace(/\s+$/, "") + "\n";
}

function buildOrderedFrontmatter(frontmatter: WikiFrontmatter) {
  const ordered: Record<string, unknown> = {};

  for (const key of orderedFrontmatterKeys) {
    ordered[key] = frontmatter[key];
  }

  for (const [key, value] of Object.entries(frontmatter)) {
    if (!(key in ordered)) {
      ordered[key] = value;
    }
  }

  return ordered;
}

export function parseWikiDocument({
  rawContent,
  relativePath,
}: ParseWikiDocumentInput): ParsedWikiDocument {
  const parsed = matter(rawContent);
  const validation = wikiFrontmatterSchema.safeParse(parsed.data);

  if (!validation.success) {
    throw new AppError(
      `Invalid wiki frontmatter${relativePath ? ` in ${relativePath}` : ""}.`,
      422,
      "invalid_wiki_frontmatter",
      validation.error.flatten(),
    );
  }

  const frontmatter = validation.data;

  if (relativePath) {
    const inferredType = inferWikiPageTypeFromPath(relativePath);

    if (frontmatter.type !== inferredType) {
      throw new AppError(
        `Frontmatter type '${frontmatter.type}' does not match page path '${relativePath}'.`,
        422,
        "wiki_type_path_mismatch",
      );
    }
  }

  return {
    frontmatter,
    body: normalizeBody(parsed.content),
  };
}

export function assertWikiDocumentMatchesPath(
  relativePath: string,
  frontmatter: WikiFrontmatter,
) {
  const inferredType = inferWikiPageTypeFromPath(relativePath);

  if (frontmatter.type !== inferredType) {
    throw new AppError(
      "Changing a page type through raw markdown editing is not supported here; move the page explicitly instead.",
      422,
      "wiki_type_change_not_supported",
    );
  }

  if (relativePath === "wiki/index.md") {
    if (frontmatter.slug !== "index") {
      throw new AppError(
        "The index page slug must remain 'index'.",
        422,
        "wiki_slug_change_not_supported",
      );
    }

    return;
  }

  const fileSlug = relativePath.split("/").at(-1)?.replace(/\.md$/, "");

  if (!fileSlug || fileSlug !== frontmatter.slug) {
    throw new AppError(
      "Changing a page slug through raw markdown editing is not supported here; rename the page explicitly instead.",
      422,
      "wiki_slug_change_not_supported",
    );
  }
}

export function serializeWikiDocument(frontmatter: WikiFrontmatter, body: string) {
  const orderedFrontmatter = buildOrderedFrontmatter(frontmatter);

  return `${matter.stringify(normalizeBody(body), orderedFrontmatter).trimEnd()}\n`;
}
