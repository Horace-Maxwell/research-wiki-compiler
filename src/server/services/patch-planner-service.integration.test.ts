import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { planPatchProposalsForSource } from "@/server/services/patch-planner-service";
import { listReviewProposals, getReviewProposalDetail } from "@/server/services/review-service";
import { getSourceDetail, importSource } from "@/server/services/source-service";
import { summarizeSource } from "@/server/services/source-summary-service";
import { updateWorkspaceLlmSettings } from "@/server/services/settings-service";
import {
  createWikiPage,
  getWikiPageDetail,
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

describe("patch planner service integration", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-patch-planner-"));
    await initializeWorkspace({
      workspaceRoot,
      workspaceName: "Planner Workspace",
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

  it("creates file-backed review proposals without mutating wiki pages", async () => {
    const conceptPage = await createWikiPage({
      workspaceRoot,
      type: "concept",
      title: "Local-first software",
    });

    await updateWikiPage({
      workspaceRoot,
      pageId: conceptPage.id,
      rawContent: conceptPage.rawContent.replace(
        "## Summary\n\nTBD\n",
        [
          "## Summary",
          "",
          "Local-first software keeps data visible and under user control.",
          "",
          "## Evidence",
          "",
          "This page currently lacks citations about review workflows.",
          "",
        ].join("\n"),
      ),
    });

    const initialWikiDetail = await getWikiPageDetail(workspaceRoot, conceptPage.id);
    const initialRawContent = initialWikiDetail.rawContent;

    const fetchMock = vi.spyOn(globalThis, "fetch");

    fetchMock.mockResolvedValueOnce(
      openAiResponse({
        conciseSummary: "A source about visible review in local-first software.",
        keyEntities: [
          {
            name: "Ink & Switch",
            description: "Research group associated with local-first thinking.",
            aliases: [],
          },
        ],
        keyConcepts: [
          {
            name: "Local-first software",
            description: "Local ownership and inspectable data workflows.",
          },
        ],
        majorClaims: [
          {
            text: "Visible review workflows strengthen local-first software.",
            polarity: "supports",
            evidenceStrength: "high",
            rationale: "The source states that visible review makes local knowledge safer to maintain.",
          },
        ],
        openQuestions: ["How should review queues age over time?"],
        possibleTargetPageHints: [
          {
            title: "Local-first software",
            pageType: "concept",
            rationale: "The concept is central to the source.",
          },
          {
            title: "Compiled research wiki",
            pageType: "topic",
            rationale: "The source frames a durable compiled wiki workflow as a distinct topic.",
          },
        ],
      }),
    );

    const imported = await importSource({
      workspaceRoot,
      importKind: "pasted_text",
      title: "Visible review for local-first software",
      filename: "visible-review-local-first.md",
      text: "# Visible review for local-first software\n\nVisible review workflows help local-first software stay trustworthy over time.\n",
    });

    await summarizeSource(workspaceRoot, imported.id);

    fetchMock.mockResolvedValueOnce(
      openAiResponse({
        proposals: [
          {
            title: "Add visible review evidence to Local-first software",
            proposalType: "update_page",
            primaryTargetPageId: conceptPage.id,
            relatedTargetPageIds: [],
            proposedPage: null,
            patchGoal: "Add evidence about visible review workflows to the existing concept page.",
            rationale: "The page already covers local-first software, but it lacks this new evidence and framing.",
            affectedSections: ["Summary", "Evidence"],
            supportingClaimTexts: ["Visible review workflows strengthen local-first software."],
            conflictNotes: [],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Evidence",
                operation: "append",
                beforeText: null,
                afterText:
                  "- Visible review workflows can strengthen local-first software by making knowledge updates inspectable and easier to trust.",
              },
            ],
          },
          {
            title: "Create compiled research wiki topic page",
            proposalType: "create_page",
            primaryTargetPageId: null,
            relatedTargetPageIds: [conceptPage.id],
            proposedPage: {
              title: "Compiled research wiki",
              pageType: "topic",
              rationale: "The source presents this as a distinct durable workflow worth its own page.",
            },
            patchGoal: "Create a durable topic page for the compiled research wiki workflow.",
            rationale: "No existing page captures the workflow as a first-class topic.",
            affectedSections: ["Summary", "Open questions"],
            supportingClaimTexts: ["Visible review workflows strengthen local-first software."],
            conflictNotes: [],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Summary",
                operation: "create_section",
                beforeText: null,
                afterText:
                  "A compiled research wiki treats knowledge as durable markdown pages that evolve through reviewable patch proposals.",
              },
            ],
          },
        ],
      }),
    );

    const result = await planPatchProposalsForSource(workspaceRoot, imported.id);

    expect(result.proposalIds).toHaveLength(2);

    const proposals = await listReviewProposals(workspaceRoot);

    expect(proposals).toHaveLength(2);
    expect(proposals[0]?.artifactMarkdownPath).toContain("reviews/pending/");

    const detail = await getReviewProposalDetail(workspaceRoot, result.proposalIds[0]!);

    expect(detail.artifact?.proposalType).toBe("update_page");
    expect(detail.artifact?.supportingClaims[0]?.text).toBe(
      "Visible review workflows strengthen local-first software.",
    );
    expect(detail.hunks[0]?.operation).toBe("append");

    const artifactPaths = proposals
      .flatMap((proposal) => [proposal.artifactMarkdownPath, proposal.artifactJsonPath])
      .filter((value): value is string => Boolean(value));

    for (const artifactPath of artifactPaths) {
      const absolutePath = path.join(workspaceRoot, artifactPath);
      await expect(fs.access(absolutePath)).resolves.toBeUndefined();
    }

    const postPlanWikiDetail = await getWikiPageDetail(workspaceRoot, conceptPage.id);

    expect(postPlanWikiDetail.rawContent).toBe(initialRawContent);

    const sourceDetail = await getSourceDetail(workspaceRoot, imported.id);

    expect(sourceDetail.summary.status).toBe("completed");
  });

  it("rejects planner output that references unsupported claims", async () => {
    const conceptPage = await createWikiPage({
      workspaceRoot,
      type: "concept",
      title: "Local-first software",
    });

    const fetchMock = vi.spyOn(globalThis, "fetch");

    fetchMock.mockResolvedValueOnce(
      openAiResponse({
        conciseSummary: "A source about visible review in local-first software.",
        keyEntities: [],
        keyConcepts: [
          {
            name: "Local-first software",
            description: "Local ownership and inspectable data workflows.",
          },
        ],
        majorClaims: [
          {
            text: "Visible review workflows strengthen local-first software.",
            polarity: "supports",
            evidenceStrength: "high",
            rationale: "The source states this directly.",
          },
        ],
        openQuestions: [],
        possibleTargetPageHints: [
          {
            title: "Local-first software",
            pageType: "concept",
            rationale: "The source centers this concept.",
          },
        ],
      }),
    );

    const imported = await importSource({
      workspaceRoot,
      importKind: "pasted_text",
      title: "Visible review for local-first software",
      filename: "visible-review-local-first.md",
      text: "# Visible review for local-first software\n\nVisible review workflows help local-first software stay trustworthy over time.\n",
    });

    await summarizeSource(workspaceRoot, imported.id);

    fetchMock.mockResolvedValueOnce(
      openAiResponse({
        proposals: [
          {
            title: "Invalid claim reference",
            proposalType: "update_page",
            primaryTargetPageId: conceptPage.id,
            relatedTargetPageIds: [],
            proposedPage: null,
            patchGoal: "Invalid output",
            rationale: "This output should fail validation.",
            affectedSections: ["Summary"],
            supportingClaimTexts: ["A claim that does not exist"],
            conflictNotes: [],
            riskLevel: "low",
            hunks: [
              {
                sectionHeading: "Summary",
                operation: "append",
                beforeText: null,
                afterText: "- Invalid test hunk.",
              },
            ],
          },
        ],
      }),
    );

    await expect(planPatchProposalsForSource(workspaceRoot, imported.id)).rejects.toThrowError(
      "referenced an unknown supporting claim",
    );

    const proposals = await listReviewProposals(workspaceRoot);

    expect(proposals).toHaveLength(0);
  });
});
