import fs from "node:fs/promises";
import path from "node:path";

import {
  acquisitionTaskOverviewSchema,
  acquisitionTaskTopicSummarySchema,
  type AcquisitionTaskItem,
  type AcquisitionTaskOverview,
  type AcquisitionTaskSeed,
  type AcquisitionTaskTopicSummary,
} from "@/lib/contracts/acquisition-task";
import type { EvidenceChangeSeed } from "@/lib/contracts/evidence-change";
import type { EvidenceGapSeed } from "@/lib/contracts/evidence-gap";
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

type AcquisitionTaskSource = {
  topic: TopicPortfolioEntry;
  questions: ResearchQuestionSeed[];
  sessions: ResearchSessionSeed[];
  syntheses: ResearchSynthesisSeed[];
  evidenceGaps: EvidenceGapSeed[];
  evidenceChanges: EvidenceChangeSeed[];
  acquisitionTasks: AcquisitionTaskSeed[];
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

function priorityWeight(priority: AcquisitionTaskItem["priority"]) {
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

function statusWeight(status: AcquisitionTaskItem["status"]) {
  switch (status) {
    case "active":
      return 0;
    case "captured":
      return 1;
    case "queued":
      return 2;
    case "integrated":
    default:
      return 3;
  }
}

function sortTasks(tasks: AcquisitionTaskItem[]) {
  return [...tasks].sort((left, right) => {
    const statusDifference = statusWeight(left.status) - statusWeight(right.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const maturityDifference =
      Number(right.blocksMaturityProgression) - Number(left.blocksMaturityProgression);

    if (maturityDifference !== 0) {
      return maturityDifference;
    }

    const readyDifference = Number(right.readyForSession) - Number(left.readyForSession);

    if (readyDifference !== 0) {
      return readyDifference;
    }

    const priorityDifference = priorityWeight(left.priority) - priorityWeight(right.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    const integratedDifference =
      new Date(right.integratedAt ?? 0).getTime() - new Date(left.integratedAt ?? 0).getTime();

    if (integratedDifference !== 0) {
      return integratedDifference;
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

function findPagePath(source: AcquisitionTaskSource, title: string | null) {
  if (!title) {
    return null;
  }

  return source.pagePathByTitle.get(normalizeTitle(title)) ?? null;
}

function findQuestion(source: AcquisitionTaskSource, questionId: string) {
  return source.questions.find((question) => question.id === questionId) ?? null;
}

function findSession(source: AcquisitionTaskSource, sessionId: string) {
  return source.sessions.find((session) => session.id === sessionId) ?? null;
}

function findSynthesis(source: AcquisitionTaskSource, synthesisId: string) {
  return source.syntheses.find((synthesis) => synthesis.id === synthesisId) ?? null;
}

function findGap(source: AcquisitionTaskSource, gapId: string) {
  return source.evidenceGaps.find((gap) => gap.id === gapId) ?? null;
}

function findChange(source: AcquisitionTaskSource, changeId: string) {
  return source.evidenceChanges.find((change) => change.id === changeId) ?? null;
}

function buildCanonicalReviewHref(source: AcquisitionTaskSource, titles: string[]) {
  const targetPath =
    unique(titles)
      .map((title) => findPagePath(source, title))
      .find((candidate): candidate is string => Boolean(candidate)) ?? null;

  return targetPath
    ? buildTopicPageHref(source.topic.id, targetPath)
    : source.topic.links.canonical.href;
}

function buildInspectionHref(source: AcquisitionTaskSource, titles: string[]) {
  const targetPath =
    unique(titles)
      .map((title) => findPagePath(source, title))
      .find((candidate): candidate is string => Boolean(candidate)) ?? null;

  return targetPath
    ? buildTopicPageHref(source.topic.id, targetPath)
    : source.topic.links.canonical.href;
}

function buildTaskItem(
  source: AcquisitionTaskSource,
  task: AcquisitionTaskSeed,
): AcquisitionTaskItem {
  const session = task.nextSessionId ? findSession(source, task.nextSessionId) : null;
  const topicHome = source.topic.links.home.href;
  const linkedEvidenceGapTitles = unique(
    task.linkedEvidenceGapIds.map((gapId) => findGap(source, gapId)?.title ?? gapId),
  );
  const linkedQuestions = unique(
    task.linkedQuestionIds.map((questionId) => findQuestion(source, questionId)?.question ?? questionId),
  );
  const linkedSyntheses = unique(
    task.linkedSynthesisIds.map(
      (synthesisId) => findSynthesis(source, synthesisId)?.title ?? synthesisId,
    ),
  );
  const resultChangeTitles = unique(
    task.resultChangeIds.map((changeId) => findChange(source, changeId)?.title ?? changeId),
  );
  const questionIdForSession = session?.questionId ?? task.linkedQuestionIds[0] ?? null;

  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    status: task.status,
    priority: task.priority,
    taskType: task.taskType,
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    whyItMatters: task.whyItMatters,
    evidenceTypeToCollect: task.evidenceTypeToCollect,
    linkedEvidenceGapIds: unique(task.linkedEvidenceGapIds),
    linkedEvidenceGapTitles,
    linkedQuestionIds: unique(task.linkedQuestionIds),
    linkedQuestions,
    linkedSynthesisIds: unique(task.linkedSynthesisIds),
    linkedSyntheses,
    canonicalReviewTitles: unique(task.canonicalReviewTitles),
    monitoringTitles: unique(task.monitoringTitles),
    suggestedSourceTypes: unique(task.suggestedSourceTypes),
    suggestedSourceTargets: unique(task.suggestedSourceTargets),
    suggestedContextPackTitles: unique(task.suggestedContextPackTitles),
    suggestedPageTitles: unique(task.suggestedPageTitles),
    successCriteria: unique(task.successCriteria),
    nextSessionId: task.nextSessionId,
    nextSessionTitle: session?.title ?? null,
    nextSessionStatus:
      session?.status === "queued" || session?.status === "active" || session?.status === "completed"
        ? session.status
        : null,
    ingestionSurfaceTitles: unique(task.ingestionSurfaceTitles),
    ingestionNextStep: task.ingestionNextStep,
    resultSourceTitles: unique(task.resultSourceTitles),
    resultChangeIds: unique(task.resultChangeIds),
    resultChangeTitles,
    resultSummary: task.resultSummary,
    maturityBlockerStages: unique(task.maturityBlockerStages),
    integratedAt: task.integratedAt,
    readyForSession:
      task.status !== "integrated" &&
      Boolean(task.nextSessionId) &&
      task.suggestedContextPackTitles.length > 0 &&
      task.successCriteria.length > 0,
    awaitingIngestion: task.status === "captured",
    recentlyIntegrated: task.status === "integrated" && Boolean(task.integratedAt),
    blocksMaturityProgression:
      task.status !== "integrated" && task.maturityBlockerStages.length > 0,
    links: {
      task: {
        label: "Open acquisition task",
        href: `/acquisition?topic=${source.topic.id}&task=${task.id}`,
      },
      topicHome: {
        label: "Open topic home",
        href: topicHome,
      },
      gapLane: {
        label: "Open evidence gaps",
        href:
          task.linkedEvidenceGapIds[0]
            ? `/gaps?topic=${source.topic.id}&gap=${task.linkedEvidenceGapIds[0]}`
            : `/gaps?topic=${source.topic.id}`,
      },
      session: {
        label: session?.status === "active" ? "Continue session" : "Open session",
        href:
          questionIdForSession !== null
            ? `/sessions?topic=${source.topic.id}&question=${questionIdForSession}`
            : `/sessions?topic=${source.topic.id}`,
      },
      sources: {
        label: "Open first inspection surface",
        href: buildInspectionHref(
          source,
          task.suggestedPageTitles.length > 0 ? task.suggestedPageTitles : task.canonicalReviewTitles,
        ),
      },
      changes: {
        label: "Open evidence changes",
        href:
          task.resultChangeIds[0]
            ? `/changes?topic=${source.topic.id}&change=${task.resultChangeIds[0]}`
            : `/changes?topic=${source.topic.id}`,
      },
      canonicalReview: {
        label: "Open canonical review target",
        href: buildCanonicalReviewHref(
          source,
          task.canonicalReviewTitles.length > 0
            ? task.canonicalReviewTitles
            : task.suggestedPageTitles,
        ),
      },
    },
  };
}

async function loadExampleSource(topic: TopicPortfolioEntry): Promise<AcquisitionTaskSource> {
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
    maintenanceTitle: openClawKnowledgeMethodData.maintenanceRhythmTitle,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "OpenClaw acquisition tasks turn the strongest evidence gaps and monitoring signals into bounded collection work that can feed straight back into sessions, syntheses, and canonical review.",
  };
}

async function loadBootstrapTopicSource(
  topic: TopicPortfolioEntry,
): Promise<AcquisitionTaskSource> {
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
    maintenanceTitle: config.surfaces.maintenanceRhythm.title,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "Starter-topic acquisition tasks convert evidence gaps into bounded collection and integration work so the topic can deepen honestly without broadening into backlog noise.",
  };
}

async function loadAcquisitionTaskSource(
  topic: TopicPortfolioEntry,
): Promise<AcquisitionTaskSource> {
  if (topic.id === "openclaw") {
    return loadExampleSource(topic);
  }

  return loadBootstrapTopicSource(topic);
}

function buildTopicSummary(
  source: AcquisitionTaskSource,
  tasks: AcquisitionTaskItem[],
): AcquisitionTaskTopicSummary {
  const sorted = sortTasks(tasks);
  const unresolved = sortTasks(tasks.filter((task) => task.status !== "integrated"));
  const integrated = [...tasks]
    .filter((task) => task.status === "integrated")
    .sort(
      (left, right) =>
        new Date(right.integratedAt ?? 0).getTime() - new Date(left.integratedAt ?? 0).getTime(),
    );

  return acquisitionTaskTopicSummarySchema.parse({
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    summary: source.summary,
    taskCount: sorted.length,
    queuedCount: sorted.filter((task) => task.status === "queued").length,
    activeCount: sorted.filter((task) => task.status === "active").length,
    capturedCount: sorted.filter((task) => task.status === "captured").length,
    integratedCount: sorted.filter((task) => task.status === "integrated").length,
    highPriorityCount: sorted.filter((task) => task.priority === "high" && task.status !== "integrated")
      .length,
    maturityBlockerCount: unresolved.filter((task) => task.blocksMaturityProgression).length,
    readyForSessionCount: unresolved.filter((task) => task.readyForSession).length,
    awaitingIngestionCount: unresolved.filter((task) => task.awaitingIngestion).length,
    nextTask: unresolved[0] ?? null,
    recentIntegrated: integrated[0] ?? null,
    tasks: sorted,
  });
}

function buildBuckets(tasks: AcquisitionTaskItem[]) {
  return [
    {
      id: "next-acquisition" as const,
      title: "Highest-leverage acquisition tasks",
      description:
        "The bounded collection passes most likely to move question advancement, synthesis readiness, or topic maturity next.",
      tasks: sortTasks(tasks.filter((task) => task.status !== "integrated")),
    },
    {
      id: "session-ready" as const,
      title: "Ready to become the next session",
      description:
        "Tasks that already have a session handoff, compact context guidance, and clear success criteria.",
      tasks: sortTasks(tasks.filter((task) => task.readyForSession && task.status !== "integrated")),
    },
    {
      id: "awaiting-ingestion" as const,
      title: "Awaiting ingestion and integration",
      description:
        "Tasks where evidence was captured, but the result still needs to be threaded back into the knowledge system.",
      tasks: sortTasks(tasks.filter((task) => task.awaitingIngestion)),
    },
    {
      id: "maturity-blockers" as const,
      title: "Acquisition tasks tied to maturity blockers",
      description:
        "Tasks that matter because they unblock a real maturity step, not because they add more motion for its own sake.",
      tasks: sortTasks(tasks.filter((task) => task.blocksMaturityProgression)),
    },
    {
      id: "recently-integrated" as const,
      title: "Recently integrated acquisitions",
      description:
        "Completed acquisition work that already changed what the topic can trust, publish, or keep stable.",
      tasks: [...tasks]
        .filter((task) => task.status === "integrated")
        .sort(
          (left, right) =>
            new Date(right.integratedAt ?? 0).getTime() - new Date(left.integratedAt ?? 0).getTime(),
        ),
    },
  ];
}

export async function getAcquisitionTaskOverview(params?: {
  focusTopicId?: string | null;
  focusTaskId?: string | null;
  focusTaskTitle?: string | null;
}): Promise<AcquisitionTaskOverview> {
  const portfolio = await getTopicPortfolioOverview();
  const selectedTopics =
    params?.focusTopicId && portfolio.topics.some((topic) => topic.id === params.focusTopicId)
      ? portfolio.topics.filter((topic) => topic.id === params.focusTopicId)
      : portfolio.topics;
  const sources = await Promise.all(selectedTopics.map(loadAcquisitionTaskSource));
  const topicSummaries = sources.map((source) =>
    buildTopicSummary(
      source,
      source.acquisitionTasks.map((task) => buildTaskItem(source, task)),
    ),
  );
  const allTasks = sortTasks(topicSummaries.flatMap((topic) => topic.tasks));
  const focusTask =
    (params?.focusTaskId ? allTasks.find((task) => task.id === params.focusTaskId) ?? null : null) ??
    (params?.focusTaskTitle
      ? allTasks.find((task) => normalizeTitle(task.title) === normalizeTitle(params.focusTaskTitle ?? "")) ??
        null
      : null) ??
    allTasks.find((task) => task.status === "active") ??
    allTasks.find((task) => task.status === "captured") ??
    allTasks.find((task) => task.readyForSession) ??
    allTasks.find((task) => task.status !== "integrated") ??
    [...allTasks]
      .filter((task) => task.status === "integrated")
      .sort(
        (left, right) =>
          new Date(right.integratedAt ?? 0).getTime() - new Date(left.integratedAt ?? 0).getTime(),
      )[0] ??
    allTasks[0] ??
    null;
  const focusedTopic =
    params?.focusTopicId && selectedTopics.length === 1
      ? { id: selectedTopics[0].id, title: selectedTopics[0].title }
      : null;

  return acquisitionTaskOverviewSchema.parse({
    generatedAt: new Date().toISOString(),
    focusedTopic,
    focusedTask: focusTask
      ? {
          topicId: focusTask.topicId,
          taskId: focusTask.id,
          title: focusTask.title,
        }
      : null,
    summary: {
      totalTasks: allTasks.length,
      queued: allTasks.filter((task) => task.status === "queued").length,
      active: allTasks.filter((task) => task.status === "active").length,
      captured: allTasks.filter((task) => task.status === "captured").length,
      integrated: allTasks.filter((task) => task.status === "integrated").length,
      highPriority: allTasks.filter((task) => task.priority === "high" && task.status !== "integrated")
        .length,
      readyForSession: allTasks.filter((task) => task.readyForSession).length,
      awaitingIngestion: allTasks.filter((task) => task.awaitingIngestion).length,
      maturityBlockers: allTasks.filter((task) => task.blocksMaturityProgression).length,
    },
    focusTask,
    buckets: buildBuckets(allTasks),
    topics: topicSummaries.sort((left, right) => {
      const blockerDifference = right.maturityBlockerCount - left.maturityBlockerCount;

      if (blockerDifference !== 0) {
        return blockerDifference;
      }

      const priorityDifference = right.highPriorityCount - left.highPriorityCount;

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      const unresolvedDifference =
        (right.queuedCount + right.activeCount + right.capturedCount) -
        (left.queuedCount + left.activeCount + left.capturedCount);

      if (unresolvedDifference !== 0) {
        return unresolvedDifference;
      }

      return left.topicTitle.localeCompare(right.topicTitle);
    }),
  });
}

export async function getTopicAcquisitionTaskSummary(
  topicId: string,
): Promise<AcquisitionTaskTopicSummary | null> {
  const overview = await getAcquisitionTaskOverview({ focusTopicId: topicId });
  return overview.topics[0] ?? null;
}
