import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initializeWorkspace } from "@/server/services/workspace-service";
import {
  moveWorkspaceSourceFile,
  readWorkspaceSourceFile,
  stageLocalSourceFileInInbox,
  stageSourceTextInInbox,
  writeNormalizedSourceFile,
} from "@/server/services/source-file-service";

describe("source file service", () => {
  let workspaceRoot = "";
  let externalRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-source-files-"));
    externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-source-external-"));

    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Source Files Test",
      initializeGit: false,
    });
  });

  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }

    if (externalRoot) {
      await fs.rm(externalRoot, { recursive: true, force: true });
    }
  });

  it("stages, reads, moves, and writes normalized source files inside the workspace", async () => {
    const inboxPath = await stageSourceTextInInbox(
      workspaceRoot,
      "compiler-notes.md",
      "# Compiler Notes\n\nVisible raw material.\n",
    );

    expect(inboxPath).toContain("raw/inbox");
    expect(await readWorkspaceSourceFile(workspaceRoot, inboxPath)).toContain("Visible raw material");

    const processedPath = await moveWorkspaceSourceFile(workspaceRoot, inboxPath, "raw/processed");

    expect(processedPath).toContain("raw/processed");

    const normalizedPath = await writeNormalizedSourceFile(
      workspaceRoot,
      "compiler-notes.md",
      "markdown",
      "# Compiler Notes\n\nNormalized body.\n",
    );

    expect(normalizedPath).toContain(".normalized.md");
    expect(await readWorkspaceSourceFile(workspaceRoot, normalizedPath)).toContain("Normalized body");
  });

  it("copies external files into inbox and rejects unsafe workspace reads", async () => {
    const externalFile = path.join(externalRoot, "article.txt");
    await fs.writeFile(externalFile, "External source body.\n", "utf8");

    const staged = await stageLocalSourceFileInInbox(workspaceRoot, externalFile);

    expect(staged.relativePath).toContain("raw/inbox");
    expect(staged.originalExternalPath).toBe(externalFile);
    await expect(readWorkspaceSourceFile(workspaceRoot, "../outside.txt")).rejects.toThrowError(
      "Resolved path escapes the workspace root",
    );
  });
});
