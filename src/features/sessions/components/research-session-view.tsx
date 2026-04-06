import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  FlaskConical,
  GitBranchPlus,
  History,
} from "lucide-react";

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

function humanizeStatus(status: ResearchSessionItem["status"]) {
  return status.replace(/-/g, " ");
}

function humanizeOutcome(outcome: ResearchSessionItem["outcome"]) {
  return outcome ? outcome.replace(/-/g, " ") : "in progress";
}

function formatSessionDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
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
  detail: string;
}) {
  return (
    <div className="space-y-2 border-l border-border/60 pl-4 first:border-l-0 first:pl-0">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="text-[1.9rem] font-semibold tracking-[-0.05em] text-foreground">{value}</div>
      <p className="max-w-[24ch] text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  );
}

export function ResearchSessionView({
  overview,
}: {
  overview: ResearchSessionOverview;
}) {
  const focusedTopic = overview.focusedTopic;
  const focusedQuestion = overview.focusedQuestion;
  const focusSynthesisHref = overview.focusSession ? buildSynthesisHref(overview.focusSession) : null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Research sessions"
        title={
          focusedQuestion
            ? `${focusedQuestion.question} session lane`
            : focusedTopic
              ? `${focusedTopic.title} session queue`
              : "Sessions turn questions into durable work"
        }
        description={
          focusedQuestion
            ? "Use this focused session lane to reload the right context, see what changed the question last time, and decide whether the next pass should harden into synthesis, archive, or a canonical update."
            : focusedTopic
              ? "This is the next primary lane after questions. Use it to continue the next bounded pass, capture what changed, and keep the topic moving without reopening everything."
              : "Sessions are the second main working lane after topics and questions. Use them to run the next bounded pass, load the right context pack, capture the outcome, and decide what should become durable knowledge."
        }
        badge={`${overview.summary.totalSessions} sessions`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={focusedTopic ? `/questions?topic=${focusedTopic.id}` : "/questions"}>
                Open question queue
              </Link>
            </Button>
            {focusedTopic ? (
              <Button asChild variant="ghost">
                <Link href={`/syntheses?topic=${focusedTopic.id}`}>Open syntheses</Link>
              </Button>
            ) : null}
            <Button asChild>
              <Link href={focusedTopic ? `/topics/${focusedTopic.id}` : "/topics/openclaw"}>
                {focusedTopic ? "Open topic home" : "Open flagship topic"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <Surface className="px-5 py-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-7">
          <Metric
            label="Sessions"
            value={String(overview.summary.totalSessions)}
            detail="Bounded research passes currently modeled in the selected workspace scope."
          />
          <Metric
            label="Queued"
            value={String(overview.summary.queued)}
            detail="Sessions that are staged but not yet actively in progress."
          />
          <Metric
            label="Active"
            value={String(overview.summary.active)}
            detail="Sessions that should be continued before starting broader new work."
          />
          <Metric
            label="Done"
            value={String(overview.summary.completed)}
            detail="Completed sessions that already recorded an explicit research outcome."
          />
          <Metric
            label="State changes"
            value={String(overview.summary.changedQuestionState)}
            detail="Sessions that explicitly moved a question forward, closed it, or reopened it."
          />
          <Metric
            label="Durable"
            value={String(overview.summary.producedDurableUpdate)}
            detail="Sessions that produced a canonical update, archived note, or other durable result."
          />
          <Metric
            label="Near synthesis"
            value={String(overview.summary.readyForSynthesis)}
            detail="Sessions that look close enough to harden into synthesis on the next pass."
          />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Focus session
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                What should this session do?
              </h2>
            </div>
            <FlaskConical className="size-5 text-muted-foreground" />
          </div>
          <div className="px-5 py-5">
            {overview.focusSession ? (
              <div className="space-y-4 rounded-[22px] border border-border/50 bg-background/62 px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(overview.focusSession.status)}>
                    {humanizeStatus(overview.focusSession.status)}
                  </Badge>
                  <Badge variant={priorityVariant(overview.focusSession.priority)}>
                    {overview.focusSession.priority}
                  </Badge>
                  <Badge variant={outcomeVariant(overview.focusSession.outcome)}>
                    {humanizeOutcome(overview.focusSession.outcome)}
                  </Badge>
                  <Badge variant="outline">{formatSessionDate(overview.focusSession.sessionDate)}</Badge>
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
                    <div className="text-sm font-medium text-foreground">Question</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {overview.focusSession.question}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Goal</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {overview.focusSession.goal}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Load first</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {overview.focusSession.loadedContextPackTitles.join(", ")}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Recommended next step</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {overview.focusSession.recommendedNextStep}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Draft conclusion</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {overview.focusSession.draftConclusion}
                  </p>
                </div>
                {overview.focusSession.resumeNotes.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">Resume cues</div>
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
                    <Link href={overview.focusSession.links.questionQueue.href}>Question queue</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/gaps?topic=${overview.focusSession.topicId}`}>Evidence gaps</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={overview.focusSession.links.questionNote.href}>Question note</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={overview.focusSession.links.maintenance.href}>Maintenance rhythm</Link>
                  </Button>
                  {focusSynthesisHref ? (
                    <Button asChild variant="ghost">
                      <Link href={focusSynthesisHref}>Synthesis target</Link>
                    </Button>
                  ) : null}
                  <Button asChild variant="ghost">
                    <Link href={overview.focusSession.links.canonicalTarget.href}>
                      Target context
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[18px] bg-background/65 px-4 py-5 text-sm leading-6 text-muted-foreground">
                No research sessions are currently queued.
              </div>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Session lenses
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Read sessions by workflow need
              </h2>
            </div>
            <Clock3 className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            {overview.buckets.map((bucket) => (
              <div key={bucket.id} className="rounded-[20px] border border-border/50 bg-background/62 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bucket.sessions.length}</Badge>
                  <div className="text-sm font-medium text-foreground">{bucket.title}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{bucket.description}</p>
                <div className="mt-3 space-y-2">
                  {bucket.sessions.slice(0, 3).map((session) => (
                    <Link
                      key={`${bucket.id}-${session.topicId}-${session.id}`}
                      href={buildSynthesisHref(session) ?? session.links.session.href}
                      className="block rounded-[16px] border border-border/50 bg-background/75 px-3 py-3 transition-colors hover:bg-background"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(session.status)}>{humanizeStatus(session.status)}</Badge>
                        <Badge variant={outcomeVariant(session.outcome)}>
                          {humanizeOutcome(session.outcome)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">{session.title}</div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {session.question}
                      </div>
                    </Link>
                  ))}
                  {bucket.sessions.length === 0 ? (
                    <div className="text-sm leading-6 text-muted-foreground">Nothing currently in this lane.</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>

      <Surface>
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="space-y-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Topic sessions
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              How session depth differs by topic
            </h2>
          </div>
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
                      {topic.topicMaturityStage}
                    </Badge>
                    <Badge variant="outline">{topic.sessionCount} sessions</Badge>
                  </div>
                  <p className="max-w-[75ch] text-sm leading-7 text-muted-foreground">{topic.summary}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span>{topic.activeCount} active</span>
                    <span>{topic.queuedCount} queued</span>
                    <span>{topic.completedCount} completed</span>
                    <span>{topic.changedQuestionStateCount} changed question state</span>
                  </div>
                  {topic.nextSession ? (
                    <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Next session
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
                        Latest completed session
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
                    <Link href={`/sessions?topic=${topic.topicId}`}>Topic sessions</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={`/topics/${topic.topicId}`}>Topic home</Link>
                  </Button>
                  {topic.nextSession?.synthesisTitle ? (
                    <Button asChild variant="ghost">
                      <Link
                        href={`/syntheses?topic=${topic.topicId}&title=${encodeURIComponent(
                          topic.nextSession.synthesisTitle,
                        )}`}
                      >
                        Synthesis target
                      </Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>

      <Surface className="px-5 py-5">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FlaskConical className="size-4" />
              Bound the pass
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A session loads only the context packs and pages needed for the current question instead of reopening the full topic graph by default.
            </p>
          </div>
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ArrowUpRight className="size-4" />
              Land the result
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Every completed session records whether it changed question state, produced a durable update, or still needs more evidence before hardening.
            </p>
          </div>
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <History className="size-4" />
              Resume honestly
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Session summaries and resume cues now preserve what changed last time so a question can be continued without rereading everything.
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
}
