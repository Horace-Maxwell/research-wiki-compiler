import fs from "node:fs/promises";
import path from "node:path";

import {
  openClawExampleManifestSchema,
  type OpenClawExampleManifest,
} from "@/lib/contracts/openclaw-example";
import {
  topicPortfolioOverviewSchema,
  type TopicPortfolioActionItem,
  type TopicPortfolioComparison,
  type TopicPortfolioItem,
  type TopicPortfolioOverview,
  type TopicPortfolioStageBucket,
} from "@/lib/contracts/topic-portfolio";
import {
  topicBootstrapManifestSchema,
  type TopicBootstrapManifest,
} from "@/lib/contracts/topic-bootstrap";
import {
  TOPIC_MATURITY_STAGES,
  type TopicEvaluationReport,
} from "@/lib/contracts/topic-evaluation";
import { topicEvaluationReportSchema } from "@/lib/contracts/topic-evaluation";
import { EXAMPLES_ROOT, REPO_ROOT, TOPICS_ROOT } from "@/server/lib/repo-paths";
import { evaluateTopicQuality } from "@/server/services/topic-evaluation-service";

type ManifestLikePage = {
  title: string;
  path: string;
};

type TopicPortfolioSource = {
  id: string;
  kind: "topic" | "example";
  title: string;
  description: string;
  rootPath: string;
  canonicalRoot: string;
  obsidianRoot: string;
  evaluationRoot: string;
  corpusFileCount: number;
  pageCount: number;
  contextPackCount: number;
  auditCount: number;
  pages: ManifestLikePage[];
  evaluation: TopicEvaluationReport;
};

const STAGE_BUCKET_COPY: Record<
  (typeof TOPIC_MATURITY_STAGES)[number],
  { title: string; description: string }
> = {
  flagship: {
    title: "Flagship topics",
    description: "Showcase-grade knowledge environments with strong workflow evidence and clear product entry points.",
  },
  mature: {
    title: "Mature topics",
    description: "Strong knowledge environments that are operationally coherent and nearly showcase-ready.",
  },
  maintained: {
    title: "Maintained topics",
    description: "Topics with a visible maintenance loop, reusable context packs, and enough evidence to resume work confidently.",
  },
  developing: {
    title: "Developing topics",
    description: "Topics that have moved beyond starter shape and are beginning to accumulate real workflow depth.",
  },
  starter: {
    title: "Starter topics",
    description: "Good bounded starts that still need real summarize, review, archive, or audit evidence before they should be treated as mature.",
  },
};

function priorityWeight(priority: TopicPortfolioActionItem["priority"]) {
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

async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(targetPath: string) {
  return JSON.parse(await fs.readFile(targetPath, "utf8")) as T;
}

async function readEvaluationReport(params: {
  kind: "topic" | "example";
  id: string;
  evaluationPath: string;
}) {
  if (await pathExists(params.evaluationPath)) {
    const raw = await readJson<TopicEvaluationReport>(params.evaluationPath);
    const parsed = topicEvaluationReportSchema.safeParse(raw);

    if (parsed.success) {
      return parsed.data;
    }
  }

  return params.kind === "example"
    ? evaluateTopicQuality({ example: "openclaw", writeReport: true })
    : evaluateTopicQuality({ slug: params.id, writeReport: true });
}

function findPagePath(pages: ManifestLikePage[], matcher: (title: string) => boolean) {
  return pages.find((page) => matcher(page.title))?.path ?? "wiki/index.md";
}

function relativeRepoPath(targetPath: string) {
  return path.relative(REPO_ROOT, targetPath).split(path.sep).join("/");
}

function buildPortfolioLinks(source: TopicPortfolioSource) {
  const homeHref = `/topics/${source.id}`;
  const canonicalPath = findPagePath(
    source.pages,
    (title) => title.toLowerCase().includes("index"),
  );
  const maintenancePath = findPagePath(
    source.pages,
    (title) => title.toLowerCase().includes("maintenance rhythm"),
  );

  return {
    home: {
      label: "Open topic home",
      href: homeHref,
    },
    canonical: {
      label: "Open canonical start",
      href: `${homeHref}?pagePath=${encodeURIComponent(canonicalPath)}`,
    },
    maintenance: {
      label: "Open maintenance rhythm",
      href: `${homeHref}?pagePath=${encodeURIComponent(maintenancePath)}`,
    },
    evaluation: {
      label: "Open evaluation",
      href: `${homeHref}#evaluation`,
    },
  } as const;
}

function buildPortfolioItem(source: TopicPortfolioSource): TopicPortfolioItem {
  const links = buildPortfolioLinks(source);

  return {
    id: source.id,
    kind: source.kind,
    title: source.title,
    description: source.description,
    maturityStage: source.evaluation.maturity.stage,
    nextStage: source.evaluation.maturity.nextStage,
    overallScore: source.evaluation.overall.score,
    overallPercent: source.evaluation.overall.percent,
    summary: source.evaluation.maturity.summary,
    generatedAt: source.evaluation.generatedAt,
    corpusFileCount: source.corpusFileCount,
    pageCount: source.pageCount,
    contextPackCount: source.contextPackCount,
    auditCount: source.auditCount,
    strengths: source.evaluation.strengths.slice(0, 3),
    weakSurfaces: source.evaluation.weakSurfaces,
    missingSurfaces: source.evaluation.missingSurfaces,
    promotionReadinessPercent: source.evaluation.promotionReadiness.percent,
    promotionReadinessSummary: source.evaluation.promotionReadiness.summary,
    promotionBlockers: source.evaluation.promotionReadiness.blockers,
    nextActions: source.evaluation.nextActions,
    links,
    fileRoots: {
      canonical: relativeRepoPath(source.canonicalRoot),
      obsidian: relativeRepoPath(source.obsidianRoot),
      evaluation: relativeRepoPath(source.evaluationRoot),
    },
  };
}

async function loadOpenClawPortfolioSource(): Promise<TopicPortfolioSource> {
  const rootPath = path.join(EXAMPLES_ROOT, "openclaw-wiki");
  const manifest = openClawExampleManifestSchema.parse(
    await readJson<OpenClawExampleManifest>(path.join(rootPath, "manifest.json")),
  );
  const evaluation = await readEvaluationReport({
    kind: "example",
    id: "openclaw",
    evaluationPath: path.join(rootPath, "evaluation", "topic-evaluation.json"),
  });

  return {
    id: "openclaw",
    kind: "example",
    title: "OpenClaw",
    description:
      "The flagship official example that shows the full compile, review, ask, archive, audit, and maintenance loop.",
    rootPath,
    canonicalRoot: path.join(rootPath, "workspace", "wiki"),
    obsidianRoot: path.join(rootPath, "obsidian-vault"),
    evaluationRoot: path.join(rootPath, "evaluation"),
    corpusFileCount: manifest.corpusFiles.length,
    pageCount: manifest.pages.length,
    contextPackCount: 4,
    auditCount: manifest.audits.length,
    pages: manifest.pages.map((page) => ({
      title: page.title,
      path: page.path,
    })),
    evaluation,
  };
}

async function loadBootstrapTopicPortfolioSources() {
  const entries = await fs.readdir(TOPICS_ROOT, { withFileTypes: true });
  const topics = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));

  return Promise.all(
    topics.map(async (slug) => {
      const rootPath = path.join(TOPICS_ROOT, slug);
      const manifest = topicBootstrapManifestSchema.parse(
        await readJson<TopicBootstrapManifest>(path.join(rootPath, "manifest.json")),
      );
      const evaluation = await readEvaluationReport({
        kind: "topic",
        id: slug,
        evaluationPath: path.join(rootPath, "evaluation", "topic-evaluation.json"),
      });

      return {
        id: slug,
        kind: "topic" as const,
        title: manifest.title,
        description: manifest.description,
        rootPath,
        canonicalRoot: path.join(rootPath, "workspace", "wiki"),
        obsidianRoot: path.join(rootPath, "obsidian-vault"),
        evaluationRoot: path.join(rootPath, "evaluation"),
        corpusFileCount: manifest.corpusFiles.length,
        pageCount: manifest.pages.length,
        contextPackCount: manifest.qualityBar.requiredContextPackTitles.length,
        auditCount: 0,
        pages: manifest.pages.map((page) => ({
          title: page.title,
          path: page.path,
        })),
        evaluation,
      } satisfies TopicPortfolioSource;
    }),
  );
}

function buildBuckets(topics: TopicPortfolioItem[]): TopicPortfolioStageBucket[] {
  return TOPIC_MATURITY_STAGES.map((stage) => {
    const bucketTopics = topics.filter((topic) => topic.maturityStage === stage);
    const copy = STAGE_BUCKET_COPY[stage];

    return {
      stage,
      title: copy.title,
      description: copy.description,
      topics: bucketTopics,
    };
  }).filter((bucket) => bucket.topics.length > 0);
}

function buildActionQueue(topics: TopicPortfolioItem[]): TopicPortfolioActionItem[] {
  return topics
    .flatMap((topic) =>
      topic.nextActions.slice(0, 2).map((action) => ({
        topicId: topic.id,
        topicTitle: topic.title,
        maturityStage: topic.maturityStage,
        priority: action.priority,
        title: action.title,
        summary: action.summary,
        whyNow: action.whyNow,
        href: topic.links.evaluation.href,
      })),
    )
    .sort((left, right) => {
      const priorityDifference = priorityWeight(left.priority) - priorityWeight(right.priority);

      if (priorityDifference !== 0) {
        return priorityDifference;
      }

      return left.topicTitle.localeCompare(right.topicTitle);
    })
    .slice(0, 8);
}

function buildComparisonSpotlight(
  topics: TopicPortfolioItem[],
  sources: TopicPortfolioSource[],
): TopicPortfolioComparison | null {
  if (topics.length < 2) {
    return null;
  }

  const sortedByStage = [...topics].sort((left, right) => {
    const stageDifference =
      TOPIC_MATURITY_STAGES.indexOf(right.maturityStage) -
      TOPIC_MATURITY_STAGES.indexOf(left.maturityStage);

    if (stageDifference !== 0) {
      return stageDifference;
    }

    return right.overallScore - left.overallScore;
  });
  const leader = sortedByStage[0];
  const challenger = sortedByStage.at(-1);

  if (!leader || !challenger || leader.id === challenger.id) {
    return null;
  }

  const leaderSource = sources.find((source) => source.id === leader.id);
  const challengerSource = sources.find((source) => source.id === challenger.id);
  const leaderWorkflow = leaderSource?.evaluation.dimensions.find(
    (dimension) => dimension.id === "workflow_provenance",
  );
  const challengerWorkflow = challengerSource?.evaluation.dimensions.find(
    (dimension) => dimension.id === "workflow_provenance",
  );
  const decisiveDifferences = unique([
    leaderWorkflow && challengerWorkflow
      ? `${leader.title} scores ${leaderWorkflow.score}/5 on workflow and provenance, while ${challenger.title} scores ${challengerWorkflow.score}/5.`
      : "",
    `${leader.title} is ${leader.maturityStage}; ${challenger.title} is ${challenger.maturityStage}.`,
    ...challenger.promotionBlockers.slice(0, 2).map(
      (criterion) => `${challenger.title} still lacks: ${criterion.label}.`,
    ),
  ]).filter(Boolean);

  return {
    leaderId: leader.id,
    challengerId: challenger.id,
    summary: `${leader.title} is ahead because it combines strong content surfaces with visible workflow evidence, while ${challenger.title} is still mostly a strong starter scaffold.`,
    decisiveDifferences,
  };
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function getTopicPortfolioOverview(): Promise<TopicPortfolioOverview> {
  const generatedAt = new Date().toISOString();
  const sources = [
    await loadOpenClawPortfolioSource(),
    ...(await loadBootstrapTopicPortfolioSources()),
  ];
  const topics = sources
    .map(buildPortfolioItem)
    .sort((left, right) => right.overallScore - left.overallScore);
  const actionQueue = buildActionQueue(topics);

  return topicPortfolioOverviewSchema.parse({
    generatedAt,
    summary: {
      totalTopics: topics.length,
      flagshipTopics: topics.filter((topic) => topic.maturityStage === "flagship").length,
      starterTopics: topics.filter((topic) => topic.maturityStage === "starter").length,
      needsWorkflowGrounding: topics.filter((topic) =>
        topic.nextActions.some((action) => action.category === "workflow"),
      ).length,
      actionItems: actionQueue.length,
    },
    buckets: buildBuckets(topics),
    topics,
    actionQueue,
    comparisonSpotlight: buildComparisonSpotlight(topics, sources),
  });
}

export async function getTopicPortfolioItem(id: string) {
  const portfolio = await getTopicPortfolioOverview();
  return portfolio.topics.find((topic) => topic.id === id) ?? null;
}
