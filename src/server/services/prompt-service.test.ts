import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  extractPromptVersion,
  hashPromptTemplate,
  readWorkspacePromptTemplate,
} from "@/server/services/prompt-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

describe("prompt service", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-prompt-workspace-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Prompt Workspace",
      initializeGit: false,
    });
  });

  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("loads the visible workspace source summarizer prompt and hashes it stably", async () => {
    const prompt = await readWorkspacePromptTemplate(workspaceRoot, "source_summarizer.md");

    expect(prompt).toContain("Version: `0.3.0-m3`");
    expect(prompt).toContain("task modes");
    expect(hashPromptTemplate(prompt)).toHaveLength(64);
    expect(hashPromptTemplate(prompt)).toBe(hashPromptTemplate(prompt));
  });

  it("extracts visible prompt versions for later job metadata", () => {
    expect(extractPromptVersion("# Prompt\n\nVersion: `0.4.0-m4`\n")).toBe("0.4.0-m4");
    expect(extractPromptVersion("# Prompt without explicit version")).toBe("unversioned");
  });
});
