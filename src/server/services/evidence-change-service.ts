import fs from "node:fs/promises";
import path from "node:path";

import {
  evidenceChangeOverviewSchema,
  evidenceChangeTopicSummarySchema,
  type EvidenceBundleItem,
  type EvidenceBundleSeed,
  type EvidenceChangeItem,
  type EvidenceChangeOverview,
  type EvidenceChangeSeed,
  type EvidenceChangeTopicSummary,
} from "@/lib/contracts/evidence-change";
import type { ResearchQuestionSeed } from "@/lib/contracts/research-question";
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

type EvidenceChangeSource = {
  topic: TopicPortfolioEntry;
  questions: ResearchQuestionSeed[];
  syntheses: ResearchSynthesisSeed[];
  evidenceBundles: EvidenceBundleSeed[];
  evidenceChanges: EvidenceChangeSeed[];
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

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function priorityWeight(priority: EvidenceChangeItem["priority"]) {
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

function stateWeight(state: EvidenceChangeItem["state"]) {
  switch (state) {
    case "reopened":
      return 0;
    case "review-needed":
      return 1;
    case "stabilized":
    default:
      return 2;
  }
}

function sortChanges(changes: EvidenceChangeItem[]) {
  return [...changes].sort((left, right) => {
    const stateDifference = stateWeight(left.state) - stateWeight(right.state);

    if (stateDifference !== 0) {
      return stateDifference;
    }

    const priorityDifference = priorityWeight(left.priority) - priorityWeight(right.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime();
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

function findPagePath(source: EvidenceChangeSource, title: string | null) {
  if (!title) {
    return null;
  }

  return source.pagePathByTitle.get(normalizeTitle(title)) ?? null;
}

function findQuestion(source: EvidenceChangeSource, questionId: string) {
  return source.questions.find((question) => question.id === questionId) ?? null;
}

function findSynthesis(source: EvidenceChangeSource, synthesisId: string) {
  return source.syntheses.find((synthesis) => synthesis.id === synthesisId) ?? null;
}

function findBundle(source: EvidenceChangeSource, bundleId: string) {
  return source.evidenceBundles.find((bundle) => bundle.id === bundleId) ?? null;
}

function buildBundleItem(
  source: EvidenceChangeSource,
  bundle: EvidenceBundleSeed,
): EvidenceBundleItem {
  return {
    id: bundle.id,
    title: bundle.title,
    kind: bundle.kind,
    summary: bundle.summary,
    sourceTitles: unique(bundle.sourceTitles),
    assumptionNotes: unique(bundle.assumptionNotes),
    linkedQuestions: unique(
      bundle.linkedQuestionIds.map((questionId) => findQuestion(source, questionId)?.question ?? questionId),
    ),
    linkedSyntheses: unique(
      bundle.linkedSynthesisIds.map(
        (synthesisId) => findSynthesis(source, synthesisId)?.title ?? synthesisId,
      ),
    ),
    canonicalPageTitles: unique(bundle.canonicalPageTitles),
    watchpointTitles: unique(bundle.watchpointTitles),
    maintenanceSurfaceTitles: unique(bundle.maintenanceSurfaceTitles),
  };
}

function buildCanonicalReviewHref(source: EvidenceChangeSource, titles: string[]) {
  const topicHome = source.topic.links.home.href;
  const targetPath =
    unique(titles)
      .map((title) => findPagePath(source, title))
      .find((candidate): candidate is string => Boolean(candidate)) ?? null;

  return targetPath
    ? `${topicHome}?pagePath=${encodeURIComponent(targetPath)}`
    : source.topic.links.canonical.href;
}

function buildEvidenceChangeItem(
  source: EvidenceChangeSource,
  change: EvidenceChangeSeed,
): EvidenceChangeItem {
  const topicHome = source.topic.links.home.href;
  const maintenancePath = findPagePath(source, source.maintenanceTitle);
  const bundles = unique(change.evidenceBundleIds)
    .map((bundleId) => findBundle(source, bundleId))
    .filter((bundle): bundle is EvidenceBundleSeed => bundle !== null)
    .map((bundle) => buildBundleItem(source, bundle));
  const affectedQuestions = unique(
    change.affectedQuestionIds.map((questionId) => findQuestion(source, questionId)?.question ?? questionId),
  );
  const affectedSyntheses = unique(
    change.affectedSynthesisIds.map(
      (synthesisId) => findSynthesis(source, synthesisId)?.title ?? synthesisId,
    ),
  );
  const reopenQuestions = unique(
    change.reopenQuestionIds.map((questionId) => findQuestion(source, questionId)?.question ?? questionId),
  );
  const staleSyntheses = unique(
    change.staleSynthesisIds.map(
      (synthesisId) => findSynthesis(source, synthesisId)?.title ?? synthesisId,
    ),
  );
  const canonicalReviewTitles = unique(
    change.canonicalReviewTitles.concat(
      bundles.flatMap((bundle) => bundle.canonicalPageTitles),
    ),
  );

  return {
    id: change.id,
    title: change.title,
    summary: change.summary,
    state: change.state,
    priority: change.priority,
    changeType: change.changeType,
    changedAt: change.changedAt,
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    evidenceBundleIds: unique(change.evidenceBundleIds),
    evidenceBundles: bundles,
    sourceTitles: unique(change.sourceTitles),
    whyItMatters: change.whyItMatters,
    impactSummary: change.impactSummary,
    affectedQuestionIds: unique(change.affectedQuestionIds),
    affectedQuestions,
    affectedSynthesisIds: unique(change.affectedSynthesisIds),
    affectedSyntheses,
    canonicalReviewTitles: unique(change.canonicalReviewTitles),
    triggeredWatchpointTitles: unique(change.triggeredWatchpointTitles),
    maintenanceActionTitles: unique(change.maintenanceActionTitles),
    likelyStableTitles: unique(change.likelyStableTitles),
    reopenQuestionIds: unique(change.reopenQuestionIds),
    reopenQuestions,
    staleSynthesisIds: unique(change.staleSynthesisIds),
    staleSyntheses,
    downgradedDecisionTitles: unique(change.downgradedDecisionTitles),
    recommendedAction: change.recommendedAction,
    reopensWork:
      change.state === "reopened" ||
      change.reopenQuestionIds.length > 0 ||
      change.staleSynthesisIds.length > 0,
    needsCanonicalReview: change.canonicalReviewTitles.length > 0,
    triggersMaintenance:
      change.maintenanceActionTitles.length > 0 || change.triggeredWatchpointTitles.length > 0,
    links: {
      change: {
        label: "Open evidence change",
        href: `/changes?topic=${source.topic.id}&change=${change.id}`,
      },
      topicHome: {
        label: "Open topic home",
        href: topicHome,
      },
      maintenance: {
        label: "Open maintenance rhythm",
        href: maintenancePath
          ? `${topicHome}?pagePath=${encodeURIComponent(maintenancePath)}`
          : source.topic.links.maintenance.href,
      },
      questionQueue: {
        label: "Open question queue",
        href: `/questions?topic=${source.topic.id}`,
      },
      syntheses: {
        label: "Open syntheses",
        href: `/syntheses?topic=${source.topic.id}`,
      },
      canonicalReview: {
        label: "Open canonical review target",
        href: buildCanonicalReviewHref(source, canonicalReviewTitles),
      },
    },
  };
}

async function loadExampleSource(topic: TopicPortfolioEntry): Promise<EvidenceChangeSource> {
  const manifest = openClawExampleManifestSchema.parse(
    await readJson<OpenClawExampleManifest>(path.join(OPENCLAW_EXAMPLE_ROOT, "manifest.json")),
  );

  return {
    topic,
    questions: openClawKnowledgeMethodData.researchQuestions,
    syntheses: openClawKnowledgeMethodData.researchSyntheses,
    evidenceBundles: openClawKnowledgeMethodData.evidenceBundles,
    evidenceChanges: openClawKnowledgeMethodData.evidenceChanges,
    openQuestionsTitle: openClawKnowledgeMethodData.openQuestionsTitle,
    maintenanceTitle: openClawKnowledgeMethodData.maintenanceRhythmTitle,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "OpenClaw evidence changes show how new release, provider, and monitoring signals should reopen questions selectively instead of triggering broad rewrite churn.",
  };
}

async function loadBootstrapTopicSource(
  topic: TopicPortfolioEntry,
): Promise<EvidenceChangeSource> {
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
    syntheses: config.researchSyntheses,
    evidenceBundles: config.evidenceBundles,
    evidenceChanges: config.evidenceChanges,
    openQuestionsTitle: config.surfaces.openQuestions.title,
    maintenanceTitle: config.surfaces.maintenanceRhythm.title,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "Starter-topic evidence changes keep maintenance selective by showing which new signals should reopen work, which syntheses are now stale, and which canonical surfaces can probably stay stable.",
  };
}

async function loadEvidenceChangeSource(
  topic: TopicPortfolioEntry,
): Promise<EvidenceChangeSource> {
  if (topic.id === "openclaw") {
    return loadExampleSource(topic);
  }

  return loadBootstrapTopicSource(topic);
}

function buildTopicSummary(
  source: EvidenceChangeSource,
  changes: EvidenceChangeItem[],
): EvidenceChangeTopicSummary {
  const sorted = sortChanges(changes);
  const latestByDate =
    [...changes].sort(
      (left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime(),
    )[0] ?? null;
  const nextReview =
    sortChanges(
      changes.filter((change) => change.state === "reopened" || change.state === "review-needed"),
    )[0] ?? null;

  return evidenceChangeTopicSummarySchema.parse({
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    summary: source.summary,
    changeCount: sorted.length,
    reviewNeededCount: sorted.filter((change) => change.state === "review-needed").length,
    reopenedCount: sorted.filter((change) => change.state === "reopened").length,
    stabilizedCount: sorted.filter((change) => change.state === "stabilized").length,
    canonicalReviewCount: sorted.filter((change) => change.needsCanonicalReview).length,
    reopenedQuestionCount: sorted.reduce(
      (count, change) => count + change.reopenQuestionIds.length,
      0,
    ),
    staleSynthesisCount: sorted.reduce(
      (count, change) => count + change.staleSynthesisIds.length,
      0,
    ),
    latestChange: latestByDate,
    nextReview,
    changes: sorted,
  });
}

function buildBuckets(changes: EvidenceChangeItem[]) {
  return [
    {
      id: "recent" as const,
      title: "Recent evidence changes",
      description:
        "The latest evidence shifts across the portfolio, ordered so reopen-worthy and review-worthy changes stay ahead of passive updates.",
      changes: sortChanges(changes),
    },
    {
      id: "reopen" as const,
      title: "Reopen work now",
      description:
        "Changes that materially reopen synthesized questions, stale durable syntheses, or change the active question lane.",
      changes: sortChanges(changes.filter((change) => change.state === "reopened")),
    },
    {
      id: "review" as const,
      title: "Canonical review needed",
      description:
        "Changes that do not fully invalidate the topic story, but do require a bounded review of canonical or maintenance surfaces.",
      changes: sortChanges(changes.filter((change) => change.state === "review-needed")),
    },
    {
      id: "stabilized" as const,
      title: "Likely stable despite change",
      description:
        "Changes that help narrow maintenance work by showing which durable surfaces probably do not need a broad rewrite.",
      changes: sortChanges(changes.filter((change) => change.state === "stabilized")),
    },
  ];
}

export async function getEvidenceChangeOverview(params?: {
  focusTopicId?: string | null;
  focusChangeId?: string | null;
  focusChangeTitle?: string | null;
}): Promise<EvidenceChangeOverview> {
  const portfolio = await getTopicPortfolioOverview();
  const selectedTopics =
    params?.focusTopicId && portfolio.topics.some((topic) => topic.id === params.focusTopicId)
      ? portfolio.topics.filter((topic) => topic.id === params.focusTopicId)
      : portfolio.topics;
  const sources = await Promise.all(selectedTopics.map(loadEvidenceChangeSource));
  const topicSummaries = sources.map((source) =>
    buildTopicSummary(
      source,
      source.evidenceChanges.map((change) => buildEvidenceChangeItem(source, change)),
    ),
  );
  const allChanges = sortChanges(topicSummaries.flatMap((topic) => topic.changes));
  const focusChange =
    (params?.focusChangeId
      ? allChanges.find((change) => change.id === params.focusChangeId) ?? null
      : null) ??
    (params?.focusChangeTitle
      ? allChanges.find(
          (change) => normalizeTitle(change.title) === normalizeTitle(params.focusChangeTitle ?? ""),
        ) ?? null
      : null) ??
    allChanges.find((change) => change.state === "reopened") ??
    allChanges.find((change) => change.state === "review-needed") ??
    [...allChanges].sort(
      (left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime(),
    )[0] ??
    allChanges[0] ??
    null;
  const focusedTopic =
    params?.focusTopicId && selectedTopics.length === 1
      ? { id: selectedTopics[0].id, title: selectedTopics[0].title }
      : null;

  return evidenceChangeOverviewSchema.parse({
    generatedAt: new Date().toISOString(),
    focusedTopic,
    focusedChange: focusChange
      ? {
          topicId: focusChange.topicId,
          changeId: focusChange.id,
          title: focusChange.title,
        }
      : null,
    summary: {
      totalChanges: allChanges.length,
      reviewNeeded: allChanges.filter((change) => change.state === "review-needed").length,
      reopened: allChanges.filter((change) => change.state === "reopened").length,
      stabilized: allChanges.filter((change) => change.state === "stabilized").length,
      canonicalReview: allChanges.filter((change) => change.needsCanonicalReview).length,
      reopenedQuestions: allChanges.reduce(
        (count, change) => count + change.reopenQuestionIds.length,
        0,
      ),
      staleSyntheses: allChanges.reduce(
        (count, change) => count + change.staleSynthesisIds.length,
        0,
      ),
    },
    focusChange,
    buckets: buildBuckets(allChanges),
    topics: topicSummaries.sort((left, right) => {
      const reopenDifference = right.reopenedCount - left.reopenedCount;

      if (reopenDifference !== 0) {
        return reopenDifference;
      }

      const reviewDifference = right.reviewNeededCount - left.reviewNeededCount;

      if (reviewDifference !== 0) {
        return reviewDifference;
      }

      const canonicalDifference = right.canonicalReviewCount - left.canonicalReviewCount;

      if (canonicalDifference !== 0) {
        return canonicalDifference;
      }

      return left.topicTitle.localeCompare(right.topicTitle);
    }),
  });
}

export async function getTopicEvidenceChangeSummary(
  topicId: string,
): Promise<EvidenceChangeTopicSummary | null> {
  const overview = await getEvidenceChangeOverview({ focusTopicId: topicId });
  return overview.topics[0] ?? null;
}
