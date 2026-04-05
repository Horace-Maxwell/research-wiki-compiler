import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { retrieveAskContext } from "@/server/services/retrieval-service";
import { summarizeSource } from "@/server/services/source-summary-service";
import { updateWorkspaceLlmSettings } from "@/server/services/settings-service";
import { importSource } from "@/server/services/source-service";
import { createWikiPage, updateWikiPage } from "@/server/services/wiki-page-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

function openAiResponse(payload: unknown) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(payload),
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
  );
}

describe("retrieval service", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-retrieval-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Retrieval Workspace",
      initializeGit: false,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("retrieves wiki pages first when compiled pages are relevant", async () => {
    const page = await createWikiPage({
      workspaceRoot,
      type: "concept",
      title: "Local-first software",
    });

    await updateWikiPage({
      workspaceRoot,
      pageId: page.id,
      rawContent: page.rawContent.replace(
        "## Summary\n\nTBD\n",
        "## Summary\n\nLocal-first software keeps data close to the user and emphasizes durable local state.\n",
      ),
    });

    const result = await retrieveAskContext(
      workspaceRoot,
      "What is local-first software?",
    );

    expect(result.policy.order).toEqual(["wiki_pages", "source_summaries", "raw_chunks"]);
    expect(result.wikiPages.length).toBeGreaterThan(0);
    expect(result.wikiPages[0]?.title).toBe("Local-first software");
    expect(result.policy.usedSummaryFallback).toBe(false);
    expect(result.policy.usedChunkFallback).toBe(false);
  });

  it("falls back to source summaries when the wiki lacks relevant pages", async () => {
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

    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      openAiResponse({
        conciseSummary: "Visible review strengthens local-first research workflows.",
        keyEntities: [],
        keyConcepts: [
          {
            name: "Visible review",
            description: "Review-first knowledge mutation.",
          },
        ],
        majorClaims: [
          {
            text: "Visible review makes local-first research workflows safer to evolve.",
            polarity: "supports",
            evidenceStrength: "high",
            rationale: "The source explicitly connects reviewability to trust.",
          },
        ],
        openQuestions: [],
        possibleTargetPageHints: [],
      }),
    );

    const source = await importSource({
      workspaceRoot,
      importKind: "pasted_text",
      title: "Visible review note",
      text: "Visible review helps local-first research workflows stay trustworthy.",
    });

    await summarizeSource(workspaceRoot, source.id);

    const result = await retrieveAskContext(
      workspaceRoot,
      "Why does visible review matter for local-first research?",
    );

    expect(result.wikiPages).toHaveLength(0);
    expect(result.sourceSummaries.length).toBeGreaterThan(0);
    expect(result.sourceSummaries[0]?.sourceId).toBe(source.id);
    expect(result.policy.usedSummaryFallback).toBe(true);
    expect(result.policy.usedChunkFallback).toBe(false);
  });

  it("falls back to raw chunks only when wiki and summaries are insufficient", async () => {
    const source = await importSource({
      workspaceRoot,
      importKind: "pasted_text",
      title: "Review workflows",
      text: "Review workflows preserve durable local knowledge and make patch proposals easier to inspect.",
    });

    const result = await retrieveAskContext(
      workspaceRoot,
      "How do review workflows preserve durable local knowledge?",
    );

    expect(result.wikiPages).toHaveLength(0);
    expect(result.sourceSummaries).toHaveLength(0);
    expect(result.rawChunks.length).toBeGreaterThan(0);
    expect(result.rawChunks[0]?.sourceId).toBe(source.id);
    expect(result.policy.usedChunkFallback).toBe(true);
  });
});
