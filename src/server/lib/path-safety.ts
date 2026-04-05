import path from "node:path";

import { AppError } from "@/server/lib/errors";

export function normalizeWorkspaceRoot(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new AppError("Workspace path is required.", 400, "invalid_workspace_root");
  }

  const resolved = path.resolve(trimmed);
  const { root } = path.parse(resolved);

  if (resolved === root) {
    throw new AppError(
      "Workspace path cannot be the filesystem root.",
      400,
      "invalid_workspace_root",
    );
  }

  return resolved;
}

export function isPathWithinRoot(rootPath: string, candidatePath: string) {
  const relative = path.relative(rootPath, candidatePath);

  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function resolveWithinWorkspaceRoot(
  workspaceRoot: string,
  ...segments: string[]
) {
  const normalizedRoot = normalizeWorkspaceRoot(workspaceRoot);
  const candidate = path.resolve(/* turbopackIgnore: true */ normalizedRoot, ...segments);

  if (!isPathWithinRoot(normalizedRoot, candidate)) {
    throw new AppError(
      `Resolved path escapes the workspace root: ${candidate}`,
      400,
      "unsafe_workspace_path",
    );
  }

  return candidate;
}
