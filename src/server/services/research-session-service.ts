import fs from "node:fs/promises";
import path from "node:path";

import {
  researchSessionOverviewSchema,
  researchSessionTopicSummarySchema,
  type ResearchSessionItem,
  type ResearchSessionOverview,
  type ResearchSessionSeed,
  type ResearchSessionTopicSummary,
} from "@/lib/contracts/research-session";
import type { ResearchQuestionSeed } from "@/lib/contracts/research-question";
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

type ResearchSessionSource = {
  topic: TopicPortfolioEntry;
  questions: ResearchQuestionSeed[];
  sessions: ResearchSessionSeed[];
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

function priorityWeight(priority: ResearchSessionItem["priority"]) {
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

function sessionStatusWeight(status: ResearchSessionItem["status"]) {
  switch (status) {
    case "active":
      return 0;
    case "queued":
      return 1;
    case "completed":
    default:
      return 2;
  }
}

function sortSessions(sessions: ResearchSessionItem[]) {
  return [...sessions].sort((left, right) => {
    const statusDifference = sessionStatusWeight(left.status) - sessionStatusWeight(right.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const priorityDifference = priorityWeight(left.priority) - priorityWeight(right.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return new Date(right.sessionDate).getTime() - new Date(left.sessionDate).getTime();
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

function findPagePath(source: ResearchSessionSource, title: string | null) {
  if (!title) {
    return null;
  }

  return source.pagePathByTitle.get(normalizeTitle(title)) ?? null;
}

function findQuestion(source: ResearchSessionSource, questionId: string) {
  return source.questions.find((question) => question.id === questionId) ?? null;
}

function buildCanonicalTargetTitle(
  source: ResearchSessionSource,
  session: ResearchSessionSeed,
) {
  const question = findQuestion(source, session.questionId);
  const synthesizedTargetTitle =
    session.synthesisTitle && findPagePath(source, session.synthesisTitle)
      ? session.synthesisTitle
      : null;

  return (
    session.canonicalUpdateTitle ??
    session.archiveTitle ??
    synthesizedTargetTitle ??
    question?.canonicalTargetTitle ??
    question?.relatedPages[0] ??
    session.relevantPages[0] ??
    null
  );
}

function buildSessionItem(
  source: ResearchSessionSource,
  session: ResearchSessionSeed,
): ResearchSessionItem {
  const question = findQuestion(source, session.questionId);
  const openQuestionsPath = findPagePath(source, source.openQuestionsTitle);
  const maintenancePath = findPagePath(source, source.maintenanceTitle);
  const canonicalTargetTitle = buildCanonicalTargetTitle(source, session);
  const canonicalTargetPath = findPagePath(source, canonicalTargetTitle);
  const topicHome = source.topic.links.home.href;

  return {
    id: session.id,
    questionId: session.questionId,
    question: question?.question ?? session.questionId,
    questionStatus: question?.status ?? "open",
    title: session.title,
    goal: session.goal,
    summary: session.summary,
    status: session.status,
    priority: session.priority,
    sessionDate: session.sessionDate,
    outcome: session.outcome,
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    loadedContextPackTitles: unique(session.loadedContextPackTitles),
    supportingContextPackTitles: unique(session.supportingContextPackTitles),
    relevantPages: unique(session.relevantPages),
    relevantSources: unique(session.relevantSources),
    draftConclusion: session.draftConclusion,
    evidenceGained: unique(session.evidenceGained),
    remainingUncertainty: unique(session.remainingUncertainty),
    recommendedNextStep: session.recommendedNextStep,
    synthesisTitle: session.synthesisTitle,
    archiveTitle: session.archiveTitle,
    canonicalUpdateTitle: session.canonicalUpdateTitle,
    maintenanceUpdateTitles: unique(session.maintenanceUpdateTitles),
    questionStatusChange: session.questionStatusChange,
    resumeNotes: unique(session.resumeNotes),
    changedQuestionState: Boolean(session.questionStatusChange),
    producedDurableUpdate: Boolean(
      session.archiveTitle ||
        session.canonicalUpdateTitle ||
        session.outcome === "updated-canonical" ||
        session.outcome === "synthesized" ||
        session.outcome === "archived-answer",
    ),
    readyForSynthesis: Boolean(
      session.synthesisTitle &&
        (session.status === "active" ||
          session.status === "queued" ||
          question?.status === "ready-for-synthesis"),
    ),
    links: {
      session: {
        label: session.status === "active" ? "Continue session" : "Open session",
        href: `/sessions?topic=${source.topic.id}&question=${session.questionId}`,
      },
      questionQueue: {
        label: "Open question queue",
        href: `/questions?topic=${source.topic.id}`,
      },
      questionNote: {
        label: "Open question note",
        href: openQuestionsPath
          ? `${topicHome}?pagePath=${encodeURIComponent(openQuestionsPath)}`
          : topicHome,
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
      canonicalTarget: {
        label: canonicalTargetPath ? "Open target context" : "Open topic grounding",
        href: canonicalTargetPath
          ? `${topicHome}?pagePath=${encodeURIComponent(canonicalTargetPath)}`
          : source.topic.links.canonical.href,
      },
    },
  };
}

async function loadExampleSource(topic: TopicPortfolioEntry): Promise<ResearchSessionSource> {
  const manifest = openClawExampleManifestSchema.parse(
    await readJson<OpenClawExampleManifest>(path.join(OPENCLAW_EXAMPLE_ROOT, "manifest.json")),
  );

  return {
    topic,
    questions: openClawKnowledgeMethodData.researchQuestions,
    sessions: openClawKnowledgeMethodData.researchSessions,
    openQuestionsTitle: openClawKnowledgeMethodData.openQuestionsTitle,
    maintenanceTitle: openClawKnowledgeMethodData.maintenanceRhythmTitle,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "OpenClaw sessions show how grounded answers, maintenance syntheses, and next-step sessions turn question state into durable operational knowledge.",
  };
}

async function loadBootstrapTopicSource(topic: TopicPortfolioEntry): Promise<ResearchSessionSource> {
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
    openQuestionsTitle: config.surfaces.openQuestions.title,
    maintenanceTitle: config.surfaces.maintenanceRhythm.title,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "Starter-topic sessions should record what advanced, what stalled, and which synthesis or watch surface deserves the next focused pass.",
  };
}

async function loadResearchSessionSource(topic: TopicPortfolioEntry): Promise<ResearchSessionSource> {
  if (topic.id === "openclaw") {
    return loadExampleSource(topic);
  }

  return loadBootstrapTopicSource(topic);
}

function buildTopicSummary(
  source: ResearchSessionSource,
  sessions: ResearchSessionItem[],
): ResearchSessionTopicSummary {
  const sorted = sortSessions(sessions);

  return researchSessionTopicSummarySchema.parse({
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    summary: source.summary,
    sessionCount: sorted.length,
    queuedCount: sorted.filter((session) => session.status === "queued").length,
    activeCount: sorted.filter((session) => session.status === "active").length,
    completedCount: sorted.filter((session) => session.status === "completed").length,
    changedQuestionStateCount: sorted.filter((session) => session.changedQuestionState).length,
    nextSession:
      sorted.find((session) => session.status === "active") ??
      sorted.find((session) => session.status === "queued") ??
      null,
    recentSession:
      sortSessions(sorted.filter((session) => session.status === "completed"))[0] ?? null,
    sessions: sorted,
  });
}

function buildBuckets(sessions: ResearchSessionItem[]) {
  return [
    {
      id: "queue" as const,
      title: "Run next",
      description:
        "Queued and active sessions that should shape the next bounded research pass.",
      sessions: sortSessions(
        sessions.filter((session) => session.status === "active" || session.status === "queued"),
      ),
    },
    {
      id: "ready-for-synthesis" as const,
      title: "Closest to synthesis",
      description:
        "Sessions that already have enough context and target shape to plausibly become a synthesis on the next pass.",
      sessions: sortSessions(sessions.filter((session) => session.readyForSynthesis)),
    },
    {
      id: "recent-outcomes" as const,
      title: "Recent outcomes",
      description:
        "Completed sessions that changed question state, produced durable updates, or recorded the latest research outcome clearly enough to resume later.",
      sessions: sortSessions(
        sessions.filter(
          (session) =>
            session.status === "completed" &&
            (session.changedQuestionState || session.producedDurableUpdate || Boolean(session.outcome)),
        ),
      ),
    },
  ];
}

export async function getResearchSessionOverview(params?: {
  focusTopicId?: string | null;
  focusQuestionId?: string | null;
}): Promise<ResearchSessionOverview> {
  const portfolio = await getTopicPortfolioOverview();
  const selectedTopics =
    params?.focusTopicId && portfolio.topics.some((topic) => topic.id === params.focusTopicId)
      ? portfolio.topics.filter((topic) => topic.id === params.focusTopicId)
      : portfolio.topics;
  const sources = await Promise.all(selectedTopics.map(loadResearchSessionSource));
  const topicSummaries = sources.map((source) =>
    buildTopicSummary(source, source.sessions.map((session) => buildSessionItem(source, session))),
  );
  const allSessions = sortSessions(topicSummaries.flatMap((topic) => topic.sessions));
  const focusedTopic =
    params?.focusTopicId && selectedTopics.length === 1
      ? { id: selectedTopics[0].id, title: selectedTopics[0].title }
      : null;
  const focusedQuestion =
    params?.focusQuestionId
      ? (() => {
          for (const source of sources) {
            const question = source.questions.find((item) => item.id === params.focusQuestionId);

            if (question) {
              return {
                topicId: source.topic.id,
                questionId: question.id,
                question: question.question,
              };
            }
          }

          return null;
        })()
      : null;
  const focusSession = params?.focusQuestionId
    ? allSessions.find((session) => session.questionId === params.focusQuestionId) ?? null
    : allSessions.find((session) => session.status === "active") ??
      allSessions.find((session) => session.status === "queued") ??
      null;

  return researchSessionOverviewSchema.parse({
    generatedAt: new Date().toISOString(),
    focusedTopic,
    focusedQuestion,
    summary: {
      totalSessions: allSessions.length,
      queued: allSessions.filter((session) => session.status === "queued").length,
      active: allSessions.filter((session) => session.status === "active").length,
      completed: allSessions.filter((session) => session.status === "completed").length,
      changedQuestionState: allSessions.filter((session) => session.changedQuestionState).length,
      producedDurableUpdate: allSessions.filter((session) => session.producedDurableUpdate).length,
      readyForSynthesis: allSessions.filter((session) => session.readyForSynthesis).length,
    },
    focusSession,
    buckets: buildBuckets(allSessions),
    topics: topicSummaries.sort((left, right) => {
      const activeDifference = right.activeCount - left.activeCount;

      if (activeDifference !== 0) {
        return activeDifference;
      }

      const queuedDifference = right.queuedCount - left.queuedCount;

      if (queuedDifference !== 0) {
        return queuedDifference;
      }

      return left.topicTitle.localeCompare(right.topicTitle);
    }),
  });
}

export async function getTopicResearchSessionSummary(
  topicId: string,
): Promise<ResearchSessionTopicSummary | null> {
  const overview = await getResearchSessionOverview({ focusTopicId: topicId });
  return overview.topics[0] ?? null;
}
