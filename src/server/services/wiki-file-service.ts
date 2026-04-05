import fs from "node:fs/promises";
import path from "node:path";

import type { WikiPageType } from "@/lib/contracts/wiki";
import { AppError } from "@/server/lib/errors";
import { resolveWithinWorkspaceRoot } from "@/server/lib/path-safety";
import { WIKI_TEMPLATE_DIRECTORY } from "@/server/lib/repo-paths";
import { slugifyTitle } from "@/server/lib/slug";
import { getWikiRelativePath, resolveWikiFilePath } from "@/server/lib/wiki-paths";
import {
  parseWikiDocument,
  serializeWikiDocument,
} from "@/server/services/wiki-frontmatter-service";

async function walkMarkdownFiles(rootDirectory: string, prefix: string) {
  const entries = await fs.readdir(rootDirectory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const nextAbsolutePath = path.join(rootDirectory, entry.name);
    const nextRelativePath = `${prefix}/${entry.name}`.replace(/\\/g, "/");

    if (entry.isDirectory()) {
      files.push(...(await walkMarkdownFiles(nextAbsolutePath, nextRelativePath)));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(nextRelativePath);
    }
  }

  return files;
}

export async function discoverWikiMarkdownFiles(workspaceRoot: string) {
  const results: string[] = [];
  const indexPath = resolveWikiFilePath(workspaceRoot, "wiki/index.md");

  try {
    await fs.access(indexPath);
    results.push("wiki/index.md");
  } catch {
    // Leave the index absent if the workspace has not been initialized correctly.
  }

  const typedRoots = [
    "wiki/topics",
    "wiki/entities",
    "wiki/concepts",
    "wiki/timelines",
    "wiki/syntheses",
    "wiki/notes",
  ];

  for (const relativeRoot of typedRoots) {
    const absoluteRoot = resolveWithinWorkspaceRoot(workspaceRoot, relativeRoot);

    try {
      const stats = await fs.stat(absoluteRoot);

      if (!stats.isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    results.push(...(await walkMarkdownFiles(absoluteRoot, relativeRoot)));
  }

  return results.sort((left, right) => left.localeCompare(right));
}

export async function readWikiMarkdownFile(workspaceRoot: string, relativePath: string) {
  return fs.readFile(resolveWikiFilePath(workspaceRoot, relativePath), "utf8");
}

export async function writeWikiMarkdownFile(
  workspaceRoot: string,
  relativePath: string,
  rawContent: string,
) {
  const absolutePath = resolveWikiFilePath(workspaceRoot, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, rawContent, "utf8");
}

type CreatePageFromTemplateInput = {
  workspaceRoot: string;
  type: Exclude<WikiPageType, "index">;
  title: string;
  slug?: string;
  aliases?: string[];
  tags?: string[];
};

export async function renderWikiPageTemplate({
  workspaceRoot,
  type,
  title,
  slug,
  aliases = [],
  tags = [],
}: CreatePageFromTemplateInput) {
  const nextSlug = slug ?? slugifyTitle(title);

  if (!nextSlug) {
    throw new AppError(
      "Could not derive a valid slug from the page title.",
      422,
      "invalid_wiki_page_slug",
    );
  }

  const relativePath = getWikiRelativePath(type, nextSlug);
  const absolutePath = resolveWikiFilePath(workspaceRoot, relativePath);

  try {
    await fs.access(absolutePath);
    throw new AppError(
      `A wiki page already exists at ${relativePath}.`,
      409,
      "wiki_page_already_exists",
    );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  const templatePath = path.join(WIKI_TEMPLATE_DIRECTORY, `${type}.md`);
  const templateRawContent = await fs.readFile(templatePath, "utf8");
  const parsedTemplate = parseWikiDocument({ rawContent: templateRawContent });
  const timestamp = new Date().toISOString();
  const frontmatter = {
    ...parsedTemplate.frontmatter,
    title,
    slug: nextSlug,
    type,
    aliases,
    tags,
    created_at: timestamp,
    updated_at: timestamp,
  };

  const body = parsedTemplate.body.replace(
    new RegExp(`^#\\s+${parsedTemplate.frontmatter.title}$`, "m"),
    `# ${title}`,
  );
  const rawContent = serializeWikiDocument(frontmatter, body);

  return {
    relativePath,
    rawContent,
  };
}

export async function createWikiPageFromTemplate(params: CreatePageFromTemplateInput) {
  const rendered = await renderWikiPageTemplate(params);

  await writeWikiMarkdownFile(params.workspaceRoot, rendered.relativePath, rendered.rawContent);

  return rendered;
}
