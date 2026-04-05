import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createWikiPage,
  getWikiPageDetail,
  listWikiPages,
  updateWikiPage,
} from "@/server/services/wiki-page-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

describe("wiki page service integration", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-wiki-pages-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Integration Wiki",
      initializeGit: false,
    });
  });

  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("creates, browses, saves, and back-links wiki pages", async () => {
    const created = await createWikiPage({
      workspaceRoot,
      type: "topic",
      title: "Local First Research",
    });

    expect(created.path).toBe("wiki/topics/local-first-research.md");

    const initialPages = await listWikiPages(workspaceRoot);
    const indexPage = initialPages.find((page) => page.type === "index");

    expect(indexPage).toBeDefined();

    const updated = await updateWikiPage({
      workspaceRoot,
      pageId: created.id,
      rawContent: created.rawContent.replace(
        "## Summary\n\nTBD\n",
        [
          "## Summary",
          "",
          "See [[Integration Wiki]] for the workspace index.",
          "See [[Integration Wiki]] for the workspace overview.",
          "",
        ].join("\n"),
      ),
    });

    expect(updated.outgoingLinks).toHaveLength(2);
    expect(updated.outgoingLinks.every((item) => item.targetTitle === "Integration Wiki")).toBe(
      true,
    );
    expect(updated.renderedHtml).toContain("/wiki?");

    const reloaded = await getWikiPageDetail(workspaceRoot, created.id);

    expect(reloaded.rawContent).toContain("[[Integration Wiki]]");

    const indexDetail = await getWikiPageDetail(workspaceRoot, indexPage!.id);

    expect(indexDetail.backlinks.some((item) => item.sourcePageId === created.id)).toBe(true);
    expect(indexDetail.backlinks.filter((item) => item.sourcePageId === created.id)).toHaveLength(1);

    const rawFile = await fs.readFile(
      path.join(workspaceRoot, "wiki/topics/local-first-research.md"),
      "utf8",
    );

    expect(rawFile).toContain("[[Integration Wiki]]");
  });
});
