import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getWorkspaceStatus,
  initializeWorkspace,
} from "@/server/services/workspace-service";

describe("workspace service integration", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-workspace-init-"));
  });

  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("initializes the local-first workspace tree, prompt files, settings, and database", async () => {
    const status = await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Integration Workspace",
      initializeGit: false,
    });

    expect(status.initialized).toBe(true);
    expect(status.databaseInitialized).toBe(true);
    expect(status.gitInitialized).toBe(false);
    expect(status.settings?.workspaceName).toBe("Integration Workspace");
    expect(status.requiredPaths.every((entry) => entry.exists)).toBe(true);

    await expect(fs.access(path.join(workspaceRoot, "wiki", "index.md"))).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(workspaceRoot, "prompts", "source_summarizer.md")),
    ).resolves.toBeUndefined();
    await expect(
      fs.access(path.join(workspaceRoot, ".research-wiki", "settings.json")),
    ).resolves.toBeUndefined();
  });

  it("re-initializes idempotently and preserves a healthy workspace status", async () => {
    const first = await initializeWorkspace({
      workspaceRoot,
      workspaceName: "First Name",
      initializeGit: false,
    });
    const second = await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Renamed Workspace",
      initializeGit: false,
    });
    const status = await getWorkspaceStatus(workspaceRoot);

    expect(first.workspaceRecord?.id).toBe(second.workspaceRecord?.id);
    expect(status.initialized).toBe(true);
    expect(status.workspaceRecord?.name).toBe("Renamed Workspace");
    expect(status.settings?.workspaceName).toBe("Renamed Workspace");
    expect(status.databaseTables).toContain("workspaces");
  });
});
