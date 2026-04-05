import fs from "node:fs/promises";

import type { ReviewProposalArtifact } from "@/lib/contracts/review";
import { AppError } from "@/server/lib/errors";
import { resolveWithinWorkspaceRoot } from "@/server/lib/path-safety";

function buildProposalArtifactBaseName(sourceSlug: string, proposalId: string) {
  return `${sourceSlug}-${proposalId}.proposal`;
}

export async function writePatchProposalArtifacts(params: {
  workspaceRoot: string;
  sourceSlug: string;
  proposalId: string;
  markdown: string;
  artifact: ReviewProposalArtifact;
  statusFolder?: "pending" | "approved" | "rejected";
}) {
  const statusFolder = params.statusFolder ?? "pending";
  const reviewsDirectory = resolveWithinWorkspaceRoot(
    params.workspaceRoot,
    "reviews",
    statusFolder,
  );
  const baseName = buildProposalArtifactBaseName(params.sourceSlug, params.proposalId);
  const markdownRelativePath = `reviews/${statusFolder}/${baseName}.md`;
  const jsonRelativePath = `reviews/${statusFolder}/${baseName}.json`;
  const markdownAbsolutePath = resolveWithinWorkspaceRoot(params.workspaceRoot, markdownRelativePath);
  const jsonAbsolutePath = resolveWithinWorkspaceRoot(params.workspaceRoot, jsonRelativePath);

  try {
    await fs.mkdir(reviewsDirectory, { recursive: true });
    await fs.writeFile(markdownAbsolutePath, `${params.markdown.trim()}\n`, "utf8");
    await fs.writeFile(jsonAbsolutePath, `${JSON.stringify(params.artifact, null, 2)}\n`, "utf8");
  } catch (error) {
    throw new AppError(
      "Failed to persist patch proposal artifacts.",
      500,
      "patch_proposal_artifact_write_failed",
      error,
    );
  }

  return {
    markdownPath: markdownRelativePath,
    jsonPath: jsonRelativePath,
  };
}

async function removeArtifactIfPresent(workspaceRoot: string, relativePath: string | null) {
  if (!relativePath) {
    return;
  }

  try {
    await fs.rm(resolveWithinWorkspaceRoot(workspaceRoot, relativePath), {
      force: true,
    });
  } catch (error) {
    throw new AppError(
      "Failed to remove an existing patch proposal artifact.",
      500,
      "patch_proposal_artifact_remove_failed",
      error,
    );
  }
}

export async function removePatchProposalArtifacts(params: {
  workspaceRoot: string;
  markdownPath: string | null;
  jsonPath: string | null;
}) {
  await Promise.all([
    removeArtifactIfPresent(params.workspaceRoot, params.markdownPath),
    removeArtifactIfPresent(params.workspaceRoot, params.jsonPath),
  ]);
}

export async function readPatchProposalArtifactMarkdown(
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
      "Failed to read patch proposal markdown artifact.",
      500,
      "patch_proposal_markdown_read_failed",
      error,
    );
  }
}

export async function readPatchProposalArtifactJson(
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
      "Failed to read patch proposal JSON artifact.",
      500,
      "patch_proposal_json_read_failed",
      error,
    );
  }
}
