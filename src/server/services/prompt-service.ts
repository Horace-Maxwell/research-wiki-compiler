import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";

import { PROMPT_TEMPLATE_FILES } from "@/lib/constants";
import { AppError } from "@/server/lib/errors";
import { resolveWithinWorkspaceRoot } from "@/server/lib/path-safety";
import { PROMPTS_DIRECTORY } from "@/server/lib/repo-paths";

export async function ensureWorkspacePromptTemplates(workspaceRoot: string) {
  const repoPromptDirectory = PROMPTS_DIRECTORY;

  await Promise.all(
    PROMPT_TEMPLATE_FILES.map(async (fileName) => {
      const sourcePath = path.join(repoPromptDirectory, fileName);
      const targetPath = resolveWithinWorkspaceRoot(workspaceRoot, "prompts", fileName);

      try {
        await fs.access(targetPath);
      } catch {
        await fs.copyFile(sourcePath, targetPath);
      }
    }),
  );
}

export async function readPromptTemplate(fileName: (typeof PROMPT_TEMPLATE_FILES)[number]) {
  const promptPath = path.join(PROMPTS_DIRECTORY, fileName);

  try {
    return await fs.readFile(promptPath, "utf8");
  } catch (error) {
    throw new AppError(
      `Prompt template not found: ${fileName}`,
      500,
      "missing_prompt_template",
      error,
    );
  }
}

export async function readWorkspacePromptTemplate(
  workspaceRoot: string,
  fileName: (typeof PROMPT_TEMPLATE_FILES)[number],
) {
  const workspacePromptPath = resolveWithinWorkspaceRoot(workspaceRoot, "prompts", fileName);

  try {
    return await fs.readFile(workspacePromptPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return readPromptTemplate(fileName);
    }

    throw new AppError(
      `Failed to read workspace prompt template: ${fileName}`,
      500,
      "workspace_prompt_template_read_failed",
      error,
    );
  }
}

export function hashPromptTemplate(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

export function extractPromptVersion(content: string) {
  const match = content.match(/^Version:\s*`?([^`\n]+)`?/m);

  return match?.[1]?.trim() ?? "unversioned";
}
