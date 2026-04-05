import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { recallCandidatePages } from "@/server/services/candidate-page-recall-service";
import { getSourceDetail, importSource } from "@/server/services/source-service";
import { summarizeSource } from "@/server/services/source-summary-service";
import { updateWorkspaceLlmSettings } from "@/server/services/settings-service";
import {
  createWikiPage,
  updateWikiPage,
} from "@/server/services/wiki-page-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

describe("candidate page recall service", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-recall-workspace-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Recall Workspace",
      initializeGit: false,
    });

    await updateWorkspaceLlmSettings(workspaceRoot, {
      provider: "openai",
      model: null,
      openai: {
        apiKey: "sk-test",
        model: "gpt-test",
      },
      anthropic: {
        apiKey: null,
        model: null,
      },
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("ranks strongly matching wiki pages ahead of unrelated pages and filters low-signal results", async () => {
    const conceptPage = await createWikiPage({
      workspaceRoot,
      type: "concept",
      title: "Local-first software",
    });
    const unrelatedPage = await createWikiPage({
      workspaceRoot,
      type: "topic",
      title: "Gardening notes",
    });

    await updateWikiPage({
      workspaceRoot,
      pageId: conceptPage.id,
      rawContent: conceptPage.rawContent.replace(
        "## Summary\n\nTBD\n",
        [
          "## Summary",
          "",
          "Ink & Switch popularized research about local-first software and visible data ownership.",
          "",
          "## Evidence",
          "",
          "This page tracks concepts around local-first software, visible review, and durable knowledge bases.",
          "",
        ].join("\n"),
      ),
    });
    await updateWikiPage({
      workspaceRoot,
      pageId: unrelatedPage.id,
      rawContent: unrelatedPage.rawContent.replace(
        "## Summary\n\nTBD\n",
        "## Summary\n\nCompletely unrelated notes about compost, seedlings, and watering.\n",
      ),
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  conciseSummary: "A source connecting local-first software with visible review workflows.",
                  keyEntities: [
                    {
                      name: "Ink & Switch",
                      description: "Research group referenced by the source.",
                      aliases: [],
                    },
                  ],
                  keyConcepts: [
                    {
                      name: "Local-first software",
                      description: "Software that keeps user data local and inspectable.",
                    },
                  ],
                  majorClaims: [
                    {
                      text: "Local-first software benefits from visible review workflows.",
                      polarity: "supports",
                      evidenceStrength: "medium",
                      rationale: "The source ties local ownership to reviewability.",
                    },
                  ],
                  openQuestions: [],
                  possibleTargetPageHints: [
                    {
                      title: "Local-first software",
                      pageType: "concept",
                      rationale: "The source centers this concept directly.",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    const imported = await importSource({
      workspaceRoot,
      importKind: "pasted_text",
      title: "Visible local-first review",
      filename: "visible-local-first.md",
      text: "# Visible local-first review\n\nInk & Switch linked local-first software to visible review workflows.\n",
    });

    await summarizeSource(workspaceRoot, imported.id);

    const recall = await recallCandidatePages(workspaceRoot, imported.id);
    const topCandidate = recall.candidates[0];

    expect(topCandidate?.title).toBe("Local-first software");
    expect(topCandidate?.reasons.some((reason) => reason.kind === "hint_exact")).toBe(true);
    expect(topCandidate?.reasons.some((reason) => reason.kind === "fts")).toBe(true);
    expect(recall.candidates.some((candidate) => candidate.title === "Gardening notes")).toBe(false);

    const sourceDetail = await getSourceDetail(workspaceRoot, imported.id);

    expect(sourceDetail.summary.status).toBe("completed");
  });
});
