import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CircleHelp,
  GitBranchPlus,
  Radar,
  RefreshCw,
  SearchCheck,
} from "lucide-react";

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

function humanizeStatus(status: QuestionWorkflowItem["status"]) {
  switch (status) {
    case "ready-for-synthesis":
      return "ready for synthesis";
    case "waiting-for-sources":
      return "waiting for sources";
    default:
      return status.replace(/-/g, " ");
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

function QuestionCard({
  question,
  showTopic = true,
}: {
  question: QuestionWorkflowItem;
  showTopic?: boolean;
}) {
  const synthesisHref = buildSynthesisHref(question);

  return (
    <div className="rounded-[22px] border border-border/50 bg-background/62 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(question.status)}>{humanizeStatus(question.status)}</Badge>
        <Badge variant={priorityVariant(question.priority)}>{question.priority}</Badge>
        <Badge variant="outline">{question.readinessPercent}% ready</Badge>
        {showTopic ? <Badge variant={stageVariant(question.topicMaturityStage)}>{question.topicTitle}</Badge> : null}
      </div>
      <div className="mt-3 text-[15px] font-medium leading-7 text-foreground">{question.question}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{question.summary}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">Load first:</span> {question.contextPackTitle}
        </div>
        <div>
          <span className="font-medium text-foreground">Why now:</span> {question.whyNow}
        </div>
        {question.synthesizeInto ? (
          <div>
            <span className="font-medium text-foreground">Promote into:</span> {question.synthesizeInto}
          </div>
        ) : null}
        {question.sourceGaps.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Missing evidence:</span>{" "}
            {question.sourceGaps.join("; ")}
          </div>
        ) : null}
        {question.reopenTriggers.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Reopen if:</span>{" "}
            {question.reopenTriggers.join("; ")}
          </div>
        ) : null}
        {question.sessionCount > 0 ? (
          <div>
            <span className="font-medium text-foreground">Session lane:</span>{" "}
            {question.nextSessionTitle ?? question.latestSessionTitle ?? "Session history available"}
          </div>
        ) : null}
        {question.latestStatusChangeReason ? (
          <div>
            <span className="font-medium text-foreground">Last state change:</span>{" "}
            {question.latestStatusChangeReason}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={question.links.sessionWorkspace.href}>
            {question.hasActiveSession ? "Continue session" : "Open session"}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={question.links.openQuestions.href}>Open question note</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={question.links.maintenance.href}>Maintenance</Link>
        </Button>
        {question.sourceGaps.length > 0 ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={`/gaps?topic=${question.topicId}`}>Evidence gaps</Link>
          </Button>
        ) : null}
        {synthesisHref ? (
          <Button asChild size="sm" variant="ghost">
            <Link href={synthesisHref}>Synthesis target</Link>
          </Button>
        ) : null}
        <Button asChild size="sm" variant="ghost">
          <Link href={question.links.canonicalTarget.href}>
            Grounding
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function QuestionWorkflowView({
  overview,
}: {
  overview: QuestionWorkflowOverview;
}) {
  const focusedTopic = overview.focusedTopic;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Research workflow"
        title={focusedTopic ? `${focusedTopic.title} question queue` : "Questions drive the research"}
        description={
          focusedTopic
            ? "Use this topic-focused queue to see which question is closest to synthesis, which one still needs more evidence, and which grounded answers should reopen if the topic shifts."
            : "Questions are now a first-class operating surface across the portfolio. Use them to decide what to read next, which context pack to load, what still needs sources, and what is finally ready to become durable synthesis."
        }
        badge={`${overview.summary.totalQuestions} questions`}
        actions={
          <div className="flex flex-wrap gap-2">
            {focusedTopic ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/questions">Open full question queue</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/gaps?topic=${focusedTopic.id}`}>Open evidence gaps</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/changes?topic=${focusedTopic.id}`}>Open change lane</Link>
                </Button>
              </>
            ) : (
              <Button asChild variant="outline">
                <Link href="/topics">Open topic portfolio</Link>
              </Button>
            )}
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
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
          <Metric
            label="Questions"
            value={String(overview.summary.totalQuestions)}
            detail="Explicit research questions currently modeled in the selected workspace scope."
          />
          <Metric
            label="Work next"
            value={String(overview.summary.workQueue)}
            detail="Questions that should actively shape the next research pass."
          />
          <Metric
            label="Ready"
            value={String(overview.summary.readyForSynthesis)}
            detail="Questions that look close enough to durable synthesis to promote soon."
          />
          <Metric
            label="Need sources"
            value={String(overview.summary.needsSources)}
            detail="Questions that still need more evidence before they should harden."
          />
          <Metric
            label="Reopen watch"
            value={String(overview.summary.watchForReopen)}
            detail="Grounded questions that should reopen if monitoring signals or topic framing change."
          />
          <Metric
            label="Grounded"
            value={String(overview.summary.synthesized)}
            detail="Questions that already have a durable page, synthesis, or archived answer behind them."
          />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Focus queue
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Which question should we work on next?
              </h2>
            </div>
            <CircleHelp className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            {overview.focusQueue.length === 0 ? (
              <div className="rounded-[18px] bg-background/65 px-4 py-5 text-sm leading-6 text-muted-foreground">
                No active research questions are currently queued.
              </div>
            ) : (
              overview.focusQueue.map((question) => (
                <QuestionCard
                  key={`${question.topicId}-${question.id}`}
                  question={question}
                  showTopic={!focusedTopic}
                />
              ))
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Research lenses
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Read the queue by workflow need
              </h2>
            </div>
            <Radar className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            {overview.buckets.map((bucket) => (
              <div key={bucket.id} className="rounded-[20px] border border-border/50 bg-background/62 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bucket.questions.length}</Badge>
                  <div className="text-sm font-medium text-foreground">{bucket.title}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{bucket.description}</p>
                <div className="mt-3 space-y-2">
                  {bucket.questions.slice(0, 3).map((question) => (
                    <Link
                      key={`${bucket.id}-${question.topicId}-${question.id}`}
                      href={buildSynthesisHref(question) ?? question.links.openQuestions.href}
                      className="block rounded-[16px] border border-border/50 bg-background/75 px-3 py-3 transition-colors hover:bg-background"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(question.status)}>{humanizeStatus(question.status)}</Badge>
                        {focusedTopic ? null : (
                          <span className="text-xs text-muted-foreground">{question.topicTitle}</span>
                        )}
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">{question.question}</div>
                    </Link>
                  ))}
                  {bucket.questions.length === 0 ? (
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
              Topic queues
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              How the questions differ by topic
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
                      href={`/questions?topic=${topic.topicId}`}
                      className="text-lg font-semibold tracking-tight text-foreground"
                    >
                      {topic.topicTitle}
                    </Link>
                    <Badge variant={stageVariant(topic.topicMaturityStage)}>
                      {topic.topicMaturityStage}
                    </Badge>
                    <Badge variant="outline">{topic.questionCount} questions</Badge>
                  </div>
                  <p className="max-w-[75ch] text-sm leading-7 text-muted-foreground">{topic.summary}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span>{topic.readyForSynthesisCount} ready for synthesis</span>
                    <span>{topic.needsSourcesCount} need sources</span>
                    <span>{topic.watchForReopenCount} watch for reopen</span>
                  </div>
                  {topic.topQuestion ? (
                    <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Highest-leverage question
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {topic.topQuestion.question}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        Load {topic.topQuestion.contextPackTitle} first.
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/questions?topic=${topic.topicId}`}>Topic question queue</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={`/topics/${topic.topicId}`}>Topic home</Link>
                  </Button>
                  {topic.topQuestion?.synthesizeInto ? (
                    <Button asChild variant="ghost">
                      <Link
                        href={`/syntheses?topic=${topic.topicId}&title=${encodeURIComponent(
                          topic.topQuestion.synthesizeInto,
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
              <SearchCheck className="size-4" />
              Context first
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Every question now names the first context pack to load, so research starts with the smallest useful bundle instead of the whole graph.
            </p>
          </div>
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ArrowUpRight className="size-4" />
              Promotion path
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ready questions point toward the synthesis or durable page they should become next, so research progression stays visible.
            </p>
          </div>
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <RefreshCw className="size-4" />
              Reopen honestly
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Grounded questions stay linked to reopen triggers, so archived answers and syntheses can re-enter the workflow when the topic changes.
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
}
