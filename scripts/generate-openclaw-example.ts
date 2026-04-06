import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  AnswerArtifact,
  AnswererOutput,
} from "@/lib/contracts/answer";
import {
  openClawExampleManifestSchema,
  openClawExamplePipelineConfigSchema,
  openClawExampleReferenceBaselineSchema,
  type OpenClawExampleManifest,
  type OpenClawExampleMode,
  type OpenClawExamplePipelineConfig,
  type OpenClawExampleReferenceBaseline,
  type OpenClawExampleSourcePlan,
} from "@/lib/contracts/openclaw-example";
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
import {
  OPENCLAW_RENDERED_WORKSPACE_ROOT,
  REPO_ROOT,
} from "@/server/lib/repo-paths";
import {
  ensureOpenClawRenderedWorkspace,
} from "@/server/services/openclaw-example-service";
import {
  buildOpenClawObsidianVault,
} from "@/server/services/openclaw-obsidian-vault-service";
import {
  buildKnowledgeMethodPack,
  findKnowledgeSurface,
} from "@/server/services/knowledge-method-template-service";
import { openClawKnowledgeMethodData } from "@/server/services/openclaw-knowledge-method";
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
  createWikiPage,
  getWikiPageDetail,
  listWikiPages,
  syncWikiIndex,
  updateWikiPage,
} from "@/server/services/wiki-page-service";
import { initializeWorkspace } from "@/server/services/workspace-service";

const EXAMPLE_ROOT = path.join(REPO_ROOT, "examples", "openclaw-wiki");
const PIPELINE_CONFIG_PATH = path.join(EXAMPLE_ROOT, "pipeline.json");
const openClawMethodPack = buildKnowledgeMethodPack(openClawKnowledgeMethodData);

type SourcePlan = {
  importedId: string;
  summaryMarkdownPath: string | null;
  summaryJsonPath: string | null;
  proposalIds: string[];
  approvedProposalIds: string[];
  rejectedProposalIds: string[];
};

type OpenClawBuildPaths = {
  corpusRoot: string;
  snapshotRoot: string;
  canonicalManifestPath: string;
  referenceBaselinePath: string;
  canonicalObsidianVaultRoot: string;
  runtimeWorkspaceRoot: string;
  runtimeManifestPath: string;
  runtimeObsidianVaultRoot: string;
};

type OpenClawBuildResult = {
  mode: OpenClawExampleMode;
  workspaceRoot: string;
  runtimeManifestPath: string;
  runtimeObsidianVaultRoot: string;
  manifest: OpenClawExampleManifest;
  config: OpenClawExamplePipelineConfig;
  paths: OpenClawBuildPaths;
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

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizeTextFileContent(value: string) {
  return value.replace(/\r\n/g, "\n");
}

async function writeJsonFile(targetPath: string, value: unknown) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function fileExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readPipelineConfig() {
  const raw = await fs.readFile(PIPELINE_CONFIG_PATH, "utf8");
  return openClawExamplePipelineConfigSchema.parse(JSON.parse(raw));
}

function getBuildPaths(
  config: OpenClawExamplePipelineConfig,
  mode: OpenClawExampleMode,
): OpenClawBuildPaths {
  return {
    corpusRoot: path.join(REPO_ROOT, config.paths.corpusRoot),
    snapshotRoot: path.join(REPO_ROOT, config.paths.canonicalSnapshotRoot),
    canonicalManifestPath: path.join(REPO_ROOT, config.paths.canonicalManifestPath),
    referenceBaselinePath: path.join(REPO_ROOT, config.paths.referenceBaselinePath),
    canonicalObsidianVaultRoot: path.join(REPO_ROOT, config.paths.canonicalObsidianVaultRoot),
    runtimeWorkspaceRoot: path.join(
      REPO_ROOT,
      mode === "reference"
        ? config.paths.referenceRuntimeWorkspaceRoot
        : config.paths.liveRuntimeWorkspaceRoot,
    ),
    runtimeManifestPath: path.join(
      REPO_ROOT,
      mode === "reference"
        ? config.paths.referenceRuntimeManifestPath
        : config.paths.liveRuntimeManifestPath,
    ),
    runtimeObsidianVaultRoot: path.join(
      REPO_ROOT,
      mode === "reference"
        ? config.paths.referenceRuntimeObsidianVaultRoot
        : config.paths.liveRuntimeObsidianVaultRoot,
    ),
  };
}

async function listFilesRecursively(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (entry.name === ".DS_Store") {
      continue;
    }

    files.push(absolutePath);
  }

  return files.sort();
}

async function collectHashEntries(params: {
  root: string;
  logicalPrefix?: string;
}) {
  const files = await listFilesRecursively(params.root);

  return Promise.all(
    files.map(async (filePath) => {
      const raw = await fs.readFile(filePath, "utf8");

      return {
        logicalPath: path.posix.join(
          params.logicalPrefix ?? "",
          path.relative(params.root, filePath).split(path.sep).join("/"),
        ),
        sha256: sha256(normalizeTextFileContent(raw)),
      };
    }),
  );
}

async function buildReferenceBaseline(params: {
  manifestPath: string;
  snapshotRoot: string;
  corpusRoot: string;
  obsidianVaultRoot: string;
}) {
  const manifestRaw = await fs.readFile(params.manifestPath, "utf8");
  const entries = [
    {
      logicalPath: "manifest.json",
      sha256: sha256(normalizeTextFileContent(manifestRaw)),
    },
    ...(await collectHashEntries({
      root: params.snapshotRoot,
      logicalPrefix: "workspace",
    })),
    ...(await collectHashEntries({
      root: params.obsidianVaultRoot,
      logicalPrefix: "obsidian-vault",
    })),
  ].sort((left, right) => left.logicalPath.localeCompare(right.logicalPath));
  const corpusEntries = (await collectHashEntries({
    root: params.corpusRoot,
    logicalPrefix: "source-corpus",
  })).sort((left, right) => left.logicalPath.localeCompare(right.logicalPath));

  return openClawExampleReferenceBaselineSchema.parse({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    mode: "reference",
    manifestLogicalPath: "manifest.json",
    entries,
    corpusEntries,
  });
}

function compareHashEntries(params: {
  actual: OpenClawExampleReferenceBaseline["entries"];
  expected: OpenClawExampleReferenceBaseline["entries"];
  label: string;
}) {
  const expectedMap = new Map(
    params.expected.map((entry) => [entry.logicalPath, entry.sha256]),
  );
  const actualMap = new Map(params.actual.map((entry) => [entry.logicalPath, entry.sha256]));
  const missing = [...expectedMap.keys()].filter((key) => !actualMap.has(key));
  const unexpected = [...actualMap.keys()].filter((key) => !expectedMap.has(key));
  const mismatched = [...expectedMap.entries()]
    .filter(([key, hash]) => actualMap.has(key) && actualMap.get(key) !== hash)
    .map(([key]) => key);

  if (missing.length === 0 && unexpected.length === 0 && mismatched.length === 0) {
    return;
  }

  const parts = [
    `${params.label} did not match the canonical reference baseline.`,
  ];

  if (missing.length > 0) {
    parts.push(`Missing: ${missing.join(", ")}`);
  }

  if (unexpected.length > 0) {
    parts.push(`Unexpected: ${unexpected.join(", ")}`);
  }

  if (mismatched.length > 0) {
    parts.push(`Changed: ${mismatched.join(", ")}`);
  }

  throw new Error(parts.join(" "));
}

async function withDeterministicRuntime<T>(
  seedTimestamp: string,
  callback: () => Promise<T>,
) {
  const OriginalDate = Date;
  const originalRandomUUID = crypto.randomUUID;
  const baseTime = OriginalDate.parse(seedTimestamp);
  let tick = 0;
  let uuidCounter = 0;
  const nextTime = () => baseTime + tick++;

  class DeterministicDate extends OriginalDate {
    constructor(...args: unknown[]) {
      if (args.length === 0) {
        super(nextTime());
        return;
      }

      if (args.length === 1) {
        super(args[0] as string | number | Date);
        return;
      }

      if (args.length === 2) {
        super(args[0] as number, args[1] as number);
        return;
      }

      if (args.length === 3) {
        super(args[0] as number, args[1] as number, args[2] as number);
        return;
      }

      if (args.length === 4) {
        super(args[0] as number, args[1] as number, args[2] as number, args[3] as number);
        return;
      }

      if (args.length === 5) {
        super(
          args[0] as number,
          args[1] as number,
          args[2] as number,
          args[3] as number,
          args[4] as number,
        );
        return;
      }

      if (args.length === 6) {
        super(
          args[0] as number,
          args[1] as number,
          args[2] as number,
          args[3] as number,
          args[4] as number,
          args[5] as number,
        );
        return;
      }

      super(
        args[0] as number,
        args[1] as number,
        args[2] as number,
        args[3] as number,
        args[4] as number,
        args[5] as number,
        args[6] as number,
      );
    }

    static now() {
      return nextTime();
    }

    static parse(value: string) {
      return OriginalDate.parse(value);
    }

    static UTC(...args: Parameters<typeof Date.UTC>) {
      return OriginalDate.UTC(...args);
    }
  }

  globalThis.Date = DeterministicDate as DateConstructor;
  crypto.randomUUID = () => {
    const suffix = String(uuidCounter++).padStart(12, "0");
    return `00000000-0000-4000-8000-${suffix}`;
  };

  try {
    return await callback();
  } finally {
    globalThis.Date = OriginalDate;
    crypto.randomUUID = originalRandomUUID;
  }
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

async function syncDirectory(sourceRoot: string, targetRoot: string) {
  await fs.rm(targetRoot, { recursive: true, force: true });
  await fs.mkdir(targetRoot, { recursive: true });
  await fs.cp(sourceRoot, targetRoot, { recursive: true });
}

async function syncSnapshot(runtimeWorkspaceRoot: string, snapshotRoot: string) {
  await fs.mkdir(snapshotRoot, { recursive: true });

  for (const name of ["raw", "reviews", "audits", "wiki"]) {
    await fs.rm(path.join(snapshotRoot, name), { recursive: true, force: true });
  }

  for (const name of ["raw", "reviews", "audits", "wiki"]) {
    const from = path.join(runtimeWorkspaceRoot, name);
    const to = path.join(snapshotRoot, name);

    await fs.cp(from, to, { recursive: true });
  }
}

async function buildRuntimeEntries(params: {
  manifestPath: string;
  workspaceRoot: string;
  obsidianVaultRoot: string;
}) {
  const manifestRaw = await fs.readFile(params.manifestPath, "utf8");
  const workspaceEntries = [];

  for (const directoryName of ["raw", "reviews", "audits", "wiki"] as const) {
    workspaceEntries.push(
      ...(await collectHashEntries({
        root: path.join(params.workspaceRoot, directoryName),
        logicalPrefix: path.posix.join("workspace", directoryName),
      })),
    );
  }

  const obsidianEntries = await collectHashEntries({
    root: params.obsidianVaultRoot,
    logicalPrefix: "obsidian-vault",
  });

  return [
    {
      logicalPath: "manifest.json",
      sha256: sha256(normalizeTextFileContent(manifestRaw)),
    },
    ...workspaceEntries,
    ...obsidianEntries,
  ].sort((left, right) => left.logicalPath.localeCompare(right.logicalPath));
}

function getLiveProviderSettings(config: OpenClawExamplePipelineConfig) {
  const provider = process.env.OPENCLAW_EXAMPLE_LIVE_PROVIDER?.trim() || config.modes.live.provider;

  if (provider !== "openai") {
    throw new Error(
      `Unsupported OPENCLAW_EXAMPLE_LIVE_PROVIDER "${provider}". This example currently supports live OpenAI execution only.`,
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for npm run example:openclaw:live.");
  }

  return {
    provider: "openai" as const,
    model: null,
    openai: {
      apiKey,
      model: process.env.OPENCLAW_EXAMPLE_LIVE_MODEL?.trim() || "gpt-5.4",
    },
    anthropic: {
      apiKey: null,
      model: null,
    },
  };
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

function uniqueStringValues(values: string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function buildKnowledgeFrontmatter(title: string) {
  const surface = findKnowledgeSurface(openClawKnowledgeMethodData, title);

  if (!surface) {
    return {};
  }

  return {
    knowledge_role: surface.role,
    surface_kind: surface.surfaceKind,
    ...(surface.revisitCadence
      ? {
          revisit_cadence: surface.revisitCadence,
        }
      : {}),
    ...(surface.refreshTriggers && surface.refreshTriggers.length > 0
      ? {
          refresh_triggers: surface.refreshTriggers,
        }
      : {}),
  };
}

async function rewritePageByPath(params: {
  workspaceRoot: string;
  pagePath: string;
  mutate: (input: {
    detail: Awaited<ReturnType<typeof getWikiPageDetail>>;
    frontmatter: ReturnType<typeof parseWikiDocument>["frontmatter"];
    body: string;
  }) => {
    frontmatter: ReturnType<typeof parseWikiDocument>["frontmatter"];
    body: string;
  };
}) {
  const pageId = await getPageIdByPath(params.workspaceRoot, params.pagePath);
  const detail = await getWikiPageDetail(params.workspaceRoot, pageId);
  const parsed = parseWikiDocument({
    rawContent: detail.rawContent,
    relativePath: detail.path,
  });
  const next = params.mutate({
    detail,
    frontmatter: parsed.frontmatter,
    body: parsed.body,
  });

  await updateWikiPage({
    workspaceRoot: params.workspaceRoot,
    pageId,
    rawContent: serializeWikiDocument(next.frontmatter, next.body),
  });
}

async function upsertCuratedPage(params: {
  workspaceRoot: string;
  title: string;
  type: "synthesis" | "note";
  aliases?: string[];
  tags?: string[];
  sourceRefs?: string[];
  pageRefs?: string[];
  confidence?: number;
  extraFrontmatter?: Record<string, unknown>;
  body: string;
}) {
  const pages = await listWikiPages(params.workspaceRoot);
  const existing = pages.find((page) => page.title === params.title);
  const detail = existing
    ? await getWikiPageDetail(params.workspaceRoot, existing.id)
    : await createWikiPage({
        workspaceRoot: params.workspaceRoot,
        title: params.title,
        type: params.type,
        aliases: params.aliases ?? [],
        tags: params.tags ?? [],
      });
  const parsed = parseWikiDocument({
    rawContent: detail.rawContent,
    relativePath: detail.path,
  });

  await updateWikiPage({
    workspaceRoot: params.workspaceRoot,
    pageId: detail.id,
    rawContent: serializeWikiDocument(
      {
        ...parsed.frontmatter,
        title: params.title,
        aliases: uniqueStringValues(params.aliases ?? parsed.frontmatter.aliases),
        tags: uniqueStringValues(params.tags ?? parsed.frontmatter.tags),
        source_refs: uniqueStringValues(params.sourceRefs ?? parsed.frontmatter.source_refs),
        page_refs: uniqueStringValues(params.pageRefs ?? parsed.frontmatter.page_refs),
        confidence: params.confidence ?? parsed.frontmatter.confidence,
        review_status: "approved",
        status: "active",
        updated_at: new Date().toISOString(),
        ...(params.extraFrontmatter ?? {}),
      },
      params.body,
    ),
  });
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
  const surfaceTitles = uniqueStringValues([
    ...openClawKnowledgeMethodData.canonicalSurfaces.map((surface) => surface.title),
    ...openClawKnowledgeMethodData.workingSurfaces.map((surface) => surface.title),
    ...openClawKnowledgeMethodData.monitoringSurfaces.map((surface) => surface.title),
  ]);
  const nextFrontmatter = {
    ...parsed.frontmatter,
    title: openClawKnowledgeMethodData.indexTitle,
    aliases: ["OpenClaw MOC", "OpenClaw map of content"],
    tags: ["workspace", "example", "openclaw", "navigation", "start-here"],
    source_refs: sourceIds,
    page_refs: surfaceTitles,
    updated_at: new Date().toISOString(),
    knowledge_role: "The atlas and start-here surface for the topic.",
    surface_kind: "navigation",
    revisit_cadence:
      "Refresh when the recommended entry path, maintenance order, or key-page set changes.",
    refresh_triggers: [
      "A new working surface becomes part of the default path.",
      "Maintenance or context-pack guidance changes.",
    ],
  };
  const nextBody = openClawMethodPack.wiki.index;

  await updateWikiPage({
    workspaceRoot,
    pageId: indexId,
    rawContent: serializeWikiDocument(nextFrontmatter, nextBody),
  });
  await syncWikiIndex(workspaceRoot);
  await refreshWikiPageSearchIndex(workspaceRoot);
}

async function applyKnowledgeWorkOptimization(workspaceRoot: string, sourceIds: string[]) {
  const archivedNoteTitle = openClawKnowledgeMethodData.archivedNoteTitle;
  const durableSurfaceRefs = uniqueStringValues([
    ...openClawKnowledgeMethodData.canonicalSurfaces.map((surface) => surface.title),
    ...openClawKnowledgeMethodData.workingSurfaces.map((surface) => surface.title),
    ...openClawKnowledgeMethodData.monitoringSurfaces.map((surface) => surface.title),
  ]);
  const relatedSurfaceRefs = (pageTitle: string) =>
    durableSurfaceRefs.filter((title) => title.toLowerCase() !== pageTitle.toLowerCase());

  await upsertCuratedPage({
    workspaceRoot,
    title: openClawKnowledgeMethodData.readingPathsTitle,
    type: "synthesis",
    tags: ["navigation", "reading-paths", "openclaw", "synthesis"],
    sourceRefs: sourceIds,
    pageRefs: relatedSurfaceRefs(openClawKnowledgeMethodData.readingPathsTitle),
    confidence: 0.82,
    extraFrontmatter: buildKnowledgeFrontmatter(openClawKnowledgeMethodData.readingPathsTitle),
    body: openClawMethodPack.wiki.readingPaths,
  });

  await upsertCuratedPage({
    workspaceRoot,
    title: openClawKnowledgeMethodData.currentTensionsTitle,
    type: "synthesis",
    tags: ["tensions", "risk", "openclaw", "synthesis"],
    sourceRefs: sourceIds,
    pageRefs: relatedSurfaceRefs(openClawKnowledgeMethodData.currentTensionsTitle),
    confidence: 0.79,
    extraFrontmatter: buildKnowledgeFrontmatter(openClawKnowledgeMethodData.currentTensionsTitle),
    body: openClawMethodPack.wiki.currentTensions,
  });

  await upsertCuratedPage({
    workspaceRoot,
    title: openClawKnowledgeMethodData.openQuestionsTitle,
    type: "note",
    tags: ["open-questions", "next-work", "openclaw", "note"],
    sourceRefs: sourceIds,
    pageRefs: relatedSurfaceRefs(openClawKnowledgeMethodData.openQuestionsTitle),
    confidence: 0.74,
    extraFrontmatter: buildKnowledgeFrontmatter(openClawKnowledgeMethodData.openQuestionsTitle),
    body: openClawMethodPack.wiki.openQuestions,
  });

  await upsertCuratedPage({
    workspaceRoot,
    title: openClawKnowledgeMethodData.maintenanceRhythmTitle,
    type: "synthesis",
    tags: ["maintenance", "triage", "next-work", "openclaw", "synthesis"],
    sourceRefs: sourceIds,
    pageRefs: relatedSurfaceRefs(openClawKnowledgeMethodData.maintenanceRhythmTitle),
    confidence: 0.81,
    extraFrontmatter: buildKnowledgeFrontmatter(openClawKnowledgeMethodData.maintenanceRhythmTitle),
    body: openClawMethodPack.wiki.maintenanceRhythm,
  });

  await upsertCuratedPage({
    workspaceRoot,
    title: openClawKnowledgeMethodData.maintenanceWatchpointsTitle,
    type: "synthesis",
    tags: ["synthesis", "openclaw", "monitoring", "operations"],
    sourceRefs: sourceIds,
    pageRefs: relatedSurfaceRefs(openClawKnowledgeMethodData.maintenanceWatchpointsTitle),
    confidence: 0.78,
    extraFrontmatter: buildKnowledgeFrontmatter(
      openClawKnowledgeMethodData.maintenanceWatchpointsTitle,
    ),
    body: openClawMethodPack.wiki.maintenanceWatchpoints,
  });

  await rewritePageByPath({
    workspaceRoot,
    pagePath: "wiki/entities/openclaw.md",
    mutate: ({ frontmatter, body }) => ({
      frontmatter: {
        ...frontmatter,
        aliases: uniqueStringValues(["open claw", ...frontmatter.aliases]),
        tags: ["entity", "openclaw", "entry-point", "core-page"],
        page_refs: [
          "OpenClaw release cadence",
          "Plugin compatibility",
          "Provider dependency risk",
          "OpenClaw maintenance watchpoints",
          "OpenClaw maintenance rhythm",
          "OpenClaw current tensions",
          "OpenClaw open questions",
        ],
        source_refs: sourceIds,
        updated_at: new Date().toISOString(),
        ...buildKnowledgeFrontmatter("OpenClaw"),
      },
      body,
    }),
  });

  await rewritePageByPath({
    workspaceRoot,
    pagePath: "wiki/topics/openclaw-release-cadence.md",
    mutate: ({ frontmatter, body }) => ({
      frontmatter: {
        ...frontmatter,
        tags: ["topic", "openclaw", "releases", "upgrade-planning"],
        page_refs: [
          "OpenClaw",
          "OpenClaw maintenance watchpoints",
          "OpenClaw maintenance rhythm",
          "OpenClaw current tensions",
          archivedNoteTitle,
        ],
        updated_at: new Date().toISOString(),
        ...buildKnowledgeFrontmatter("OpenClaw release cadence"),
      },
      body,
    }),
  });

  await rewritePageByPath({
    workspaceRoot,
    pagePath: "wiki/concepts/plugin-compatibility.md",
    mutate: ({ frontmatter, body }) => ({
      frontmatter: {
        ...frontmatter,
        tags: ["concept", "openclaw", "plugins", "integration"],
        page_refs: [
          "OpenClaw",
          "OpenClaw release cadence",
          "OpenClaw maintenance watchpoints",
          "OpenClaw maintenance rhythm",
          "OpenClaw current tensions",
          "OpenClaw open questions",
        ],
        updated_at: new Date().toISOString(),
        ...buildKnowledgeFrontmatter("Plugin compatibility"),
      },
      body,
    }),
  });

  await rewritePageByPath({
    workspaceRoot,
    pagePath: "wiki/concepts/provider-dependency-risk.md",
    mutate: ({ frontmatter, body }) => ({
      frontmatter: {
        ...frontmatter,
        tags: ["concept", "openclaw", "providers", "risk"],
        page_refs: [
          "OpenClaw",
          "OpenClaw current tensions",
          "OpenClaw maintenance watchpoints",
          "OpenClaw maintenance rhythm",
          archivedNoteTitle,
        ],
        updated_at: new Date().toISOString(),
        ...buildKnowledgeFrontmatter("Provider dependency risk"),
      },
      body,
    }),
  });

  await rewritePageByPath({
    workspaceRoot,
    pagePath: "wiki/notes/note-what-should-i-monitor-before-upgrading-openclaw.md",
    mutate: ({ frontmatter, body }) => ({
      frontmatter: {
        ...frontmatter,
        aliases: uniqueStringValues([
          "OpenClaw upgrade checklist",
          ...frontmatter.aliases,
        ]),
        tags: uniqueStringValues([
          ...frontmatter.tags,
          "openclaw",
          "monitoring",
          "upgrade",
          "next-work",
        ]),
        page_refs: [
          "OpenClaw release cadence",
          "Plugin compatibility",
          "Provider dependency risk",
          "OpenClaw maintenance watchpoints",
          "OpenClaw maintenance rhythm",
          "OpenClaw current tensions",
          "OpenClaw open questions",
        ],
        updated_at: new Date().toISOString(),
        ...buildKnowledgeFrontmatter(archivedNoteTitle),
      },
      body: body.replace(
        "## Based-on pages\n\n- No directly grounded wiki pages were attached to this answer artifact.",
        [
          "## Based-on pages",
          "",
          "- [[OpenClaw release cadence]]",
          "- [[Plugin compatibility]]",
          "- [[Provider dependency risk]]",
          "",
          "These pages are the most useful compiled follow-through even though the original answer artifact fell back to source summaries.",
        ].join("\n"),
      ),
    }),
  });
}

async function buildManifest(params: {
  workspaceRoot: string;
  sourcePlans: SourcePlan[];
  answers: AnswerArtifact[];
  auditIds: string[];
  config: OpenClawExamplePipelineConfig;
  paths: OpenClawBuildPaths;
  mode: OpenClawExampleMode;
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
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    generatedMode: params.mode,
    exampleName: params.config.exampleName,
    corpusFiles: params.config.corpusFiles.map((file) => ({
      snapshotPath: file.snapshotPath,
      originPath: file.originPath,
      excerptScope: file.excerptScope,
    })),
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
      mockProvider:
        params.mode === "reference"
          ? "openai structured mock transport via real service calls"
          : null,
      runtimeWorkspaceRoot: path
        .relative(REPO_ROOT, params.paths.runtimeWorkspaceRoot)
        .split(path.sep)
        .join("/"),
      committedSnapshotRoot: path
        .relative(REPO_ROOT, params.paths.snapshotRoot)
        .split(path.sep)
        .join("/"),
      reproducibility: {
        referenceMode: params.config.modes.reference.description,
        liveMode: params.config.modes.live.description,
      },
    },
  } satisfies OpenClawExampleManifest;
}

const runAuditResultCache = new Map<
  string,
  Awaited<ReturnType<typeof runAudit>>
>();

async function validateWorkspaceAgainstConfig(params: {
  workspaceRoot: string;
  manifest: OpenClawExampleManifest;
  config: OpenClawExamplePipelineConfig;
}) {
  for (const directoryName of params.config.validation.requiredWorkspaceDirectories) {
    const absolutePath = path.join(params.workspaceRoot, directoryName);

    if (!(await fileExists(absolutePath))) {
      throw new Error(`Missing required workspace directory: ${directoryName}`);
    }
  }

  for (const relativePath of params.config.validation.requiredArtifactPaths) {
    if (!(await fileExists(path.join(params.workspaceRoot, relativePath)))) {
      throw new Error(`Missing required artifact: ${relativePath}`);
    }
  }

  for (const expectedPage of params.config.validation.requiredWikiPages) {
    const absolutePath = path.join(params.workspaceRoot, expectedPage.path);

    if (!(await fileExists(absolutePath))) {
      throw new Error(`Missing required wiki page: ${expectedPage.path}`);
    }

    const raw = await fs.readFile(absolutePath, "utf8");
    const parsed = parseWikiDocument({
      rawContent: raw,
      relativePath: expectedPage.path,
    });

    if (parsed.frontmatter.title !== expectedPage.title) {
      throw new Error(
        `Wiki page ${expectedPage.path} has title "${parsed.frontmatter.title}" but expected "${expectedPage.title}".`,
      );
    }

    for (const heading of expectedPage.requiredHeadings) {
      if (!parsed.body.includes(`## ${heading}`)) {
        throw new Error(
          `Wiki page ${expectedPage.path} is missing required heading "## ${heading}".`,
        );
      }
    }
  }

  const approvedProposalCount = (
    await listFilesRecursively(path.join(params.workspaceRoot, "reviews", "approved"))
  ).filter((filePath) => filePath.endsWith(".proposal.json")).length;
  const rejectedProposalCount = (
    await listFilesRecursively(path.join(params.workspaceRoot, "reviews", "rejected"))
  ).filter((filePath) => filePath.endsWith(".proposal.json")).length;

  if (approvedProposalCount !== params.config.validation.requiredApprovedProposalCount) {
    throw new Error(
      `Expected ${params.config.validation.requiredApprovedProposalCount} approved proposals, found ${approvedProposalCount}.`,
    );
  }

  if (rejectedProposalCount !== params.config.validation.requiredRejectedProposalCount) {
    throw new Error(
      `Expected ${params.config.validation.requiredRejectedProposalCount} rejected proposals, found ${rejectedProposalCount}.`,
    );
  }

  const manifestPagePaths = new Set(params.manifest.pages.map((page) => page.path));

  for (const page of params.config.validation.requiredWikiPages) {
    if (!manifestPagePaths.has(page.path)) {
      throw new Error(`Manifest is missing expected page path ${page.path}.`);
    }
  }

  const archivedAnswer = params.manifest.answers.find(
    (answer) => answer.archivedPagePath === params.config.validation.archivedAnswerPagePath,
  );

  if (!archivedAnswer) {
    throw new Error(
      `Manifest is missing archived answer page ${params.config.validation.archivedAnswerPagePath}.`,
    );
  }

  for (const requiredMode of params.config.validation.requiredAuditModes) {
    if (!params.manifest.audits.some((audit) => audit.mode === requiredMode)) {
      throw new Error(`Manifest is missing required audit mode ${requiredMode}.`);
    }
  }
}

async function validateObsidianVaultAgainstConfig(params: {
  vaultRoot: string;
  config: OpenClawExamplePipelineConfig;
}) {
  for (const expectedNote of params.config.validation.requiredObsidianNotes) {
    const absolutePath = path.join(params.vaultRoot, expectedNote.path);

    if (!(await fileExists(absolutePath))) {
      throw new Error(`Missing required Obsidian note: ${expectedNote.path}`);
    }

    const raw = await fs.readFile(absolutePath, "utf8");

    if (!new RegExp(`^#\\s+${expectedNote.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m").test(raw)) {
      throw new Error(
        `Obsidian note ${expectedNote.path} is missing title heading "# ${expectedNote.title}".`,
      );
    }

    for (const heading of expectedNote.requiredHeadings) {
      if (!raw.includes(`## ${heading}`)) {
        throw new Error(
          `Obsidian note ${expectedNote.path} is missing required heading "## ${heading}".`,
        );
      }
    }
  }
}

export async function runOpenClawExampleBuild(params?: {
  mode?: OpenClawExampleMode;
  syncSnapshot?: boolean;
}) {
  const mode = params?.mode ?? "reference";
  const config = await readPipelineConfig();
  const paths = getBuildPaths(config, mode);
  runAuditResultCache.clear();

  const sourcePlans: SourcePlan[] = [];
  const runner = async () => {
    await cleanDirectory(paths.runtimeWorkspaceRoot);
    await fs.mkdir(path.join(REPO_ROOT, "tmp"), { recursive: true });

    await initializeWorkspace({
      workspaceRoot: paths.runtimeWorkspaceRoot,
      workspaceName: "OpenClaw Example Workspace",
      initializeGit: false,
    });

    await updateWorkspaceLlmSettings(
      paths.runtimeWorkspaceRoot,
      mode === "reference"
        ? {
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
          }
        : getLiveProviderSettings(config),
    );

    for (const corpusFile of config.corpusFiles) {
      const filePath = path.join(paths.corpusRoot, corpusFile.fileName);
      const imported = await importSource({
        workspaceRoot: paths.runtimeWorkspaceRoot,
        importKind: "local_file_path",
        filePath,
      });
      const summarized = await summarizeSource(paths.runtimeWorkspaceRoot, imported.id);
      const planned = await planPatchProposalsForSource(paths.runtimeWorkspaceRoot, imported.id);
      const approvals = await applyProposalsForSource(
        paths.runtimeWorkspaceRoot,
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

    const answers: AnswerArtifact[] = [];

    for (const question of config.questions) {
      answers.push(await answerQuestion(paths.runtimeWorkspaceRoot, question.question));
    }

    const archivedQuestionIndex = config.questions.findIndex(
      (question) => question.archiveAs !== null,
    );

    if (archivedQuestionIndex !== -1) {
      const archiveTarget = config.questions[archivedQuestionIndex]!;
      const archived = await archiveAnswerArtifact(
        paths.runtimeWorkspaceRoot,
        answers[archivedQuestionIndex]!.id,
        archiveTarget.archiveAs!,
      );
      answers[archivedQuestionIndex] = archived;
    }

    const coverageAudit = await runAudit(paths.runtimeWorkspaceRoot, "coverage");
    runAuditResultCache.set(coverageAudit.id, coverageAudit);

    await applyKnowledgeWorkOptimization(
      paths.runtimeWorkspaceRoot,
      sourcePlans.map((plan) => plan.importedId),
    );
    await rewriteExampleIndex(
      paths.runtimeWorkspaceRoot,
      sourcePlans.map((plan) => plan.importedId),
    );
    await checkpointDatabase(paths.runtimeWorkspaceRoot);

    const manifest = await buildManifest({
      workspaceRoot: paths.runtimeWorkspaceRoot,
      sourcePlans,
      answers,
      auditIds: [coverageAudit.id],
      config,
      paths,
      mode,
    });

    manifest.sources = await Promise.all(
      manifest.sources.map(async (source) => {
        const detail = await getSourceDetail(paths.runtimeWorkspaceRoot, source.id);
        return openClawExampleManifestSchema.shape.sources.element.parse({
          ...source,
          title: detail.title,
        }) as OpenClawExampleSourcePlan;
      }),
    );

    await writeJsonFile(
      paths.runtimeManifestPath,
      openClawExampleManifestSchema.parse(manifest),
    );

    await buildOpenClawObsidianVault({
      workspaceRoot: paths.runtimeWorkspaceRoot,
      outputRoot: paths.runtimeObsidianVaultRoot,
      manifest,
      config,
    });

    if (params?.syncSnapshot) {
      if (mode !== "reference") {
        throw new Error("Canonical snapshot sync is only supported in reference mode.");
      }

      await syncSnapshot(paths.runtimeWorkspaceRoot, paths.snapshotRoot);
      await syncDirectory(paths.runtimeObsidianVaultRoot, paths.canonicalObsidianVaultRoot);
      await writeJsonFile(paths.canonicalManifestPath, manifest);
      const baseline = await buildReferenceBaseline({
        manifestPath: paths.canonicalManifestPath,
        snapshotRoot: paths.snapshotRoot,
        corpusRoot: paths.corpusRoot,
        obsidianVaultRoot: paths.canonicalObsidianVaultRoot,
      });
      await writeJsonFile(paths.referenceBaselinePath, baseline);
    }

    return {
      mode,
      workspaceRoot: paths.runtimeWorkspaceRoot,
      runtimeManifestPath: paths.runtimeManifestPath,
      runtimeObsidianVaultRoot: paths.runtimeObsidianVaultRoot,
      manifest,
      config,
      paths,
    } satisfies OpenClawBuildResult;
  };

  const result =
    mode === "reference"
      ? await withDeterministicRuntime(config.modes.reference.seedTimestamp, async () =>
          withMockedOpenAi(runner),
        )
      : await runner();

  await validateWorkspaceAgainstConfig({
    workspaceRoot: result.workspaceRoot,
    manifest: result.manifest,
    config: result.config,
  });
  await validateObsidianVaultAgainstConfig({
    vaultRoot: result.runtimeObsidianVaultRoot,
    config: result.config,
  });

  return result;
}

export async function validateOpenClawExampleReference() {
  const config = await readPipelineConfig();
  const paths = getBuildPaths(config, "reference");

  const baselineRaw = await fs.readFile(paths.referenceBaselinePath, "utf8");
  const baseline = openClawExampleReferenceBaselineSchema.parse(JSON.parse(baselineRaw));
  const canonicalManifestRaw = await fs.readFile(paths.canonicalManifestPath, "utf8");
  const canonicalManifest = openClawExampleManifestSchema.parse(
    JSON.parse(canonicalManifestRaw),
  );

  await validateWorkspaceAgainstConfig({
    workspaceRoot: paths.snapshotRoot,
    manifest: canonicalManifest,
    config,
  });
  await validateObsidianVaultAgainstConfig({
    vaultRoot: paths.canonicalObsidianVaultRoot,
    config,
  });

  const canonicalBaseline = await buildReferenceBaseline({
    manifestPath: paths.canonicalManifestPath,
    snapshotRoot: paths.snapshotRoot,
    corpusRoot: paths.corpusRoot,
    obsidianVaultRoot: paths.canonicalObsidianVaultRoot,
  });

  compareHashEntries({
    actual: canonicalBaseline.entries,
    expected: baseline.entries,
    label: "Committed OpenClaw reference snapshot",
  });
  compareHashEntries({
    actual: canonicalBaseline.corpusEntries,
    expected: baseline.corpusEntries,
    label: "Committed OpenClaw source corpus",
  });

  const buildResult = await runOpenClawExampleBuild({
    mode: "reference",
    syncSnapshot: false,
  });
  const runtimeEntries = await buildRuntimeEntries({
    manifestPath: buildResult.runtimeManifestPath,
    workspaceRoot: buildResult.workspaceRoot,
    obsidianVaultRoot: buildResult.runtimeObsidianVaultRoot,
  });

  compareHashEntries({
    actual: runtimeEntries,
    expected: baseline.entries,
    label: "Reference-mode build output",
  });

  const renderedWorkspaceRoot = await ensureOpenClawRenderedWorkspace();
  const renderedPages = await listWikiPages(renderedWorkspaceRoot);

  if (renderedPages.length !== canonicalManifest.pages.length) {
    throw new Error(
      `Rendered example workspace has ${renderedPages.length} pages, expected ${canonicalManifest.pages.length}.`,
    );
  }

  return {
    baseline,
    buildResult,
    renderedWorkspaceRoot,
  };
}

export async function resetOpenClawExampleRuntime() {
  const config = await readPipelineConfig();
  const referencePaths = getBuildPaths(config, "reference");
  const livePaths = getBuildPaths(config, "live");

  for (const target of [
    referencePaths.runtimeWorkspaceRoot,
    referencePaths.runtimeObsidianVaultRoot,
    livePaths.runtimeWorkspaceRoot,
    livePaths.runtimeObsidianVaultRoot,
    OPENCLAW_RENDERED_WORKSPACE_ROOT,
  ]) {
    await fs.rm(target, {
      recursive: true,
      force: true,
    });
  }
}

function parseCliArgs(argv: string[]) {
  const parsed = {
    mode: "reference" as OpenClawExampleMode,
    syncSnapshot: false,
  };

  for (const argument of argv) {
    if (argument.startsWith("--mode=")) {
      const value = argument.slice("--mode=".length);

      if (value === "reference" || value === "live") {
        parsed.mode = value;
        continue;
      }

      throw new Error(`Unsupported --mode value "${value}".`);
    }

    if (argument === "--sync-snapshot") {
      parsed.syncSnapshot = true;
      continue;
    }
  }

  return parsed;
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  const result = await runOpenClawExampleBuild({
    mode: args.mode,
    syncSnapshot: args.syncSnapshot,
  });

  console.log("OpenClaw example generated.");
  console.log(`Mode: ${result.mode}`);
  console.log(`Workspace: ${result.workspaceRoot}`);
  console.log(`Manifest: ${result.runtimeManifestPath}`);
  console.log(`Obsidian vault: ${result.runtimeObsidianVaultRoot}`);
  console.log(
    `Archived page: ${
      result.manifest.answers.find((answer) => answer.archivedPagePath)?.archivedPagePath ?? "none"
    }`,
  );
  console.log(
    `Coverage audit: ${
      result.manifest.audits.find((audit) => audit.mode === "coverage")?.reportPath ?? "none"
    }`,
  );

  if (args.syncSnapshot) {
    console.log(`Canonical snapshot: ${result.paths.snapshotRoot}`);
    console.log(`Canonical manifest: ${result.paths.canonicalManifestPath}`);
    console.log(`Reference baseline: ${result.paths.referenceBaselinePath}`);
    console.log(`Canonical Obsidian vault: ${result.paths.canonicalObsidianVaultRoot}`);
  }
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  main().catch((error) => {
    console.error("Failed to generate the OpenClaw example.");
    console.error(error);
    process.exitCode = 1;
  });
}
