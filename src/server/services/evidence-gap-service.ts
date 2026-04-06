import fs from "node:fs/promises";
import path from "node:path";

import {
  evidenceGapOverviewSchema,
  evidenceGapTopicSummarySchema,
  type EvidenceGapItem,
  type EvidenceGapOverview,
  type EvidenceGapSeed,
  type EvidenceGapTopicSummary,
} from "@/lib/contracts/evidence-gap";
import type { ResearchQuestionSeed } from "@/lib/contracts/research-question";
import type { ResearchSessionSeed } from "@/lib/contracts/research-session";
import type { ResearchSynthesisSeed } from "@/lib/contracts/research-synthesis";
import {
  openClawExampleManifestSchema,
  type OpenClawExampleManifest,
} from "@/lib/contracts/openclaw-example";
import {
  topicBootstrapConfigSchema,
  topicBootstrapManifestSchema,
  type TopicBootstrapConfig,
  type TopicBootstrapManifest,
} from "@/lib/contracts/topic-bootstrap";
import { OPENCLAW_EXAMPLE_ROOT, TOPICS_ROOT } from "@/server/lib/repo-paths";
import { openClawKnowledgeMethodData } from "@/server/services/openclaw-knowledge-method";
import { getTopicPortfolioOverview } from "@/server/services/topic-portfolio-service";

type TopicPortfolioEntry = Awaited<
  ReturnType<typeof getTopicPortfolioOverview>
>["topics"][number];

type EvidenceGapSource = {
  topic: TopicPortfolioEntry;
  questions: ResearchQuestionSeed[];
  sessions: ResearchSessionSeed[];
  syntheses: ResearchSynthesisSeed[];
  evidenceGaps: EvidenceGapSeed[];
  openQuestionsTitle: string;
  maintenanceTitle: string;
  pagePathByTitle: Map<string, string>;
  summary: string;
};

function normalizeTitle(value: string) {
  return value.trim().toLowerCase();
}

async function readJson<T>(targetPath: string) {
  return JSON.parse(await fs.readFile(targetPath, "utf8")) as T;
}

function unique<T extends string>(values: T[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))] as T[];
}

function priorityWeight(priority: EvidenceGapItem["priority"]) {
  switch (priority) {
    case "high":
      return 0;
    case "medium":
      return 1;
    case "low":
    default:
      return 2;
  }
}

function statusWeight(status: EvidenceGapItem["status"]) {
  switch (status) {
    case "in-session":
      return 0;
    case "planned":
      return 1;
    case "open":
      return 2;
    case "resolved":
    default:
      return 3;
  }
}

function sortGaps(gaps: EvidenceGapItem[]) {
  return [...gaps].sort((left, right) => {
    const statusDifference = statusWeight(left.status) - statusWeight(right.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const maturityDifference =
      Number(right.blocksMaturityProgression) - Number(left.blocksMaturityProgression);

    if (maturityDifference !== 0) {
      return maturityDifference;
    }

    const priorityDifference = priorityWeight(left.priority) - priorityWeight(right.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const resolvedAtDifference =
      new Date(right.resolvedAt ?? 0).getTime() - new Date(left.resolvedAt ?? 0).getTime();

    if (resolvedAtDifference !== 0) {
      return resolvedAtDifference;
    }

    return left.title.localeCompare(right.title);
  });
}

function buildPagePathMap(
  pages: Array<{
    title: string;
    path: string;
  }>,
) {
  return new Map(pages.map((page) => [normalizeTitle(page.title), page.path]));
}

function findPagePath(source: EvidenceGapSource, title: string | null) {
  if (!title) {
    return null;
  }

  return source.pagePathByTitle.get(normalizeTitle(title)) ?? null;
}

function findQuestion(source: EvidenceGapSource, questionId: string) {
  return source.questions.find((question) => question.id === questionId) ?? null;
}

function findSession(source: EvidenceGapSource, sessionId: string) {
  return source.sessions.find((session) => session.id === sessionId) ?? null;
}

function findSynthesis(source: EvidenceGapSource, synthesisId: string) {
  return source.syntheses.find((synthesis) => synthesis.id === synthesisId) ?? null;
}

function buildCanonicalReviewHref(source: EvidenceGapSource, titles: string[]) {
  const topicHome = source.topic.links.home.href;
  const targetPath =
    unique(titles)
      .map((title) => findPagePath(source, title))
      .find((candidate): candidate is string => Boolean(candidate)) ?? null;

  return targetPath
    ? `${topicHome}?pagePath=${encodeURIComponent(targetPath)}`
    : source.topic.links.canonical.href;
}

function buildGapItem(
  source: EvidenceGapSource,
  gap: EvidenceGapSeed,
): EvidenceGapItem {
  const session = gap.acquisitionSessionId
    ? findSession(source, gap.acquisitionSessionId)
    : null;
  const topicHome = source.topic.links.home.href;
  const maintenancePath = findPagePath(source, source.maintenanceTitle);
  const linkedQuestions = unique(
    gap.linkedQuestionIds.map((questionId) => findQuestion(source, questionId)?.question ?? questionId),
  );
  const linkedSyntheses = unique(
    gap.linkedSynthesisIds.map(
      (synthesisId) => findSynthesis(source, synthesisId)?.title ?? synthesisId,
    ),
  );
  const advancesQuestions = unique(
    gap.advancesQuestionIds.map(
      (questionId) => findQuestion(source, questionId)?.question ?? questionId,
    ),
  );
  const advancesSyntheses = unique(
    gap.advancesSynthesisIds.map(
      (synthesisId) => findSynthesis(source, synthesisId)?.title ?? synthesisId,
    ),
  );
  const questionIdForSession =
    session?.questionId ?? gap.linkedQuestionIds[0] ?? gap.advancesQuestionIds[0] ?? null;

  return {
    id: gap.id,
    title: gap.title,
    summary: gap.summary,
    status: gap.status,
    priority: gap.priority,
    gapType: gap.gapType,
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    whyItMatters: gap.whyItMatters,
    impactSummary: gap.impactSummary,
    missingEvidence: gap.missingEvidence,
    nextEvidenceToAcquire: gap.nextEvidenceToAcquire,
    successCriteria: unique(gap.successCriteria),
    linkedQuestionIds: unique(gap.linkedQuestionIds),
    linkedQuestions,
    linkedSynthesisIds: unique(gap.linkedSynthesisIds),
    linkedSyntheses,
    canonicalReviewTitles: unique(gap.canonicalReviewTitles),
    watchpointTitles: unique(gap.watchpointTitles),
    maintenanceSurfaceTitles: unique(gap.maintenanceSurfaceTitles),
    acquisitionSessionId: gap.acquisitionSessionId,
    acquisitionSessionTitle: session?.title ?? null,
    acquisitionSessionStatus:
      session?.status === "queued" || session?.status === "active" || session?.status === "completed"
        ? session.status
        : null,
    preferredContextPackTitles: unique(gap.preferredContextPackTitles),
    firstPageTitles: unique(gap.firstPageTitles),
    firstSourceTitles: unique(gap.firstSourceTitles),
    maturityBlockerStages: unique(gap.maturityBlockerStages),
    qualityBlockerNotes: unique(gap.qualityBlockerNotes),
    advancesQuestionIds: unique(gap.advancesQuestionIds),
    advancesQuestions,
    advancesSynthesisIds: unique(gap.advancesSynthesisIds),
    advancesSyntheses,
    resolvedAt: gap.resolvedAt,
    resolutionSummary: gap.resolutionSummary,
    blocksQuestions: gap.linkedQuestionIds.length > 0 || gap.advancesQuestionIds.length > 0,
    blocksSyntheses: gap.linkedSynthesisIds.length > 0 || gap.advancesSynthesisIds.length > 0,
    blocksMaturityProgression: gap.maturityBlockerStages.length > 0,
    acquisitionReady:
      gap.status !== "resolved" &&
      Boolean(gap.acquisitionSessionId) &&
      gap.preferredContextPackTitles.length > 0 &&
      gap.successCriteria.length > 0,
    recentlyResolved: gap.status === "resolved" && Boolean(gap.resolvedAt),
    links: {
      gap: {
        label: "Open evidence gap",
        href: `/gaps?topic=${source.topic.id}&gap=${gap.id}`,
      },
      topicHome: {
        label: "Open topic home",
        href: topicHome,
      },
      session: {
        label: session?.status === "active" ? "Continue acquisition session" : "Open acquisition session",
        href:
          questionIdForSession !== null
            ? `/sessions?topic=${source.topic.id}&question=${questionIdForSession}`
            : `/sessions?topic=${source.topic.id}`,
      },
      questionQueue: {
        label: "Open question queue",
        href: `/questions?topic=${source.topic.id}`,
      },
      syntheses: {
        label: "Open syntheses",
        href: `/syntheses?topic=${source.topic.id}`,
      },
      maintenance: {
        label: "Open maintenance rhythm",
        href: maintenancePath
          ? `${topicHome}?pagePath=${encodeURIComponent(maintenancePath)}`
          : source.topic.links.maintenance.href,
      },
      canonicalReview: {
        label: "Open canonical review target",
        href: buildCanonicalReviewHref(
          source,
          gap.canonicalReviewTitles.length > 0 ? gap.canonicalReviewTitles : gap.firstPageTitles,
        ),
      },
    },
  };
}

async function loadExampleSource(topic: TopicPortfolioEntry): Promise<EvidenceGapSource> {
  const manifest = openClawExampleManifestSchema.parse(
    await readJson<OpenClawExampleManifest>(path.join(OPENCLAW_EXAMPLE_ROOT, "manifest.json")),
  );

  return {
    topic,
    questions: openClawKnowledgeMethodData.researchQuestions,
    sessions: openClawKnowledgeMethodData.researchSessions,
    syntheses: openClawKnowledgeMethodData.researchSyntheses,
    evidenceGaps: openClawKnowledgeMethodData.evidenceGaps,
    openQuestionsTitle: openClawKnowledgeMethodData.openQuestionsTitle,
    maintenanceTitle: openClawKnowledgeMethodData.maintenanceRhythmTitle,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "OpenClaw evidence gaps keep the flagship example honest about what still needs deeper acquisition before a question or recommendation should harden further.",
  };
}

async function loadBootstrapTopicSource(
  topic: TopicPortfolioEntry,
): Promise<EvidenceGapSource> {
  const topicRoot = path.join(TOPICS_ROOT, topic.id);
  const config = topicBootstrapConfigSchema.parse(
    await readJson<TopicBootstrapConfig>(path.join(topicRoot, "topic.json")),
  );
  const manifest = topicBootstrapManifestSchema.parse(
    await readJson<TopicBootstrapManifest>(path.join(topicRoot, "manifest.json")),
  );

  return {
    topic,
    questions: config.researchQuestions,
    sessions: config.researchSessions,
    syntheses: config.researchSyntheses,
    evidenceGaps: config.evidenceGaps,
    openQuestionsTitle: config.surfaces.openQuestions.title,
    maintenanceTitle: config.surfaces.maintenanceRhythm.title,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "Starter-topic evidence gaps distinguish structural completeness from evidence completeness, so the next acquisition pass is explicit instead of implicit.",
  };
}

async function loadEvidenceGapSource(topic: TopicPortfolioEntry): Promise<EvidenceGapSource> {
  if (topic.id === "openclaw") {
    return loadExampleSource(topic);
  }

  return loadBootstrapTopicSource(topic);
}

function buildTopicSummary(
  source: EvidenceGapSource,
  gaps: EvidenceGapItem[],
): EvidenceGapTopicSummary {
  const sorted = sortGaps(gaps);
  const unresolved = sortGaps(gaps.filter((gap) => gap.status !== "resolved"));
  const resolved = [...gaps]
    .filter((gap) => gap.status === "resolved")
    .sort(
      (left, right) =>
        new Date(right.resolvedAt ?? 0).getTime() - new Date(left.resolvedAt ?? 0).getTime(),
    );

  return evidenceGapTopicSummarySchema.parse({
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    summary: source.summary,
    gapCount: sorted.length,
    openCount: sorted.filter((gap) => gap.status === "open").length,
    plannedCount: sorted.filter((gap) => gap.status === "planned").length,
    inSessionCount: sorted.filter((gap) => gap.status === "in-session").length,
    resolvedCount: sorted.filter((gap) => gap.status === "resolved").length,
    highPriorityCount: sorted.filter((gap) => gap.priority === "high" && gap.status !== "resolved").length,
    blockedQuestionCount: unique(
      unresolved.flatMap((gap) => gap.linkedQuestionIds.concat(gap.advancesQuestionIds)),
    ).length,
    blockedSynthesisCount: unique(
      unresolved.flatMap((gap) => gap.linkedSynthesisIds.concat(gap.advancesSynthesisIds)),
    ).length,
    maturityBlockerCount: unresolved.filter((gap) => gap.blocksMaturityProgression).length,
    nextGap: unresolved[0] ?? null,
    recentlyResolved: resolved[0] ?? null,
    gaps: sorted,
  });
}

function buildBuckets(gaps: EvidenceGapItem[]) {
  return [
    {
      id: "next-evidence" as const,
      title: "Highest-leverage next evidence",
      description:
        "The best next evidence to acquire if you want the largest movement in question advancement, synthesis readiness, or topic quality.",
      gaps: sortGaps(gaps.filter((gap) => gap.status !== "resolved")),
    },
    {
      id: "question-blockers" as const,
      title: "Questions blocked on missing evidence",
      description:
        "Gaps that currently block questions from advancing cleanly toward durable answers or synthesis.",
      gaps: sortGaps(
        gaps.filter(
          (gap) =>
            gap.status !== "resolved" &&
            (gap.linkedQuestionIds.length > 0 || gap.advancesQuestionIds.length > 0),
        ),
      ),
    },
    {
      id: "synthesis-blockers" as const,
      title: "Syntheses blocked on missing evidence",
      description:
        "Gaps that are holding a synthesis candidate in session, in queue, or at a still-provisional confidence boundary.",
      gaps: sortGaps(
        gaps.filter(
          (gap) =>
            gap.status !== "resolved" &&
            (gap.linkedSynthesisIds.length > 0 || gap.advancesSynthesisIds.length > 0),
        ),
      ),
    },
    {
      id: "maturity-blockers" as const,
      title: "Maturity blockers caused by evidence gaps",
      description:
        "Gaps that matter not because the structure is missing, but because the next maturity step still needs better evidence.",
      gaps: sortGaps(
        gaps.filter((gap) => gap.status !== "resolved" && gap.maturityBlockerStages.length > 0),
      ),
    },
    {
      id: "recently-resolved" as const,
      title: "Recent gaps resolved",
      description:
        "Gaps that were recently closed and now explain why a question, note, or synthesis became more trustworthy.",
      gaps: [...gaps]
        .filter((gap) => gap.status === "resolved")
        .sort(
          (left, right) =>
            new Date(right.resolvedAt ?? 0).getTime() - new Date(left.resolvedAt ?? 0).getTime(),
        ),
    },
  ];
}

export async function getEvidenceGapOverview(params?: {
  focusTopicId?: string | null;
  focusGapId?: string | null;
  focusGapTitle?: string | null;
}): Promise<EvidenceGapOverview> {
  const portfolio = await getTopicPortfolioOverview();
  const selectedTopics =
    params?.focusTopicId && portfolio.topics.some((topic) => topic.id === params.focusTopicId)
      ? portfolio.topics.filter((topic) => topic.id === params.focusTopicId)
      : portfolio.topics;
  const sources = await Promise.all(selectedTopics.map(loadEvidenceGapSource));
  const topicSummaries = sources.map((source) =>
    buildTopicSummary(
      source,
      source.evidenceGaps.map((gap) => buildGapItem(source, gap)),
    ),
  );
  const allGaps = sortGaps(topicSummaries.flatMap((topic) => topic.gaps));
  const focusGap =
    (params?.focusGapId ? allGaps.find((gap) => gap.id === params.focusGapId) ?? null : null) ??
    (params?.focusGapTitle
      ? allGaps.find((gap) => normalizeTitle(gap.title) === normalizeTitle(params.focusGapTitle ?? "")) ?? null
      : null) ??
    allGaps.find((gap) => gap.status === "in-session") ??
    allGaps.find((gap) => gap.priority === "high" && gap.status !== "resolved") ??
    allGaps.find((gap) => gap.status !== "resolved") ??
    [...allGaps]
      .filter((gap) => gap.status === "resolved")
      .sort(
        (left, right) =>
          new Date(right.resolvedAt ?? 0).getTime() - new Date(left.resolvedAt ?? 0).getTime(),
      )[0] ??
    allGaps[0] ??
    null;
  const focusedTopic =
    params?.focusTopicId && selectedTopics.length === 1
      ? { id: selectedTopics[0].id, title: selectedTopics[0].title }
      : null;

  return evidenceGapOverviewSchema.parse({
    generatedAt: new Date().toISOString(),
    focusedTopic,
    focusedGap: focusGap
      ? {
          topicId: focusGap.topicId,
          gapId: focusGap.id,
          title: focusGap.title,
        }
      : null,
    summary: {
      totalGaps: allGaps.length,
      open: allGaps.filter((gap) => gap.status === "open").length,
      planned: allGaps.filter((gap) => gap.status === "planned").length,
      inSession: allGaps.filter((gap) => gap.status === "in-session").length,
      resolved: allGaps.filter((gap) => gap.status === "resolved").length,
      highPriority: allGaps.filter((gap) => gap.priority === "high" && gap.status !== "resolved")
        .length,
      blockedQuestions: unique(
        allGaps
          .filter((gap) => gap.status !== "resolved")
          .flatMap((gap) => gap.linkedQuestionIds.concat(gap.advancesQuestionIds)),
      ).length,
      blockedSyntheses: unique(
        allGaps
          .filter((gap) => gap.status !== "resolved")
          .flatMap((gap) => gap.linkedSynthesisIds.concat(gap.advancesSynthesisIds)),
      ).length,
      maturityBlockers: allGaps.filter(
        (gap) => gap.status !== "resolved" && gap.blocksMaturityProgression,
      ).length,
    },
    focusGap,
    buckets: buildBuckets(allGaps),
    topics: topicSummaries.sort((left, right) => {
      const maturityDifference = right.maturityBlockerCount - left.maturityBlockerCount;

      if (maturityDifference !== 0) {
        return maturityDifference;
      }

      const priorityDifference = right.highPriorityCount - left.highPriorityCount;

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const unresolvedDifference =
        (right.openCount + right.plannedCount + right.inSessionCount) -
        (left.openCount + left.plannedCount + left.inSessionCount);

      if (unresolvedDifference !== 0) {
        return unresolvedDifference;
      }

      return left.topicTitle.localeCompare(right.topicTitle);
    }),
  });
}

export async function getTopicEvidenceGapSummary(
  topicId: string,
): Promise<EvidenceGapTopicSummary | null> {
  const overview = await getEvidenceGapOverview({ focusTopicId: topicId });
  return overview.topics[0] ?? null;
}
