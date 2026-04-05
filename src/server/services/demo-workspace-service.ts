import fs from "node:fs/promises";
import path from "node:path";

import { archiveAnswerArtifact } from "@/server/services/answer-archive-service";
import { answerQuestion } from "@/server/services/answer-service";
import { runAudit } from "@/server/services/audit-service";
import { planPatchProposalsForSource } from "@/server/services/patch-planner-service";
import {
  approveReviewProposal,
  rejectReviewProposal,
} from "@/server/services/review-action-service";
import { updateWorkspaceSettings } from "@/server/services/settings-service";
import { importSource } from "@/server/services/source-service";
import { summarizeSource } from "@/server/services/source-summary-service";
import {
  parseWikiDocument,
  serializeWikiDocument,
} from "@/server/services/wiki-frontmatter-service";
import {
  createWikiPage,
  getWikiPageDetail,
  listWikiPages,
  syncWikiIndex,
  updateWikiPage,
} from "@/server/services/wiki-page-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

type DemoWorkspaceSeedParams = {
  workspaceRoot: string;
  datasetRoot: string;
};

export type DemoWorkspaceSeedResult = {
  workspaceRoot: string;
  pageIds: {
    index: string;
    localFirst: string;
    compiledResearchWiki: string;
    inkAndSwitch: string;
    orphanNote: string;
    archivedSynthesis: string;
  };
  sourceIds: {
    visibleReview: string;
    automationCounterpoints: string;
    durableAnswerArchives: string;
  };
  reviewIds: {
    approved: string;
    pending: string;
    rejected: string;
  };
  answerIds: {
    archived: string;
    readyToArchive: string;
  };
  auditIds: string[];
};

type DemoPageSeed = {
  title: string;
  type: "topic" | "entity" | "concept" | "timeline" | "synthesis" | "note";
  tags: string[];
  aliases?: string[];
  pageRefs?: string[];
  body: string;
};

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

async function withMockedOpenAiResponse<T>(payload: unknown, callback: () => Promise<T>) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => openAiResponse(payload)) as typeof globalThis.fetch;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function rewriteWikiPage(params: {
  workspaceRoot: string;
  pageId: string;
  aliases?: string[];
  tags?: string[];
  sourceRefs?: string[];
  pageRefs?: string[];
  confidence?: number;
  body: string;
}) {
  const detail = await getWikiPageDetail(params.workspaceRoot, params.pageId);
  const parsed = parseWikiDocument({
    rawContent: detail.rawContent,
    relativePath: detail.path,
  });
  const nextRawContent = serializeWikiDocument(
    {
      ...parsed.frontmatter,
      aliases: params.aliases ?? parsed.frontmatter.aliases,
      tags: params.tags ?? parsed.frontmatter.tags,
      source_refs: params.sourceRefs ?? parsed.frontmatter.source_refs,
      page_refs: params.pageRefs ?? parsed.frontmatter.page_refs,
      confidence: params.confidence ?? parsed.frontmatter.confidence,
      updated_at: new Date().toISOString(),
    },
    params.body,
  );

  return updateWikiPage({
    workspaceRoot: params.workspaceRoot,
    pageId: params.pageId,
    rawContent: nextRawContent,
  });
}

async function createSeedPage(workspaceRoot: string, seed: DemoPageSeed) {
  const page = await createWikiPage({
    workspaceRoot,
    type: seed.type,
    title: seed.title,
    tags: seed.tags,
  });

  return rewriteWikiPage({
    workspaceRoot,
    pageId: page.id,
    aliases: seed.aliases,
    tags: seed.tags,
    pageRefs: seed.pageRefs,
    body: seed.body,
  });
}

async function findPageIdByPath(workspaceRoot: string, pagePath: string) {
  const pages = await listWikiPages(workspaceRoot);
  const page = pages.find((entry) => entry.path === pagePath);

  if (!page) {
    throw new Error(`Expected wiki page at ${pagePath}.`);
  }

  return page.id;
}

async function seedBasePages(workspaceRoot: string) {
  await syncWikiIndex(workspaceRoot);

  const localFirst = await createSeedPage(workspaceRoot, {
    type: "concept",
    title: "Local-first software",
    aliases: ["Local first"],
    tags: ["local-first", "trust", "knowledge-system"],
    pageRefs: ["Compiled research wiki", "Ink & Switch"],
    body: [
      "# Local-first software",
      "",
      "## Summary",
      "",
      "Local-first software keeps important state close to the user and treats visibility as part of trust, not just convenience.",
      "",
      "## Evidence",
      "",
      "- Durable knowledge systems need mutation paths that stay inspectable to the user.",
      "",
      "## Related pages",
      "",
      "- [[Compiled research wiki]]",
      "- [[Ink & Switch]]",
    ].join("\n"),
  });

  const compiledResearchWiki = await createSeedPage(workspaceRoot, {
    type: "topic",
    title: "Compiled research wiki",
    tags: ["research", "wiki", "workflow"],
    pageRefs: ["Local-first software", "Ink & Switch"],
    body: [
      "# Compiled research wiki",
      "",
      "## Summary",
      "",
      "A compiled research wiki turns raw materials into durable markdown pages that can be reviewed, cited, and improved over time.",
      "",
      "## Workflow",
      "",
      "- Import sources into a visible local workspace.",
      "- Compile summaries and proposal artifacts before mutating the wiki.",
      "- Keep approvals explicit so durable pages remain explainable after the fact.",
      "",
      "## Related pages",
      "",
      "- [[Local-first software]]",
      "- [[Ink & Switch]]",
    ].join("\n"),
  });

  const inkAndSwitch = await createSeedPage(workspaceRoot, {
    type: "entity",
    title: "Ink & Switch",
    tags: ["entity", "research", "local-first"],
    pageRefs: ["Local-first software", "Compiled research wiki"],
    body: [
      "# Ink & Switch",
      "",
      "## Summary",
      "",
      "Ink & Switch is a recurring reference point for local-first software and visible knowledge tooling ideas.",
      "",
      "## Significance",
      "",
      "The local-first framing helps anchor why durable research tools should keep data, reasoning, and change history visible.",
      "",
      "## Related pages",
      "",
      "- [[Local-first software]]",
      "- [[Compiled research wiki]]",
    ].join("\n"),
  });

  const orphanNote = await createSeedPage(workspaceRoot, {
    type: "note",
    title: "Weekly research cadence note",
    tags: ["note", "operations"],
    body: [
      "# Weekly research cadence note",
      "",
      "## Summary",
      "",
      "This standalone note records a weekly cadence idea for checking the workspace, but it is intentionally left unlinked so the orphan audit has a real structural issue to find in the demo.",
      "",
      "## Details",
      "",
      "A useful future improvement would be to connect this note to a synthesis or operations page once the cadence becomes durable knowledge.",
    ].join("\n"),
  });

  const indexId = await findPageIdByPath(workspaceRoot, "wiki/index.md");

  await rewriteWikiPage({
    workspaceRoot,
    pageId: indexId,
    tags: ["index", "overview"],
    pageRefs: [
      localFirst.title,
      compiledResearchWiki.title,
      inkAndSwitch.title,
    ],
    body: [
      "# Research Wiki Demo",
      "",
      "## Core pages",
      "",
      "- [[Compiled research wiki]]",
      "- [[Local-first software]]",
      "- [[Ink & Switch]]",
      "",
      "## Demo focus",
      "",
      "This workspace demonstrates the full local-first loop: source intake, visible summaries, reviewable proposals, approved wiki mutation, wiki-first answers, archived syntheses, and audits.",
    ].join("\n"),
  });

  return {
    index: indexId,
    localFirst: localFirst.id,
    compiledResearchWiki: compiledResearchWiki.id,
    inkAndSwitch: inkAndSwitch.id,
    orphanNote: orphanNote.id,
  };
}

async function setTemporaryLlmConfig(workspaceRoot: string) {
  await updateWorkspaceSettings(workspaceRoot, {
    llm: {
      provider: "openai",
      model: null,
      openai: {
        apiKey: "demo-seed-key",
        model: "gpt-demo",
      },
      anthropic: {
        apiKey: null,
        model: null,
      },
    },
    review: {
      autoDraftLowRiskPatches: false,
      gitCommitOnApply: false,
    },
  });
}

async function clearLlmConfig(workspaceRoot: string) {
  await updateWorkspaceSettings(workspaceRoot, {
    llm: {
      provider: null,
      model: null,
      openai: {
        apiKey: null,
        model: null,
      },
      anthropic: {
        apiKey: null,
        model: null,
      },
    },
    review: {
      autoDraftLowRiskPatches: false,
      gitCommitOnApply: false,
    },
  });
}

async function finalizeIndexPage(workspaceRoot: string, synthesisTitle: string) {
  const indexId = await findPageIdByPath(workspaceRoot, "wiki/index.md");

  await rewriteWikiPage({
    workspaceRoot,
    pageId: indexId,
    tags: ["index", "overview"],
    pageRefs: [
      "Compiled research wiki",
      "Local-first software",
      "Ink & Switch",
      synthesisTitle,
    ],
    body: [
      "# Research Wiki Demo",
      "",
      "## Core pages",
      "",
      "- [[Compiled research wiki]]",
      "- [[Local-first software]]",
      "- [[Ink & Switch]]",
      "",
      "## Archived synthesis",
      "",
      `- [[${synthesisTitle}]]`,
      "",
      "## Demo focus",
      "",
      "This workspace demonstrates the full local-first loop: source intake, visible summaries, reviewable proposals, approved wiki mutation, wiki-first answers, archived syntheses, and audits.",
    ].join("\n"),
  });
}

export async function resetAndSeedDemoWorkspace(
  params: DemoWorkspaceSeedParams,
): Promise<DemoWorkspaceSeedResult> {
  const workspaceRoot = path.resolve(params.workspaceRoot);
  const datasetRoot = path.resolve(params.datasetRoot);
  const visibleReviewPath = path.join(datasetRoot, "sources", "visible-review-local-first.md");
  const counterpointsPath = path.join(
    datasetRoot,
    "sources",
    "counterpoints-on-aggressive-automation.md",
  );
  const answerArchivesPath = path.join(datasetRoot, "sources", "durable-answer-archives.md");

  await fs.rm(workspaceRoot, { recursive: true, force: true });

  await initializeWorkspace({
    workspaceRoot,
    workspaceName: "Research Wiki Demo",
    initializeGit: true,
  });

  const pageIds = await seedBasePages(workspaceRoot);

  await setTemporaryLlmConfig(workspaceRoot);

  const visibleReviewSource = await importSource({
    workspaceRoot,
    importKind: "local_file_path",
    title: "Visible review for local-first software",
    filePath: visibleReviewPath,
  });

  await withMockedOpenAiResponse(
    {
      conciseSummary:
        "The source argues that local-first research tools stay trustworthy when knowledge mutation flows through visible review queues.",
      keyEntities: [
        {
          name: "Ink & Switch",
          description: "A research group often associated with local-first ideas.",
          aliases: [],
        },
      ],
      keyConcepts: [
        {
          name: "Local-first software",
          description: "Software that keeps important state close to the user and visible.",
        },
        {
          name: "Reviewable patches",
          description: "Explicit change proposals that keep mutation inspectable.",
        },
      ],
      majorClaims: [
        {
          text: "Reviewable patch proposals strengthen local-first software by making knowledge mutation inspectable.",
          polarity: "supports",
          evidenceStrength: "high",
          rationale:
            "The source directly links visible review queues to trust in local-first research tools.",
        },
      ],
      openQuestions: ["How should review queues surface aging proposals?"],
      possibleTargetPageHints: [
        {
          title: "Local-first software",
          pageType: "concept",
          rationale: "The source centers the local-first trust model.",
        },
        {
          title: "Compiled research wiki",
          pageType: "topic",
          rationale: "The source treats patch proposals as part of the durable wiki workflow.",
        },
      ],
    },
    async () => summarizeSource(workspaceRoot, visibleReviewSource.id),
  );

  const visibleReviewPlan = await withMockedOpenAiResponse(
    {
      proposals: [
        {
          title: "Add reviewable mutation evidence to Local-first software",
          proposalType: "update_page",
          primaryTargetPageId: pageIds.localFirst,
          relatedTargetPageIds: [pageIds.compiledResearchWiki],
          proposedPage: null,
          patchGoal:
            "Add explicit evidence that reviewable patch proposals improve trust in local-first research tools.",
          rationale:
            "The concept page already covers local ownership but needs clearer evidence about inspectable knowledge mutation.",
          affectedSections: ["Evidence", "Related pages"],
          supportingClaimTexts: [
            "Reviewable patch proposals strengthen local-first software by making knowledge mutation inspectable.",
          ],
          conflictNotes: [],
          riskLevel: "medium",
          hunks: [
            {
              sectionHeading: "Evidence",
              operation: "append",
              beforeText: null,
              afterText:
                "- Reviewable patch proposals strengthen local-first research tools by making knowledge mutation inspectable, attributable, and easier to trust over time.",
            },
          ],
        },
      ],
    },
    async () => planPatchProposalsForSource(workspaceRoot, visibleReviewSource.id),
  );

  const approvedReview = await approveReviewProposal(
    workspaceRoot,
    visibleReviewPlan.proposalIds[0]!,
    "This is strong, source-backed evidence that belongs on the concept page.",
  );

  const automationCounterpointsSource = await importSource({
    workspaceRoot,
    importKind: "local_file_path",
    title: "Counterpoints on aggressive automation",
    filePath: counterpointsPath,
  });

  await withMockedOpenAiResponse(
    {
      conciseSummary:
        "This source warns that always-auto-applied research updates can create drift and recommends explicit counterpoints when new evidence changes the story.",
      keyEntities: [],
      keyConcepts: [
        {
          name: "Compiled research wiki",
          description: "A durable markdown wiki that evolves through explicit compilation loops.",
        },
        {
          name: "Evidence ledger",
          description: "A staging concept for tracking which claims still need stronger support.",
        },
      ],
      majorClaims: [
        {
          text: "Always-auto-applied research updates can create drift in a compiled research wiki.",
          polarity: "supports",
          evidenceStrength: "high",
          rationale:
            "The source explicitly warns that silent mutation erodes trust and accuracy over time.",
        },
        {
          text: "Major thesis sections should surface counterpoints instead of silently overwriting prior conclusions.",
          polarity: "supports",
          evidenceStrength: "medium",
          rationale:
            "The source recommends explicit tension handling when new evidence complicates an existing page.",
        },
      ],
      openQuestions: ["Which changes are risky enough to require special review handling?"],
      possibleTargetPageHints: [
        {
          title: "Compiled research wiki",
          pageType: "topic",
          rationale: "The source is directly about this workflow and its failure modes.",
        },
      ],
    },
    async () => summarizeSource(workspaceRoot, automationCounterpointsSource.id),
  );

  const counterpointsPlan = await withMockedOpenAiResponse(
    {
      proposals: [
        {
          title: "Add counterpoints on aggressive automation to Compiled research wiki",
          proposalType: "update_page",
          primaryTargetPageId: pageIds.compiledResearchWiki,
          relatedTargetPageIds: [pageIds.localFirst],
          proposedPage: null,
          patchGoal:
            "Add an explicit counterpoints section warning against silent auto-apply behavior in the compiled wiki workflow.",
          rationale:
            "The topic page explains the workflow positively but lacks the cautionary note from newer evidence about drift and silent rewriting.",
          affectedSections: ["Counterpoints", "Summary"],
          supportingClaimTexts: [
            "Always-auto-applied research updates can create drift in a compiled research wiki.",
            "Major thesis sections should surface counterpoints instead of silently overwriting prior conclusions.",
          ],
          conflictNotes: [
            "The current workflow framing emphasizes momentum, while the new source warns that silent auto-apply can degrade trust.",
          ],
          riskLevel: "high",
          hunks: [
            {
              sectionHeading: "Counterpoints",
              operation: "create_section",
              beforeText: null,
              afterText:
                "Auto-applied research updates can create drift when they rewrite major sections without review. High-impact changes should surface explicit counterpoints or tensions instead of silently replacing prior conclusions.",
            },
          ],
        },
      ],
    },
    async () => planPatchProposalsForSource(workspaceRoot, automationCounterpointsSource.id),
  );

  const durableAnswerArchiveText = await fs.readFile(answerArchivesPath, "utf8");
  const durableAnswerArchivesSource = await importSource({
    workspaceRoot,
    importKind: "pasted_text",
    title: "Durable answer archives",
    filename: "durable-answer-archives.md",
    text: durableAnswerArchiveText,
  });

  await withMockedOpenAiResponse(
    {
      conciseSummary:
        "The source argues that grounded answers should return to the wiki as cited synthesis pages and suggests an evidence ledger as a useful staging concept.",
      keyEntities: [],
      keyConcepts: [
        {
          name: "Answer archive",
          description: "Turning a grounded answer artifact into a durable wiki page.",
        },
        {
          name: "Evidence ledger",
          description: "A staging concept for deciding which answers and claims are ready for durable archival.",
        },
      ],
      majorClaims: [
        {
          text: "Archived answers should retain citations, page refs, and the original question.",
          polarity: "supports",
          evidenceStrength: "high",
          rationale:
            "The source states directly that answer archives should preserve provenance and the originating prompt.",
        },
        {
          text: "An evidence ledger can help decide which answers deserve durable archival.",
          polarity: "supports",
          evidenceStrength: "medium",
          rationale:
            "The source frames an evidence ledger as a useful intermediate structure before promoting answers into durable pages.",
        },
      ],
      openQuestions: ["What makes an answer stable enough to archive permanently?"],
      possibleTargetPageHints: [
        {
          title: "Compiled research wiki",
          pageType: "topic",
          rationale: "The archival loop extends the core compiled wiki workflow.",
        },
      ],
    },
    async () => summarizeSource(workspaceRoot, durableAnswerArchivesSource.id),
  );

  const answerArchivePlan = await withMockedOpenAiResponse(
    {
      proposals: [
        {
          title: "Create Evidence ledger concept page",
          proposalType: "create_page",
          primaryTargetPageId: null,
          relatedTargetPageIds: [pageIds.compiledResearchWiki],
          proposedPage: {
            title: "Evidence ledger",
            pageType: "concept",
            rationale:
              "Two source summaries now point to the idea as a useful bridge between review, archive, and audit work.",
          },
          patchGoal:
            "Create a concept page for tracking which claims and answers still need stronger support.",
          rationale:
            "The concept appears in recent summaries and could become a durable coordination artifact, but it may still need more evidence.",
          affectedSections: ["Summary", "Usage"],
          supportingClaimTexts: [
            "An evidence ledger can help decide which answers deserve durable archival.",
          ],
          conflictNotes: [],
          riskLevel: "medium",
          hunks: [
            {
              sectionHeading: "Summary",
              operation: "create_section",
              beforeText: null,
              afterText:
                "An evidence ledger tracks which claims, answers, and wiki sections still need stronger support before they should be treated as durable compiled knowledge.",
            },
          ],
        },
      ],
    },
    async () => planPatchProposalsForSource(workspaceRoot, durableAnswerArchivesSource.id),
  );

  const rejectedReview = await rejectReviewProposal(
    workspaceRoot,
    answerArchivePlan.proposalIds[0]!,
    "Keep this in review history until another source reinforces the concept.",
  );

  const archivedAnswerSeed = await withMockedOpenAiResponse(
    {
      shortAnswer:
        "A compiled research wiki uses reviewable patches so durable pages can evolve without hiding why the knowledge changed.",
      detailedAnswer:
        "The compiled research wiki page frames the workflow around durable markdown pages and explicit review, while the local-first concept page adds evidence that visible patch proposals make knowledge mutation inspectable and easier to trust. The supporting source summary reinforces that reviewable patch proposals protect trust by surfacing rationale instead of silently rewriting the wiki.",
      citations: [
        {
          referenceId: `wiki_page:${pageIds.compiledResearchWiki}`,
          note: "The topic page defines the compiled wiki workflow around durable pages and explicit review.",
        },
        {
          referenceId: `wiki_page:${pageIds.localFirst}`,
          note: "The concept page connects local-first trust to inspectable knowledge mutation.",
        },
        {
          referenceId: `source_summary:${visibleReviewSource.id}`,
          note: "The summarized source explicitly argues that reviewable patch proposals strengthen trust.",
        },
      ],
      caveats: [
        "This answer is grounded in the currently compiled demo workspace and one directly supporting source summary.",
      ],
      basedOnPageIds: [pageIds.compiledResearchWiki, pageIds.localFirst],
      followUpQuestions: [
        "Which patch changes should remain high-risk even after more evidence arrives?",
        "What audit signals should trigger a new review proposal?",
      ],
      insufficientKnowledge: false,
      recommendedSourceTypes: [],
    },
    async () =>
      answerQuestion(
        workspaceRoot,
        "Why does a compiled research wiki use reviewable patches?",
      ),
  );

  const archivedAnswer = await archiveAnswerArtifact(
    workspaceRoot,
    archivedAnswerSeed.id,
    "synthesis",
  );

  if (!archivedAnswer.archivedPageId || !archivedAnswer.archivedPage) {
    throw new Error("Expected the seeded answer artifact to archive into a synthesis page.");
  }

  await finalizeIndexPage(workspaceRoot, archivedAnswer.archivedPage.title);

  const answerReadyToArchive = await withMockedOpenAiResponse(
    {
      shortAnswer:
        "Grounded answers should return to the wiki as explicit synthesis pages or notes that preserve the question, citations, and page context.",
      detailedAnswer:
        "The compiled research wiki workflow already treats durable markdown pages as the long-term product, so valuable answers should not stay isolated in transient answer artifacts. The source summary on durable answer archives adds the operational rule: when an answer is grounded, archive it into the wiki with the original question, citations, and page references intact so it can re-enter future retrieval and review loops.",
      citations: [
        {
          referenceId: `wiki_page:${pageIds.compiledResearchWiki}`,
          note: "The compiled research wiki workflow is built around durable markdown pages rather than temporary chat state.",
        },
        {
          referenceId: `source_summary:${durableAnswerArchivesSource.id}`,
          note: "The summarized source says archived answers should retain citations, page refs, and the original question.",
        },
      ],
      caveats: [
        "This answer reflects the current demo workspace and one directly supporting source summary about archival practice.",
      ],
      basedOnPageIds: [pageIds.compiledResearchWiki],
      followUpQuestions: [
        "When should an answer become a synthesis page instead of a note?",
        "Which archived answers should trigger new review proposals later?",
      ],
      insufficientKnowledge: false,
      recommendedSourceTypes: [],
    },
    async () =>
      answerQuestion(
        workspaceRoot,
        "How does the compiled research wiki archive grounded answers?",
      ),
  );

  const coverageAudit = await runAudit(workspaceRoot, "coverage");
  const orphanAudit = await runAudit(workspaceRoot, "orphan");

  await clearLlmConfig(workspaceRoot);

  return {
    workspaceRoot,
    pageIds: {
      ...pageIds,
      archivedSynthesis: archivedAnswer.archivedPageId,
    },
    sourceIds: {
      visibleReview: visibleReviewSource.id,
      automationCounterpoints: automationCounterpointsSource.id,
      durableAnswerArchives: durableAnswerArchivesSource.id,
    },
    reviewIds: {
      approved: approvedReview.id,
      pending: counterpointsPlan.proposalIds[0]!,
      rejected: rejectedReview.id,
    },
    answerIds: {
      archived: archivedAnswer.id,
      readyToArchive: answerReadyToArchive.id,
    },
    auditIds: [coverageAudit.id, orphanAudit.id],
  };
}
