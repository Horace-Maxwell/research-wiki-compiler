import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { answerQuestion } from "@/server/services/answer-service";
import { archiveAnswerArtifact } from "@/server/services/answer-archive-service";
import { retrieveAskContext } from "@/server/services/retrieval-service";
import { summarizeSource } from "@/server/services/source-summary-service";
import { updateWorkspaceLlmSettings } from "@/server/services/settings-service";
import { importSource } from "@/server/services/source-service";
import {
  createWikiPage,
  getWikiPageDetail,
  listWikiPages,
  updateWikiPage,
} from "@/server/services/wiki-page-service";
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

async function createGroundedAnswerArtifact(workspaceRoot: string) {
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

  const conceptPage = await createWikiPage({
    workspaceRoot,
    type: "concept",
    title: "Local-first software",
  });

  await updateWikiPage({
    workspaceRoot,
    pageId: conceptPage.id,
    rawContent: conceptPage.rawContent
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
          referenceId: `wiki_page:${conceptPage.id}`,
          note: "The concept page directly defines the local-first framing.",
        },
        {
          referenceId: `source_summary:${source.id}`,
          note: "The supporting source summary restates the visibility and control claim.",
        },
      ],
      caveats: ["This answer is grounded in the currently compiled local-first materials only."],
      basedOnPageIds: [conceptPage.id],
      followUpQuestions: ["What tradeoffs does local-first software introduce?"],
      insufficientKnowledge: false,
      recommendedSourceTypes: [],
    }),
  );

  const answer = await answerQuestion(workspaceRoot, "What is local-first software?");

  return {
    answer,
    source,
    conceptPage,
  };
}

describe("answer archive service integration", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-answer-archive-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Answer Archive Workspace",
      initializeGit: false,
    });
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("archives a grounded answer artifact as a synthesis page and makes it immediately retrievable", async () => {
    const setup = await createGroundedAnswerArtifact(workspaceRoot);

    const archived = await archiveAnswerArtifact(workspaceRoot, setup.answer.id, "synthesis");

    expect(archived.archivedPageId).toBeTruthy();
    expect(archived.archivedPage?.type).toBe("synthesis");
    expect(archived.archivedPage?.path.startsWith("wiki/syntheses/")).toBe(true);

    const archivedPage = await getWikiPageDetail(workspaceRoot, archived.archivedPageId!);
    const archiveFrontmatter = archivedPage.frontmatter as typeof archivedPage.frontmatter &
      Record<string, unknown>;

    expect(archivedPage.frontmatter.source_refs).toContain(setup.source.id);
    expect(archivedPage.frontmatter.page_refs).toContain("Local-first software");
    expect(archivedPage.frontmatter.status).toBe("active");
    expect(archivedPage.frontmatter.review_status).toBe("approved");
    expect(archiveFrontmatter.answer_artifact_id).toBe(setup.answer.id);
    expect(archiveFrontmatter.archive_kind).toBe("synthesis");
    expect(archivedPage.body).toContain("## Citations");
    expect(archivedPage.body).toContain("[[Local-first software]]");

    const wikiPages = await listWikiPages(workspaceRoot);

    expect(wikiPages.some((page) => page.id === archived.archivedPageId)).toBe(true);

    const retrieval = await retrieveAskContext(
      workspaceRoot,
      archived.archivedPage?.title ?? "Local-first software synthesis",
    );

    expect(retrieval.wikiPages.some((page) => page.pageId === archived.archivedPageId)).toBe(
      true,
    );
  });

  it("archives a grounded answer artifact as a note page with valid frontmatter", async () => {
    const setup = await createGroundedAnswerArtifact(workspaceRoot);

    const archived = await archiveAnswerArtifact(workspaceRoot, setup.answer.id, "note");

    expect(archived.archivedPageId).toBeTruthy();
    expect(archived.archivedPage?.type).toBe("note");
    expect(archived.archivedPage?.path.startsWith("wiki/notes/")).toBe(true);

    const archivedPage = await getWikiPageDetail(workspaceRoot, archived.archivedPageId!);
    const archiveFrontmatter = archivedPage.frontmatter as typeof archivedPage.frontmatter &
      Record<string, unknown>;

    expect(archivedPage.frontmatter.type).toBe("note");
    expect(archivedPage.frontmatter.source_refs).toContain(setup.source.id);
    expect(archivedPage.frontmatter.page_refs).toContain("Local-first software");
    expect(archivedPage.frontmatter.review_status).toBe("approved");
    expect(archiveFrontmatter.answer_artifact_id).toBe(setup.answer.id);
    expect(archiveFrontmatter.archive_kind).toBe("note");
    expect(archivedPage.body).toContain("## Archived notes");
    expect(archivedPage.body).toContain("## Answer summary");
  });
});
