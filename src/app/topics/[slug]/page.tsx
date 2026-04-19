import { notFound } from "next/navigation";

import { TopicWorkspaceIntro } from "@/features/topics/components/topic-workspace-intro";
import { getLocaleCopy, getTopicMaturityStageLabel } from "@/lib/app-locale";
import { readRequestLocale } from "@/lib/app-locale-server";
import { WikiBrowser } from "@/features/wiki/components/wiki-browser";
import type { WikiPageDetail, WikiPageSummary } from "@/lib/contracts/wiki";
import { getTopicAcquisitionTaskSummary } from "@/server/services/acquisition-task-service";
import { getTopicEvidenceChangeSummary } from "@/server/services/evidence-change-service";
import { getTopicEvidenceGapSummary } from "@/server/services/evidence-gap-service";
import { getTopicMonitoringSummary } from "@/server/services/monitoring-service";
import { getOpenClawExampleManifest, ensureOpenClawRenderedWorkspace } from "@/server/services/openclaw-example-service";
import { getTopicQuestionWorkflow } from "@/server/services/question-workflow-service";
import { getTopicResearchSessionSummary } from "@/server/services/research-session-service";
import { getTopicResearchSynthesisSummary } from "@/server/services/research-synthesis-service";
import { getTopicPortfolioOverview } from "@/server/services/topic-portfolio-service";
import { ensureRenderedTopicWorkspace } from "@/server/services/rendered-topic-service";
import { getWikiPageDetail, listWikiPages } from "@/server/services/wiki-page-service";

export const dynamic = "force-dynamic";

type TopicWorkspacePageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizePageTitle(value: string) {
  return value.trim().toLowerCase();
}

function findTopicHomePagePath(
  pages: WikiPageSummary[],
  topicTitle: string,
) {
  const normalizedTitle = normalizePageTitle(topicTitle);

  return (
    pages.find(
      (page) =>
        normalizePageTitle(page.title) === normalizedTitle &&
        (page.type === "topic" || page.type === "entity"),
    )?.path ??
    pages.find(
      (page) =>
        normalizePageTitle(page.canonicalTitle) === normalizedTitle &&
        (page.type === "topic" || page.type === "entity"),
    )?.path ??
    "wiki/index.md"
  );
}

async function resolveWorkspaceRoot(slug: string) {
  if (slug === "openclaw") {
    return ensureOpenClawRenderedWorkspace();
  }

  return ensureRenderedTopicWorkspace(slug);
}

export default async function TopicWorkspacePage({
  params,
  searchParams,
}: TopicWorkspacePageProps) {
  const locale = await readRequestLocale();
  const copy = getLocaleCopy(locale);
  const { slug } = await params;
  const portfolio = await getTopicPortfolioOverview();
  const topic = portfolio.topics.find((item) => item.id === slug) ?? null;

  if (!topic) {
    notFound();
  }

  const routeParams = searchParams ? await searchParams : {};
  const requestedPageId = readParam(routeParams.pageId);
  const workspaceRoot = await resolveWorkspaceRoot(slug);
  const [
    questionWorkflow,
    sessionSummary,
    synthesisSummary,
    evidenceChangeSummary,
    evidenceGapSummary,
    acquisitionSummary,
    monitoringSummary,
  ] = await Promise.all([
    getTopicQuestionWorkflow(slug),
    getTopicResearchSessionSummary(slug),
    getTopicResearchSynthesisSummary(slug),
    getTopicEvidenceChangeSummary(slug),
    getTopicEvidenceGapSummary(slug),
    getTopicAcquisitionTaskSummary(slug),
    getTopicMonitoringSummary(slug),
  ]);
  const initialPages: WikiPageSummary[] = await listWikiPages(workspaceRoot);
  const topicHomePagePath = findTopicHomePagePath(initialPages, topic.title);
  const initialPage =
    initialPages.find((page) => page.id === requestedPageId) ??
    initialPages.find((page) => page.path === topicHomePagePath) ??
    initialPages[0] ??
    null;
  const initialDetail: WikiPageDetail | null = initialPage
    ? await getWikiPageDetail(workspaceRoot, initialPage.id)
    : null;
  const manifest = slug === "openclaw" ? await getOpenClawExampleManifest() : null;

  return (
    <WikiBrowser
      allowCreate={false}
      allowEdit={false}
      allowRefreshLinks={false}
      defaultWorkspaceRoot={workspaceRoot}
      initialDetail={initialDetail}
      initialPages={initialPages}
      internalLinkBasePath={`/topics/${slug}`}
      preferredInitialPagePath={topicHomePagePath}
      showWorkspaceRootCard={false}
      topicHomePagePath={topicHomePagePath}
      workspaceRootMode="fixed"
      header={{
        eyebrow: copy.shell.headerTopic,
        title: topic.title,
        badge:
          slug === "openclaw"
            ? copy.topicHome.openClawBadge(manifest?.generatedMode ?? "reference")
            : getTopicMaturityStageLabel(locale, topic.maturityStage),
      }}
      intro={
        <TopicWorkspaceIntro
          acquisitionSummary={acquisitionSummary}
          evidenceChangeSummary={evidenceChangeSummary}
          evidenceGapSummary={evidenceGapSummary}
          locale={locale}
          monitoringSummary={monitoringSummary}
          questionWorkflow={questionWorkflow}
          sessionSummary={sessionSummary}
          synthesisSummary={synthesisSummary}
          topic={topic}
        />
      }
    />
  );
}
