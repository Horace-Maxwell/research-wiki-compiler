import fs from "node:fs/promises";
import path from "node:path";

import type {
  AnswerArtifact,
  AnswererOutput,
} from "@/lib/contracts/answer";
import type {
  ReviewProposalDetail,
  EditableReviewProposal,
  PatchPlannerOutput,
} from "@/lib/contracts/review";
import type {
  SourceSummaryArtifactContent,
} from "@/lib/contracts/source-summary";
import { answerQuestion } from "@/server/services/answer-service";
import { archiveAnswerArtifact } from "@/server/services/answer-archive-service";
import { runAudit } from "@/server/services/audit-service";
import { refreshWikiPageSearchIndex } from "@/server/services/candidate-page-recall-service";
import { getWorkspaceDatabase } from "@/server/db/client";
import { REPO_ROOT } from "@/server/lib/repo-paths";
import {
  parseWikiDocument,
  serializeWikiDocument,
} from "@/server/services/wiki-frontmatter-service";
import { planPatchProposalsForSource } from "@/server/services/patch-planner-service";
import {
  approveReviewProposal,
  editAndApproveReviewProposal,
  rejectReviewProposal,
} from "@/server/services/review-action-service";
import {
  getReviewProposalDetail,
} from "@/server/services/review-service";
import { updateWorkspaceLlmSettings } from "@/server/services/settings-service";
import { importSource, getSourceDetail } from "@/server/services/source-service";
import { summarizeSource } from "@/server/services/source-summary-service";
import {
  getWikiPageDetail,
  listWikiPages,
  syncWikiIndex,
  updateWikiPage,
} from "@/server/services/wiki-page-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

const EXAMPLE_ROOT = path.join(REPO_ROOT, "examples", "openclaw-wiki");
const SNAPSHOT_ROOT = path.join(EXAMPLE_ROOT, "workspace");
const CORPUS_ROOT = path.join(EXAMPLE_ROOT, "source-corpus");
const BUILD_WORKSPACE_ROOT = path.join(REPO_ROOT, "tmp", "openclaw-workspace-build");
const MANIFEST_PATH = path.join(EXAMPLE_ROOT, "manifest.json");

const CORPUS_FILES = [
  "2026-03-31-openclaw-release-and-plugin-surface.md",
  "2026-03-26-openclaw-plugin-sdk-and-policy.md",
  "2026-04-02-openclaw-release-cadence-and-test-churn.md",
  "2026-04-05-openclaw-provider-risk-and-changelog.md",
] as const;

type SourcePlan = {
  importedId: string;
  summaryMarkdownPath: string | null;
  summaryJsonPath: string | null;
  proposalIds: string[];
  approvedProposalIds: string[];
  rejectedProposalIds: string[];
};

type Manifest = {
  generatedAt: string;
  exampleName: string;
  corpusFiles: Array<{
    snapshotPath: string;
    originPath: string;
    excerptScope: string[];
  }>;
  sources: Array<{
    id: string;
    title: string;
    summaryMarkdownPath: string | null;
    summaryJsonPath: string | null;
    proposalIds: string[];
    approvedProposalIds: string[];
    rejectedProposalIds: string[];
  }>;
  pages: Array<{
    title: string;
    type: string;
    path: string;
  }>;
  answers: Array<{
    id: string;
    question: string;
    shortAnswer: string;
    archivedPagePath: string | null;
  }>;
  audits: Array<{
    id: string;
    mode: string;
    reportPath: string | null;
    findingCount: number;
  }>;
  notes: {
    mockProvider: string;
    runtimeWorkspaceRoot: string;
    committedSnapshotRoot: string;
  };
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

function extractPromptField(prompt: string, field: string) {
  const match = prompt.match(new RegExp(`^${field}:\\s*(.+)$`, "m"));

  if (!match?.[1]) {
    throw new Error(`Missing prompt field ${field}.`);
  }

  return match[1].trim();
}

function parseJsonBlock(prompt: string, label: string) {
  const marker = `${label}:\n`;
  const start = prompt.indexOf(marker);

  if (start === -1) {
    throw new Error(`Missing JSON block ${label}.`);
  }

  return JSON.parse(prompt.slice(start + marker.length)) as Record<string, unknown>;
}

function buildSummaryArtifactForTitle(sourceTitle: string): SourceSummaryArtifactContent {
  switch (sourceTitle) {
    case "OpenClaw release and plugin surface update (2026-03-31)":
      return {
        conciseSummary:
          "The digest frames OpenClaw as a fast-moving developer tool whose latest release still centers model integration, Control UI, and plugin compatibility, while the plugin SDK baseline is still changing underneath custom integrations.",
        keyEntities: [
          {
            name: "OpenClaw",
            description:
              "The product being tracked across releases, commits, and workflow impact notes.",
            aliases: ["openclaw"],
          },
        ],
        keyConcepts: [
          {
            name: "OpenClaw release cadence",
            description:
              "Frequent release checkpoints that consolidate scattered OpenClaw changes into upgrade moments.",
          },
          {
            name: "Plugin compatibility",
            description:
              "The compatibility surface for plugins, custom integrations, and MCP-style extensions.",
          },
          {
            name: "Control UI",
            description:
              "A repeatedly mentioned OpenClaw surface that appears alongside CSP and model-integration changes.",
          },
          {
            name: "Provider configuration",
            description:
              "The provider-side setup and model access path that maintainers need to keep aligned with releases.",
          },
        ],
        majorClaims: [
          {
            text: "OpenClaw is shipping rapid release checkpoints while still refining model integration, Control UI, and plugin compatibility.",
            polarity: "supports",
            evidenceStrength: "high",
            rationale:
              "The release note is framed as another update in an already active line of changes, with the same product surfaces still moving.",
          },
          {
            text: "Plugin SDK baseline changes can force custom plugins and integrations to adjust compatibility layers.",
            polarity: "supports",
            evidenceStrength: "high",
            rationale:
              "The digest explicitly connects plugin SDK baseline changes to plugin interfaces, runtime detection order, and compatibility layers.",
          },
        ],
        openQuestions: [
          "How stable are OpenClaw plugin interfaces between releases?",
          "Which Control UI and provider-doc changes actually require operator intervention?",
        ],
        possibleTargetPageHints: [
          {
            title: "OpenClaw",
            pageType: "entity",
            rationale:
              "The source repeatedly treats OpenClaw itself as the stable anchor for releases, commits, and workflow impact.",
          },
          {
            title: "OpenClaw release cadence",
            pageType: "topic",
            rationale:
              "The release is described as part of a broader cadence of closely spaced upgrade checkpoints.",
          },
        ],
      };
    case "OpenClaw plugin SDK baseline and policy fixtures (2026-03-26)":
      return {
        conciseSummary:
          "This digest excerpt focuses on OpenClaw commit activity that touches the plugin SDK baseline and type-policy fixtures, suggesting that both the integration surface and compliance-sensitive workflow edges are still being worked through.",
        keyEntities: [
          {
            name: "OpenClaw",
            description:
              "The tracked product whose commit stream is being treated as operationally important to downstream workflows.",
            aliases: ["openclaw"],
          },
        ],
        keyConcepts: [
          {
            name: "Plugin compatibility",
            description:
              "The ability for plugins and integrations to keep working as SDK baselines move.",
          },
          {
            name: "Policy fixtures",
            description:
              "Typed policy fixtures that hint at compliance, supplier terms, and disclosure constraints in workflow design.",
          },
          {
            name: "Integration surface",
            description:
              "The operational surface where SDK, plugin, and workflow changes affect actual tool adoption.",
          },
        ],
        majorClaims: [
          {
            text: "Plugin SDK baseline refreshes can change OpenClaw integration capabilities and adoption timing.",
            polarity: "supports",
            evidenceStrength: "high",
            rationale:
              "The digest explicitly says the SDK baseline commit changes workflow, integration style, and available capability.",
          },
          {
            text: "Policy fixture work suggests OpenClaw integrators need to monitor compliance and disclosure boundaries.",
            polarity: "supports",
            evidenceStrength: "medium",
            rationale:
              "The policy-fixture note frames the impact in terms of formal workflow adoption, supplier terms, and external disclosure.",
          },
        ],
        openQuestions: [
          "Which integration assumptions break when the plugin SDK baseline changes?",
          "How much policy-fixture work is precautionary versus required for production usage?",
        ],
        possibleTargetPageHints: [
          {
            title: "OpenClaw",
            pageType: "entity",
            rationale:
              "The excerpt still centers OpenClaw as the primary thing being monitored.",
          },
          {
            title: "Plugin compatibility",
            pageType: "concept",
            rationale:
              "The strongest recurring change theme is plugin and SDK compatibility.",
          },
        ],
      };
    case "OpenClaw release cadence and test churn (2026-04-02)":
      return {
        conciseSummary:
          "The corpus records another OpenClaw release only days later and pairs it with commit activity around test import churn, reinforcing that releases are frequent and that local behavior may still shift under maintainers.",
        keyEntities: [
          {
            name: "OpenClaw",
            description:
              "The tracked product whose releases and code churn are being watched for workflow impact.",
            aliases: ["openclaw"],
          },
        ],
        keyConcepts: [
          {
            name: "OpenClaw release cadence",
            description:
              "The recurring pattern of closely spaced OpenClaw releases that create frequent upgrade checkpoints.",
          },
          {
            name: "Control UI",
            description:
              "A surface that remains part of the release framing alongside plugins and model integration.",
          },
          {
            name: "Provider configuration",
            description:
              "The provider and model setup path that may need synchronized adjustments when behavior shifts.",
          },
          {
            name: "Default behavior drift",
            description:
              "The risk that local workflows change indirectly as test churn and imports are tightened.",
          },
        ],
        majorClaims: [
          {
            text: "Repeated releases suggest OpenClaw changes are being consolidated into frequent upgrade checkpoints.",
            polarity: "supports",
            evidenceStrength: "high",
            rationale:
              "The release is framed as another consolidation point in a line of already continuous changes.",
          },
          {
            text: "Test and import churn signals that default behavior and local workflows may still shift.",
            polarity: "supports",
            evidenceStrength: "medium",
            rationale:
              "The digest directly ties test/import churn to the need to watch for local workflow behavior changes.",
          },
        ],
        openQuestions: [
          "When does release cadence become stable enough for routine upgrades?",
          "Which local defaults should operators regression-test after each release?",
        ],
        possibleTargetPageHints: [
          {
            title: "OpenClaw release cadence",
            pageType: "topic",
            rationale:
              "The strongest new evidence is another release checkpoint and what it means for upgrade rhythm.",
          },
          {
            title: "OpenClaw maintenance watchpoints",
            pageType: "synthesis",
            rationale:
              "The source is already phrased as advice about what maintainers should keep watching.",
          },
        ],
      };
    case "OpenClaw provider risk and changelog signals (2026-04-05)":
      return {
        conciseSummary:
          "This excerpt connects OpenClaw’s continued provider-side refactors and changelog packaging to a broader operational risk picture: plugin and model access still move quickly, and external provider-policy shifts can materially affect OpenClaw workflows.",
        keyEntities: [
          {
            name: "OpenClaw",
            description:
              "The tracked product whose provider, release, and changelog signals are being compiled into maintenance guidance.",
            aliases: ["openclaw"],
          },
          {
            name: "Anthropic",
            description:
              "An external provider named in a community report about OpenClaw-related subscription restrictions.",
            aliases: [],
          },
        ],
        keyConcepts: [
          {
            name: "Provider dependency risk",
            description:
              "The risk that model-provider changes or restrictions reshape OpenClaw capability and adoption paths.",
          },
          {
            name: "Provider configuration",
            description:
              "The provider-specific setup layer that must be watched as OpenClaw changes its core shims and changelog packaging.",
          },
          {
            name: "Control UI",
            description:
              "A still-moving OpenClaw surface that continues to appear in release framing.",
          },
        ],
        majorClaims: [
          {
            text: "OpenClaw still depends on active provider and plugin adjustments, especially around model access and configuration.",
            polarity: "supports",
            evidenceStrength: "high",
            rationale:
              "The provider-specific shim removal and repeated release framing both point to a still-moving provider and integration layer.",
          },
          {
            text: "External provider-policy shifts can create adoption and upgrade risk for OpenClaw workflows.",
            polarity: "mixed",
            evidenceStrength: "medium",
            rationale:
              "The Anthropic item is community-reported rather than a primary upstream source, but it is still treated as a meaningful risk signal.",
          },
          {
            text: "Changelog refreshes indicate recent OpenClaw changes are nearing release-level packaging.",
            polarity: "supports",
            evidenceStrength: "medium",
            rationale:
              "The digest explicitly treats the unreleased changelog refresh as a sign that recent fixes are being consolidated for upgrade decisions.",
          },
        ],
        openQuestions: [
          "Which provider-level assumptions remain safe for production OpenClaw workflows?",
          "How often should teams review changelog and provider-doc updates before upgrading?",
        ],
        possibleTargetPageHints: [
          {
            title: "Provider dependency risk",
            pageType: "concept",
            rationale:
              "The core new signal is not just product change but the external risk that comes from provider dependence.",
          },
          {
            title: "OpenClaw maintenance watchpoints",
            pageType: "synthesis",
            rationale:
              "The source naturally compiles into a checklist of what maintainers should monitor.",
          },
        ],
      };
    default:
      throw new Error(`No summary mock configured for ${sourceTitle}.`);
  }
}

function getCandidateId(
  context: Record<string, unknown>,
  title: string,
) {
  const candidates = (
    (context.candidateRecall as Record<string, unknown>).candidates as Array<Record<string, unknown>>
  ) ?? [];
  const match = candidates.find((candidate) => candidate.title === title);

  if (!match || typeof match.pageId !== "string") {
    throw new Error(`Missing candidate page ${title}.`);
  }

  return match.pageId;
}

function buildPatchPlanForContext(context: Record<string, unknown>): PatchPlannerOutput {
  const source = context.source as Record<string, unknown>;
  const sourceTitle = source.title as string;

  switch (sourceTitle) {
    case "OpenClaw release and plugin surface update (2026-03-31)": {
      const majorClaims = source.majorClaims as Array<{ text: string }>;

      return {
        proposals: [
          {
            title: "Create OpenClaw entity page",
            proposalType: "create_page",
            primaryTargetPageId: null,
            relatedTargetPageIds: [],
            proposedPage: {
              title: "OpenClaw",
              pageType: "entity",
              rationale:
                "The corpus treats OpenClaw itself as the durable anchor for releases, integrations, and workflow impact.",
            },
            patchGoal:
              "Create a core entity page that captures what OpenClaw is and which surfaces in the corpus keep moving.",
            rationale:
              "Without an OpenClaw entity page, later release, plugin, and risk evidence has no durable landing page.",
            affectedSections: ["Summary", "Key signals", "Related pages"],
            supportingClaimTexts: [
              majorClaims[0]!.text,
              majorClaims[1]!.text,
            ],
            conflictNotes: [],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Summary",
                operation: "replace",
                beforeText: "TBD",
                afterText:
                  "In this corpus, OpenClaw appears as a fast-moving AI developer tool and workflow surface centered on model integration, Control UI, and plugin compatibility.",
              },
              {
                sectionHeading: "Key signals",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- Releases and commits repeatedly emphasize model integration, Control UI / CSP, and plugin compatibility.",
                  "- The corpus treats OpenClaw as something operators actively monitor because changes can alter everyday workflow behavior.",
                ].join("\n"),
              },
              {
                sectionHeading: "Related pages",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- [[OpenClaw release cadence]]",
                  "- [[Plugin compatibility]]",
                  "- [[Provider dependency risk]]",
                ].join("\n"),
              },
            ],
          },
          {
            title: "Create OpenClaw release cadence topic page",
            proposalType: "create_page",
            primaryTargetPageId: null,
            relatedTargetPageIds: [],
            proposedPage: {
              title: "OpenClaw release cadence",
              pageType: "topic",
              rationale:
                "The source repeatedly frames releases as upgrade checkpoints rather than isolated announcements.",
            },
            patchGoal:
              "Create a topic page that tracks how quickly OpenClaw changes are turning into upgrade decisions.",
            rationale:
              "The release signal is important enough to deserve a dedicated place that later releases can update.",
            affectedSections: ["Summary", "Evidence", "Related pages"],
            supportingClaimTexts: [majorClaims[0]!.text],
            conflictNotes: [],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Summary",
                operation: "replace",
                beforeText: "TBD",
                afterText:
                  "OpenClaw release cadence matters because the corpus keeps treating new versions as near-term upgrade checkpoints with direct workflow impact.",
              },
              {
                sectionHeading: "Evidence",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- The 2026.3.31 release is described as a consolidation point for ongoing model-integration, Control UI, and plugin changes.",
                  "- Plugin SDK baseline changes are part of the same moving release surface rather than a separate maintenance thread.",
                ].join("\n"),
              },
              {
                sectionHeading: "Related pages",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- [[OpenClaw]]",
                  "- [[Plugin compatibility]]",
                  "- [[OpenClaw maintenance watchpoints]]",
                ].join("\n"),
              },
            ],
          },
        ],
      };
    }
    case "OpenClaw plugin SDK baseline and policy fixtures (2026-03-26)": {
      const openClawId = getCandidateId(context, "OpenClaw");
      const majorClaims = source.majorClaims as Array<{ text: string }>;

      return {
        proposals: [
          {
            title: "Create Plugin compatibility concept page",
            proposalType: "create_page",
            primaryTargetPageId: null,
            relatedTargetPageIds: [openClawId],
            proposedPage: {
              title: "Plugin compatibility",
              pageType: "concept",
              rationale:
                "The strongest new evidence is about plugin SDK baselines and what they mean for downstream integrations.",
            },
            patchGoal:
              "Create a durable concept page for the compatibility surface between OpenClaw, plugins, and custom integrations.",
            rationale:
              "This concept recurs in the source and is distinct from OpenClaw itself.",
            affectedSections: ["Summary", "Why it matters", "Related pages"],
            supportingClaimTexts: [
              majorClaims[0]!.text,
              majorClaims[1]!.text,
            ],
            conflictNotes: [],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Summary",
                operation: "replace",
                beforeText: "TBD",
                afterText:
                  "Plugin compatibility is the moving boundary where OpenClaw releases, SDK baselines, and custom integrations either continue to work cleanly or force operators to adjust.",
              },
              {
                sectionHeading: "Why it matters",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- SDK baseline refreshes can change adoption timing and available capability.",
                  "- Policy-fixture work implies that compatibility is not just technical; it can touch compliance and disclosure boundaries too.",
                ].join("\n"),
              },
              {
                sectionHeading: "Related pages",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- [[OpenClaw]]",
                  "- [[OpenClaw release cadence]]",
                ].join("\n"),
              },
            ],
          },
          {
            title: "Add integration-surface evidence to OpenClaw",
            proposalType: "update_page",
            primaryTargetPageId: openClawId,
            relatedTargetPageIds: [],
            proposedPage: null,
            patchGoal:
              "Expand the OpenClaw page with evidence about SDK baselines, policy fixtures, and practical workflow impact.",
            rationale:
              "The entity page should not stay at release-level framing only; the corpus also describes how OpenClaw changes land on integration workflows.",
            affectedSections: ["Integration surface", "Workflow cautions"],
            supportingClaimTexts: [
              majorClaims[0]!.text,
              majorClaims[1]!.text,
            ],
            conflictNotes: [],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Integration surface",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- Plugin SDK baseline refreshes can change what downstream integrations expect from OpenClaw.",
                  "- The corpus treats SDK, plugin, and workflow changes as operational signals, not just code churn.",
                  "- See [[Plugin compatibility]] for the compatibility layer this creates.",
                ].join("\n"),
              },
              {
                sectionHeading: "Workflow cautions",
                operation: "create_section",
                beforeText: null,
                afterText:
                  "- Type-policy fixture work suggests that some OpenClaw integrations may also need review around compliance, supplier terms, and disclosure boundaries.",
              },
            ],
          },
        ],
      };
    }
    case "OpenClaw release cadence and test churn (2026-04-02)": {
      const openClawId = getCandidateId(context, "OpenClaw");
      const releaseCadenceId = getCandidateId(context, "OpenClaw release cadence");
      const majorClaims = source.majorClaims as Array<{ text: string }>;

      return {
        proposals: [
          {
            title: "Update OpenClaw release cadence with 2026.4.2 evidence",
            proposalType: "update_page",
            primaryTargetPageId: releaseCadenceId,
            relatedTargetPageIds: [openClawId],
            proposedPage: null,
            patchGoal:
              "Update the release-cadence topic page with another release checkpoint and its workflow implications.",
            rationale:
              "The later release strengthens the cadence pattern and adds more concrete upgrade pressure.",
            affectedSections: ["Evidence", "Upgrade implications"],
            supportingClaimTexts: [
              majorClaims[0]!.text,
              majorClaims[1]!.text,
            ],
            conflictNotes: [],
            riskLevel: "low",
            hunks: [
              {
                sectionHeading: "Evidence",
                operation: "append",
                beforeText: null,
                afterText:
                  "- By 2026-04-02, another OpenClaw release had already arrived, reinforcing the pattern of closely spaced upgrade checkpoints.",
              },
              {
                sectionHeading: "Upgrade implications",
                operation: "create_section",
                beforeText: null,
                afterText:
                  "- Release monitoring should include local regression checks because nearby code churn can change default behavior without looking dramatic in release titles.",
              },
            ],
          },
          {
            title: "Add configuration-drift signals to OpenClaw",
            proposalType: "update_page",
            primaryTargetPageId: openClawId,
            relatedTargetPageIds: [releaseCadenceId],
            proposedPage: null,
            patchGoal:
              "Capture the way test/import churn makes OpenClaw default behavior worth monitoring between releases.",
            rationale:
              "The entity page should represent not just headline releases, but the quieter changes that affect local workflows.",
            affectedSections: ["Configuration drift signals"],
            supportingClaimTexts: [majorClaims[1]!.text],
            conflictNotes: [],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Configuration drift signals",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- Test and import churn in the commit stream is a warning that local defaults and workflow behavior may still move.",
                  "- Operators should treat release monitoring and local regression checks as a paired habit.",
                ].join("\n"),
              },
            ],
          },
          {
            title: "Create low-value OpenClaw daily watchlist note",
            proposalType: "create_page",
            primaryTargetPageId: null,
            relatedTargetPageIds: [openClawId],
            proposedPage: {
              title: "OpenClaw daily watchlist snapshot",
              pageType: "note",
              rationale:
                "This would preserve a daily tracking note, but the knowledge may be too transient to deserve a durable page.",
            },
            patchGoal:
              "Capture the current OpenClaw watchlist as a short note.",
            rationale:
              "The source mentions short-horizon watch behavior, but the resulting page would likely stay ephemeral.",
            affectedSections: ["Notes"],
            supportingClaimTexts: [majorClaims[1]!.text],
            conflictNotes: [],
            riskLevel: "low",
            hunks: [
              {
                sectionHeading: "Notes",
                operation: "replace",
                beforeText: "TBD",
                afterText:
                  "Watch default behavior drift, local workflow regressions, and whether release-level notes fully explain nearby code churn.",
              },
            ],
          },
        ],
      };
    }
    case "OpenClaw provider risk and changelog signals (2026-04-05)": {
      const openClawId = getCandidateId(context, "OpenClaw");
      const releaseCadenceId = getCandidateId(context, "OpenClaw release cadence");
      const pluginCompatibilityId = getCandidateId(context, "Plugin compatibility");
      const majorClaims = source.majorClaims as Array<{ text: string }>;

      return {
        proposals: [
          {
            title: "Create Provider dependency risk concept page",
            proposalType: "create_page",
            primaryTargetPageId: null,
            relatedTargetPageIds: [openClawId],
            proposedPage: {
              title: "Provider dependency risk",
              pageType: "concept",
              rationale:
                "The new evidence is specifically about external provider constraints and provider-specific integration paths.",
            },
            patchGoal:
              "Create a concept page for the external provider and access-path risks that shape OpenClaw maintenance decisions.",
            rationale:
              "This concept is recurring and affects how the corpus interprets releases, changelogs, and external policy shifts.",
            affectedSections: ["Summary", "Signals", "Related pages"],
            supportingClaimTexts: [
              majorClaims[0]!.text,
              majorClaims[1]!.text,
            ],
            conflictNotes: [
              "Some provider-risk evidence is community-reported rather than a primary vendor statement, so it should be tracked as a tension signal rather than a settled fact.",
            ],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Summary",
                operation: "replace",
                beforeText: "TBD",
                afterText:
                  "Provider dependency risk describes the way OpenClaw capabilities and upgrade choices can be reshaped by model-provider changes, restrictions, and provider-specific integration paths.",
              },
              {
                sectionHeading: "Signals",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- Provider-specific shim removal suggests the provider layer is still being actively simplified and rearranged.",
                  "- Community discussion about Anthropic restrictions is not a final authority, but it is still a warning that external policy moves can hit OpenClaw workflows.",
                ].join("\n"),
              },
              {
                sectionHeading: "Related pages",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- [[OpenClaw]]",
                  "- [[Plugin compatibility]]",
                  "- [[OpenClaw maintenance watchpoints]]",
                ].join("\n"),
              },
            ],
          },
          {
            title: "Record external tensions on OpenClaw",
            proposalType: "conflict_note",
            primaryTargetPageId: openClawId,
            relatedTargetPageIds: [releaseCadenceId, pluginCompatibilityId],
            proposedPage: null,
            patchGoal:
              "Record the external provider-policy tension that could constrain OpenClaw workflows even when the product itself keeps improving.",
            rationale:
              "The OpenClaw entity page should show not just internal product movement, but the external constraints maintainers are reacting to.",
            affectedSections: ["Tensions"],
            supportingClaimTexts: [majorClaims[1]!.text],
            conflictNotes: [
              "The Anthropic-related signal is a community risk marker, not a fully authoritative upstream contract statement.",
            ],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Tensions",
                operation: "note_conflict",
                beforeText: null,
                afterText:
                  "External provider-policy shifts can create adoption and upgrade risk for OpenClaw workflows, so maintainers should treat provider dependence as an ongoing tension rather than a solved detail. See [[Provider dependency risk]].",
              },
            ],
          },
          {
            title: "Create OpenClaw maintenance watchpoints synthesis",
            proposalType: "create_page",
            primaryTargetPageId: null,
            relatedTargetPageIds: [openClawId, releaseCadenceId, pluginCompatibilityId],
            proposedPage: {
              title: "OpenClaw maintenance watchpoints",
              pageType: "synthesis",
              rationale:
                "The source naturally compiles into a maintainer-facing synthesis of what to watch between releases.",
            },
            patchGoal:
              "Create a synthesis page that turns scattered OpenClaw signals into an operator checklist.",
            rationale:
              "By this point the corpus has enough repeated structure to justify a synthesis page rather than only isolated entity and concept pages.",
            affectedSections: ["Thesis", "Watchpoints", "Related pages"],
            supportingClaimTexts: [
              majorClaims[0]!.text,
              majorClaims[2]!.text,
            ],
            conflictNotes: [
              "Treat external provider-policy reports as watchpoints unless they are confirmed by primary vendor material.",
            ],
            riskLevel: "medium",
            hunks: [
              {
                sectionHeading: "Thesis",
                operation: "replace",
                beforeText: "TBD",
                afterText:
                  "Maintaining OpenClaw well means watching three things together: release cadence, plugin compatibility, and provider dependency risk.",
              },
              {
                sectionHeading: "Watchpoints",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- Track release notes and changelog packaging together; changelog refreshes often signal that upgrade-relevant changes are being consolidated.",
                  "- Regression-test plugin and integration paths because SDK baselines and compatibility layers are still moving.",
                  "- Watch provider documentation and external policy signals so model-access assumptions do not drift unnoticed.",
                ].join("\n"),
              },
              {
                sectionHeading: "Related pages",
                operation: "create_section",
                beforeText: null,
                afterText: [
                  "- [[OpenClaw]]",
                  "- [[OpenClaw release cadence]]",
                  "- [[Plugin compatibility]]",
                  "- [[Provider dependency risk]]",
                ].join("\n"),
              },
            ],
          },
        ],
      };
    }
    default:
      throw new Error(`No patch-plan mock configured for ${sourceTitle}.`);
  }
}

function buildGroundedAnswerFromEvidence(prompt: string): AnswererOutput {
  const question = extractPromptField(prompt, "question");
  const evidence = parseJsonBlock(prompt, "evidence_json");
  const wikiPages =
    (evidence.wikiPages as Array<Record<string, unknown>> | undefined) ?? [];
  const sourceSummaries =
    (evidence.sourceSummaries as Array<Record<string, unknown>> | undefined) ?? [];
  const questionLower = question.toLowerCase();
  const wikiByTitle = new Map(
    wikiPages.map((page) => [String(page.title).toLowerCase(), page]),
  );
  const summaryByTitle = new Map(
    sourceSummaries.map((summary) => [String(summary.sourceTitle).toLowerCase(), summary]),
  );

  const pickWikiPage = (preferredTitles: string[], fallbackIndex = 0) => {
    for (const preferredTitle of preferredTitles) {
      const exact = wikiByTitle.get(preferredTitle.toLowerCase());

      if (exact) {
        return exact;
      }

      const fuzzy = wikiPages.find((page) => {
        const pageTitle = String(page.title).toLowerCase();
        const preferred = preferredTitle.toLowerCase();

        return pageTitle.includes(preferred) || preferred.includes(pageTitle);
      });

      if (fuzzy) {
        return fuzzy;
      }
    }

    const fallback = wikiPages[fallbackIndex] ?? wikiPages[0];

    if (!fallback) {
      throw new Error(
        `Missing wiki evidence for preferred titles: ${preferredTitles.join(", ")}`,
      );
    }

    return fallback;
  };
  const maybeSummary = (title: string) => summaryByTitle.get(title.toLowerCase()) ?? null;
  const uniquePageIds = (pagesToUse: Array<Record<string, unknown>>) => {
    return [...new Set(pagesToUse.map((page) => String(page.pageId)))];
  };

  if (questionLower.includes("what is openclaw")) {
    const openClaw = pickWikiPage(["OpenClaw"]);
    const contextPage = pickWikiPage(
      ["OpenClaw release cadence", "OpenClaw maintenance watchpoints", "Plugin compatibility"],
      1,
    );

    return {
      shortAnswer:
        "In this corpus, OpenClaw appears as a fast-moving AI developer tool and workflow surface centered on model integration, Control UI, and plugin compatibility.",
      detailedAnswer: [
        "The compiled wiki does not describe OpenClaw as a generic chatbot. Instead, it consistently treats OpenClaw as an operator-facing toolchain surface whose releases and commits directly affect workflow behavior.",
        "",
        "Across the corpus, three recurring themes define it:",
        "- releases arrive as meaningful upgrade checkpoints, not just passive version bumps;",
        "- plugin and integration compatibility matter enough to deserve separate tracking;",
        "- provider and configuration changes can alter what OpenClaw can do in practice.",
        "",
        "So the safest reading is: OpenClaw is the durable entity at the center of a changing integration and operations surface, and maintainers need to watch it as a live system rather than a static tool.",
      ].join("\n"),
      citations: [
        {
          referenceId: String(openClaw.referenceId),
          note: "The OpenClaw entity page captures the corpus-level description of what OpenClaw is and which surfaces keep moving.",
        },
        {
          referenceId: String(contextPage.referenceId),
          note: "A second wiki page provides the operational context that keeps OpenClaw from reading like a static tool description.",
        },
      ],
      caveats: [
        "This answer is grounded in the provided research corpus, not in the upstream OpenClaw repository directly.",
      ],
      basedOnPageIds: uniquePageIds([openClaw, contextPage]),
      followUpQuestions: [
        "Which OpenClaw surfaces in this corpus look most unstable?",
        "What should a maintainer monitor before upgrading OpenClaw?",
      ],
      insufficientKnowledge: false,
      recommendedSourceTypes: [],
    };
  }

  if (
    questionLower.includes("unstable") ||
    questionLower.includes("fast-moving") ||
    questionLower.includes("most unstable")
  ) {
    const openClaw = pickWikiPage(["OpenClaw"]);
    const releaseOrWatchpoints = pickWikiPage(
      ["OpenClaw release cadence", "OpenClaw maintenance watchpoints", "Plugin compatibility"],
      1,
    );
    const providerRisk = pickWikiPage(
      ["Provider dependency risk", "OpenClaw maintenance watchpoints"],
      2,
    );
    const riskSummary = maybeSummary("OpenClaw provider risk and changelog signals (2026-04-05)");

    return {
      shortAnswer:
        "The fastest-moving parts of OpenClaw in this corpus are the release cadence, plugin/integration surface, and provider-facing configuration path.",
      detailedAnswer: [
        "Three areas look especially unstable or fast-moving:",
        "",
        "1. Release checkpoints keep arriving close together, so version changes are part of the normal operating rhythm.",
        "2. Plugin and integration compatibility is still being tightened through SDK baseline work and related commits.",
        "3. Provider-facing paths are still shifting, which means model access and configuration assumptions can age quickly.",
        "",
        "The corpus also adds an external tension: provider-policy shifts can matter even when OpenClaw itself is improving. That makes operational stability partly dependent on the wider provider environment, not just on OpenClaw releases.",
      ].join("\n"),
      citations: [
        {
          referenceId: String(releaseOrWatchpoints.referenceId),
          note: "A second compiled page captures why OpenClaw feels operationally fast-moving rather than just frequently renamed.",
        },
        {
          referenceId: String(providerRisk.referenceId),
          note: "The provider-dependency concept page captures the external and provider-facing risks that make the surface feel unstable.",
        },
        ...(riskSummary
          ? [
              {
                referenceId: String(riskSummary.referenceId),
                note: "The 2026-04-05 source summary adds fresh evidence about provider-specific shim changes and external policy risk signals.",
              },
            ]
          : []),
      ],
      caveats: [
        "Some external-risk evidence in this corpus is community-reported and should be treated as a tension signal rather than a settled vendor statement.",
      ],
      basedOnPageIds: [
        ...uniquePageIds([openClaw, releaseOrWatchpoints, providerRisk]),
      ],
      followUpQuestions: [
        "Which OpenClaw changes are important enough to block an upgrade?",
        "What should be regression-tested after each OpenClaw release?",
      ],
      insufficientKnowledge: false,
      recommendedSourceTypes: [],
    };
  }

  if (
    questionLower.includes("monitor before upgrading openclaw") ||
    questionLower.includes("monitor before upgrading")
  ) {
    const riskSummary = maybeSummary("OpenClaw provider risk and changelog signals (2026-04-05)");
    const releaseSummary = maybeSummary("OpenClaw release cadence and test churn (2026-04-02)");

    if (wikiPages.length === 0) {
      const fallbackSummary = riskSummary ?? releaseSummary ?? sourceSummaries[0] ?? null;

      if (!fallbackSummary) {
        throw new Error("Missing summary evidence for upgrade-monitoring answer.");
      }

      return {
        shortAnswer:
          "Before upgrading OpenClaw, monitor release/changelog packaging, plugin compatibility, and provider-side changes that could alter access paths or defaults.",
        detailedAnswer: [
          "This answer is grounded from summary fallback because retrieval did not surface enough wiki pages for the question.",
          "",
          "The summaries still point to a practical three-part checklist:",
          "1. Read release notes and changelog packaging together so you know which fixes are graduating into a real upgrade checkpoint.",
          "2. Re-test plugin and integration paths because SDK baselines and compatibility layers are still moving.",
          "3. Re-check provider assumptions because provider-side refactors and outside policy changes can change what the upgrade means in practice.",
        ].join("\n"),
        citations: [
          {
            referenceId: String(fallbackSummary.referenceId),
            note: "This source summary is the strongest fallback evidence for the upgrade-monitoring checklist.",
          },
          ...(releaseSummary && releaseSummary.referenceId !== fallbackSummary.referenceId
            ? [
                {
                  referenceId: String(releaseSummary.referenceId),
                  note: "A second source summary reinforces the release-cadence and local-regression side of the checklist.",
                },
              ]
            : []),
        ],
        caveats: [
          "The answer relied on summary fallback because retrieval did not surface enough wiki pages for this question.",
        ],
        basedOnPageIds: [],
        followUpQuestions: [
          "Which OpenClaw release signals should trigger a full regression run?",
          "Which provider assumptions are most likely to change next?",
        ],
        insufficientKnowledge: false,
        recommendedSourceTypes: [],
      };
    }

    const watchpoints = pickWikiPage(
      ["OpenClaw maintenance watchpoints", "OpenClaw release cadence"],
    );
    const releaseCadence = pickWikiPage(
      ["OpenClaw release cadence", "OpenClaw maintenance watchpoints", "OpenClaw"],
      1,
    );
    const providerRisk = pickWikiPage(
      ["Provider dependency risk", "Plugin compatibility", "OpenClaw"],
      2,
    );

    return {
      shortAnswer:
        "Before upgrading OpenClaw, monitor release notes and changelog packaging, plugin/integration compatibility, and provider-side configuration or policy changes.",
      detailedAnswer: [
        "A practical OpenClaw upgrade check in this corpus has three parts:",
        "",
        "1. Read the release note together with the changelog signals. The corpus treats changelog refreshes as a sign that upgrade-relevant fixes are being consolidated.",
        "2. Regression-test plugin and custom integration paths. SDK baseline and compatibility-layer changes can land quietly but still break the workflow you rely on.",
        "3. Re-check provider assumptions. Provider-specific refactors and outside policy signals can change access paths, default behavior, or acceptable usage assumptions.",
        "",
        "If one of those three areas is still unclear, the safest move is to delay the upgrade until release notes, provider docs, and your own local regression checks line up.",
      ].join("\n"),
      citations: [
        {
          referenceId: String(watchpoints.referenceId),
          note: "The maintenance-watchpoints synthesis page compiles the operating checklist directly from the wiki.",
        },
        {
          referenceId: String(releaseCadence.referenceId),
          note: "The release-cadence topic explains why release timing itself is part of upgrade risk.",
        },
        {
          referenceId: String(providerRisk.referenceId),
          note: "The provider-dependency concept page covers the external and provider-facing checks that should happen before an upgrade.",
        },
        ...(riskSummary
          ? [
              {
                referenceId: String(riskSummary.referenceId),
                note: "The 2026-04-05 source summary reinforces why provider docs and changelog packaging deserve explicit review before upgrading.",
              },
            ]
          : []),
      ],
      caveats: [
        "This guidance is corpus-specific and should still be cross-checked against the upstream release notes when you actually upgrade.",
      ],
      basedOnPageIds: [
        ...uniquePageIds([watchpoints, releaseCadence, providerRisk]),
      ],
      followUpQuestions: [
        "Which OpenClaw plugin paths are most likely to regress first?",
        "What release signals should trigger a full local regression run?",
      ],
      insufficientKnowledge: false,
      recommendedSourceTypes: [],
    };
  }

  const fallbackPage = wikiPages[0];

  if (!fallbackPage) {
    throw new Error(`No evidence available for question: ${question}`);
  }

  return {
    shortAnswer:
      "The corpus has some grounded context, but this question was not explicitly modeled in the example answer generator.",
    detailedAnswer:
      "The generator fallback could only confirm that relevant OpenClaw context exists in the compiled wiki. Ask one of the seeded questions in the example to see the stronger synthesis path.",
    citations: [
      {
        referenceId: String(fallbackPage.referenceId),
        note: "This is the highest-ranked wiki page retrieved for the fallback question.",
      },
    ],
    caveats: ["This fallback answer is intentionally conservative."],
    basedOnPageIds: [String(fallbackPage.pageId)],
    followUpQuestions: [],
    insufficientKnowledge: false,
    recommendedSourceTypes: [],
  };
}

async function withMockedOpenAi<T>(callback: () => Promise<T>) {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (_input, init) => {
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const userPrompt = Array.isArray(body.messages)
      ? body.messages.find((message: { role?: string }) => message.role === "user")?.content ?? ""
      : "";
    const schemaName = body.response_format?.json_schema?.name ?? "";
    const taskMode = userPrompt.match(/^task_mode:\s*(.+)$/m)?.[1]?.trim() ?? null;

    if (schemaName === "emit_source_chunk_digest" || taskMode === "chunk_digest") {
      return openAiResponse({
        chunkSummary: "OpenClaw excerpt digest.",
        keyEntities: ["OpenClaw"],
        keyConcepts: ["Plugin compatibility"],
        claims: ["OpenClaw workflow assumptions are still moving."],
        openQuestions: ["Which surfaces in OpenClaw are stable enough to automate against?"],
      });
    }

    if (schemaName === "emit_source_summary_artifact") {
      const sourceTitle = extractPromptField(userPrompt, "source_title");
      return openAiResponse(buildSummaryArtifactForTitle(sourceTitle));
    }

    if (schemaName === "emit_patch_plan") {
      const planningContext = parseJsonBlock(userPrompt, "planning_context_json");
      return openAiResponse(buildPatchPlanForContext(planningContext));
    }

    if (schemaName === "emit_grounded_answer_artifact") {
      return openAiResponse(buildGroundedAnswerFromEvidence(userPrompt));
    }

    throw new Error(
      `Unhandled mocked OpenAI request: schema=${schemaName} taskMode=${taskMode ?? "unknown"}`,
    );
  }) as typeof globalThis.fetch;

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function cleanDirectory(directory: string) {
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
}

async function syncSnapshot(runtimeWorkspaceRoot: string) {
  await fs.mkdir(SNAPSHOT_ROOT, { recursive: true });

  for (const name of ["raw", "reviews", "audits", "wiki"]) {
    await fs.rm(path.join(SNAPSHOT_ROOT, name), { recursive: true, force: true });
  }

  for (const name of ["raw", "reviews", "audits", "wiki"]) {
    const from = path.join(runtimeWorkspaceRoot, name);
    const to = path.join(SNAPSHOT_ROOT, name);

    await fs.cp(from, to, { recursive: true });
  }
}

async function checkpointDatabase(workspaceRoot: string) {
  const dbPath = path.join(workspaceRoot, ".research-wiki", "app.db");
  const { sqlite } = getWorkspaceDatabase(dbPath);
  sqlite.pragma("wal_checkpoint(TRUNCATE)");
}

async function getPageIdByPath(workspaceRoot: string, pagePath: string) {
  const pages = await listWikiPages(workspaceRoot);
  const page = pages.find((entry) => entry.path === pagePath);

  if (!page) {
    throw new Error(`Missing wiki page at ${pagePath}.`);
  }

  return page.id;
}

function buildEditedProposal(detail: ReviewProposalDetail, newAfterText: string): EditableReviewProposal {
  if (!detail.artifact) {
    throw new Error(`Missing artifact for proposal ${detail.id}.`);
  }

  const nextHunks = [...detail.artifact.hunks];
  const firstSummaryHunkIndex = nextHunks.findIndex(
    (hunk) => hunk.sectionHeading === "Summary" && hunk.operation === "replace",
  );

  if (firstSummaryHunkIndex === -1) {
    throw new Error(`Could not find summary replace hunk for proposal ${detail.id}.`);
  }

  nextHunks[firstSummaryHunkIndex] = {
    ...nextHunks[firstSummaryHunkIndex]!,
    afterText: newAfterText,
  };

  return {
    title: detail.artifact.title,
    patchGoal: detail.artifact.patchGoal,
    rationale: detail.artifact.rationale,
    affectedSections: detail.artifact.affectedSections,
    conflictNotes: detail.artifact.conflictNotes,
    proposedPage: detail.artifact.proposedPage,
    hunks: nextHunks,
  };
}

async function applyProposalsForSource(
  workspaceRoot: string,
  sourceTitle: string,
  proposalIds: string[],
) {
  const details = await Promise.all(
    proposalIds.map((proposalId) => getReviewProposalDetail(workspaceRoot, proposalId)),
  );
  const approvedProposalIds: string[] = [];
  const rejectedProposalIds: string[] = [];

  const requireProposal = (title: string) => {
    const proposal = details.find((detail) => detail.title === title);

    if (!proposal) {
      throw new Error(`Missing proposal "${title}" for ${sourceTitle}.`);
    }

    return proposal;
  };

  switch (sourceTitle) {
    case "OpenClaw release and plugin surface update (2026-03-31)": {
      const openClawProposal = requireProposal("Create OpenClaw entity page");
      const releaseCadenceProposal = requireProposal("Create OpenClaw release cadence topic page");

      await editAndApproveReviewProposal({
        workspaceRoot,
        proposalId: openClawProposal.id,
        note: "Tightened the summary wording before approval so the page stays explicit about corpus scope.",
        edits: buildEditedProposal(
          openClawProposal,
          "In this corpus, OpenClaw appears as a fast-moving AI developer tool and workflow surface whose releases, plugin interfaces, and provider-facing behavior all matter to maintainers.",
        ),
      });
      approvedProposalIds.push(openClawProposal.id);

      await approveReviewProposal(
        workspaceRoot,
        releaseCadenceProposal.id,
        "Approved to create a durable landing page for later OpenClaw release evidence.",
      );
      approvedProposalIds.push(releaseCadenceProposal.id);
      break;
    }
    case "OpenClaw plugin SDK baseline and policy fixtures (2026-03-26)": {
      const pluginProposal = requireProposal("Create Plugin compatibility concept page");
      const openClawUpdate = requireProposal("Add integration-surface evidence to OpenClaw");

      await approveReviewProposal(
        workspaceRoot,
        pluginProposal.id,
        "Approved because the compatibility surface is a recurring concept in the corpus.",
      );
      approvedProposalIds.push(pluginProposal.id);

      await approveReviewProposal(
        workspaceRoot,
        openClawUpdate.id,
        "Approved to land the SDK baseline and policy-fixture evidence on the core OpenClaw page.",
      );
      approvedProposalIds.push(openClawUpdate.id);
      break;
    }
    case "OpenClaw release cadence and test churn (2026-04-02)": {
      const cadenceUpdate = requireProposal(
        "Update OpenClaw release cadence with 2026.4.2 evidence",
      );
      const openClawUpdate = requireProposal("Add configuration-drift signals to OpenClaw");
      const rejectedNote = requireProposal("Create low-value OpenClaw daily watchlist note");

      await approveReviewProposal(
        workspaceRoot,
        cadenceUpdate.id,
        "Approved because the new release strengthens the cadence pattern rather than duplicating it.",
      );
      approvedProposalIds.push(cadenceUpdate.id);

      await approveReviewProposal(
        workspaceRoot,
        openClawUpdate.id,
        "Approved to capture the quieter configuration-drift signals that affect local workflows.",
      );
      approvedProposalIds.push(openClawUpdate.id);

      await rejectReviewProposal(
        workspaceRoot,
        rejectedNote.id,
        "Rejected because this would preserve an ephemeral daily watchlist note instead of durable compiled knowledge.",
      );
      rejectedProposalIds.push(rejectedNote.id);
      break;
    }
    case "OpenClaw provider risk and changelog signals (2026-04-05)": {
      const providerRisk = requireProposal("Create Provider dependency risk concept page");
      const tensionNote = requireProposal("Record external tensions on OpenClaw");
      const watchpoints = requireProposal("Create OpenClaw maintenance watchpoints synthesis");

      await approveReviewProposal(
        workspaceRoot,
        providerRisk.id,
        "Approved to give external provider constraints a durable conceptual page instead of burying them in release notes.",
      );
      approvedProposalIds.push(providerRisk.id);

      await approveReviewProposal(
        workspaceRoot,
        tensionNote.id,
        "Approved to keep the Anthropic-related signal visible as a tension, not as a silent assumption.",
      );
      approvedProposalIds.push(tensionNote.id);

      await approveReviewProposal(
        workspaceRoot,
        watchpoints.id,
        "Approved because the corpus now supports a maintainer-facing synthesis page.",
      );
      approvedProposalIds.push(watchpoints.id);
      break;
    }
    default:
      throw new Error(`Unhandled source approval plan for ${sourceTitle}.`);
  }

  return {
    approvedProposalIds,
    rejectedProposalIds,
  };
}

async function rewriteExampleIndex(workspaceRoot: string, sourceIds: string[]) {
  const indexId = await getPageIdByPath(workspaceRoot, "wiki/index.md");
  const indexDetail = await getWikiPageDetail(workspaceRoot, indexId);
  const parsed = parseWikiDocument({
    rawContent: indexDetail.rawContent,
    relativePath: indexDetail.path,
  });
  const archivedNoteTitle = "Note: What should I monitor before upgrading OpenClaw";
  const nextFrontmatter = {
    ...parsed.frontmatter,
    title: "OpenClaw Example Index",
    tags: ["workspace", "example", "openclaw"],
    source_refs: sourceIds,
    page_refs: [
      "OpenClaw",
      "OpenClaw release cadence",
      "Plugin compatibility",
      "Provider dependency risk",
      "OpenClaw maintenance watchpoints",
      archivedNoteTitle,
    ],
    updated_at: new Date().toISOString(),
  };
  const nextBody = [
    "# OpenClaw Example Index",
    "",
    "## Overview",
    "",
    "This wiki is a compiled example built from a small user-derived OpenClaw corpus. It shows how the product turns raw source excerpts into summaries, reviewable patch proposals, durable wiki pages, grounded answers, archived notes, and audit findings.",
    "",
    "## Start here",
    "",
    "- [[OpenClaw]]",
    "- [[OpenClaw release cadence]]",
    "- [[Plugin compatibility]]",
    "- [[Provider dependency risk]]",
    "- [[OpenClaw maintenance watchpoints]]",
    `- [[${archivedNoteTitle}]]`,
    "",
    "## Corpus",
    "",
    "- Four curated excerpts from the user's Obsidian AI news digests between 2026-03-26 and 2026-04-05.",
    "- The corpus emphasizes releases, plugin/API baseline changes, provider-facing refactors, and external provider-policy risk signals.",
    "",
    "## Visible artifacts",
    "",
    "- Source summaries live under `raw/processed/summaries/`.",
    "- Review proposals live under `reviews/approved/` and `reviews/rejected/`.",
    "- Audit reports live under `audits/`.",
    "",
    "## Reading path",
    "",
    "Read the OpenClaw entity page first, then the release-cadence and plugin-compatibility pages, then the provider-risk and maintenance-watchpoints pages, and finally the archived upgrade note.",
  ].join("\n");

  await updateWikiPage({
    workspaceRoot,
    pageId: indexId,
    rawContent: serializeWikiDocument(nextFrontmatter, nextBody),
  });
  await syncWikiIndex(workspaceRoot);
  await refreshWikiPageSearchIndex(workspaceRoot);
}

async function buildManifest(params: {
  workspaceRoot: string;
  sourcePlans: SourcePlan[];
  answers: AnswerArtifact[];
  auditIds: string[];
}) {
  const pages = await listWikiPages(params.workspaceRoot);
  const audits = params.auditIds.map((auditId) => {
    const detail = runAuditResultCache.get(auditId);

    if (!detail) {
      throw new Error(`Missing cached audit detail for ${auditId}.`);
    }

    return detail;
  });

  return {
    generatedAt: new Date().toISOString(),
    exampleName: "OpenClaw example wiki",
    corpusFiles: await Promise.all(
      CORPUS_FILES.map(async (fileName) => {
        const raw = await fs.readFile(path.join(CORPUS_ROOT, fileName), "utf8");
        const frontmatterMatch = raw.match(/^---\n([\s\S]+?)\n---/);
        const originPath = frontmatterMatch?.[1].match(/origin_path:\s*"(.+)"/)?.[1] ?? "";
        const excerptScope = [
          ...raw.matchAll(/^\s*-\s+"(.+)"$/gm),
        ].map((match) => match[1]!);

        return {
          snapshotPath: `examples/openclaw-wiki/source-corpus/${fileName}`,
          originPath,
          excerptScope,
        };
      }),
    ),
    sources: params.sourcePlans.map((sourcePlan) => ({
      id: sourcePlan.importedId,
      title: "",
      summaryMarkdownPath: sourcePlan.summaryMarkdownPath,
      summaryJsonPath: sourcePlan.summaryJsonPath,
      proposalIds: sourcePlan.proposalIds,
      approvedProposalIds: sourcePlan.approvedProposalIds,
      rejectedProposalIds: sourcePlan.rejectedProposalIds,
    })),
    pages: pages.map((page) => ({
      title: page.title,
      type: page.type,
      path: page.path,
    })),
    answers: params.answers.map((answer) => ({
      id: answer.id,
      question: answer.question,
      shortAnswer: answer.shortAnswer,
      archivedPagePath: answer.archivedPage?.path ?? null,
    })),
    audits: audits.map((audit) => ({
      id: audit.id,
      mode: audit.mode,
      reportPath: audit.reportPath,
      findingCount: audit.findings.length,
    })),
    notes: {
      mockProvider: "openai structured mock transport via real service calls",
      runtimeWorkspaceRoot: "tmp/openclaw-workspace-build",
      committedSnapshotRoot: "examples/openclaw-wiki/workspace",
    },
  } satisfies Manifest;
}

const runAuditResultCache = new Map<
  string,
  Awaited<ReturnType<typeof runAudit>>
>();

async function main() {
  await cleanDirectory(BUILD_WORKSPACE_ROOT);
  await fs.mkdir(path.join(REPO_ROOT, "tmp"), { recursive: true });

  await initializeWorkspace({
    workspaceRoot: BUILD_WORKSPACE_ROOT,
    workspaceName: "OpenClaw Example Workspace",
    initializeGit: false,
  });

  await updateWorkspaceLlmSettings(BUILD_WORKSPACE_ROOT, {
    provider: "openai",
    model: null,
    openai: {
      apiKey: "sk-openclaw-example",
      model: "gpt-openclaw-example",
    },
    anthropic: {
      apiKey: null,
      model: null,
    },
  });

  const sourcePlans: SourcePlan[] = [];

  await withMockedOpenAi(async () => {
    for (const fileName of CORPUS_FILES) {
      const filePath = path.join(CORPUS_ROOT, fileName);
      const imported = await importSource({
        workspaceRoot: BUILD_WORKSPACE_ROOT,
        importKind: "local_file_path",
        filePath,
      });
      const summarized = await summarizeSource(BUILD_WORKSPACE_ROOT, imported.id);
      const planned = await planPatchProposalsForSource(BUILD_WORKSPACE_ROOT, imported.id);
      const approvals = await applyProposalsForSource(
        BUILD_WORKSPACE_ROOT,
        summarized.title,
        planned.proposalIds,
      );

      sourcePlans.push({
        importedId: imported.id,
        summaryMarkdownPath: summarized.summary.markdownPath,
        summaryJsonPath: summarized.summary.jsonPath,
        proposalIds: planned.proposalIds,
        approvedProposalIds: approvals.approvedProposalIds,
        rejectedProposalIds: approvals.rejectedProposalIds,
      });
    }

    const questions = [
      "What is OpenClaw in this corpus?",
      "Which parts of OpenClaw look most unstable or fast-moving?",
      "What should I monitor before upgrading OpenClaw?",
    ] as const;
    const answers: AnswerArtifact[] = [];

    for (const question of questions) {
      answers.push(await answerQuestion(BUILD_WORKSPACE_ROOT, question));
    }

    const archived = await archiveAnswerArtifact(
      BUILD_WORKSPACE_ROOT,
      answers[2]!.id,
      "note",
    );
    answers[2] = archived;

    const coverageAudit = await runAudit(BUILD_WORKSPACE_ROOT, "coverage");
    runAuditResultCache.set(coverageAudit.id, coverageAudit);

    await rewriteExampleIndex(
      BUILD_WORKSPACE_ROOT,
      sourcePlans.map((plan) => plan.importedId),
    );
    await checkpointDatabase(BUILD_WORKSPACE_ROOT);
    await syncSnapshot(BUILD_WORKSPACE_ROOT);

    const manifest = await buildManifest({
      workspaceRoot: BUILD_WORKSPACE_ROOT,
      sourcePlans,
      answers,
      auditIds: [coverageAudit.id],
    });

    manifest.sources = await Promise.all(
      manifest.sources.map(async (source) => {
        const detail = await getSourceDetail(BUILD_WORKSPACE_ROOT, source.id);
        return {
          ...source,
          title: detail.title,
        };
      }),
    );

    await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

    console.log("OpenClaw example generated.");
    console.log(`Snapshot: ${SNAPSHOT_ROOT}`);
    console.log(`Manifest: ${MANIFEST_PATH}`);
    console.log(`Archived page: ${archived.archivedPage?.path ?? "none"}`);
    console.log(`Coverage audit: ${coverageAudit.reportPath ?? "none"}`);
  });
}

main().catch((error) => {
  console.error("Failed to generate the OpenClaw example.");
  console.error(error);
  process.exitCode = 1;
});
