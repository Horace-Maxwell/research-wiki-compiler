import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answerQuestion, getAnswerArtifact } from "@/server/services/answer-service";
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

describe("answer service integration", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-answer-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Answer Workspace",
      initializeGit: false,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("answers from compiled wiki context and persists a cited answer artifact", async () => {
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
        conciseSummary: "Local-first software keeps user data local and visible.",
        keyEntities: [],
        keyConcepts: [
          {
            name: "Local-first software",
            description: "Software that keeps core state local-first.",
          },
        ],
        majorClaims: [
          {
            text: "Local-first software keeps user data visible and under direct control.",
            polarity: "supports",
            evidenceStrength: "high",
            rationale: "The source states that visibility and control are core properties.",
          },
        ],
        openQuestions: [],
        possibleTargetPageHints: [],
      }),
    );

    const source = await importSource({
      workspaceRoot,
      importKind: "pasted_text",
      title: "Local-first note",
      text: "Local-first software keeps user data visible and under direct control.",
    });

    await summarizeSource(workspaceRoot, source.id);

    const page = await createWikiPage({
      workspaceRoot,
      type: "concept",
      title: "Local-first software",
    });

    await updateWikiPage({
      workspaceRoot,
      pageId: page.id,
      rawContent: page.rawContent
        .replace("source_refs: []", `source_refs:\n  - ${source.id}`)
        .replace(
          "## Summary\n\nTBD\n",
          "## Summary\n\nLocal-first software keeps important knowledge and user data visible, inspectable, and close to the user.\n",
        ),
    });

    fetchMock.mockResolvedValueOnce(
      openAiResponse({
        shortAnswer:
          "Local-first software keeps important user state visible and under direct user control.",
        detailedAnswer:
          "The compiled wiki describes local-first software as keeping knowledge and state close to the user, and the supporting source summary reinforces that visibility and direct control are core properties.",
        citations: [
          {
            referenceId: `wiki_page:${page.id}`,
            note: "The concept page directly defines the local-first framing.",
          },
          {
            referenceId: `source_summary:${source.id}`,
            note: "The supporting source summary restates the visibility and control claim.",
          },
        ],
        caveats: ["This answer is grounded in the currently compiled local-first materials only."],
        basedOnPageIds: [page.id],
        followUpQuestions: ["What tradeoffs does local-first software introduce?"],
        insufficientKnowledge: false,
        recommendedSourceTypes: [],
      }),
    );

    const answer = await answerQuestion(
      workspaceRoot,
      "What is local-first software?",
    );

    expect(answer.shortAnswer).toContain("visible");
    expect(answer.citations).toHaveLength(2);
    expect(answer.basedOnPages[0]?.id).toBe(page.id);
    expect(answer.metadata.provider).toBe("openai");
    expect(answer.metadata.retrieval.wikiPageIds).toContain(page.id);
    expect(answer.metadata.retrieval.chunkIds).toHaveLength(0);

    const persisted = await getAnswerArtifact(workspaceRoot, answer.id);

    expect(persisted.id).toBe(answer.id);
    expect(persisted.citations[0]?.referenceId).toBe(`wiki_page:${page.id}`);
  });

  it("persists an insufficient-knowledge answer artifact when nothing relevant is found", async () => {
    const answer = await answerQuestion(
      workspaceRoot,
      "What are the contradictions in the workspace audit findings?",
    );

    expect(answer.metadata.insufficientKnowledge).toBe(true);
    expect(answer.citations).toHaveLength(0);
    expect(answer.followUpQuestions.length).toBeGreaterThan(0);
    expect(answer.metadata.recommendedSourceTypes.length).toBeGreaterThan(0);
  });

  it("rejects answerer output that cites unknown evidence references", async () => {
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

    const page = await createWikiPage({
      workspaceRoot,
      type: "topic",
      title: "Compiled research wiki",
    });

    await updateWikiPage({
      workspaceRoot,
      pageId: page.id,
      rawContent: page.rawContent.replace(
        "## Summary\n\nTBD\n",
        "## Summary\n\nA compiled research wiki maintains durable markdown pages through reviewable mutation.\n",
      ),
    });

    const fetchMock = vi.spyOn(globalThis, "fetch");
    fetchMock.mockResolvedValueOnce(
      openAiResponse({
        shortAnswer: "A compiled research wiki is durable.",
        detailedAnswer: "It keeps durable pages.",
        citations: [
          {
            referenceId: "wiki_page:missing",
            note: "Bad reference.",
          },
        ],
        caveats: [],
        basedOnPageIds: [page.id],
        followUpQuestions: [],
        insufficientKnowledge: false,
        recommendedSourceTypes: [],
      }),
    );

    await expect(
      answerQuestion(workspaceRoot, "What is a compiled research wiki?"),
    ).rejects.toThrowError("unknown evidence id");
  });
});
