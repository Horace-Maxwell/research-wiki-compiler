import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { initializeWorkspace } from "@/server/services/workspace-service";
import {
  discoverWikiMarkdownFiles,
  readWikiMarkdownFile,
  writeWikiMarkdownFile,
} from "@/server/services/wiki-file-service";

describe("wiki file service", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-wiki-files-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Wiki Files Test",
      initializeGit: false,
    });
  });

  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("discovers pages from typed wiki folders", async () => {
    await writeWikiMarkdownFile(
      workspaceRoot,
      "wiki/topics/local-first.md",
      `---
title: Local First
slug: local-first
type: topic
created_at: 2026-04-04T00:00:00.000Z
updated_at: 2026-04-04T00:00:00.000Z
status: draft
aliases: []
tags: []
source_refs: []
page_refs: []
confidence: 0.4
review_status: pending
---

# Local First
`,
    );

    const files = await discoverWikiMarkdownFiles(workspaceRoot);

    expect(files).toContain("wiki/index.md");
    expect(files).toContain("wiki/topics/local-first.md");
  });

  it("reads and writes markdown only within the workspace wiki", async () => {
    const rawContent = `---
title: Notes
slug: notes
type: note
created_at: 2026-04-04T00:00:00.000Z
updated_at: 2026-04-04T00:00:00.000Z
status: draft
aliases: []
tags: []
source_refs: []
page_refs: []
confidence: 0.1
review_status: pending
---

# Notes
`;

    await writeWikiMarkdownFile(workspaceRoot, "wiki/notes/notes.md", rawContent);
    const saved = await readWikiMarkdownFile(workspaceRoot, "wiki/notes/notes.md");

    expect(saved).toContain("title: Notes");
    await expect(
      writeWikiMarkdownFile(workspaceRoot, "../outside.md", rawContent),
    ).rejects.toThrowError("Unsupported wiki page path");
  });
});

