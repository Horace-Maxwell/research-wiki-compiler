import fs from "node:fs/promises";
import path from "node:path";

import type { AcquisitionTaskSeed } from "@/lib/contracts/acquisition-task";
import type { EvidenceChangeSeed } from "@/lib/contracts/evidence-change";
import type { EvidenceGapSeed } from "@/lib/contracts/evidence-gap";
import {
  monitoringOverviewSchema,
  monitoringTopicSummarySchema,
  type MonitoringItem,
  type MonitoringItemSeed,
  type MonitoringOverview,
  type MonitoringTopicSummary,
} from "@/lib/contracts/monitoring-item";
import {
  openClawExampleManifestSchema,
  type OpenClawExampleManifest,
} from "@/lib/contracts/openclaw-example";
import type { ResearchQuestionSeed } from "@/lib/contracts/research-question";
import type { ResearchSessionSeed } from "@/lib/contracts/research-session";
import type { ResearchSynthesisSeed } from "@/lib/contracts/research-synthesis";
import {
  topicBootstrapConfigSchema,
  topicBootstrapManifestSchema,
  type TopicBootstrapConfig,
  type TopicBootstrapManifest,
} from "@/lib/contracts/topic-bootstrap";
import { buildTopicPageHref } from "@/server/lib/page-route-hrefs";
import { OPENCLAW_EXAMPLE_ROOT, TOPICS_ROOT } from "@/server/lib/repo-paths";
import { openClawKnowledgeMethodData } from "@/server/services/openclaw-knowledge-method";
import { getTopicPortfolioOverview } from "@/server/services/topic-portfolio-service";

type TopicPortfolioEntry = Awaited<
  ReturnType<typeof getTopicPortfolioOverview>
>["topics"][number];

type MonitoringSource = {
  topic: TopicPortfolioEntry;
  questions: ResearchQuestionSeed[];
  sessions: ResearchSessionSeed[];
  syntheses: ResearchSynthesisSeed[];
  evidenceGaps: EvidenceGapSeed[];
  evidenceChanges: EvidenceChangeSeed[];
  acquisitionTasks: AcquisitionTaskSeed[];
  monitoringItems: MonitoringItemSeed[];
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

function priorityWeight(priority: MonitoringItem["priority"]) {
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

function statusWeight(status: MonitoringItem["status"]) {
  switch (status) {
    case "spawned-acquisition":
      return 0;
    case "triggered":
      return 1;
    case "review-needed":
      return 2;
    case "watching":
      return 3;
    case "stable":
    default:
      return 4;
  }
}

function sortMonitoringItems(items: MonitoringItem[]) {
  return [...items].sort((left, right) => {
    const statusDifference = statusWeight(left.status) - statusWeight(right.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const actionDifference =
      Number(right.spawnsAcquisition || right.reopensWork) -
      Number(left.spawnsAcquisition || left.reopensWork);

    if (actionDifference !== 0) {
      return actionDifference;
    }

    const priorityDifference = priorityWeight(left.priority) - priorityWeight(right.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const recentDifference =
      Math.max(
        new Date(right.triggeredAt ?? 0).getTime(),
        new Date(right.lastCheckedAt ?? 0).getTime(),
      ) -
      Math.max(
        new Date(left.triggeredAt ?? 0).getTime(),
        new Date(left.lastCheckedAt ?? 0).getTime(),
      );

    if (recentDifference !== 0) {
      return recentDifference;
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

function findPagePath(source: MonitoringSource, title: string | null) {
  if (!title) {
    return null;
  }

  return source.pagePathByTitle.get(normalizeTitle(title)) ?? null;
}

function findQuestion(source: MonitoringSource, questionId: string) {
  return source.questions.find((question) => question.id === questionId) ?? null;
}

function findSession(source: MonitoringSource, sessionId: string) {
  return source.sessions.find((session) => session.id === sessionId) ?? null;
}

function findSynthesis(source: MonitoringSource, synthesisId: string) {
  return source.syntheses.find((synthesis) => synthesis.id === synthesisId) ?? null;
}

function findGap(source: MonitoringSource, gapId: string) {
  return source.evidenceGaps.find((gap) => gap.id === gapId) ?? null;
}

function findAcquisitionTask(source: MonitoringSource, taskId: string) {
  return source.acquisitionTasks.find((task) => task.id === taskId) ?? null;
}

function findChange(source: MonitoringSource, changeId: string) {
  return source.evidenceChanges.find((change) => change.id === changeId) ?? null;
}

function buildCanonicalReviewHref(source: MonitoringSource, titles: string[]) {
  const targetPath =
    unique(titles)
      .map((title) => findPagePath(source, title))
      .find((candidate): candidate is string => Boolean(candidate)) ?? null;

  return targetPath
    ? buildTopicPageHref(source.topic.id, targetPath)
    : source.topic.links.canonical.href;
}

function buildMonitoringItem(
  source: MonitoringSource,
  item: MonitoringItemSeed,
): MonitoringItem {
  const session = item.spawnSessionId ? findSession(source, item.spawnSessionId) : null;
  const topicHome = source.topic.links.home.href;
  const maintenancePath = findPagePath(source, source.maintenanceTitle);
  const linkedEvidenceGapTitles = unique(
    item.linkedEvidenceGapIds.map((gapId) => findGap(source, gapId)?.title ?? gapId),
  );
  const linkedAcquisitionTaskTitles = unique(
    item.linkedAcquisitionTaskIds.map(
      (taskId) => findAcquisitionTask(source, taskId)?.title ?? taskId,
    ),
  );
  const linkedChangeTitles = unique(
    item.linkedChangeIds.map((changeId) => findChange(source, changeId)?.title ?? changeId),
  );
  const linkedQuestions = unique(
    item.linkedQuestionIds.map((questionId) => findQuestion(source, questionId)?.question ?? questionId),
  );
  const linkedSyntheses = unique(
    item.linkedSynthesisIds.map(
      (synthesisId) => findSynthesis(source, synthesisId)?.title ?? synthesisId,
    ),
  );

  return {
    id: item.id,
    title: item.title,
    summary: item.summary,
    status: item.status,
    mode: item.mode,
    priority: item.priority,
    triggerAction: item.triggerAction,
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    whyItMatters: item.whyItMatters,
    triggerSignals: unique(item.triggerSignals),
    latestSignalSummary: item.latestSignalSummary,
    linkedWatchpointTitles: unique(item.linkedWatchpointTitles),
    linkedEvidenceGapIds: unique(item.linkedEvidenceGapIds),
    linkedEvidenceGapTitles,
    linkedAcquisitionTaskIds: unique(item.linkedAcquisitionTaskIds),
    linkedAcquisitionTaskTitles,
    linkedChangeIds: unique(item.linkedChangeIds),
    linkedChangeTitles,
    linkedQuestionIds: unique(item.linkedQuestionIds),
    linkedQuestions,
    linkedSynthesisIds: unique(item.linkedSynthesisIds),
    linkedSyntheses,
    canonicalReviewTitles: unique(item.canonicalReviewTitles),
    reviewSurfaceTitles: unique(item.reviewSurfaceTitles),
    suggestedContextPackTitles: unique(item.suggestedContextPackTitles),
    suggestedPageTitles: unique(item.suggestedPageTitles),
    spawnSessionId: item.spawnSessionId,
    spawnSessionTitle: session?.title ?? null,
    spawnSessionStatus:
      session?.status === "queued" || session?.status === "active" || session?.status === "completed"
        ? session.status
        : null,
    nextCheck: item.nextCheck,
    recommendedAction: item.recommendedAction,
    maturityImpactStages: unique(item.maturityImpactStages),
    lastCheckedAt: item.lastCheckedAt,
    triggeredAt: item.triggeredAt,
    stableSince: item.stableSince,
    spawnsAcquisition: item.triggerAction === "spawn-acquisition",
    marksReview: item.triggerAction === "mark-review",
    reopensWork: item.triggerAction === "reopen-work",
    links: {
      monitor: {
        label: "Open monitoring item",
        href: `/monitoring?topic=${source.topic.id}&monitor=${item.id}`,
      },
      topicHome: {
        label: "Open topic home",
        href: topicHome,
      },
      acquisition: {
        label: "Open acquisition task",
        href:
          item.linkedAcquisitionTaskIds[0]
            ? `/acquisition?topic=${source.topic.id}&task=${item.linkedAcquisitionTaskIds[0]}`
            : `/acquisition?topic=${source.topic.id}`,
      },
      changes: {
        label: "Open evidence change",
        href:
          item.linkedChangeIds[0]
            ? `/changes?topic=${source.topic.id}&change=${item.linkedChangeIds[0]}`
            : `/changes?topic=${source.topic.id}`,
      },
      questionQueue: {
        label: "Open question queue",
        href: `/questions?topic=${source.topic.id}`,
      },
      maintenance: {
        label: "Open maintenance rhythm",
        href: maintenancePath
          ? buildTopicPageHref(source.topic.id, maintenancePath)
          : source.topic.links.maintenance.href,
      },
      canonicalReview: {
        label: "Open canonical review target",
        href: buildCanonicalReviewHref(
          source,
          item.canonicalReviewTitles.length > 0
            ? item.canonicalReviewTitles
            : item.suggestedPageTitles,
        ),
      },
    },
  };
}

async function loadExampleSource(topic: TopicPortfolioEntry): Promise<MonitoringSource> {
  const manifest = openClawExampleManifestSchema.parse(
    await readJson<OpenClawExampleManifest>(path.join(OPENCLAW_EXAMPLE_ROOT, "manifest.json")),
  );

  return {
    topic,
    questions: openClawKnowledgeMethodData.researchQuestions,
    sessions: openClawKnowledgeMethodData.researchSessions,
    syntheses: openClawKnowledgeMethodData.researchSyntheses,
    evidenceGaps: openClawKnowledgeMethodData.evidenceGaps,
    evidenceChanges: openClawKnowledgeMethodData.evidenceChanges,
    acquisitionTasks: openClawKnowledgeMethodData.acquisitionTasks,
    monitoringItems: openClawKnowledgeMethodData.monitoringItems,
    maintenanceTitle: openClawKnowledgeMethodData.maintenanceRhythmTitle,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "OpenClaw monitoring items distinguish passive watchfulness from the events that should spawn bounded acquisition work, reopen research, or mark durable surfaces for review.",
  };
}

async function loadBootstrapTopicSource(
  topic: TopicPortfolioEntry,
): Promise<MonitoringSource> {
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
    evidenceChanges: config.evidenceChanges,
    acquisitionTasks: config.acquisitionTasks,
    monitoringItems: config.monitoringItems,
    maintenanceTitle: config.surfaces.maintenanceRhythm.title,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "Starter-topic monitoring items make the watch loop explicit: what should stay passive, what needs periodic review, and what should spawn bounded acquisition work next.",
  };
}

async function loadMonitoringSource(topic: TopicPortfolioEntry): Promise<MonitoringSource> {
  if (topic.id === "openclaw") {
    return loadExampleSource(topic);
  }

  return loadBootstrapTopicSource(topic);
}

function buildTopicSummary(
  source: MonitoringSource,
  items: MonitoringItem[],
): MonitoringTopicSummary {
  const sorted = sortMonitoringItems(items);
  const unresolved = sortMonitoringItems(items.filter((item) => item.status !== "stable"));
  const recentlyStable = [...items]
    .filter((item) => item.status === "stable")
    .sort(
      (left, right) =>
        new Date(right.stableSince ?? 0).getTime() - new Date(left.stableSince ?? 0).getTime(),
    );

  return monitoringTopicSummarySchema.parse({
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    summary: source.summary,
    itemCount: sorted.length,
    watchingCount: sorted.filter((item) => item.status === "watching").length,
    triggeredCount: sorted.filter((item) => item.status === "triggered").length,
    reviewNeededCount: sorted.filter((item) => item.status === "review-needed").length,
    spawnedAcquisitionCount: sorted.filter((item) => item.status === "spawned-acquisition").length,
    periodicReviewCount: sorted.filter((item) => item.mode === "periodic-review").length,
    nextMonitor: unresolved[0] ?? null,
    nextAcquisitionTrigger:
      sortMonitoringItems(
        items.filter(
          (item) =>
            item.status !== "stable" &&
            (item.triggerAction === "spawn-acquisition" || item.triggerAction === "reopen-work"),
        ),
      )[0] ?? null,
    items: sorted.length > 0 ? sorted : recentlyStable,
  });
}

function buildBuckets(items: MonitoringItem[]) {
  const assignedItemIds = new Set<string>();
  const claimItems = (candidates: MonitoringItem[]) =>
    sortMonitoringItems(candidates).filter((item) => {
      if (assignedItemIds.has(item.id)) {
        return false;
      }

      assignedItemIds.add(item.id);
      return true;
    });
  const recentlyStable = [...items]
    .filter((item) => item.status === "stable")
    .sort(
      (left, right) =>
        new Date(right.stableSince ?? 0).getTime() - new Date(left.stableSince ?? 0).getTime(),
    );

  return [
    {
      id: "spawn-acquisition" as const,
      title: "Monitoring that should spawn work",
      description:
        "Watchpoints and signals that should escalate into bounded acquisition or reopen work instead of staying passive.",
      items: claimItems(
        items.filter(
          (item) =>
            item.triggerAction === "spawn-acquisition" || item.triggerAction === "reopen-work",
        ),
      ),
    },
    {
      id: "review-needed" as const,
      title: "Review-needed monitoring",
      description:
        "Signals that should mark bounded review surfaces without necessarily spawning new evidence collection immediately.",
      items: claimItems(
        items.filter(
          (item) =>
            item.status === "review-needed" || item.triggerAction === "mark-review",
        ),
      ),
    },
    {
      id: "periodic-review" as const,
      title: "Periodic review monitors",
      description:
        "Monitoring items that should be checked on a cadence because the topic is not yet ready to treat them as stable background assumptions.",
      items: claimItems(items.filter((item) => item.mode === "periodic-review")),
    },
    {
      id: "keep-watching" as const,
      title: "Keep watching",
      description:
        "Signals worth keeping visible even when they do not yet justify new acquisition or bounded canonical review.",
      items: claimItems(
        items.filter(
          (item) =>
            item.triggerAction === "keep-watching" || item.status === "watching",
        ),
      ),
    },
    {
      id: "recently-stable" as const,
      title: "Recently stable",
      description:
        "Monitoring items that help narrow work by showing which surfaces can likely stay stable for now.",
      items: claimItems(recentlyStable),
    },
  ].filter((bucket) => bucket.items.length > 0);
}

export async function getMonitoringOverview(params?: {
  focusTopicId?: string | null;
  focusMonitorId?: string | null;
  focusMonitorTitle?: string | null;
}): Promise<MonitoringOverview> {
  const portfolio = await getTopicPortfolioOverview();
  const selectedTopics =
    params?.focusTopicId && portfolio.topics.some((topic) => topic.id === params.focusTopicId)
      ? portfolio.topics.filter((topic) => topic.id === params.focusTopicId)
      : portfolio.topics;
  const sources = await Promise.all(selectedTopics.map(loadMonitoringSource));
  const topicSummaries = sources.map((source) =>
    buildTopicSummary(
      source,
      source.monitoringItems.map((item) => buildMonitoringItem(source, item)),
    ),
  );
  const allItems = sortMonitoringItems(topicSummaries.flatMap((topic) => topic.items));
  const focusMonitor =
    (params?.focusMonitorId
      ? allItems.find((item) => item.id === params.focusMonitorId) ?? null
      : null) ??
    (params?.focusMonitorTitle
      ? allItems.find((item) => normalizeTitle(item.title) === normalizeTitle(params.focusMonitorTitle ?? "")) ??
        null
      : null) ??
    allItems.find((item) => item.status === "spawned-acquisition") ??
    allItems.find((item) => item.status === "triggered") ??
    allItems.find((item) => item.status === "review-needed") ??
    allItems.find((item) => item.status === "watching") ??
    [...allItems]
      .filter((item) => item.status === "stable")
      .sort(
        (left, right) =>
          new Date(right.stableSince ?? 0).getTime() - new Date(left.stableSince ?? 0).getTime(),
      )[0] ??
    allItems[0] ??
    null;
  const focusedTopic =
    params?.focusTopicId && selectedTopics.length === 1
      ? { id: selectedTopics[0].id, title: selectedTopics[0].title }
      : null;

  return monitoringOverviewSchema.parse({
    generatedAt: new Date().toISOString(),
    focusedTopic,
    focusedMonitor: focusMonitor
      ? {
          topicId: focusMonitor.topicId,
          monitorId: focusMonitor.id,
          title: focusMonitor.title,
        }
      : null,
    summary: {
      totalItems: allItems.length,
      watching: allItems.filter((item) => item.status === "watching").length,
      triggered: allItems.filter((item) => item.status === "triggered").length,
      reviewNeeded: allItems.filter((item) => item.status === "review-needed").length,
      spawnedAcquisition: allItems.filter((item) => item.status === "spawned-acquisition").length,
      periodicReview: allItems.filter((item) => item.mode === "periodic-review").length,
    },
    focusMonitor,
    buckets: buildBuckets(allItems),
    topics: topicSummaries.sort((left, right) => {
      const escalationDifference =
        right.spawnedAcquisitionCount - left.spawnedAcquisitionCount;

      if (escalationDifference !== 0) {
        return escalationDifference;
      }

      const reviewDifference = right.reviewNeededCount - left.reviewNeededCount;

      if (reviewDifference !== 0) {
        return reviewDifference;
      }

      const periodicDifference = right.periodicReviewCount - left.periodicReviewCount;

      if (periodicDifference !== 0) {
        return periodicDifference;
      }

      return left.topicTitle.localeCompare(right.topicTitle);
    }),
  });
}

export async function getTopicMonitoringSummary(
  topicId: string,
): Promise<MonitoringTopicSummary | null> {
  const overview = await getMonitoringOverview({ focusTopicId: topicId });
  return overview.topics[0] ?? null;
}
