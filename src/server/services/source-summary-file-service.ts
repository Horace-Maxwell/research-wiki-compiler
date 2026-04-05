import fs from "node:fs/promises";

import type { SourceSummaryArtifact } from "@/lib/contracts/source-summary";
import { AppError } from "@/server/lib/errors";
import { resolveWithinWorkspaceRoot } from "@/server/lib/path-safety";

function buildSummaryArtifactBaseName(sourceSlug: string, sourceId: string) {
  return `${sourceSlug}-${sourceId}.summary`;
}

export async function writeSourceSummaryArtifacts(params: {
  workspaceRoot: string;
  sourceId: string;
  sourceSlug: string;
  markdown: string;
  artifact: SourceSummaryArtifact;
}) {
  const summariesDirectory = resolveWithinWorkspaceRoot(
    params.workspaceRoot,
    "raw",
    "processed",
    "summaries",
  );
  const baseName = buildSummaryArtifactBaseName(params.sourceSlug, params.sourceId);
  const markdownRelativePath = `raw/processed/summaries/${baseName}.md`;
  const jsonRelativePath = `raw/processed/summaries/${baseName}.json`;
  const markdownAbsolutePath = resolveWithinWorkspaceRoot(params.workspaceRoot, markdownRelativePath);
  const jsonAbsolutePath = resolveWithinWorkspaceRoot(params.workspaceRoot, jsonRelativePath);

  try {
    await fs.mkdir(summariesDirectory, { recursive: true });
    await fs.writeFile(markdownAbsolutePath, `${params.markdown.trim()}\n`, "utf8");
    await fs.writeFile(jsonAbsolutePath, `${JSON.stringify(params.artifact, null, 2)}\n`, "utf8");
  } catch (error) {
    throw new AppError(
      "Failed to persist source summary artifacts.",
      500,
      "source_summary_artifact_write_failed",
      error,
    );
  }

  return {
    markdownPath: markdownRelativePath,
    jsonPath: jsonRelativePath,
  };
}

export async function readSourceSummaryArtifactMarkdown(
  workspaceRoot: string,
  markdownPath: string | null,
) {
  if (!markdownPath) {
    return null;
  }

  try {
    const absolutePath = resolveWithinWorkspaceRoot(workspaceRoot, markdownPath);
    return await fs.readFile(absolutePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw new AppError(
      "Failed to read source summary markdown artifact.",
      500,
      "source_summary_markdown_read_failed",
      error,
    );
  }
}

export async function readSourceSummaryArtifactJson(
  workspaceRoot: string,
  jsonPath: string | null,
) {
  if (!jsonPath) {
    return null;
  }

  try {
    const absolutePath = resolveWithinWorkspaceRoot(workspaceRoot, jsonPath);
    const raw = await fs.readFile(absolutePath, "utf8");
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    throw new AppError(
      "Failed to read source summary JSON artifact.",
      500,
      "source_summary_json_read_failed",
      error,
    );
  }
}
