import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import { and, eq } from "drizzle-orm";

import type {
  AuditFinding,
  AuditMode,
  AuditRunDetail,
  AuditRunSummary,
  AuditSeverity,
  AuditSeverityCounts,
} from "@/lib/contracts/audit";
import {
  auditFindingSchema,
  auditRunDetailSchema,
  auditRunSummarySchema,
  auditSeverityCountsSchema,
} from "@/lib/contracts/audit";
import { auditRuns, claims, conceptMentions, entityMentions, pageLinks, sourceDocuments, wikiPages } from "@/server/db/schema";
import { AppError } from "@/server/lib/errors";
import { logger } from "@/server/lib/logger";
import { resolveWithinWorkspaceRoot } from "@/server/lib/path-safety";
import { readWikiMarkdownFile } from "@/server/services/wiki-file-service";
import { parseWikiDocument } from "@/server/services/wiki-frontmatter-service";
import { syncWikiIndex } from "@/server/services/wiki-page-service";
import { getWorkspaceContext } from "@/server/services/workspace-context-service";

type AuditPageRecord = typeof wikiPages.$inferSelect & {
  body: string;
};

type AuditWorkspaceState = {
  workspaceRoot: string;
  workspaceId: string;
  pages: AuditPageRecord[];
  pageLinkRows: Array<typeof pageLinks.$inferSelect>;
  sourceRows: Array<typeof sourceDocuments.$inferSelect>;
  claimRows: Array<typeof claims.$inferSelect>;
  entityRows: Array<typeof entityMentions.$inferSelect>;
  conceptRows: Array<typeof conceptMentions.$inferSelect>;
};

const TOKEN_STOPWORDS = new Set([
  "about",
  "after",
  "before",
  "being",
  "between",
  "could",
  "does",
  "doing",
  "during",
  "have",
  "into",
  "just",
  "might",
  "more",
  "only",
  "other",
  "same",
  "should",
  "some",
  "such",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "this",
  "those",
  "through",
  "under",
  "were",
  "what",
  "when",
  "which",
  "while",
  "with",
  "would",
]);

function createAuditRunId(workspaceId: string, mode: AuditMode) {
  return `audit_${crypto
    .createHash("sha1")
    .update(`${workspaceId}:${mode}:${Date.now()}:${crypto.randomUUID()}`)
    .digest("hex")
    .slice(0, 32)}`;
}

function normalizeValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeValue(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length >= 4 && !TOKEN_STOPWORDS.has(token));
}

function uniqueValues(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function computeTokenOverlap(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let shared = 0;

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.max(leftTokens.size, rightTokens.size);
}

function stripYears(value: string) {
  return value.replace(/\b(?:19|20)\d{2}\b/g, " ");
}

function extractYears(value: string) {
  return uniqueValues(value.match(/\b(?:19|20)\d{2}\b/g) ?? []);
}

function createFindingId(mode: AuditMode, seed: string) {
  return `finding_${crypto.createHash("sha1").update(`${mode}:${seed}`).digest("hex").slice(0, 20)}`;
}

function severityCounts(findings: AuditFinding[]) {
  const counts: AuditSeverityCounts = {
    low: 0,
    medium: 0,
    high: 0,
  };

  findings.forEach((finding) => {
    counts[finding.severity] += 1;
  });

  return auditSeverityCountsSchema.parse(counts);
}

function formatModeLabel(mode: AuditMode) {
  return mode
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function severityRank(severity: AuditSeverity) {
  if (severity === "high") {
    return 3;
  }

  if (severity === "medium") {
    return 2;
  }

  return 1;
}

function isSubstantiveBody(body: string) {
  const normalized = body
    .replace(/^#+\s+/gm, "")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();

  return normalized.length >= 80 && !/^tbd\b/i.test(normalized);
}

async function loadAuditWorkspaceState(workspaceRoot: string): Promise<AuditWorkspaceState> {
  await syncWikiIndex(workspaceRoot);

  const { db, workspace, workspaceRoot: normalizedWorkspaceRoot } =
    await getWorkspaceContext(workspaceRoot);
  const [
    pageRows,
    pageLinkRows,
    sourceRows,
    claimRows,
    entityRows,
    conceptRows,
  ] = await Promise.all([
    db.query.wikiPages.findMany({
      where: eq(wikiPages.workspaceId, workspace.id),
      orderBy: (table, { asc }) => [asc(table.title)],
    }),
    db.query.pageLinks.findMany({
      where: eq(pageLinks.workspaceId, workspace.id),
    }),
    db.query.sourceDocuments.findMany({
      where: eq(sourceDocuments.workspaceId, workspace.id),
      orderBy: (table, { asc }) => [asc(table.title)],
    }),
    db.query.claims.findMany({
      where: eq(claims.workspaceId, workspace.id),
    }),
    db.query.entityMentions.findMany({
      where: eq(entityMentions.workspaceId, workspace.id),
    }),
    db.query.conceptMentions.findMany({
      where: eq(conceptMentions.workspaceId, workspace.id),
    }),
  ]);

  const pages = await Promise.all(
    pageRows.map(async (page) => {
      const rawContent = await readWikiMarkdownFile(normalizedWorkspaceRoot, page.path);
      const parsed = parseWikiDocument({
        rawContent,
        relativePath: page.path,
      });

      return {
        ...page,
        body: parsed.body,
      };
    }),
  );

  return {
    workspaceRoot: normalizedWorkspaceRoot,
    workspaceId: workspace.id,
    pages,
    pageLinkRows,
    sourceRows,
    claimRows,
    entityRows,
    conceptRows,
  };
}

function findMatchingPage(state: AuditWorkspaceState, normalizedName: string) {
  return state.pages.find((page) => {
    const candidates = [
      page.title,
      page.canonicalTitle,
      page.slug.replace(/-/g, " "),
      ...page.aliasesJson,
    ].map(normalizeValue);

    return candidates.includes(normalizedName);
  });
}

function detectContradictionFindings(state: AuditWorkspaceState) {
  const findings: AuditFinding[] = [];
  const sourceTitleById = new Map(state.sourceRows.map((source) => [source.id, source.title]));

  for (let index = 0; index < state.claimRows.length; index += 1) {
    const left = state.claimRows[index]!;

    for (let compareIndex = index + 1; compareIndex < state.claimRows.length; compareIndex += 1) {
      const right = state.claimRows[compareIndex]!;

      if (left.documentId === right.documentId) {
        continue;
      }

      const oppositePolarity =
        (left.polarity === "supports" && right.polarity === "contradicts") ||
        (left.polarity === "contradicts" && right.polarity === "supports");
      const similarity = computeTokenOverlap(stripYears(left.text), stripYears(right.text));
      const sharedYears = new Set(extractYears(left.text));
      const rightYears = extractYears(right.text);
      const hasTimeConflict =
        sharedYears.size > 0 &&
        rightYears.length > 0 &&
        rightYears.some((year) => !sharedYears.has(year)) &&
        similarity >= 0.68;

      if (!((oppositePolarity && similarity >= 0.5) || hasTimeConflict)) {
        continue;
      }

      const leftStrength = severityRank(
        left.evidenceStrength === "high"
          ? "high"
          : left.evidenceStrength === "medium"
            ? "medium"
            : "low",
      );
      const rightStrength = severityRank(
        right.evidenceStrength === "high"
          ? "high"
          : right.evidenceStrength === "medium"
            ? "medium"
            : "low",
      );
      const severity: AuditSeverity =
        leftStrength >= 3 && rightStrength >= 3 ? "high" : "medium";
      const leftSourceId = left.documentId ?? "";
      const rightSourceId = right.documentId ?? "";

      findings.push(
        auditFindingSchema.parse({
          id: createFindingId("contradiction", `${left.id}:${right.id}`),
          mode: "contradiction",
          severity,
          title: hasTimeConflict
            ? "Potential time conflict across summarized claims"
            : "Potential contradiction across summarized claims",
          note: [
            `Source ${sourceTitleById.get(leftSourceId) ?? leftSourceId}: "${left.text}" (${left.polarity}, ${left.evidenceStrength})`,
            `Source ${sourceTitleById.get(rightSourceId) ?? rightSourceId}: "${right.text}" (${right.polarity}, ${right.evidenceStrength})`,
            hasTimeConflict
              ? "These claims look semantically close but reference different dates or time markers."
              : "These claims look semantically close but express opposing polarity.",
          ].join(" "),
          relatedPageIds: [],
          relatedPagePaths: [],
          relatedSourceIds: uniqueValues([leftSourceId, rightSourceId]),
          metadata: {
            leftClaimId: left.id,
            rightClaimId: right.id,
            similarity,
          },
        }),
      );
    }
  }

  return findings;
}

function detectCoverageFindings(state: AuditWorkspaceState) {
  const findings: AuditFinding[] = [];
  const sourceTitleById = new Map(state.sourceRows.map((source) => [source.id, source.title]));
  const groupedMentions = new Map<
    string,
    {
      type: "entity" | "concept";
      displayName: string;
      sourceIds: Set<string>;
    }
  >();

  state.entityRows.forEach((row) => {
    const current = groupedMentions.get(row.normalizedName) ?? {
      type: "entity",
      displayName: row.name,
      sourceIds: new Set<string>(),
    };
    if (row.documentId) {
      current.sourceIds.add(row.documentId);
    }
    groupedMentions.set(row.normalizedName, current);
  });
  state.conceptRows.forEach((row) => {
    const current = groupedMentions.get(row.normalizedName) ?? {
      type: "concept",
      displayName: row.name,
      sourceIds: new Set<string>(),
    };
    if (row.documentId) {
      current.sourceIds.add(row.documentId);
    }
    groupedMentions.set(row.normalizedName, current);
  });

  groupedMentions.forEach((entry, normalizedName) => {
    const sourceIds = [...entry.sourceIds];

    if (sourceIds.length < 2 || normalizedName.length < 4) {
      return;
    }

    const existingPage = findMatchingPage(state, normalizedName);

    if (existingPage) {
      return;
    }

    findings.push(
      auditFindingSchema.parse({
        id: createFindingId("coverage", `${entry.type}:${normalizedName}`),
        mode: "coverage",
        severity: sourceIds.length >= 3 ? "high" : "medium",
        title:
          entry.type === "entity"
            ? "Recurring entity lacks wiki coverage"
            : "Recurring concept lacks wiki coverage",
        note: `${entry.displayName} appears across ${sourceIds.length} summarized sources but does not yet have a matching durable wiki page.`,
        relatedPageIds: [],
        relatedPagePaths: [],
        relatedSourceIds: sourceIds,
        metadata: {
          mentionType: entry.type,
          sourceTitles: sourceIds.map((sourceId) => sourceTitleById.get(sourceId) ?? sourceId),
        },
      }),
    );
  });

  return findings;
}

function buildReferenceMaps(state: AuditWorkspaceState) {
  const inboundCounts = new Map<string, number>();
  const outboundCounts = new Map<string, number>();

  state.pageLinkRows
    .filter((row) => row.targetPageId && row.targetPageId !== row.sourcePageId)
    .forEach((row) => {
      inboundCounts.set(row.targetPageId!, (inboundCounts.get(row.targetPageId!) ?? 0) + 1);
      outboundCounts.set(row.sourcePageId, (outboundCounts.get(row.sourcePageId) ?? 0) + 1);
    });

  const titleReferenceCounts = new Map<string, number>();
  const pageIdByTitle = new Map(state.pages.map((page) => [page.title, page.id]));

  state.pages.forEach((page) => {
    page.pageRefsJson.forEach((pageRef) => {
      const targetPageId = pageIdByTitle.get(pageRef);

      if (!targetPageId || targetPageId === page.id) {
        return;
      }

      titleReferenceCounts.set(targetPageId, (titleReferenceCounts.get(targetPageId) ?? 0) + 1);
    });
  });

  return {
    inboundCounts,
    outboundCounts,
    titleReferenceCounts,
  };
}

function detectOrphanFindings(state: AuditWorkspaceState) {
  const findings: AuditFinding[] = [];
  const { inboundCounts, outboundCounts } = buildReferenceMaps(state);

  state.pages
    .filter((page) => page.type !== "index")
    .forEach((page) => {
      const inbound = inboundCounts.get(page.id) ?? 0;
      const outbound = outboundCounts.get(page.id) ?? 0;
      const frontmatterRefs = page.pageRefsJson.length;

      if (inbound > 0 || outbound > 0 || frontmatterRefs > 0) {
        return;
      }

      findings.push(
        auditFindingSchema.parse({
          id: createFindingId("orphan", page.id),
          mode: "orphan",
          severity:
            page.type === "note" || page.type === "synthesis" ? "low" : "medium",
          title: "Wiki page is structurally orphaned",
          note: `${page.title} has no meaningful inbound or outbound page links and no referenced companion pages.`,
          relatedPageIds: [page.id],
          relatedPagePaths: [page.path],
          relatedSourceIds: [],
          metadata: {
            pageType: page.type,
          },
        }),
      );
    });

  return findings;
}

function detectStaleFindings(state: AuditWorkspaceState) {
  const findings: AuditFinding[] = [];
  const { inboundCounts, titleReferenceCounts } = buildReferenceMaps(state);
  const now = Date.now();

  state.pages
    .filter((page) => page.type !== "index" && page.type !== "note")
    .forEach((page) => {
      const referencedCount =
        (inboundCounts.get(page.id) ?? 0) + (titleReferenceCounts.get(page.id) ?? 0);
      const ageDays = Math.floor((now - page.updatedAt.getTime()) / 86_400_000);

      if (referencedCount < 2 || ageDays < 90) {
        return;
      }

      findings.push(
        auditFindingSchema.parse({
          id: createFindingId("stale", `${page.id}:${ageDays}:${referencedCount}`),
          mode: "stale",
          severity: ageDays >= 180 && referencedCount >= 3 ? "high" : "medium",
          title: "Frequently referenced page looks stale",
          note: `${page.title} has not been updated for ${ageDays} days but is still referenced ${referencedCount} times across the wiki graph.`,
          relatedPageIds: [page.id],
          relatedPagePaths: [page.path],
          relatedSourceIds: page.sourceRefsJson,
          metadata: {
            ageDays,
            referencedCount,
          },
        }),
      );
    });

  return findings;
}

function detectUnsupportedClaimFindings(state: AuditWorkspaceState) {
  const findings: AuditFinding[] = [];
  const sourceIdSet = new Set(state.sourceRows.map((source) => source.id));

  state.pages
    .filter((page) => page.type !== "index")
    .forEach((page) => {
      if (!isSubstantiveBody(page.body)) {
        return;
      }

      const validSourceRefs = page.sourceRefsJson.filter((sourceId) => sourceIdSet.has(sourceId));

      if (validSourceRefs.length > 0) {
        return;
      }

      findings.push(
        auditFindingSchema.parse({
          id: createFindingId("unsupported_claims", page.id),
          mode: "unsupported_claims",
          severity:
            page.type === "note" ? "medium" : "high",
          title: "Substantive wiki page lacks source grounding",
          note:
            page.sourceRefsJson.length === 0
              ? `${page.title} contains substantive compiled content but does not reference any source documents in frontmatter.`
              : `${page.title} references source ids that are no longer present in the workspace.`,
          relatedPageIds: [page.id],
          relatedPagePaths: [page.path],
          relatedSourceIds: page.sourceRefsJson,
          metadata: {
            pageType: page.type,
            sourceRefCount: page.sourceRefsJson.length,
            validSourceRefCount: validSourceRefs.length,
          },
        }),
      );
    });

  return findings;
}

function detectFindingsForMode(state: AuditWorkspaceState, mode: AuditMode) {
  switch (mode) {
    case "contradiction":
      return detectContradictionFindings(state);
    case "coverage":
      return detectCoverageFindings(state);
    case "orphan":
      return detectOrphanFindings(state);
    case "stale":
      return detectStaleFindings(state);
    case "unsupported_claims":
      return detectUnsupportedClaimFindings(state);
    default:
      return [];
  }
}

function buildAuditReport(params: {
  auditId: string;
  mode: AuditMode;
  createdAt: string;
  completedAt: string;
  findings: AuditFinding[];
}) {
  const counts = severityCounts(params.findings);
  const sortedFindings = [...params.findings].sort((left, right) => {
    return severityRank(right.severity) - severityRank(left.severity) || left.title.localeCompare(right.title);
  });

  return [
    `# ${formatModeLabel(params.mode)} Audit`,
    "",
    `- Audit ID: \`${params.auditId}\``,
    `- Mode: ${params.mode}`,
    `- Created at: ${params.createdAt}`,
    `- Completed at: ${params.completedAt}`,
    `- Total findings: ${params.findings.length}`,
    `- Severity counts: high ${counts.high}, medium ${counts.medium}, low ${counts.low}`,
    "",
    sortedFindings.length === 0
      ? "No findings were detected by this audit pass."
      : sortedFindings
          .map((finding, index) =>
            [
              `## Finding ${index + 1}: ${finding.title}`,
              "",
              `- Severity: ${finding.severity}`,
              `- Mode: ${finding.mode}`,
              `- Related pages: ${
                finding.relatedPagePaths.length > 0 ? finding.relatedPagePaths.join(", ") : "None"
              }`,
              `- Related sources: ${
                finding.relatedSourceIds.length > 0 ? finding.relatedSourceIds.join(", ") : "None"
              }`,
              "",
              finding.note,
              "",
            ].join("\n"),
          )
          .join("\n"),
  ].join("\n");
}

async function writeAuditReport(params: {
  workspaceRoot: string;
  auditId: string;
  mode: AuditMode;
  markdown: string;
}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const relativePath = `audits/${timestamp}-${params.mode}-${params.auditId}.md`;
  const absolutePath = resolveWithinWorkspaceRoot(params.workspaceRoot, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, params.markdown, "utf8");

  return relativePath;
}

function mapAuditRunSummary(row: typeof auditRuns.$inferSelect): AuditRunSummary {
  const findings = row.findingsJson.map((finding) => auditFindingSchema.parse(finding));

  return auditRunSummarySchema.parse({
    id: row.id,
    mode: row.mode,
    status: row.status,
    reportPath: row.reportPath,
    findingCount: findings.length,
    severityCounts: severityCounts(findings),
    createdAt: row.createdAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
  });
}

export async function listAuditRuns(workspaceRoot: string) {
  const { db, workspace } = await getWorkspaceContext(workspaceRoot);
  const rows = await db.query.auditRuns.findMany({
    where: eq(auditRuns.workspaceId, workspace.id),
    orderBy: (table, { desc: orderDesc }) => [orderDesc(table.createdAt)],
  });

  return rows.map(mapAuditRunSummary);
}

export async function getAuditRunDetail(
  workspaceRoot: string,
  auditId: string,
): Promise<AuditRunDetail> {
  const { db, workspace } = await getWorkspaceContext(workspaceRoot);
  const row = await db.query.auditRuns.findFirst({
    where: and(eq(auditRuns.workspaceId, workspace.id), eq(auditRuns.id, auditId)),
  });

  if (!row) {
    throw new AppError("Audit run not found.", 404, "audit_run_not_found");
  }

  const summary = mapAuditRunSummary(row);
  let reportMarkdown: string | null = null;

  if (row.reportPath) {
    try {
      reportMarkdown = await fs.readFile(
        resolveWithinWorkspaceRoot(workspaceRoot, row.reportPath),
        "utf8",
      );
    } catch {
      reportMarkdown = null;
    }
  }

  return auditRunDetailSchema.parse({
    ...summary,
    findings: row.findingsJson.map((finding) => auditFindingSchema.parse(finding)),
    reportMarkdown,
  });
}

export async function runAudit(
  workspaceRoot: string,
  mode: AuditMode,
): Promise<AuditRunDetail> {
  const { db, workspace } = await getWorkspaceContext(workspaceRoot);
  const auditId = createAuditRunId(workspace.id, mode);
  const createdAt = new Date();

  await db.insert(auditRuns).values({
    id: auditId,
    workspaceId: workspace.id,
    mode,
    status: "running",
    reportPath: null,
    findingsJson: [],
    createdAt,
    completedAt: null,
  });

  try {
    const state = await loadAuditWorkspaceState(workspaceRoot);
    const findings = detectFindingsForMode(state, mode);
    const completedAt = new Date();
    const markdown = buildAuditReport({
      auditId,
      mode,
      createdAt: createdAt.toISOString(),
      completedAt: completedAt.toISOString(),
      findings,
    });
    const reportPath = await writeAuditReport({
      workspaceRoot: state.workspaceRoot,
      auditId,
      mode,
      markdown,
    });

    await db
      .update(auditRuns)
      .set({
        status: "completed",
        reportPath,
        findingsJson: findings,
        completedAt,
      })
      .where(and(eq(auditRuns.workspaceId, workspace.id), eq(auditRuns.id, auditId)));

    logger.info(
      {
        auditId,
        mode,
        findingCount: findings.length,
        reportPath,
      },
      "Audit run completed.",
    );

    return getAuditRunDetail(workspaceRoot, auditId);
  } catch (error) {
    const completedAt = new Date();

    await db
      .update(auditRuns)
      .set({
        status: "failed",
        completedAt,
      })
      .where(and(eq(auditRuns.workspaceId, workspace.id), eq(auditRuns.id, auditId)));

    logger.error(
      {
        auditId,
        mode,
        error,
      },
      "Audit run failed.",
    );

    throw error;
  }
}
