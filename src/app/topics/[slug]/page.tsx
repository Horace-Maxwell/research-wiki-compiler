import { notFound } from "next/navigation";

import { TopicWorkspaceIntro } from "@/features/topics/components/topic-workspace-intro";
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
  const { slug } = await params;
  const portfolio = await getTopicPortfolioOverview();
  const topic = portfolio.topics.find((item) => item.id === slug) ?? null;

  if (!topic) {
    notFound();
  }

  const routeParams = searchParams ? await searchParams : {};
  const requestedPageId = readParam(routeParams.pageId);
  const requestedPagePath = readParam(routeParams.pagePath);
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
  const initialPage =
    initialPages.find((page) => page.id === requestedPageId) ??
    initialPages.find((page) => page.path === requestedPagePath) ??
    initialPages.find((page) => page.path === "wiki/index.md") ??
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
      showWorkspaceRootCard={false}
      workspaceRootMode="fixed"
      header={{
        eyebrow: "Topic home",
        title: `${topic.title} workspace`,
        description:
          slug === "openclaw"
            ? "A flagship topic home that combines rendered wiki reading, maturity awareness, and next-action guidance in one place."
            : "A rendered topic home that combines the canonical wiki with maturity guidance and the next steps required to deepen the workspace honestly.",
        badge:
          slug === "openclaw"
            ? `${manifest?.generatedMode ?? "reference"} example`
            : topic.maturityStage,
      }}
      intro={
        <TopicWorkspaceIntro
          acquisitionSummary={acquisitionSummary}
          comparisonSpotlight={portfolio.comparisonSpotlight}
          evidenceChangeSummary={evidenceChangeSummary}
          evidenceGapSummary={evidenceGapSummary}
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
