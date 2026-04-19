import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  FileSymlink,
  GitBranchPlus,
  Lightbulb,
  Radar,
} from "lucide-react";

import type { AppLocale } from "@/lib/app-locale";
import {
  getLocaleCopy,
  getQuestionEffectLabel,
  getSynthesisDecisionTypeLabel,
  getSynthesisStatusLabel,
  getTopicMaturityStageLabel,
  localeToIntlTag,
} from "@/lib/app-locale";
import type {
  ResearchSynthesisDecisionType,
  ResearchSynthesisItem,
  ResearchSynthesisOverview,
} from "@/lib/contracts/research-synthesis";
import type { TopicMaturityStage } from "@/lib/contracts/topic-evaluation";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Surface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-[28px] border border-border/58 bg-card/80 shadow-[0_14px_38px_-34px_rgba(15,23,42,0.18)] backdrop-blur-[2px]",
        className,
      )}
    >
      {children}
    </section>
  );
}

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

function statusVariant(status: ResearchSynthesisItem["status"]) {
  switch (status) {
    case "published":
      return "success";
    case "ready":
      return "default";
    case "in-progress":
      return "warning";
    case "stale":
      return "warning";
    case "candidate":
    default:
      return "outline";
  }
}

function decisionVariant(type: ResearchSynthesisDecisionType) {
  switch (type) {
    case "recommendation":
      return "success";
    case "comparison":
      return "default";
    case "caution":
      return "warning";
    case "watch":
    case "not-enough-evidence":
    default:
      return "outline";
  }
}

function formatDate(locale: AppLocale, value: string) {
  return new Intl.DateTimeFormat(localeToIntlTag(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="space-y-2 border-l border-border/60 pl-4 first:border-l-0 first:pl-0">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="text-[1.9rem] font-semibold tracking-[-0.05em] text-foreground">{value}</div>
      {detail ? <p className="max-w-[24ch] text-sm leading-6 text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function ResearchSynthesisView({
  overview,
  locale,
}: {
  overview: ResearchSynthesisOverview;
  locale: AppLocale;
}) {
  const copy = getLocaleCopy(locale);
  const focusedTopic = overview.focusedTopic;
  const focusSynthesis = overview.focusSynthesis;
  const decisionLoopCount = overview.summary.candidate + overview.summary.inProgress;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={copy.syntheses.eyebrow}
        title={copy.syntheses.pageTitle(focusedTopic?.title)}
        badge={copy.syntheses.badge(overview.summary.totalSyntheses)}
        actions={
          <div className="flex flex-wrap gap-2">
            {focusedTopic ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/sessions?topic=${focusedTopic.id}`}>{copy.syntheses.sessions}</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/questions?topic=${focusedTopic.id}`}>{copy.syntheses.questions}</Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline">
                <Link href="/topics">{copy.syntheses.topics}</Link>
              </Button>
            )}
            <Button asChild>
              <Link href={focusedTopic ? `/topics/${focusedTopic.id}` : "/topics/openclaw"}>
                {focusedTopic ? copy.syntheses.topic : copy.syntheses.showcase}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <Surface className="px-5 py-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
          <Metric label={copy.syntheses.eyebrow} value={String(overview.summary.totalSyntheses)} />
          <Metric label={copy.syntheses.ready} value={String(overview.summary.ready)} />
          <Metric label={copy.syntheses.loop} value={String(decisionLoopCount)} />
          <Metric label={copy.syntheses.published} value={String(overview.summary.published)} />
          <Metric label={copy.syntheses.canon} value={String(overview.summary.changedCanonical)} />
          <Metric label={copy.syntheses.watch} value={String(overview.summary.introducedWatchpoints)} />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.syntheses.focus}</h2>
            <Lightbulb className="size-5 text-muted-foreground" />
          </div>
          <div className="px-5 py-5">
            {focusSynthesis ? (
              <div className="space-y-4 rounded-[22px] border border-border/50 bg-background/62 px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(focusSynthesis.status)}>
                    {getSynthesisStatusLabel(locale, focusSynthesis.status)}
                  </Badge>
                  <Badge variant="outline">
                    {locale === "zh"
                      ? `${focusSynthesis.confidencePercent}% 置信度`
                      : `${focusSynthesis.confidencePercent}% confidence`}
                  </Badge>
                  <Badge variant={stageVariant(focusSynthesis.topicMaturityStage)}>
                    {focusSynthesis.topicTitle}
                  </Badge>
                  <Badge variant="outline">{formatDate(locale, focusSynthesis.updatedAt)}</Badge>
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    {focusSynthesis.title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusSynthesis.goal}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.syntheses.questionsField}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusSynthesis.sourceQuestions.join("; ")}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.syntheses.sessionsField}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusSynthesis.sourceSessions.length > 0
                        ? focusSynthesis.sourceSessions.join("; ")
                        : copy.syntheses.noLinkedSessions}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{copy.syntheses.conclusion}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusSynthesis.durableConclusion}
                  </p>
                </div>
                {focusSynthesis.provisionalBoundary ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.syntheses.openEdge}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusSynthesis.provisionalBoundary}
                    </p>
                  </div>
                ) : null}
                {focusSynthesis.changedCanonicalSummary ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.syntheses.pageChange}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusSynthesis.changedCanonicalSummary}
                    </p>
                  </div>
                ) : null}
                <div>
                  <div className="text-sm font-medium text-foreground">{copy.syntheses.decisions}</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {focusSynthesis.decisions.map((decision) => (
                      <div
                        key={`${focusSynthesis.id}-${decision.title}`}
                        className="rounded-[18px] border border-border/50 bg-background/75 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={decisionVariant(decision.type)}>
                            {getSynthesisDecisionTypeLabel(locale, decision.type)}
                          </Badge>
                        </div>
                        <div className="mt-3 text-sm font-medium text-foreground">
                          {decision.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">
                          {decision.summary}
                        </div>
                        <div className="mt-2 text-sm leading-6 text-foreground">{decision.action}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {focusSynthesis.questionImpacts.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.syntheses.questionEffects}</div>
                    <div className="mt-3 space-y-2">
                      {focusSynthesis.questionImpacts.map((impact) => (
                        <div
                          key={`${focusSynthesis.id}-${impact.questionId}-${impact.effect}`}
                          className="rounded-[16px] border border-border/50 bg-background/75 px-3 py-3 text-sm leading-6 text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">
                            {getQuestionEffectLabel(locale, impact.effect)}:
                          </span>{" "}
                          {impact.note}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={focusSynthesis.links.questionQueue.href}>{copy.syntheses.questions}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/gaps?topic=${focusSynthesis.topicId}`}>{copy.syntheses.gaps}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={focusSynthesis.links.sessionWorkspace.href}>{copy.syntheses.sessions}</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusSynthesis.links.maintenance.href}>{copy.syntheses.maintenance}</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusSynthesis.links.publishedPage.href}>
                      {focusSynthesis.hasPublishedPage ? copy.syntheses.publishedPage : copy.syntheses.targetPage}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusSynthesis.links.canonicalTarget.href}>
                      {copy.syntheses.page}
                      <FileSymlink className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[18px] bg-background/65 px-4 py-5 text-sm leading-6 text-muted-foreground">
                {copy.syntheses.noSyntheses}
              </div>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.syntheses.byStatus}</h2>
            <Radar className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            {overview.buckets.map((bucket) => (
              <div key={bucket.id} className="rounded-[20px] border border-border/50 bg-background/62 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bucket.syntheses.length}</Badge>
                  <div className="text-sm font-medium text-foreground">{bucket.title}</div>
                </div>
                <div className="mt-3 space-y-2">
                  {bucket.syntheses.slice(0, 3).map((synthesis) => (
                    <Link
                      key={`${bucket.id}-${synthesis.topicId}-${synthesis.id}`}
                      href={synthesis.links.synthesis.href}
                      className="block rounded-[16px] border border-border/50 bg-background/75 px-3 py-3 transition-colors hover:bg-background"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(synthesis.status)}>
                          {getSynthesisStatusLabel(locale, synthesis.status)}
                        </Badge>
                        {focusedTopic ? null : (
                          <span className="text-xs text-muted-foreground">{synthesis.topicTitle}</span>
                        )}
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">{synthesis.title}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {synthesis.durableConclusion}
                      </div>
                    </Link>
                  ))}
                  {bucket.syntheses.length === 0 ? (
                    <div className="text-sm leading-6 text-muted-foreground">{copy.syntheses.nothingHere}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <Surface>
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.syntheses.topicsSection}</h2>
          <GitBranchPlus className="size-5 text-muted-foreground" />
        </div>
        <div>
          {overview.topics.map((topic) => (
            <div key={topic.topicId} className="border-t border-border/60 px-5 py-5 first:border-t-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/syntheses?topic=${topic.topicId}`}
                      className="text-lg font-semibold tracking-tight text-foreground"
                    >
                      {topic.topicTitle}
                    </Link>
                    <Badge variant={stageVariant(topic.topicMaturityStage)}>
                      {getTopicMaturityStageLabel(locale, topic.topicMaturityStage)}
                    </Badge>
                    <Badge variant="outline">{copy.syntheses.badge(topic.synthesisCount)}</Badge>
                  </div>
                  <p className="max-w-[75ch] text-sm leading-7 text-muted-foreground">{topic.summary}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span>{copy.syntheses.summaryReady(topic.readyCount)}</span>
                    <span>{copy.syntheses.summaryInProgress(topic.inProgressCount)}</span>
                    <span>{copy.syntheses.summaryPublished(topic.publishedCount)}</span>
                    <span>{copy.syntheses.summaryChangedCanonical(topic.changedCanonicalCount)}</span>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {copy.syntheses.nextSynthesis}
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {topic.nextSynthesis?.title ?? copy.syntheses.noActiveCandidate}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {topic.nextSynthesis?.recommendedNextStep ?? copy.syntheses.nextSynthesisHint}
                      </div>
                    </div>
                    <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {copy.syntheses.recentDurableSynthesis}
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {topic.recentPublished?.title ?? copy.syntheses.noPublishedSynthesis}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {topic.recentPublished?.changedCanonicalSummary ??
                          topic.recentPublished?.durableConclusion ??
                          copy.syntheses.publishedImpactHint}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/syntheses?topic=${topic.topicId}`}>{copy.syntheses.eyebrow}</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={`/topics/${topic.topicId}`}>{copy.syntheses.topic}</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>

    </div>
  );
}
