import Link from "next/link";
import { ArrowRight, FlaskConical, FolderTree, Gauge, Radar, RefreshCw, SearchCheck, Sparkles } from "lucide-react";

import type { AcquisitionTaskTopicSummary } from "@/lib/contracts/acquisition-task";
import type { EvidenceChangeTopicSummary } from "@/lib/contracts/evidence-change";
import type { EvidenceGapTopicSummary } from "@/lib/contracts/evidence-gap";
import type { MonitoringTopicSummary } from "@/lib/contracts/monitoring-item";
import type { QuestionWorkflowTopicSummary } from "@/lib/contracts/research-question";
import type { ResearchSessionTopicSummary } from "@/lib/contracts/research-session";
import type { ResearchSynthesisTopicSummary } from "@/lib/contracts/research-synthesis";
import type { TopicPortfolioComparison, TopicPortfolioItem } from "@/lib/contracts/topic-portfolio";
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

function priorityVariant(priority: "high" | "medium" | "low") {
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

function statusVariant(status: string) {
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

function humanizeStatus(status: string) {
  switch (status) {
    case "ready-for-synthesis":
      return "ready for synthesis";
    case "waiting-for-sources":
      return "waiting for sources";
    default:
      return status.replace(/-/g, " ");
  }
}

function Surface({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-border/55 bg-card/74 p-5 shadow-[0_12px_32px_-30px_rgba(15,23,42,0.18)]">
      <div className="space-y-2">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </div>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function FocusCard({
  label,
  title,
  detail,
  note,
}: {
  label: string;
  title: string;
  detail: string;
  note: string;
}) {
  return (
    <div className="rounded-[18px] border border-border/50 bg-background/62 px-4 py-4">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-3 text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-sm leading-6 text-muted-foreground">{detail}</div>
      <div className="mt-3 text-sm leading-6 text-foreground">{note}</div>
    </div>
  );
}

export function TopicWorkspaceIntro({
  topic,
  comparisonSpotlight,
  acquisitionSummary,
  evidenceChangeSummary,
  evidenceGapSummary,
  monitoringSummary,
  questionWorkflow,
  sessionSummary,
  synthesisSummary,
}: {
  topic: TopicPortfolioItem;
  comparisonSpotlight: TopicPortfolioComparison | null;
  acquisitionSummary: AcquisitionTaskTopicSummary | null;
  evidenceChangeSummary: EvidenceChangeTopicSummary | null;
  evidenceGapSummary: EvidenceGapTopicSummary | null;
  monitoringSummary: MonitoringTopicSummary | null;
  questionWorkflow: QuestionWorkflowTopicSummary | null;
  sessionSummary: ResearchSessionTopicSummary | null;
  synthesisSummary: ResearchSynthesisTopicSummary | null;
}) {
  const isComparedTopic =
    comparisonSpotlight &&
    (comparisonSpotlight.leaderId === topic.id ||
      comparisonSpotlight.challengerId === topic.id);
  const isOfficialShowcase = topic.id === "openclaw";
  const leadQuestion = questionWorkflow?.questions[0] ?? null;
  const nextSession = sessionSummary?.nextSession ?? null;
  const nextSynthesis = synthesisSummary?.nextSynthesis ?? null;
  const mainSignal = evidenceGapSummary?.nextGap
    ? {
        label: "Main evidence blocker",
        title: evidenceGapSummary.nextGap.title,
        detail: evidenceGapSummary.nextGap.nextEvidenceToAcquire,
        note: "Open evidence gaps only because this topic now needs a specific evidence move.",
      }
    : evidenceChangeSummary?.nextReview
      ? {
          label: "Main review trigger",
          title: evidenceChangeSummary.nextReview.title,
          detail: evidenceChangeSummary.nextReview.recommendedAction,
          note: "Changes matter when they reopen or review durable knowledge, not just because they exist.",
        }
      : monitoringSummary?.nextAcquisitionTrigger
        ? {
            label: "Main watch signal",
            title: monitoringSummary.nextAcquisitionTrigger.title,
            detail: monitoringSummary.nextAcquisitionTrigger.recommendedAction,
            note: "Monitoring stays secondary until a watchpoint justifies real work.",
          }
        : monitoringSummary?.nextMonitor
          ? {
              label: "Main watch signal",
              title: monitoringSummary.nextMonitor.title,
              detail: monitoringSummary.nextMonitor.recommendedAction,
              note: "Use monitoring as a quiet background lane unless it changes the work.",
            }
          : acquisitionSummary?.nextTask
            ? {
                label: "Main acquisition move",
                title: acquisitionSummary.nextTask.title,
                detail: acquisitionSummary.nextTask.evidenceTypeToCollect,
                note: "Acquisition should stay bounded and session-ready instead of feeling like a backlog dump.",
              }
            : null;

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,246,240,0.96))] p-6 ring-1 ring-border/55">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={stageVariant(topic.maturityStage)}>{topic.maturityStage}</Badge>
          <Badge variant="outline">{topic.kind === "example" ? "official example" : "topic workspace"}</Badge>
          {isOfficialShowcase ? <Badge variant="outline">official showcase</Badge> : null}
          <Badge variant="outline">{topic.corpusFileCount} corpus files</Badge>
          <Badge variant="outline">{topic.pageCount} pages</Badge>
          <Badge variant="outline">{topic.contextPackCount} context packs</Badge>
        </div>
        <div className="mt-4 max-w-4xl space-y-3">
          <p className="text-lg font-medium text-foreground">{topic.description}</p>
          <p className="text-sm leading-7 text-muted-foreground">{topic.summary}</p>
          {isOfficialShowcase ? (
            <p className="text-sm leading-7 text-muted-foreground">
              This is the flagship showcase topic. Use this page as the real working cockpit, then
              open the rendered showcase route only when you want the guided article-first tour of
              the same committed Markdown source.
            </p>
          ) : null}
        </div>
        <div className="mt-6 rounded-[22px] border border-border/55 bg-background/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Daily working path
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Start here, then move through question -&gt; session -&gt; synthesis. Pull in gaps,
            changes, acquisition, and monitoring only when the work actually needs them.
          </p>
          <div className="mt-4 grid gap-3 xl:grid-cols-4">
            <FocusCard
              label="Start with"
              title={leadQuestion?.question ?? "No lead question seeded yet"}
              detail={leadQuestion?.summary ?? "The question queue will surface the next useful research thread here."}
              note={
                leadQuestion
                  ? `Load ${leadQuestion.contextPackTitle} first.`
                  : "Open the question queue to establish the next bounded research thread."
              }
            />
            <FocusCard
              label="Continue"
              title={nextSession?.title ?? "No active session yet"}
              detail={nextSession?.summary ?? "Session history and the next bounded pass will surface here."}
              note={
                nextSession
                  ? nextSession.recommendedNextStep
                  : "Use sessions only after the question queue has made the next pass clear."
              }
            />
            <FocusCard
              label="Harden next"
              title={nextSynthesis?.title ?? "No synthesis close enough yet"}
              detail={
                nextSynthesis?.durableConclusion ??
                "The next durable synthesis will appear here once a question and session have earned it."
              }
              note={
                nextSynthesis
                  ? nextSynthesis.recommendedNextStep
                  : "Syntheses stay later in the path so provisional work does not pretend to be durable too early."
              }
            />
            <FocusCard
              label={mainSignal?.label ?? "Signals"}
              title={mainSignal?.title ?? "No signal currently outranks the main path"}
              detail={
                mainSignal?.detail ??
                "This means the topic can stay focused on questions, sessions, and syntheses for now."
              }
              note={
                mainSignal?.note ??
                "Signals are supporting lanes. Check them when they change the work, not by default."
              }
            />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={`/questions?topic=${topic.id}`}>
              Open question queue
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={nextSession ? `/sessions?topic=${topic.id}` : `/sessions?topic=${topic.id}`}>
              {nextSession ? "Continue next session" : "Open session queue"}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/syntheses?topic=${topic.id}`}>
              {nextSynthesis ? "Open closest synthesis" : "Open syntheses"}
            </Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={topic.links.canonical.href}>Open canonical start</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={topic.links.maintenance.href}>Open maintenance rhythm</Link>
          </Button>
          {isOfficialShowcase ? (
            <Button asChild variant="ghost">
              <Link href="/examples/openclaw">Open rendered showcase</Link>
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <Link href="/topics">Back to portfolio</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Surface
          title="Promotion readiness"
          description="This is the maturity gap between the current stage and the next one. Treat it as the shortest honest path upward."
        >
          <div id="evaluation" className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={stageVariant(topic.maturityStage)}>{topic.maturityStage}</Badge>
              <Badge variant="outline">
                {topic.promotionReadinessPercent}% to {topic.nextStage ?? "top stage"}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-foreground">{topic.promotionReadinessSummary}</p>
            <div className="space-y-2">
              {topic.promotionBlockers.length > 0 ? (
                topic.promotionBlockers.map((blocker) => (
                  <div
                    key={blocker.label}
                    className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4"
                  >
                    <div className="text-sm font-medium text-foreground">{blocker.label}</div>
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      {blocker.details}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  This topic currently clears the highest stage defined in the system.
                </div>
              )}
            </div>
          </div>
        </Surface>

        <Surface
          title="Next actions"
          description="These are the recommended upgrades that should turn evaluation into real work instead of a score snapshot."
        >
          <div className="space-y-3">
            {topic.nextActions.map((action) => (
              <div
                key={action.id}
                className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={priorityVariant(action.priority)}>{action.priority}</Badge>
                  <Badge variant="outline">{action.category}</Badge>
                </div>
                <div className="mt-3 text-sm font-medium text-foreground">{action.title}</div>
                <div className="mt-1 text-sm leading-6 text-muted-foreground">{action.summary}</div>
                <div className="mt-2 text-sm leading-6 text-foreground">{action.whyNow}</div>
              </div>
            ))}
          </div>
        </Surface>

      </div>

      {questionWorkflow ? (
        <Surface
          title="Question workflow"
          description="Start here after landing on the topic home. These questions should drive the next pass of reading, evidence gathering, or synthesis for this topic."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{questionWorkflow.questionCount} questions</Badge>
              <Badge variant="outline">{questionWorkflow.readyForSynthesisCount} ready</Badge>
              <Badge variant="outline">{questionWorkflow.needsSourcesCount} need sources</Badge>
              <Badge variant="outline">{questionWorkflow.watchForReopenCount} watch for reopen</Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              {questionWorkflow.questions.slice(0, 3).map((question) => (
                <div
                  key={question.id}
                  className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={statusVariant(question.status)}>{humanizeStatus(question.status)}</Badge>
                    <Badge variant={priorityVariant(question.priority)}>{question.priority}</Badge>
                  </div>
                  <div className="mt-3 text-sm font-medium text-foreground">{question.question}</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">{question.summary}</div>
                  <div className="mt-3 text-sm leading-6 text-foreground">
                    Load <span className="font-medium">{question.contextPackTitle}</span> first.
                  </div>
                  {question.synthesizeInto ? (
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      Promote into {question.synthesizeInto}.
                    </div>
                  ) : null}
                  {question.sourceGaps.length > 0 ? (
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      Missing evidence: {question.sourceGaps.join("; ")}
                    </div>
                  ) : null}
                  {question.nextSessionTitle || question.latestSessionTitle ? (
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      Session lane: {question.nextSessionTitle ?? question.latestSessionTitle}
                    </div>
                  ) : null}
                  {question.latestStatusChangeReason ? (
                    <div className="mt-1 text-sm leading-6 text-muted-foreground">
                      Last state change: {question.latestStatusChangeReason}
                    </div>
                  ) : null}
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={question.links.sessionWorkspace.href}>
                          {question.hasActiveSession ? "Continue session" : "Open session"}
                        </Link>
                      </Button>
                      {question.synthesizeInto ? (
                        <Button asChild size="sm" variant="ghost">
                          <Link
                            href={`/syntheses?topic=${topic.id}&title=${encodeURIComponent(
                              question.synthesizeInto,
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
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/questions?topic=${topic.id}`}>Open topic question queue</Link>
              </Button>
            </div>
          </div>
        </Surface>
      ) : null}

      {sessionSummary ? (
        <Surface
          title="Research sessions"
          description="After the question queue, sessions turn intent into bounded work: what we loaded, what changed, and what should harden next."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{sessionSummary.sessionCount} sessions</Badge>
              <Badge variant="outline">{sessionSummary.activeCount} active</Badge>
              <Badge variant="outline">{sessionSummary.queuedCount} queued</Badge>
              <Badge variant="outline">{sessionSummary.completedCount} completed</Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <FlaskConical className="size-4" />
                  Next session
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {sessionSummary.nextSession ? (
                    <>
                      <div className="font-medium text-foreground">
                        {sessionSummary.nextSession.title}
                      </div>
                      <div className="mt-1">{sessionSummary.nextSession.recommendedNextStep}</div>
                    </>
                  ) : (
                    "No queued or active session is currently seeded for this topic."
                  )}
                </div>
              </div>
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gauge className="size-4" />
                  Latest outcome
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {sessionSummary.recentSession ? (
                    <>
                      <div className="font-medium text-foreground">
                        {sessionSummary.recentSession.title}
                      </div>
                      <div className="mt-1">{sessionSummary.recentSession.summary}</div>
                    </>
                  ) : (
                    "No completed session has been recorded yet."
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/sessions?topic=${topic.id}`}>Open topic session queue</Link>
              </Button>
              {sessionSummary.nextSession?.synthesisTitle ? (
                <Button asChild variant="ghost">
                  <Link
                    href={`/syntheses?topic=${topic.id}&title=${encodeURIComponent(
                      sessionSummary.nextSession.synthesisTitle,
                    )}`}
                  >
                    Synthesis target
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </Surface>
      ) : null}

      {synthesisSummary ? (
        <Surface
          title="Syntheses and decisions"
          description="After questions and sessions have earned it, syntheses turn repeated work into durable judgment and make the canonical and maintenance consequences explicit."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{synthesisSummary.synthesisCount} syntheses</Badge>
              <Badge variant="outline">{synthesisSummary.readyCount} ready</Badge>
              <Badge variant="outline">{synthesisSummary.inProgressCount} in progress</Badge>
              <Badge variant="outline">{synthesisSummary.publishedCount} published</Badge>
              <Badge variant="outline">{synthesisSummary.changedCanonicalCount} changed canonical</Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="size-4" />
                  Next synthesis
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {synthesisSummary.nextSynthesis ? (
                    <>
                      <div className="font-medium text-foreground">
                        {synthesisSummary.nextSynthesis.title}
                      </div>
                      <div className="mt-1">
                        {synthesisSummary.nextSynthesis.recommendedNextStep}
                      </div>
                    </>
                  ) : (
                    "No active synthesis candidate is currently seeded for this topic."
                  )}
                </div>
              </div>
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gauge className="size-4" />
                  Latest durable effect
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {synthesisSummary.recentPublished ? (
                    <>
                      <div className="font-medium text-foreground">
                        {synthesisSummary.recentPublished.title}
                      </div>
                      <div className="mt-1">
                        {synthesisSummary.recentPublished.changedCanonicalSummary ??
                          synthesisSummary.recentPublished.durableConclusion}
                      </div>
                    </>
                  ) : (
                    "No published synthesis has been recorded yet."
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/syntheses?topic=${topic.id}`}>Open topic syntheses</Link>
              </Button>
            </div>
          </div>
        </Surface>
      ) : null}

      {evidenceGapSummary ? (
        <Surface
          title="Evidence gaps"
          description="Open this when missing evidence is the blocker. It keeps the next required evidence move visible without turning the whole topic into a gap-management exercise."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{evidenceGapSummary.gapCount} gaps</Badge>
              <Badge variant="outline">{evidenceGapSummary.highPriorityCount} high priority</Badge>
              <Badge variant="outline">{evidenceGapSummary.blockedQuestionCount} question blockers</Badge>
              <Badge variant="outline">{evidenceGapSummary.blockedSynthesisCount} synthesis blockers</Badge>
              <Badge variant="outline">{evidenceGapSummary.maturityBlockerCount} maturity blockers</Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <SearchCheck className="size-4" />
                  Highest-leverage next evidence
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {evidenceGapSummary.nextGap ? (
                    <>
                      <div className="font-medium text-foreground">{evidenceGapSummary.nextGap.title}</div>
                      <div className="mt-1">{evidenceGapSummary.nextGap.nextEvidenceToAcquire}</div>
                    </>
                  ) : (
                    "No unresolved evidence gap is currently seeded for this topic."
                  )}
                </div>
              </div>
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gauge className="size-4" />
                  Latest resolved gap
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {evidenceGapSummary.recentlyResolved ? (
                    <>
                      <div className="font-medium text-foreground">
                        {evidenceGapSummary.recentlyResolved.title}
                      </div>
                      <div className="mt-1">
                        {evidenceGapSummary.recentlyResolved.resolutionSummary ??
                          evidenceGapSummary.recentlyResolved.summary}
                      </div>
                    </>
                  ) : (
                    "No resolved evidence gap has been seeded yet."
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/gaps?topic=${topic.id}`}>Open topic gap lane</Link>
              </Button>
              {evidenceGapSummary.nextGap ? (
                <Button asChild variant="ghost">
                  <Link href={evidenceGapSummary.nextGap.links.session.href}>
                    {evidenceGapSummary.nextGap.acquisitionSessionStatus === "active"
                      ? "Continue acquisition session"
                      : "Run acquisition session"}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </Surface>
      ) : null}

      {acquisitionSummary ? (
        <Surface
          title="Acquisition tasks"
          description="Use this after a gap or watchpoint has already made the collection pass clear. Acquisition should stay bounded, session-ready, and tightly tied to downstream knowledge work."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{acquisitionSummary.taskCount} tasks</Badge>
              <Badge variant="outline">{acquisitionSummary.highPriorityCount} high priority</Badge>
              <Badge variant="outline">{acquisitionSummary.readyForSessionCount} session ready</Badge>
              <Badge variant="outline">{acquisitionSummary.awaitingIngestionCount} awaiting ingestion</Badge>
              <Badge variant="outline">{acquisitionSummary.maturityBlockerCount} maturity blockers</Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <SearchCheck className="size-4" />
                  Highest-leverage acquisition
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {acquisitionSummary.nextTask ? (
                    <>
                      <div className="font-medium text-foreground">
                        {acquisitionSummary.nextTask.title}
                      </div>
                      <div className="mt-1">{acquisitionSummary.nextTask.evidenceTypeToCollect}</div>
                    </>
                  ) : (
                    "No unresolved acquisition task is currently seeded for this topic."
                  )}
                </div>
              </div>
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gauge className="size-4" />
                  Latest integrated acquisition
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {acquisitionSummary.recentIntegrated ? (
                    <>
                      <div className="font-medium text-foreground">
                        {acquisitionSummary.recentIntegrated.title}
                      </div>
                      <div className="mt-1">
                        {acquisitionSummary.recentIntegrated.resultSummary ??
                          acquisitionSummary.recentIntegrated.summary}
                      </div>
                    </>
                  ) : (
                    "No integrated acquisition task has been recorded yet."
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/acquisition?topic=${topic.id}`}>Open topic acquisition queue</Link>
              </Button>
              {acquisitionSummary.nextTask ? (
                <Button asChild variant="ghost">
                  <Link href={acquisitionSummary.nextTask.links.session.href}>
                    {acquisitionSummary.nextTask.nextSessionStatus === "active"
                      ? "Continue acquisition session"
                      : "Start acquisition session"}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </Surface>
      ) : null}

      {evidenceChangeSummary ? (
        <Surface
          title="Evidence changes"
          description="Check this when new evidence materially affects the topic. It keeps reopen and review pressure visible without making changes the default starting surface."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{evidenceChangeSummary.changeCount} changes</Badge>
              <Badge variant="outline">{evidenceChangeSummary.reopenedCount} reopened</Badge>
              <Badge variant="outline">{evidenceChangeSummary.reviewNeededCount} review needed</Badge>
              <Badge variant="outline">{evidenceChangeSummary.stabilizedCount} stabilized</Badge>
              <Badge variant="outline">
                {evidenceChangeSummary.canonicalReviewCount} canonical review
              </Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <RefreshCw className="size-4" />
                  Latest evidence change
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {evidenceChangeSummary.latestChange ? (
                    <>
                      <div className="font-medium text-foreground">
                        {evidenceChangeSummary.latestChange.title}
                      </div>
                      <div className="mt-1">
                        {evidenceChangeSummary.latestChange.impactSummary}
                      </div>
                    </>
                  ) : (
                    "No evidence change has been explicitly recorded for this topic yet."
                  )}
                </div>
              </div>
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gauge className="size-4" />
                  Next review action
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {evidenceChangeSummary.nextReview ? (
                    <>
                      <div className="font-medium text-foreground">
                        {evidenceChangeSummary.nextReview.title}
                      </div>
                      <div className="mt-1">
                        {evidenceChangeSummary.nextReview.recommendedAction}
                      </div>
                    </>
                  ) : (
                    "No reopen or review action is currently seeded for this topic."
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/changes?topic=${topic.id}`}>Open topic change lane</Link>
              </Button>
              {evidenceChangeSummary.latestChange ? (
                <Button asChild variant="ghost">
                  <Link href={evidenceChangeSummary.latestChange.links.change.href}>
                    Focus latest change
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </Surface>
      ) : null}

      {monitoringSummary ? (
        <Surface
          title="Monitoring"
          description="This is a lower-frequency watch lane. Use it to distinguish passive watchfulness from the signals that should actually spawn bounded review or new acquisition work."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{monitoringSummary.itemCount} monitors</Badge>
              <Badge variant="outline">{monitoringSummary.spawnedAcquisitionCount} spawned work</Badge>
              <Badge variant="outline">{monitoringSummary.reviewNeededCount} review needed</Badge>
              <Badge variant="outline">{monitoringSummary.periodicReviewCount} periodic review</Badge>
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Radar className="size-4" />
                  Next monitoring trigger
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {monitoringSummary.nextAcquisitionTrigger ? (
                    <>
                      <div className="font-medium text-foreground">
                        {monitoringSummary.nextAcquisitionTrigger.title}
                      </div>
                      <div className="mt-1">
                        {monitoringSummary.nextAcquisitionTrigger.recommendedAction}
                      </div>
                    </>
                  ) : monitoringSummary.nextMonitor ? (
                    <>
                      <div className="font-medium text-foreground">
                        {monitoringSummary.nextMonitor.title}
                      </div>
                      <div className="mt-1">{monitoringSummary.nextMonitor.recommendedAction}</div>
                    </>
                  ) : (
                    "No monitoring item is currently seeded for this topic."
                  )}
                </div>
              </div>
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gauge className="size-4" />
                  Monitoring focus
                </div>
                <div className="mt-3 text-sm leading-6 text-muted-foreground">
                  {monitoringSummary.nextMonitor ? (
                    <>
                      <div className="font-medium text-foreground">
                        {monitoringSummary.nextMonitor.title}
                      </div>
                      <div className="mt-1">{monitoringSummary.nextMonitor.latestSignalSummary}</div>
                    </>
                  ) : (
                    "No monitoring item currently needs attention."
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/monitoring?topic=${topic.id}`}>Open topic monitoring queue</Link>
              </Button>
              {monitoringSummary.nextAcquisitionTrigger ? (
                <Button asChild variant="ghost">
                  <Link href={monitoringSummary.nextAcquisitionTrigger.links.acquisition.href}>
                    Open linked acquisition
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        </Surface>
      ) : null}

      {isComparedTopic ? (
        <Surface
          title="Portfolio context"
          description="This explains how this topic differs from the rest of the portfolio, especially where the maturity gap is most meaningful."
        >
          <div className="space-y-3">
            <p className="text-sm leading-7 text-muted-foreground">{comparisonSpotlight?.summary}</p>
            <div className="grid gap-3 md:grid-cols-3">
              {comparisonSpotlight?.decisiveDifferences.map((difference) => (
                <div
                  key={difference}
                  className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4 text-sm leading-6 text-foreground"
                >
                  {difference}
                </div>
              ))}
            </div>
          </div>
        </Surface>
      ) : null}

      <Surface
        title="Durable roots and working rules"
        description="The topic home is the main cockpit, but it still sits on explicit source-controlled roots. Use these rules when you need to drop from the rendered view back into the durable layer."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FolderTree className="size-4" />
              Canonical wiki
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This remains the source-of-truth knowledge layer.
            </p>
            <div className="mt-3 break-all font-mono text-xs text-muted-foreground">
              {topic.fileRoots.canonical}
            </div>
          </div>
          <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="size-4" />
              Obsidian projection
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The projection stays additive and local-useful, not the truth layer.
            </p>
            <div className="mt-3 break-all font-mono text-xs text-muted-foreground">
              {topic.fileRoots.obsidian}
            </div>
          </div>
          <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Gauge className="size-4" />
              Evaluation root
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use evaluation to guide upgrades, not to replace judgment.
            </p>
            <div className="mt-3 break-all font-mono text-xs text-muted-foreground">
              {topic.fileRoots.evaluation}
            </div>
          </div>
          <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Radar className="size-4" />
              Read first
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Start at the canonical entry or maintenance rhythm instead of jumping into isolated notes.
            </p>
          </div>
          <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Gauge className="size-4" />
              Judge honestly
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the maturity gap to decide what the topic still lacks before promoting it.
            </p>
          </div>
          <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FolderTree className="size-4" />
              Stay file-first
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The rendered surface is for use, but the canonical and projection roots stay explicit and source-controlled.
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
}
