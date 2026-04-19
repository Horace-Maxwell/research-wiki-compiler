import fs from "node:fs/promises";
import path from "node:path";

import {
  researchSynthesisOverviewSchema,
  researchSynthesisTopicSummarySchema,
  type ResearchSynthesisItem,
  type ResearchSynthesisOverview,
  type ResearchSynthesisSeed,
  type ResearchSynthesisTopicSummary,
} from "@/lib/contracts/research-synthesis";
import type { ResearchQuestionSeed } from "@/lib/contracts/research-question";
import type { ResearchSessionSeed } from "@/lib/contracts/research-session";
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
import { buildTopicPageHref } from "@/server/lib/page-route-hrefs";
import { OPENCLAW_EXAMPLE_ROOT, TOPICS_ROOT } from "@/server/lib/repo-paths";
import { openClawKnowledgeMethodData } from "@/server/services/openclaw-knowledge-method";
import { getTopicPortfolioOverview } from "@/server/services/topic-portfolio-service";

type TopicPortfolioEntry = Awaited<
  ReturnType<typeof getTopicPortfolioOverview>
>["topics"][number];

type ResearchSynthesisSource = {
  topic: TopicPortfolioEntry;
  questions: ResearchQuestionSeed[];
  sessions: ResearchSessionSeed[];
  syntheses: ResearchSynthesisSeed[];
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

function synthesisStatusWeight(status: ResearchSynthesisItem["status"]) {
  switch (status) {
    case "ready":
      return 0;
    case "in-progress":
      return 1;
    case "candidate":
      return 2;
    case "stale":
      return 3;
    case "published":
    default:
      return 4;
  }
}

function sortSyntheses(syntheses: ResearchSynthesisItem[]) {
  return [...syntheses].sort((left, right) => {
    const statusDifference =
      synthesisStatusWeight(left.status) - synthesisStatusWeight(right.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    if (left.confidencePercent !== right.confidencePercent) {
      return right.confidencePercent - left.confidencePercent;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
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

function findPagePath(source: ResearchSynthesisSource, title: string | null) {
  if (!title) {
    return null;
  }

  return source.pagePathByTitle.get(normalizeTitle(title)) ?? null;
}

function findQuestion(source: ResearchSynthesisSource, questionId: string) {
  return source.questions.find((question) => question.id === questionId) ?? null;
}

function findSession(source: ResearchSynthesisSource, sessionId: string) {
  return source.sessions.find((session) => session.id === sessionId) ?? null;
}

function buildCanonicalTargetTitle(
  source: ResearchSynthesisSource,
  synthesis: ResearchSynthesisSeed,
) {
  const sourceQuestionPages = synthesis.sourceQuestionIds.flatMap((questionId) => {
    const question = findQuestion(source, questionId);

    return question
      ? [question.canonicalTargetTitle, ...question.relatedPages]
      : [];
  });
  const candidates = unique(
    [
      synthesis.publishedPageTitle,
      ...synthesis.canonicalUpdateTitles,
      ...sourceQuestionPages,
      ...synthesis.tensionUpdateTitles,
      ...synthesis.maintenanceUpdateTitles,
      ...synthesis.watchpointUpdateTitles,
      ...synthesis.archiveTitles,
    ].filter((value): value is string => Boolean(value)),
  );

  return candidates.find((title) => Boolean(findPagePath(source, title))) ?? candidates[0] ?? null;
}

function buildSynthesisItem(
  source: ResearchSynthesisSource,
  synthesis: ResearchSynthesisSeed,
): ResearchSynthesisItem {
  const maintenancePath = findPagePath(source, source.maintenanceTitle);
  const publishedPagePath = findPagePath(source, synthesis.publishedPageTitle);
  const canonicalTargetTitle = buildCanonicalTargetTitle(source, synthesis);
  const canonicalTargetPath = findPagePath(source, canonicalTargetTitle);
  const topicHome = source.topic.links.home.href;

  return {
    id: synthesis.id,
    title: synthesis.title,
    summary: synthesis.summary,
    goal: synthesis.goal,
    status: synthesis.status,
    confidencePercent: synthesis.confidencePercent,
    updatedAt: synthesis.updatedAt,
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    sourceQuestionIds: unique(synthesis.sourceQuestionIds),
    sourceQuestions: unique(
      synthesis.sourceQuestionIds.map(
        (questionId) => findQuestion(source, questionId)?.question ?? questionId,
      ),
    ),
    sourceSessionIds: unique(synthesis.sourceSessionIds),
    sourceSessions: unique(
      synthesis.sourceSessionIds.map(
        (sessionId) => findSession(source, sessionId)?.title ?? sessionId,
      ),
    ),
    evidenceSummary: unique(synthesis.evidenceSummary),
    durableConclusion: synthesis.durableConclusion,
    provisionalBoundary: synthesis.provisionalBoundary,
    publishedPageTitle: synthesis.publishedPageTitle,
    canonicalUpdateTitles: unique(synthesis.canonicalUpdateTitles),
    maintenanceUpdateTitles: unique(synthesis.maintenanceUpdateTitles),
    watchpointUpdateTitles: unique(synthesis.watchpointUpdateTitles),
    tensionUpdateTitles: unique(synthesis.tensionUpdateTitles),
    archiveTitles: unique(synthesis.archiveTitles),
    questionImpacts: synthesis.questionImpacts,
    decisions: synthesis.decisions,
    changedCanonicalSummary: synthesis.changedCanonicalSummary,
    recommendedNextStep: synthesis.recommendedNextStep,
    revisitTriggers: unique(synthesis.revisitTriggers),
    readyForPublication: synthesis.status === "ready" && !publishedPagePath,
    hasPublishedPage: Boolean(publishedPagePath),
    changesCanonical:
      synthesis.canonicalUpdateTitles.length > 0 || Boolean(synthesis.changedCanonicalSummary),
    introducesWatchpoints:
      synthesis.watchpointUpdateTitles.length > 0 ||
      synthesis.decisions.some((decision) => decision.type === "watch"),
    links: {
      synthesis: {
        label: "Open synthesis lane",
        href: `/syntheses?topic=${source.topic.id}&synthesis=${synthesis.id}`,
      },
      topicHome: {
        label: "Open topic home",
        href: topicHome,
      },
      maintenance: {
        label: "Open maintenance rhythm",
        href: maintenancePath
          ? buildTopicPageHref(source.topic.id, maintenancePath)
          : source.topic.links.maintenance.href,
      },
      publishedPage: {
        label: publishedPagePath ? "Open published synthesis" : "Open synthesis lane",
        href: publishedPagePath
          ? buildTopicPageHref(source.topic.id, publishedPagePath)
          : `/syntheses?topic=${source.topic.id}&synthesis=${synthesis.id}`,
      },
      canonicalTarget: {
        label: canonicalTargetPath ? "Open canonical target" : "Open canonical grounding",
        href: canonicalTargetPath
          ? buildTopicPageHref(source.topic.id, canonicalTargetPath)
          : source.topic.links.canonical.href,
      },
      questionQueue: {
        label: "Open question queue",
        href: `/questions?topic=${source.topic.id}`,
      },
      sessionWorkspace: {
        label: "Open source sessions",
        href: synthesis.sourceQuestionIds[0]
          ? `/sessions?topic=${source.topic.id}&question=${synthesis.sourceQuestionIds[0]}`
          : `/sessions?topic=${source.topic.id}`,
      },
    },
  };
}

async function loadExampleSource(topic: TopicPortfolioEntry): Promise<ResearchSynthesisSource> {
  const manifest = openClawExampleManifestSchema.parse(
    await readJson<OpenClawExampleManifest>(path.join(OPENCLAW_EXAMPLE_ROOT, "manifest.json")),
  );

  return {
    topic,
    questions: openClawKnowledgeMethodData.researchQuestions,
    sessions: openClawKnowledgeMethodData.researchSessions,
    syntheses: openClawKnowledgeMethodData.researchSyntheses,
    openQuestionsTitle: openClawKnowledgeMethodData.openQuestionsTitle,
    maintenanceTitle: openClawKnowledgeMethodData.maintenanceRhythmTitle,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "OpenClaw syntheses close the loop between question lanes, research sessions, and durable operator-facing guidance.",
  };
}

async function loadBootstrapTopicSource(
  topic: TopicPortfolioEntry,
): Promise<ResearchSynthesisSource> {
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
    openQuestionsTitle: config.surfaces.openQuestions.title,
    maintenanceTitle: config.surfaces.maintenanceRhythm.title,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "Starter-topic syntheses show which threads are still provisional, which are ready to publish next, and which updates would harden the workspace honestly.",
  };
}

async function loadResearchSynthesisSource(
  topic: TopicPortfolioEntry,
): Promise<ResearchSynthesisSource> {
  if (topic.id === "openclaw") {
    return loadExampleSource(topic);
  }

  return loadBootstrapTopicSource(topic);
}

function buildTopicSummary(
  source: ResearchSynthesisSource,
  syntheses: ResearchSynthesisItem[],
): ResearchSynthesisTopicSummary {
  const sorted = sortSyntheses(syntheses);
  const actionable = sorted.filter((synthesis) => synthesis.status !== "published");
  const recentPublished =
    [...sorted]
      .filter((synthesis) => synthesis.status === "published")
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] ??
    null;

  return researchSynthesisTopicSummarySchema.parse({
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    summary: source.summary,
    synthesisCount: sorted.length,
    candidateCount: sorted.filter((synthesis) => synthesis.status === "candidate").length,
    inProgressCount: sorted.filter((synthesis) => synthesis.status === "in-progress").length,
    readyCount: sorted.filter((synthesis) => synthesis.status === "ready").length,
    publishedCount: sorted.filter((synthesis) => synthesis.status === "published").length,
    staleCount: sorted.filter((synthesis) => synthesis.status === "stale").length,
    changedCanonicalCount: sorted.filter((synthesis) => synthesis.changesCanonical).length,
    nextSynthesis: actionable[0] ?? null,
    recentPublished,
    syntheses: sorted,
  });
}

function buildBuckets(syntheses: ResearchSynthesisItem[]) {
  return [
    {
      id: "ready" as const,
      title: "Ready to publish",
      description:
        "Syntheses with enough evidence and shape to become durable, decision-relevant knowledge on the next pass.",
      syntheses: sortSyntheses(syntheses.filter((synthesis) => synthesis.status === "ready")),
    },
    {
      id: "decision-loop" as const,
      title: "In the decision loop",
      description:
        "Candidate and in-progress syntheses that are actively turning session evidence into a publishable operating judgment.",
      syntheses: sortSyntheses(
        syntheses.filter(
          (synthesis) =>
            synthesis.status === "candidate" || synthesis.status === "in-progress",
        ),
      ),
    },
    {
      id: "recent-published" as const,
      title: "Recent durable syntheses",
      description:
        "Published syntheses that already changed canonical knowledge, maintenance posture, or watch logic.",
      syntheses: [...syntheses]
        .filter((synthesis) => synthesis.status === "published")
        .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()),
    },
    {
      id: "stale" as const,
      title: "Revisit before trusting",
      description:
        "Syntheses that still matter, but need another evidence pass before they should drive durable decisions confidently.",
      syntheses: sortSyntheses(syntheses.filter((synthesis) => synthesis.status === "stale")),
    },
  ];
}

export async function getResearchSynthesisOverview(params?: {
  focusTopicId?: string | null;
  focusSynthesisId?: string | null;
  focusSynthesisTitle?: string | null;
}): Promise<ResearchSynthesisOverview> {
  const portfolio = await getTopicPortfolioOverview();
  const selectedTopics =
    params?.focusTopicId && portfolio.topics.some((topic) => topic.id === params.focusTopicId)
      ? portfolio.topics.filter((topic) => topic.id === params.focusTopicId)
      : portfolio.topics;
  const sources = await Promise.all(selectedTopics.map(loadResearchSynthesisSource));
  const topicSummaries = sources.map((source) =>
    buildTopicSummary(
      source,
      source.syntheses.map((synthesis) => buildSynthesisItem(source, synthesis)),
    ),
  );
  const allSyntheses = sortSyntheses(topicSummaries.flatMap((topic) => topic.syntheses));
  const focusSynthesis =
    (params?.focusSynthesisId
      ? allSyntheses.find((synthesis) => synthesis.id === params.focusSynthesisId) ?? null
      : null) ??
    (params?.focusSynthesisTitle
      ? allSyntheses.find(
          (synthesis) =>
            normalizeTitle(synthesis.title) === normalizeTitle(params.focusSynthesisTitle ?? ""),
        ) ?? null
      : null) ??
    allSyntheses.find((synthesis) => synthesis.status === "ready") ??
    allSyntheses.find((synthesis) => synthesis.status === "in-progress") ??
    allSyntheses.find((synthesis) => synthesis.status === "candidate") ??
    [...allSyntheses]
      .filter((synthesis) => synthesis.status === "published")
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] ??
    allSyntheses[0] ??
    null;
  const focusedTopic =
    params?.focusTopicId && selectedTopics.length === 1
      ? { id: selectedTopics[0].id, title: selectedTopics[0].title }
      : null;

  return researchSynthesisOverviewSchema.parse({
    generatedAt: new Date().toISOString(),
    focusedTopic,
    focusedSynthesis: focusSynthesis
      ? {
          topicId: focusSynthesis.topicId,
          synthesisId: focusSynthesis.id,
          title: focusSynthesis.title,
        }
      : null,
    summary: {
      totalSyntheses: allSyntheses.length,
      candidate: allSyntheses.filter((synthesis) => synthesis.status === "candidate").length,
      inProgress: allSyntheses.filter((synthesis) => synthesis.status === "in-progress").length,
      ready: allSyntheses.filter((synthesis) => synthesis.status === "ready").length,
      published: allSyntheses.filter((synthesis) => synthesis.status === "published").length,
      stale: allSyntheses.filter((synthesis) => synthesis.status === "stale").length,
      changedCanonical: allSyntheses.filter((synthesis) => synthesis.changesCanonical).length,
      introducedWatchpoints: allSyntheses.filter((synthesis) => synthesis.introducesWatchpoints)
        .length,
    },
    focusSynthesis,
    buckets: buildBuckets(allSyntheses),
    topics: topicSummaries.sort((left, right) => {
      const readyDifference = right.readyCount - left.readyCount;

      if (readyDifference !== 0) {
        return readyDifference;
      }

      const inProgressDifference = right.inProgressCount - left.inProgressCount;

      if (inProgressDifference !== 0) {
        return inProgressDifference;
      }

      const canonicalDifference = right.changedCanonicalCount - left.changedCanonicalCount;

      if (canonicalDifference !== 0) {
        return canonicalDifference;
      }

      return left.topicTitle.localeCompare(right.topicTitle);
    }),
  });
}

export async function getTopicResearchSynthesisSummary(
  topicId: string,
): Promise<ResearchSynthesisTopicSummary | null> {
  const overview = await getResearchSynthesisOverview({ focusTopicId: topicId });
  return overview.topics[0] ?? null;
}
