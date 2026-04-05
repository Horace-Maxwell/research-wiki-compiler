import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { importSource, getSourceDetail, listSources, reprocessSource } from "@/server/services/source-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

describe("source service integration", () => {
  let workspaceRoot = "";
  let externalRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-sources-workspace-"));
    externalRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-sources-inputs-"));

    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Source Workspace",
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

  it("imports pasted text, normalizes it, persists it, and lists it", async () => {
    const detail = await importSource({
      workspaceRoot,
      importKind: "pasted_text",
      title: "Compiler Notes",
      text: "# Compiler Notes\n\nThis is a pasted source for the compiler.\n",
    });

    expect(detail.status).toBe("processed");
    expect(detail.sourceType).toBe("markdown");
    expect(detail.normalizedPath).toContain("raw/processed");
    expect(detail.chunkCount).toBeGreaterThan(0);

    const normalizedFile = await fs.readFile(
      path.join(workspaceRoot, detail.normalizedPath!),
      "utf8",
    );

    expect(normalizedFile).toContain("Compiler Notes");

    const sources = await listSources({
      workspaceRoot,
    });

    expect(sources).toHaveLength(1);
    expect(sources[0]?.id).toBe(detail.id);

    const fetched = await getSourceDetail(workspaceRoot, detail.id);

    expect(fetched.rawTextExtracted).toContain("pasted source");
    expect(fetched.chunks.length).toBeGreaterThan(0);
  });

  it("moves successful local file imports from inbox to processed", async () => {
    const localFilePath = path.join(externalRoot, "article.txt");
    await fs.writeFile(localFilePath, "Article title\n\nThis is a local source file.\n", "utf8");

    const detail = await importSource({
      workspaceRoot,
      importKind: "local_file_path",
      filePath: localFilePath,
    });

    expect(detail.status).toBe("processed");
    expect(detail.originalPath).toContain("raw/processed");

    const inboxEntries = await fs.readdir(path.join(workspaceRoot, "raw/inbox"));

    expect(inboxEntries).toHaveLength(0);
  });

  it("moves failed imports into rejected and persists rejected records", async () => {
    const detail = await importSource({
      workspaceRoot,
      importKind: "browser_file",
      filename: "scan.pdf",
      content: "%PDF-1.4 fake binary content",
    });

    expect(detail.status).toBe("rejected");
    expect(detail.originalPath).toContain("raw/rejected");
    expect(detail.failureReason).toContain("Unsupported source file type");

    const rejectedEntries = await fs.readdir(path.join(workspaceRoot, "raw/rejected"));

    expect(rejectedEntries.some((entry) => entry.endsWith(".pdf"))).toBe(true);
  });

  it("reprocesses an existing source without drifting into summarization", async () => {
    const detail = await importSource({
      workspaceRoot,
      importKind: "browser_file",
      filename: "notes.txt",
      content: "Original line\n\nBody.\n",
    });

    await fs.writeFile(
      path.join(workspaceRoot, detail.originalPath),
      "Original line\n\nBody changed for reprocess.\n",
      "utf8",
    );

    const reprocessed = await reprocessSource(workspaceRoot, detail.id);

    expect(reprocessed.status).toBe("processed");
    expect(reprocessed.rawTextExtracted).toContain("Body changed for reprocess");
  });

  it("validates source import requests", async () => {
    await expect(
      importSource({
        workspaceRoot,
        importKind: "pasted_text",
        title: "Bad",
        text: "",
      } as never),
    ).rejects.toThrowError("Invalid source import request.");
  });
});
