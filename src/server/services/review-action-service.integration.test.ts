import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { EditableReviewProposal } from "@/lib/contracts/review";
import { editAndApproveReviewProposal, rejectReviewProposal, approveReviewProposal } from "@/server/services/review-action-service";
import { listReviewProposals, getReviewProposalDetail } from "@/server/services/review-service";
import { planPatchProposalsForSource } from "@/server/services/patch-planner-service";
import { getSourceDetail, importSource } from "@/server/services/source-service";
import { summarizeSource } from "@/server/services/source-summary-service";
import { updateWorkspaceSettings } from "@/server/services/settings-service";
import { parseWikiDocument } from "@/server/services/wiki-frontmatter-service";
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

async function setupPlannedReviewWorkspace(options?: {
  gitCommitOnApply?: boolean;
}) {
  const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-review-actions-"));

  await initializeWorkspace({
    workspaceRoot,
    workspaceName: "Review Actions Workspace",
    initializeGit: false,
  });

  await updateWorkspaceSettings(workspaceRoot, {
    llm: {
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
    },
    review: {
      autoDraftLowRiskPatches: false,
      gitCommitOnApply: options?.gitCommitOnApply ?? false,
    },
  });

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
          rationale:
            "The source states that visible review makes local knowledge safer to maintain.",
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
          patchGoal:
            "Add evidence about visible review workflows to the existing concept page.",
          rationale:
            "The page already covers local-first software, but it lacks this new evidence and framing.",
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
            rationale:
              "The source presents this as a distinct durable workflow worth its own page.",
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
  const proposals = await Promise.all(
    result.proposalIds.map((proposalId) => getReviewProposalDetail(workspaceRoot, proposalId)),
  );

  return {
    workspaceRoot,
    conceptPageId: conceptPage.id,
    importedSourceId: imported.id,
    updateProposal: proposals.find((proposal) => proposal.proposalType === "update_page")!,
    createProposal: proposals.find((proposal) => proposal.proposalType === "create_page")!,
  };
}

describe("review action service integration", () => {
  let workspaceRoot = "";

  beforeEach(() => {
    workspaceRoot = "";
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("rejects a pending proposal and moves artifacts into rejected history", async () => {
    const setup = await setupPlannedReviewWorkspace();
    workspaceRoot = setup.workspaceRoot;

    const pendingMarkdownPath = setup.createProposal.artifactMarkdownPath!;
    const rejected = await rejectReviewProposal(
      workspaceRoot,
      setup.createProposal.id,
      "Not enough evidence for a new durable page yet.",
    );

    expect(rejected.status).toBe("rejected");
    expect(rejected.reviewNote).toContain("Not enough evidence");
    expect(rejected.artifactMarkdownPath).toContain("reviews/rejected/");

    await expect(fs.access(path.join(workspaceRoot, rejected.artifactMarkdownPath!))).resolves.toBeUndefined();
    await expect(fs.access(path.join(workspaceRoot, pendingMarkdownPath))).rejects.toThrow();

    const rejectedList = await listReviewProposals(workspaceRoot, {
      status: "rejected",
    });

    expect(rejectedList.map((proposal) => proposal.id)).toContain(setup.createProposal.id);
  });

  it("approves and applies an update proposal, refreshes wiki metadata, and preserves review history", async () => {
    const setup = await setupPlannedReviewWorkspace({
      gitCommitOnApply: true,
    });
    workspaceRoot = setup.workspaceRoot;
    const pendingMarkdownPath = setup.updateProposal.artifactMarkdownPath!;

    const approved = await approveReviewProposal(
      workspaceRoot,
      setup.updateProposal.id,
      "Approved after checking the evidence wording.",
    );

    expect(approved.status).toBe("approved");
    expect(approved.appliedAt).not.toBeNull();
    expect(approved.applyError).toBeNull();
    expect(approved.artifactMarkdownPath).toContain("reviews/approved/");
    expect(approved.artifact?.applyResult.success).toBe(true);
    expect(approved.applyMetadataJson.git).toMatchObject({
      attempted: true,
      success: false,
    });
    await expect(fs.access(path.join(workspaceRoot, approved.artifactMarkdownPath!))).resolves.toBeUndefined();
    await expect(fs.access(path.join(workspaceRoot, pendingMarkdownPath))).rejects.toThrow();

    const updatedPage = await getWikiPageDetail(workspaceRoot, setup.conceptPageId);

    expect(updatedPage.rawContent).toContain(
      "Visible review workflows can strengthen local-first software",
    );
    expect(updatedPage.frontmatter.review_status).toBe("approved");
    expect(updatedPage.frontmatter.source_refs).toContain(setup.importedSourceId);
    expect(updatedPage.frontmatter.status).toBe("active");

    const parsed = parseWikiDocument({
      rawContent: updatedPage.rawContent,
      relativePath: updatedPage.path,
    });

    expect(parsed.frontmatter.page_refs).toEqual([]);

    const approvedList = await listReviewProposals(workspaceRoot, {
      status: "approved",
    });

    expect(approvedList.map((proposal) => proposal.id)).toContain(setup.updateProposal.id);

    const persistedApproved = await getReviewProposalDetail(workspaceRoot, setup.updateProposal.id);

    expect(persistedApproved.markdown).toContain("Git: attempted / failed");
    expect(persistedApproved.artifact?.applyResult.git?.success).toBe(false);
    expect(
      (persistedApproved.applyMetadataJson.git as { message?: string | null }).message,
    ).toContain("Workspace is not a git repository");
  });

  it("supports edit-and-approve for create-page proposals", async () => {
    const setup = await setupPlannedReviewWorkspace();
    workspaceRoot = setup.workspaceRoot;

    const editedProposal: EditableReviewProposal = {
      title: "Create compiled knowledge workflow topic page",
      patchGoal: "Create a more precise durable topic page for the workflow.",
      rationale: "Use a clearer title before the page is added to the wiki.",
      affectedSections: ["Summary", "Workflow"],
      conflictNotes: [],
      proposedPage: {
        title: "Compiled knowledge workflow",
        pageType: "topic",
        suggestedPath: "wiki/topics/compiled-knowledge-workflow.md",
        rationale: "The edited title is more precise and still captures the durable workflow.",
      },
      hunks: [
        {
          sectionHeading: "Summary",
          operation: "create_section",
          beforeText: null,
          afterText:
            "A compiled knowledge workflow turns research into durable markdown pages that evolve through explicit review.",
          citations: setup.createProposal.hunks[0]?.citations ?? [],
        },
      ],
    };

    const approved = await editAndApproveReviewProposal({
      workspaceRoot,
      proposalId: setup.createProposal.id,
      note: "Adjusted the page title before approval.",
      edits: editedProposal,
    });

    expect(approved.status).toBe("approved");
    expect(approved.artifact?.review.editedBeforeApply).toBe(true);
    expect(approved.appliedPage?.title).toBe("Compiled knowledge workflow");
    expect(approved.appliedPage?.path).toBe("wiki/topics/compiled-knowledge-workflow.md");

    const pages = await listWikiPages(workspaceRoot);
    const createdPage = pages.find((page) => page.title === "Compiled knowledge workflow");

    expect(createdPage).toBeDefined();

    const createdPageDetail = await getWikiPageDetail(workspaceRoot, createdPage!.id);

    expect(createdPageDetail.rawContent).toContain("A compiled knowledge workflow turns research");
    expect(createdPageDetail.frontmatter.source_refs).toContain(setup.importedSourceId);
    expect(createdPageDetail.frontmatter.page_refs).toContain("Local-first software");

    const sourceDetail = await getSourceDetail(workspaceRoot, setup.importedSourceId);

    expect(sourceDetail.summary.status).toBe("completed");
  });
});
