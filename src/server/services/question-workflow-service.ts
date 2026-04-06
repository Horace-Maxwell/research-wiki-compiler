import fs from "node:fs/promises";
import path from "node:path";

import {
  questionWorkflowOverviewSchema,
  questionWorkflowTopicSummarySchema,
  type QuestionWorkflowItem,
  type QuestionWorkflowOverview,
  type QuestionWorkflowTopicSummary,
  type ResearchQuestionSeed,
  type ResearchQuestionStatus,
} from "@/lib/contracts/research-question";
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

type QuestionSource = {
  topic: TopicPortfolioEntry;
  questions: ResearchQuestionSeed[];
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

function statusWeight(status: ResearchQuestionStatus) {
  switch (status) {
    case "ready-for-synthesis":
      return 0;
    case "active":
      return 1;
    case "open":
      return 2;
    case "stale":
      return 3;
    case "waiting-for-sources":
      return 4;
    case "blocked":
      return 5;
    case "synthesized":
    default:
      return 6;
  }
}

function priorityWeight(priority: QuestionWorkflowItem["priority"]) {
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

function readinessForStatus(status: ResearchQuestionStatus) {
  switch (status) {
    case "ready-for-synthesis":
      return 90;
    case "active":
      return 72;
    case "open":
      return 58;
    case "stale":
      return 52;
    case "waiting-for-sources":
      return 34;
    case "blocked":
      return 20;
    case "synthesized":
    default:
      return 100;
  }
}

function computeReadiness(question: ResearchQuestionSeed) {
  let score = readinessForStatus(question.status);

  if (question.synthesizeInto) {
    score += 4;
  }

  if (question.sourceGaps.length > 0) {
    score -= 8;
  }

  if (question.evidenceToAdvance.length > 1) {
    score += 2;
  }

  return Math.max(0, Math.min(100, score));
}

function sortQuestions(questions: QuestionWorkflowItem[]) {
  return [...questions].sort((left, right) => {
    const statusDifference = statusWeight(left.status) - statusWeight(right.status);

    if (statusDifference !== 0) {
      return statusDifference;
    }

    const priorityDifference = priorityWeight(left.priority) - priorityWeight(right.priority);

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return right.readinessPercent - left.readinessPercent;
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

function findPagePath(source: QuestionSource, title: string | null) {
  if (!title) {
    return null;
  }

  return source.pagePathByTitle.get(normalizeTitle(title)) ?? null;
}

function buildQuestionItem(source: QuestionSource, question: ResearchQuestionSeed): QuestionWorkflowItem {
  const openQuestionsPath = findPagePath(source, source.openQuestionsTitle);
  const maintenancePath = findPagePath(source, source.maintenanceTitle);
  const canonicalTargetPath =
    findPagePath(source, question.canonicalTargetTitle) ??
    findPagePath(source, question.relatedPages[0] ?? null);
  const topicHome = source.topic.links.home.href;
  const openQuestionsHref = openQuestionsPath
    ? `${topicHome}?pagePath=${encodeURIComponent(openQuestionsPath)}`
    : topicHome;
  const maintenanceHref = maintenancePath
    ? `${topicHome}?pagePath=${encodeURIComponent(maintenancePath)}`
    : source.topic.links.maintenance.href;
  const canonicalTargetHref = canonicalTargetPath
    ? `${topicHome}?pagePath=${encodeURIComponent(canonicalTargetPath)}`
    : source.topic.links.canonical.href;
  const readinessPercent = computeReadiness(question);
  const needsSources =
    question.status === "waiting-for-sources" ||
    question.status === "blocked" ||
    question.sourceGaps.length > 0;
  const readyForSynthesis = question.status === "ready-for-synthesis";
  const watchForReopen =
    question.status === "stale" ||
    (question.status === "synthesized" && question.reopenTriggers.length > 0);

  return {
    id: question.id,
    question: question.question,
    summary: question.summary,
    status: question.status,
    priority: question.priority,
    whyNow: question.whyNow,
    readinessPercent,
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    contextPackTitle: question.contextPackTitle,
    supportingContextPackTitles: question.supportingContextPackTitles,
    relatedPages: unique(question.relatedPages),
    relatedTensions: unique(question.relatedTensions),
    relatedWatchpoints: unique(question.relatedWatchpoints),
    evidenceToAdvance: unique(question.evidenceToAdvance),
    sourceGaps: unique(question.sourceGaps),
    synthesizeInto: question.synthesizeInto,
    canonicalTargetTitle: question.canonicalTargetTitle,
    reopenTriggers: unique(question.reopenTriggers),
    provenanceNotes: unique(question.provenanceNotes),
    needsSources,
    readyForSynthesis,
    watchForReopen,
    links: {
      topicHome: {
        label: "Open topic home",
        href: topicHome,
      },
      openQuestions: {
        label: "Open question note",
        href: openQuestionsHref,
      },
      maintenance: {
        label: "Open maintenance rhythm",
        href: maintenanceHref,
      },
      canonicalTarget: {
        label: question.canonicalTargetTitle ? "Open grounded page" : "Open canonical start",
        href: canonicalTargetHref,
      },
    },
  };
}

function fallbackQuestionsFromTopicConfig(config: TopicBootstrapConfig): ResearchQuestionSeed[] {
  return config.openQuestions.map((question, index) => {
    const candidate = config.synthesisCandidates[index] ?? config.synthesisCandidates[0] ?? null;
    const pages = candidate?.load ?? [config.topic.title, config.surfaces.openQuestions.title];

    return {
      id: `derived-${index + 1}`,
      question,
      summary: "A derived question created from the starter topic config because no explicit question workflow seed exists yet.",
      status: candidate ? "active" : "open",
      priority: index === 0 ? "high" : "medium",
      whyNow: "This question is still one of the named unresolved drivers of the topic.",
      contextPackTitle: config.contextPacks[0]?.title ?? "Maintenance Triage",
      supportingContextPackTitles: config.contextPacks.slice(1, 2).map((pack) => pack.title),
      relatedPages: pages,
      relatedTensions: config.tensions.slice(0, 1),
      relatedWatchpoints: [config.surfaces.maintenanceWatchpoints.title],
      evidenceToAdvance: config.resolutionSignals.slice(0, 2),
      sourceGaps: [],
      synthesizeInto: candidate?.title ?? null,
      canonicalTargetTitle: null,
      reopenTriggers: config.surfaces.openQuestions.refreshTriggers,
      provenanceNotes: [
        "This derived question should be replaced by an explicit researchQuestions entry when the topic matures further.",
      ],
    };
  });
}

async function loadExampleSource(topic: TopicPortfolioEntry): Promise<QuestionSource> {
  const manifest = openClawExampleManifestSchema.parse(
    await readJson<OpenClawExampleManifest>(path.join(OPENCLAW_EXAMPLE_ROOT, "manifest.json")),
  );

  return {
    topic,
    questions: openClawKnowledgeMethodData.researchQuestions,
    openQuestionsTitle: openClawKnowledgeMethodData.openQuestionsTitle,
    maintenanceTitle: openClawKnowledgeMethodData.maintenanceRhythmTitle,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "OpenClaw questions bridge grounded archived answers, open synthesis candidates, and maintenance watchpoints.",
  };
}

async function loadBootstrapTopicSource(topic: TopicPortfolioEntry): Promise<QuestionSource> {
  const topicRoot = path.join(TOPICS_ROOT, topic.id);
  const config = topicBootstrapConfigSchema.parse(
    await readJson<TopicBootstrapConfig>(path.join(topicRoot, "topic.json")),
  );
  const manifest = topicBootstrapManifestSchema.parse(
    await readJson<TopicBootstrapManifest>(path.join(topicRoot, "manifest.json")),
  );

  return {
    topic,
    questions:
      config.researchQuestions.length > 0
        ? config.researchQuestions
        : fallbackQuestionsFromTopicConfig(config),
    openQuestionsTitle: config.surfaces.openQuestions.title,
    maintenanceTitle: config.surfaces.maintenanceRhythm.title,
    pagePathByTitle: buildPagePathMap(manifest.pages),
    summary:
      "Starter-topic questions should turn the bootstrap into a real research queue instead of a static set of notes.",
  };
}

async function loadQuestionSource(topic: TopicPortfolioEntry): Promise<QuestionSource> {
  if (topic.id === "openclaw") {
    return loadExampleSource(topic);
  }

  return loadBootstrapTopicSource(topic);
}

function buildTopicSummary(source: QuestionSource, questions: QuestionWorkflowItem[]) {
  const sorted = sortQuestions(questions);

  return questionWorkflowTopicSummarySchema.parse({
    topicId: source.topic.id,
    topicTitle: source.topic.title,
    topicKind: source.topic.kind,
    topicMaturityStage: source.topic.maturityStage,
    summary: source.summary,
    questionCount: questions.length,
    readyForSynthesisCount: questions.filter((question) => question.readyForSynthesis).length,
    needsSourcesCount: questions.filter((question) => question.needsSources).length,
    watchForReopenCount: questions.filter((question) => question.watchForReopen).length,
    topQuestion: sorted[0] ?? null,
    questions: sorted,
  });
}

function buildBuckets(questions: QuestionWorkflowItem[]) {
  return [
    {
      id: "work-next" as const,
      title: "Work next",
      description:
        "Questions that should actively drive the next reading, maintenance, or synthesis pass.",
      questions: sortQuestions(
        questions.filter(
          (question) =>
            question.status === "active" ||
            question.status === "open" ||
            question.status === "stale",
        ),
      ),
    },
    {
      id: "ready-for-synthesis" as const,
      title: "Closest to synthesis",
      description:
        "Questions that look answerable enough to promote into a synthesis page or durable canonical update.",
      questions: sortQuestions(questions.filter((question) => question.readyForSynthesis)),
    },
    {
      id: "needs-sources" as const,
      title: "Need more sources",
      description:
        "Questions that still need more evidence before they should be promoted into durable knowledge.",
      questions: sortQuestions(questions.filter((question) => question.needsSources)),
    },
    {
      id: "watch-for-reopen" as const,
      title: "Watch for reopen",
      description:
        "Questions that are already grounded or recently synthesized, but should reopen if the topic changes in specific ways.",
      questions: sortQuestions(questions.filter((question) => question.watchForReopen)),
    },
  ];
}

export async function getQuestionWorkflowOverview(
  focusTopicId?: string | null,
): Promise<QuestionWorkflowOverview> {
  const portfolio = await getTopicPortfolioOverview();
  const selectedTopics =
    focusTopicId && portfolio.topics.some((topic) => topic.id === focusTopicId)
      ? portfolio.topics.filter((topic) => topic.id === focusTopicId)
      : portfolio.topics;
  const sources = await Promise.all(selectedTopics.map(loadQuestionSource));
  const topicSummaries = sources.map((source) =>
    buildTopicSummary(source, source.questions.map((question) => buildQuestionItem(source, question))),
  );
  const allQuestions = sortQuestions(topicSummaries.flatMap((topic) => topic.questions));
  const focusQueue = allQuestions
    .filter((question) => question.status !== "synthesized")
    .slice(0, 8);
  const focusedTopic =
    focusTopicId && selectedTopics.length === 1
      ? { id: selectedTopics[0].id, title: selectedTopics[0].title }
      : null;

  return questionWorkflowOverviewSchema.parse({
    generatedAt: new Date().toISOString(),
    focusedTopic,
    summary: {
      totalQuestions: allQuestions.length,
      workQueue: allQuestions.filter(
        (question) =>
          question.status === "active" ||
          question.status === "open" ||
          question.status === "stale",
      ).length,
      readyForSynthesis: allQuestions.filter((question) => question.readyForSynthesis).length,
      needsSources: allQuestions.filter((question) => question.needsSources).length,
      watchForReopen: allQuestions.filter((question) => question.watchForReopen).length,
      synthesized: allQuestions.filter((question) => question.status === "synthesized").length,
    },
    focusQueue,
    buckets: buildBuckets(allQuestions),
    topics: topicSummaries.sort((left, right) => {
      const readyDifference = right.readyForSynthesisCount - left.readyForSynthesisCount;

      if (readyDifference !== 0) {
        return readyDifference;
      }

      return left.topicTitle.localeCompare(right.topicTitle);
    }),
  });
}

export async function getTopicQuestionWorkflow(
  topicId: string,
): Promise<QuestionWorkflowTopicSummary | null> {
  const overview = await getQuestionWorkflowOverview(topicId);
  return overview.topics[0] ?? null;
}
