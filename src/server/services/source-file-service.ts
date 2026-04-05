import fs from "node:fs/promises";
import path from "node:path";

import {
  SOURCE_ALLOWED_TEXT_EXTENSIONS,
  type SOURCE_TYPES,
} from "@/lib/constants";
import { AppError } from "@/server/lib/errors";
import { slugifyTitle } from "@/server/lib/slug";
import { resolveWithinWorkspaceRoot } from "@/server/lib/path-safety";

type SourceType = (typeof SOURCE_TYPES)[number];

function getExtension(filename: string) {
  return path.extname(filename).toLowerCase();
}

export function isSupportedTextSourceExtension(filename: string) {
  return SOURCE_ALLOWED_TEXT_EXTENSIONS.includes(
    getExtension(filename) as (typeof SOURCE_ALLOWED_TEXT_EXTENSIONS)[number],
  );
}

export function inferSourceTypeFromFilename(filename: string): SourceType {
  const extension = getExtension(filename);

  if (extension === ".md" || extension === ".markdown" || extension === ".mdown") {
    return "markdown";
  }

  if (extension === ".txt") {
    return "text";
  }

  return "unknown";
}

function sanitizeFilename(input: string) {
  const normalized = input.trim().replace(/[<>:"/\\|?*\u0000-\u001F]+/g, "-");

  return normalized || "source.txt";
}

async function ensureUniqueRelativePath(
  workspaceRoot: string,
  directory: string,
  filename: string,
) {
  const safeFilename = sanitizeFilename(filename);
  const extension = path.extname(safeFilename);
  const basename = safeFilename.slice(0, Math.max(1, safeFilename.length - extension.length));
  let counter = 1;
  let candidate = `${directory}/${safeFilename}`.replace(/\\/g, "/");

  for (;;) {
    try {
      await fs.access(resolveWithinWorkspaceRoot(workspaceRoot, candidate));
      counter += 1;
      candidate = `${directory}/${basename}-${counter}${extension}`.replace(/\\/g, "/");
    } catch {
      return candidate;
    }
  }
}

export async function stageSourceTextInInbox(
  workspaceRoot: string,
  filename: string,
  content: string,
) {
  const relativePath = await ensureUniqueRelativePath(workspaceRoot, "raw/inbox", filename);
  const absolutePath = resolveWithinWorkspaceRoot(workspaceRoot, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");

  return relativePath;
}

export async function stageLocalSourceFileInInbox(workspaceRoot: string, filePath: string) {
  const resolvedExternalPath = path.resolve(filePath);
  const stats = await fs.stat(resolvedExternalPath).catch(() => null);

  if (!stats || !stats.isFile()) {
    throw new AppError(
      `Local file path does not point to a readable file: ${filePath}`,
      400,
      "invalid_source_file_path",
    );
  }

  const filename = path.basename(resolvedExternalPath);
  const relativePath = await ensureUniqueRelativePath(workspaceRoot, "raw/inbox", filename);
  const absolutePath = resolveWithinWorkspaceRoot(workspaceRoot, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.copyFile(resolvedExternalPath, absolutePath);

  return {
    relativePath,
    originalExternalPath: resolvedExternalPath,
  };
}

export async function copyWorkspaceSourceFileToInbox(
  workspaceRoot: string,
  fromRelativePath: string,
) {
  const filename = path.basename(fromRelativePath);
  const nextRelativePath = await ensureUniqueRelativePath(workspaceRoot, "raw/inbox", filename);
  const fromAbsolutePath = resolveWithinWorkspaceRoot(workspaceRoot, fromRelativePath);
  const toAbsolutePath = resolveWithinWorkspaceRoot(workspaceRoot, nextRelativePath);

  await fs.mkdir(path.dirname(toAbsolutePath), { recursive: true });
  await fs.copyFile(fromAbsolutePath, toAbsolutePath);

  return nextRelativePath;
}

export async function readWorkspaceSourceFile(
  workspaceRoot: string,
  relativePath: string,
  encoding: BufferEncoding | null = "utf8",
) {
  const absolutePath = resolveWithinWorkspaceRoot(workspaceRoot, relativePath);

  if (encoding === null) {
    return fs.readFile(absolutePath);
  }

  return fs.readFile(absolutePath, encoding);
}

export async function moveWorkspaceSourceFile(
  workspaceRoot: string,
  fromRelativePath: string,
  destinationDirectory: "raw/processed" | "raw/rejected",
) {
  const filename = path.basename(fromRelativePath);
  const toRelativePath = await ensureUniqueRelativePath(workspaceRoot, destinationDirectory, filename);
  const fromAbsolutePath = resolveWithinWorkspaceRoot(workspaceRoot, fromRelativePath);
  const toAbsolutePath = resolveWithinWorkspaceRoot(workspaceRoot, toRelativePath);

  await fs.mkdir(path.dirname(toAbsolutePath), { recursive: true });
  await fs.rename(fromAbsolutePath, toAbsolutePath);

  return toRelativePath;
}

export async function writeNormalizedSourceFile(
  workspaceRoot: string,
  originalFilename: string,
  sourceType: SourceType,
  content: string,
) {
  const extension = sourceType === "markdown" ? ".md" : ".txt";
  const base = sanitizeFilename(originalFilename).replace(/\.[^.]+$/, "");
  const relativePath = await ensureUniqueRelativePath(
    workspaceRoot,
    "raw/processed",
    `${base}.normalized${extension}`,
  );
  const absolutePath = resolveWithinWorkspaceRoot(workspaceRoot, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");

  return relativePath;
}

export function buildFilenameForPastedText(title: string | undefined, sourceType: SourceType) {
  const stem = slugifyTitle(title?.trim() || "pasted-source") || "pasted-source";
  const extension = sourceType === "markdown" ? ".md" : ".txt";

  return `${stem}${extension}`;
}
