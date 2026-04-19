import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import type { AppLocale } from "@/lib/app-locale";
import {
  getLocaleCopy,
  getQuestionStatusLabel,
  getSessionStatusLabel,
  getSynthesisStatusLabel,
  getTopicMaturityStageLabel,
} from "@/lib/app-locale";
import type { AcquisitionTaskTopicSummary } from "@/lib/contracts/acquisition-task";
import type { EvidenceChangeTopicSummary } from "@/lib/contracts/evidence-change";
import type { EvidenceGapTopicSummary } from "@/lib/contracts/evidence-gap";
import type { MonitoringTopicSummary } from "@/lib/contracts/monitoring-item";
import type { QuestionWorkflowTopicSummary } from "@/lib/contracts/research-question";
import type { ResearchSessionTopicSummary } from "@/lib/contracts/research-session";
import type { ResearchSynthesisTopicSummary } from "@/lib/contracts/research-synthesis";
import type { TopicPortfolioItem } from "@/lib/contracts/topic-portfolio";
import type { TopicMaturityStage } from "@/lib/contracts/topic-evaluation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function stageVariant(stage: TopicMaturityStage) {
  switch (stage) {
    case "flagship":
      return "success";
    case "mature":
      return "default";
    case "maintained":
      return "warning";
    case "developing":
      return "outline";
    case "starter":
    default:
      return "outline";
  }
}

function questionStatusVariant(status: string) {
  switch (status) {
    case "ready-for-synthesis":
    case "synthesized":
      return "success";
    case "active":
      return "default";
    case "stale":
      return "warning";
    case "waiting-for-sources":
    case "blocked":
      return "outline";
    case "open":
    default:
      return "outline";
  }
}

function sessionStatusVariant(status: string) {
  switch (status) {
    case "active":
      return "default";
    case "completed":
      return "success";
    case "queued":
    default:
      return "outline";
  }
}

function synthesisStatusVariant(status: string) {
  switch (status) {
    case "published":
      return "success";
    case "ready":
      return "default";
    case "stale":
      return "warning";
    case "candidate":
    case "in-progress":
    default:
      return "outline";
  }
}

function WorkRow({
  label,
  title,
  detail,
  badges,
  href,
  actionLabel,
}: {
  label: string;
  title: string;
  detail?: string;
  badges?: ReactNode;
  href: string;
  actionLabel: string;
}) {
  return (
    <div className="grid gap-2.5 border-t border-border/55 py-3 first:border-t-0 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <div className="min-w-0 space-y-1.5">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[15px] font-medium leading-6 tracking-tight text-foreground">
            {title}
          </h3>
          {badges}
        </div>
        {detail ? <p className="text-[13px] leading-5 text-muted-foreground">{detail}</p> : null}
      </div>
      <div className="md:pt-5">
        <Button asChild size="sm" variant="ghost">
          <Link href={href}>
            {actionLabel}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function TopicWorkspaceIntro({
  topic,
  locale,
  acquisitionSummary,
  evidenceChangeSummary,
  evidenceGapSummary,
  monitoringSummary,
  questionWorkflow,
  sessionSummary,
  synthesisSummary,
}: {
  topic: TopicPortfolioItem;
  locale: AppLocale;
  acquisitionSummary: AcquisitionTaskTopicSummary | null;
  evidenceChangeSummary: EvidenceChangeTopicSummary | null;
  evidenceGapSummary: EvidenceGapTopicSummary | null;
  monitoringSummary: MonitoringTopicSummary | null;
  questionWorkflow: QuestionWorkflowTopicSummary | null;
  sessionSummary: ResearchSessionTopicSummary | null;
  synthesisSummary: ResearchSynthesisTopicSummary | null;
}) {
  const copy = getLocaleCopy(locale);
  const isOfficialShowcase = topic.id === "openclaw";
  const leadQuestion = questionWorkflow?.topQuestion ?? questionWorkflow?.questions[0] ?? null;
  const nextSession = sessionSummary?.nextSession ?? null;
  const nextSynthesis = synthesisSummary?.nextSynthesis ?? null;
  const leadQuestionPack = leadQuestion?.contextPackTitle ?? null;
  const nextSessionPack = nextSession?.loadedContextPackTitles[0] ?? null;
  const mainSignal = evidenceGapSummary?.nextGap
    ? {
        label: copy.topicHome.blocker,
        title: evidenceGapSummary.nextGap.title,
        href: `/gaps?topic=${topic.id}`,
        actionLabel: copy.topicHome.gaps,
      }
    : evidenceChangeSummary?.nextReview
      ? {
          label: copy.topicHome.signal,
          title: evidenceChangeSummary.nextReview.title,
          href: `/changes?topic=${topic.id}`,
          actionLabel: copy.topicHome.changes,
        }
      : monitoringSummary?.nextAcquisitionTrigger
        ? {
            label: copy.topicHome.signal,
            title: monitoringSummary.nextAcquisitionTrigger.title,
            href: `/monitoring?topic=${topic.id}`,
            actionLabel: copy.topicHome.monitoring,
          }
        : acquisitionSummary?.nextTask
          ? {
              label: copy.topicHome.signal,
              title: acquisitionSummary.nextTask.title,
              href: `/acquisition?topic=${topic.id}`,
              actionLabel: copy.topicHome.acquisition,
            }
          : null;

  return (
    <div className="space-y-3.5 border-b border-border/60 pb-4">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant={stageVariant(topic.maturityStage)}>
            {getTopicMaturityStageLabel(locale, topic.maturityStage)}
          </Badge>
          {isOfficialShowcase ? <Badge variant="outline">{copy.topicHome.showcase}</Badge> : null}
          {!isOfficialShowcase && topic.kind === "example" ? (
            <Badge variant="outline">{copy.topicHome.example}</Badge>
          ) : null}
        </div>

        <div>
          <WorkRow
            label={copy.topicHome.question}
            title={leadQuestion?.question ?? copy.topicHome.noQuestion}
            detail={leadQuestionPack ?? undefined}
            badges={
              leadQuestion ? (
                <Badge variant={questionStatusVariant(leadQuestion.status)}>
                  {getQuestionStatusLabel(locale, leadQuestion.status)}
                </Badge>
              ) : undefined
            }
            href={`/questions?topic=${topic.id}`}
            actionLabel={copy.topicHome.questions}
          />

          <WorkRow
            label={copy.topicHome.session}
            title={nextSession?.title ?? copy.topicHome.noSession}
            detail={nextSessionPack ?? undefined}
            badges={
              nextSession ? (
                <Badge variant={sessionStatusVariant(nextSession.status)}>
                  {getSessionStatusLabel(locale, nextSession.status)}
                </Badge>
              ) : undefined
            }
            href={`/sessions?topic=${topic.id}`}
            actionLabel={nextSession?.status === "active" ? copy.topicHome.continue : copy.topicHome.sessions}
          />

          <WorkRow
            label={copy.topicHome.synthesis}
            title={nextSynthesis?.title ?? copy.topicHome.noSynthesis}
            detail={nextSynthesis ? copy.topicHome.confidence(nextSynthesis.confidencePercent) : undefined}
            badges={
              nextSynthesis ? (
                <Badge variant={synthesisStatusVariant(nextSynthesis.status)}>
                  {getSynthesisStatusLabel(locale, nextSynthesis.status)}
                </Badge>
              ) : undefined
            }
            href={`/syntheses?topic=${topic.id}`}
            actionLabel={copy.topicHome.syntheses}
          />
        </div>
      </section>

      {mainSignal ? (
        <section className="border-t border-border/55 pt-2.5">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {mainSignal.label}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm leading-6 text-foreground">{mainSignal.title}</p>
            <Button asChild size="sm" variant="ghost">
              <Link href={mainSignal.href}>
                {mainSignal.actionLabel}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
