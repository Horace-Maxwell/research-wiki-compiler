import path from "node:path";

import {
  WIKI_DISCOVERY_ROOTS,
  WIKI_PAGE_TYPE_DIRECTORY_MAP,
} from "@/lib/constants";
import type { WikiPageType } from "@/lib/contracts/wiki";
import { AppError } from "@/server/lib/errors";
import { resolveWithinWorkspaceRoot } from "@/server/lib/path-safety";

export function getWikiRelativePath(type: WikiPageType, slug: string) {
  if (type === "index") {
    return "wiki/index.md";
  }

  return `wiki/${WIKI_PAGE_TYPE_DIRECTORY_MAP[type]}/${slug}.md`;
}

export function inferWikiPageTypeFromPath(relativePath: string): WikiPageType {
  const normalized = relativePath.replace(/\\/g, "/");

  if (normalized === "wiki/index.md") {
    return "index";
  }

  const segments = normalized.split("/");
  const folder = segments[1];

  const entry = Object.entries(WIKI_PAGE_TYPE_DIRECTORY_MAP).find(
    ([type, directory]) => type !== "index" && directory === folder,
  );

  if (!entry) {
    throw new AppError(
      `Cannot infer wiki page type from path: ${relativePath}`,
      400,
      "invalid_wiki_page_path",
    );
  }

  return entry[0] as WikiPageType;
}

export function getWikiFolderFromPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");

  if (normalized === "wiki/index.md") {
    return "wiki";
  }

  return path.posix.dirname(normalized);
}

export function isSupportedWikiPath(relativePath: string) {
  const normalized = relativePath.replace(/\\/g, "/");

  if (normalized === "wiki/index.md") {
    return true;
  }

  return WIKI_DISCOVERY_ROOTS.slice(1).some((root) => normalized.startsWith(`${root}/`));
}

export function resolveWikiFilePath(workspaceRoot: string, relativePath: string) {
  const normalizedRelativePath = relativePath.replace(/\\/g, "/");

  if (!normalizedRelativePath.endsWith(".md") || !isSupportedWikiPath(normalizedRelativePath)) {
    throw new AppError(
      `Unsupported wiki page path: ${relativePath}`,
      400,
      "invalid_wiki_page_path",
    );
  }

  return resolveWithinWorkspaceRoot(workspaceRoot, normalizedRelativePath);
}
