import fs from "node:fs/promises";

import simpleGit from "simple-git";

export async function ensureWorkspaceGitRepository(workspaceRoot: string) {
  const git = simpleGit(workspaceRoot);
  const isRepo = await git.checkIsRepo();

  if (!isRepo) {
    await git.init();
  }

  return {
    initialized: !isRepo,
    isRepository: true,
  };
}

export async function isGitRepository(workspaceRoot: string) {
  try {
    await fs.access(`${workspaceRoot}/.git`);
    return true;
  } catch {
    return false;
  }
}

export type GitCommitResult = {
  attempted: boolean;
  success: boolean | null;
  commitHash: string | null;
  message: string | null;
};

export async function commitWorkspaceFiles(params: {
  workspaceRoot: string;
  relativePaths: string[];
  message: string;
}): Promise<GitCommitResult> {
  const git = simpleGit(params.workspaceRoot);
  const isRepo = await git.checkIsRepo();

  if (!isRepo) {
    return {
      attempted: true,
      success: false,
      commitHash: null,
      message: "Workspace is not a git repository.",
    };
  }

  try {
    const uniquePaths = [...new Set(params.relativePaths.filter(Boolean))];

    if (uniquePaths.length > 0) {
      await git.raw(["add", "-A", ...uniquePaths]);
    }

    const commitResult = await git.commit(params.message);

    return {
      attempted: true,
      success: true,
      commitHash: commitResult.commit,
      message: null,
    };
  } catch (error) {
    return {
      attempted: true,
      success: false,
      commitHash: null,
      message: error instanceof Error ? error.message : "Git commit failed.",
    };
  }
}
