import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  FlaskConical,
  GitBranchPlus,
} from "lucide-react";

import type { AppLocale } from "@/lib/app-locale";
import {
  getLocaleCopy,
  getPriorityLabel,
  getSessionOutcomeLabel,
  getSessionStatusLabel,
  getTopicMaturityStageLabel,
  localeToIntlTag,
} from "@/lib/app-locale";
import type {
  ResearchSessionItem,
  ResearchSessionOverview,
} from "@/lib/contracts/research-session";
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

function statusVariant(status: ResearchSessionItem["status"]) {
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

function priorityVariant(priority: ResearchSessionItem["priority"]) {
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

function outcomeVariant(outcome: ResearchSessionItem["outcome"]) {
  switch (outcome) {
    case "ready-for-synthesis":
    case "synthesized":
    case "updated-canonical":
    case "archived-answer":
      return "success";
    case "question-advanced":
    case "updated-working-note":
      return "default";
    case "needs-more-sources":
      return "warning";
    case null:
    default:
      return "outline";
  }
}

function formatSessionDate(locale: AppLocale, value: string) {
  return new Intl.DateTimeFormat(localeToIntlTag(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function buildSynthesisHref(session: ResearchSessionItem) {
  return session.synthesisTitle
    ? `/syntheses?topic=${session.topicId}&title=${encodeURIComponent(session.synthesisTitle)}`
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

export function ResearchSessionView({
  overview,
  locale,
}: {
  overview: ResearchSessionOverview;
  locale: AppLocale;
}) {
  const copy = getLocaleCopy(locale);
  const focusedTopic = overview.focusedTopic;
  const focusedQuestion = overview.focusedQuestion;
  const focusSynthesisHref = overview.focusSession ? buildSynthesisHref(overview.focusSession) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={copy.sessions.eyebrow}
        title={copy.sessions.pageTitle(focusedTopic?.title, Boolean(focusedQuestion))}
        badge={copy.sessions.badge(overview.summary.totalSessions)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={focusedTopic ? `/questions?topic=${focusedTopic.id}` : "/questions"}>
                {copy.sessions.questions}
              </Link>
            </Button>
            {focusedTopic ? (
              <Button asChild variant="ghost">
                <Link href={`/syntheses?topic=${focusedTopic.id}`}>{copy.sessions.syntheses}</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={focusedTopic ? `/topics/${focusedTopic.id}` : "/topics/openclaw"}>
                {focusedTopic ? copy.sessions.topic : copy.sessions.showcase}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <Surface className="px-5 py-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-7">
          <Metric label={copy.sessions.eyebrow} value={String(overview.summary.totalSessions)} />
          <Metric label={copy.sessions.queued} value={String(overview.summary.queued)} />
          <Metric label={copy.sessions.active} value={String(overview.summary.active)} />
          <Metric label={copy.sessions.done} value={String(overview.summary.completed)} />
          <Metric label={copy.sessions.state} value={String(overview.summary.changedQuestionState)} />
          <Metric label={copy.sessions.durable} value={String(overview.summary.producedDurableUpdate)} />
          <Metric label={copy.sessions.nearSynthesis} value={String(overview.summary.readyForSynthesis)} />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.sessions.next}</h2>
            <FlaskConical className="size-5 text-muted-foreground" />
          </div>
          <div className="px-5 py-5">
            {overview.focusSession ? (
              <div className="space-y-4 rounded-[22px] border border-border/50 bg-background/62 px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(overview.focusSession.status)}>
                    {getSessionStatusLabel(locale, overview.focusSession.status)}
                  </Badge>
                  <Badge variant={priorityVariant(overview.focusSession.priority)}>
                    {getPriorityLabel(locale, overview.focusSession.priority)}
                  </Badge>
                  <Badge variant={outcomeVariant(overview.focusSession.outcome)}>
                    {getSessionOutcomeLabel(locale, overview.focusSession.outcome)}
                  </Badge>
                  <Badge variant="outline">{formatSessionDate(locale, overview.focusSession.sessionDate)}</Badge>
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    {overview.focusSession.title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {overview.focusSession.summary}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.sessions.question}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {overview.focusSession.question}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.sessions.goal}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {overview.focusSession.goal}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.sessions.loadFirst}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {overview.focusSession.loadedContextPackTitles.join(", ")}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.sessions.nextField}</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {overview.focusSession.recommendedNextStep}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{copy.sessions.conclusion}</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {overview.focusSession.draftConclusion}
                  </p>
                </div>
                {overview.focusSession.resumeNotes.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">{copy.sessions.resume}</div>
                    <div className="mt-2 space-y-2">
                      {overview.focusSession.resumeNotes.map((note) => (
                        <div
                          key={note}
                          className="rounded-[16px] border border-border/50 bg-background/75 px-3 py-3 text-sm leading-6 text-muted-foreground"
                        >
                          {note}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={overview.focusSession.links.questionQueue.href}>{copy.sessions.questions}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/gaps?topic=${overview.focusSession.topicId}`}>{copy.sessions.gaps}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={overview.focusSession.links.questionNote.href}>{copy.sessions.note}</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={overview.focusSession.links.maintenance.href}>{copy.sessions.maintenance}</Link>
                  </Button>
                  {focusSynthesisHref ? (
                    <Button asChild variant="ghost">
                      <Link href={focusSynthesisHref}>{copy.sessions.synthesis}</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost">
                    <Link href={overview.focusSession.links.canonicalTarget.href}>
                      {copy.sessions.page}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[18px] bg-background/65 px-4 py-5 text-sm leading-6 text-muted-foreground">
                {copy.sessions.noSessions}
              </div>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.sessions.byStatus}</h2>
            <Clock3 className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            {overview.buckets.map((bucket) => (
              <div key={bucket.id} className="rounded-[20px] border border-border/50 bg-background/62 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bucket.sessions.length}</Badge>
                  <div className="text-sm font-medium text-foreground">{bucket.title}</div>
                </div>
                <div className="mt-3 space-y-2">
                  {bucket.sessions.slice(0, 3).map((session) => (
                    <Link
                      key={`${bucket.id}-${session.topicId}-${session.id}`}
                      href={buildSynthesisHref(session) ?? session.links.session.href}
                      className="block rounded-[16px] border border-border/50 bg-background/75 px-3 py-3 transition-colors hover:bg-background"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(session.status)}>
                          {getSessionStatusLabel(locale, session.status)}
                        </Badge>
                        <Badge variant={outcomeVariant(session.outcome)}>
                          {getSessionOutcomeLabel(locale, session.outcome)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">{session.title}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {session.question}
                      </div>
                    </Link>
                  ))}
                  {bucket.sessions.length === 0 ? (
                    <div className="text-sm leading-6 text-muted-foreground">{copy.sessions.nothingHere}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <Surface>
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{copy.sessions.topicsSection}</h2>
          <GitBranchPlus className="size-5 text-muted-foreground" />
        </div>
        <div>
          {overview.topics.map((topic) => (
            <div key={topic.topicId} className="border-t border-border/60 px-5 py-5 first:border-t-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/sessions?topic=${topic.topicId}`}
                      className="text-lg font-semibold tracking-tight text-foreground"
                    >
                      {topic.topicTitle}
                    </Link>
                    <Badge variant={stageVariant(topic.topicMaturityStage)}>
                      {getTopicMaturityStageLabel(locale, topic.topicMaturityStage)}
                    </Badge>
                    <Badge variant="outline">{copy.sessions.badge(topic.sessionCount)}</Badge>
                  </div>
                  <p className="max-w-[75ch] text-sm leading-7 text-muted-foreground">{topic.summary}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span>{copy.sessions.summaryActive(topic.activeCount)}</span>
                    <span>{copy.sessions.summaryQueued(topic.queuedCount)}</span>
                    <span>{copy.sessions.summaryCompleted(topic.completedCount)}</span>
                    <span>{copy.sessions.summaryChangedState(topic.changedQuestionStateCount)}</span>
                  </div>
                  {topic.nextSession ? (
                    <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {copy.sessions.nextSession}
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {topic.nextSession.title}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {topic.nextSession.recommendedNextStep}
                      </div>
                    </div>
                  ) : topic.recentSession ? (
                    <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {copy.sessions.latestCompletedSession}
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {topic.recentSession.title}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {topic.recentSession.summary}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/sessions?topic=${topic.topicId}`}>{copy.sessions.eyebrow}</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={`/topics/${topic.topicId}`}>{copy.sessions.topic}</Link>
                  </Button>
                  {topic.nextSession?.synthesisTitle ? (
                    <Button asChild variant="ghost">
                      <Link
                        href={`/syntheses?topic=${topic.topicId}&title=${encodeURIComponent(
                          topic.nextSession.synthesisTitle,
                        )}`}
                      >
                        {copy.sessions.synthesis}
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
