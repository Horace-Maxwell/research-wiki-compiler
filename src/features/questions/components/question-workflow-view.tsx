import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  GitBranchPlus,
  Radar,
} from "lucide-react";

import type { AppLocale } from "@/lib/app-locale";
import {
  getLocaleCopy,
  getPriorityLabel,
  getQuestionStatusLabel,
  getTopicMaturityStageLabel,
} from "@/lib/app-locale";
import type {
  QuestionWorkflowItem,
  QuestionWorkflowOverview,
} from "@/lib/contracts/research-question";
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

function statusVariant(status: QuestionWorkflowItem["status"]) {
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

function priorityVariant(priority: QuestionWorkflowItem["priority"]) {
  switch (priority) {
    case "high":
      return "default";
    case "medium":
      return "warning";
    case "low":
    default:
      return "outline";
  }
}

function buildSynthesisHref(question: QuestionWorkflowItem) {
  return question.synthesizeInto
    ? `/syntheses?topic=${question.topicId}&title=${encodeURIComponent(question.synthesizeInto)}`
    : null;
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

function QuestionCard({
  question,
  locale,
  showTopic = true,
}: {
  question: QuestionWorkflowItem;
  locale: AppLocale;
  showTopic?: boolean;
}) {
  const copy = getLocaleCopy(locale);
  const synthesisHref = buildSynthesisHref(question);

  return (
    <div className="rounded-[22px] border border-border/50 bg-background/62 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(question.status)}>
          {getQuestionStatusLabel(locale, question.status)}
        </Badge>
        <Badge variant={priorityVariant(question.priority)}>
          {getPriorityLabel(locale, question.priority)}
        </Badge>
        <Badge variant="outline">
          {locale === "zh" ? `${question.readinessPercent}% 就绪` : `${question.readinessPercent}% ready`}
        </Badge>
        {showTopic ? (
          <Badge variant={stageVariant(question.topicMaturityStage)}>
            {question.topicTitle}
          </Badge>
        ) : null}
      </div>
      <div className="mt-3 text-[15px] font-medium leading-7 text-foreground">{question.question}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.summary}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">{copy.questions.load}:</span> {question.contextPackTitle}
        </div>
        <div>
          <span className="font-medium text-foreground">{copy.questions.why}:</span> {question.whyNow}
        </div>
        {question.synthesizeInto ? (
          <div>
            <span className="font-medium text-foreground">{copy.questions.synthesis}:</span>{" "}
            {question.synthesizeInto}
          </div>
        ) : null}
        {question.sourceGaps.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">{copy.questions.gaps}:</span> {question.sourceGaps.join("; ")}
          </div>
        ) : null}
        {question.reopenTriggers.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">{copy.questions.reopenLabel}:</span>{" "}
            {question.reopenTriggers.join("; ")}
          </div>
        ) : null}
        {question.sessionCount > 0 ? (
          <div>
            <span className="font-medium text-foreground">{copy.questions.session}:</span>{" "}
            {question.nextSessionTitle ?? question.latestSessionTitle ?? (locale === "zh" ? "已有轮次记录" : "Session history available")}
          </div>
        ) : null}
        {question.latestStatusChangeReason ? (
          <div>
            <span className="font-medium text-foreground">{copy.questions.last}:</span>{" "}
            {question.latestStatusChangeReason}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={question.links.sessionWorkspace.href}>
            {question.hasActiveSession ? copy.questions.continue : copy.questions.session}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={question.links.openQuestions.href}>{copy.questions.note}</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={question.links.maintenance.href}>{copy.questions.maintenance}</Link>
        </Button>
        {question.sourceGaps.length > 0 ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/gaps?topic=${question.topicId}`}>{copy.questions.gaps}</Link>
          </Button>
        ) : null}
        {synthesisHref ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={synthesisHref}>{copy.questions.synthesis}</Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost">
          <Link href={question.links.canonicalTarget.href}>
            {copy.questions.page}
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function QuestionWorkflowView({
  overview,
  locale,
}: {
  overview: QuestionWorkflowOverview;
  locale: AppLocale;
}) {
  const copy = getLocaleCopy(locale);
  const focusedTopic = overview.focusedTopic;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={copy.questions.eyebrow}
        title={copy.questions.pageTitle(focusedTopic?.title)}
        badge={copy.questions.badge(overview.summary.totalQuestions)}
        actions={
          <div className="flex flex-wrap gap-2">
            {focusedTopic ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/sessions?topic=${focusedTopic.id}`}>{copy.questions.sessions}</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/syntheses?topic=${focusedTopic.id}`}>{copy.questions.syntheses}</Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline">
                <Link href="/topics">{copy.questions.topics}</Link>
              </Button>
            )}
            <Button asChild>
              <Link href={focusedTopic ? `/topics/${focusedTopic.id}` : "/topics/openclaw"}>
                {focusedTopic ? copy.questions.topic : copy.questions.showcase}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <Surface className="px-5 py-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
          <Metric label={copy.questions.eyebrow} value={String(overview.summary.totalQuestions)} />
          <Metric label={copy.questions.next} value={String(overview.summary.workQueue)} />
          <Metric label={copy.questions.ready} value={String(overview.summary.readyForSynthesis)} />
          <Metric label={copy.questions.needSources} value={String(overview.summary.needsSources)} />
          <Metric label={copy.questions.reopen} value={String(overview.summary.watchForReopen)} />
          <Metric label={copy.questions.grounded} value={String(overview.summary.synthesized)} />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.questions.next}</h2>
            <CircleHelp className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            {overview.focusQueue.length === 0 ? (
              <div className="rounded-[18px] bg-background/65 px-4 py-5 text-sm leading-6 text-muted-foreground">
                {copy.questions.noQueuedQuestions}
              </div>
            ) : (
              overview.focusQueue.map((question) => (
                <QuestionCard
                  key={`${question.topicId}-${question.id}`}
                  locale={locale}
                  question={question}
                  showTopic={!focusedTopic}
                />
              ))
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.questions.byStatus}</h2>
            <Radar className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            {overview.buckets.map((bucket) => (
              <div key={bucket.id} className="rounded-[20px] border border-border/50 bg-background/62 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bucket.questions.length}</Badge>
                  <div className="text-sm font-medium text-foreground">{bucket.title}</div>
                </div>
                <div className="mt-3 space-y-2">
                  {bucket.questions.slice(0, 3).map((question) => (
                    <Link
                      key={`${bucket.id}-${question.topicId}-${question.id}`}
                      href={buildSynthesisHref(question) ?? question.links.openQuestions.href}
                      className="block rounded-[16px] border border-border/50 bg-background/75 px-3 py-3 transition-colors hover:bg-background"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(question.status)}>
                          {getQuestionStatusLabel(locale, question.status)}
                        </Badge>
                        {focusedTopic ? null : (
                          <span className="text-xs text-muted-foreground">{question.topicTitle}</span>
                        )}
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">{question.question}</div>
                    </Link>
                  ))}
                  {bucket.questions.length === 0 ? (
                    <div className="text-sm leading-6 text-muted-foreground">{copy.questions.nothingHere}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <Surface>
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.questions.topicsSection}</h2>
          <GitBranchPlus className="size-5 text-muted-foreground" />
        </div>
        <div>
          {overview.topics.map((topic) => (
            <div key={topic.topicId} className="border-t border-border/60 px-5 py-5 first:border-t-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/questions?topic=${topic.topicId}`}
                      className="text-lg font-semibold tracking-tight text-foreground"
                    >
                      {topic.topicTitle}
                    </Link>
                    <Badge variant={stageVariant(topic.topicMaturityStage)}>
                      {getTopicMaturityStageLabel(locale, topic.topicMaturityStage)}
                    </Badge>
                    <Badge variant="outline">{copy.questions.badge(topic.questionCount)}</Badge>
                  </div>
                  <p className="max-w-[75ch] text-sm leading-7 text-muted-foreground">{topic.summary}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span>{copy.questions.summaryReady(topic.readyForSynthesisCount)}</span>
                    <span>{copy.questions.summaryNeedSources(topic.needsSourcesCount)}</span>
                    <span>{copy.questions.summaryWatchForReopen(topic.watchForReopenCount)}</span>
                  </div>
                  {topic.topQuestion ? (
                    <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {copy.questions.nextQuestion}
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {topic.topQuestion.question}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {copy.questions.loadFirst(topic.topQuestion.contextPackTitle)}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/questions?topic=${topic.topicId}`}>{copy.questions.eyebrow}</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={`/topics/${topic.topicId}`}>{copy.questions.topic}</Link>
                  </Button>
                  {topic.topQuestion?.synthesizeInto ? (
                    <Button asChild variant="ghost">
                      <Link
                        href={`/syntheses?topic=${topic.topicId}&title=${encodeURIComponent(
                          topic.topQuestion.synthesizeInto,
                        )}`}
                      >
                        {copy.questions.synthesisTarget}
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>

    </div>
  );
}
