import Link from "next/link";
import { ArrowRight, FlaskConical, FolderTree, Gauge, Radar, Sparkles } from "lucide-react";

import type { QuestionWorkflowTopicSummary } from "@/lib/contracts/research-question";
import type { ResearchSessionTopicSummary } from "@/lib/contracts/research-session";
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

export function TopicWorkspaceIntro({
  topic,
  comparisonSpotlight,
  questionWorkflow,
  sessionSummary,
}: {
  topic: TopicPortfolioItem;
  comparisonSpotlight: TopicPortfolioComparison | null;
  questionWorkflow: QuestionWorkflowTopicSummary | null;
  sessionSummary: ResearchSessionTopicSummary | null;
}) {
  const isComparedTopic =
    comparisonSpotlight &&
    (comparisonSpotlight.leaderId === topic.id ||
      comparisonSpotlight.challengerId === topic.id);

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,246,240,0.96))] p-6 ring-1 ring-border/55">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={stageVariant(topic.maturityStage)}>{topic.maturityStage}</Badge>
          <Badge variant="outline">{topic.kind === "example" ? "official example" : "topic workspace"}</Badge>
          <Badge variant="outline">{topic.corpusFileCount} corpus files</Badge>
          <Badge variant="outline">{topic.pageCount} pages</Badge>
          <Badge variant="outline">{topic.contextPackCount} context packs</Badge>
        </div>
        <div className="mt-4 max-w-4xl space-y-3">
          <p className="text-lg font-medium text-foreground">{topic.description}</p>
          <p className="text-sm leading-7 text-muted-foreground">{topic.summary}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href={topic.links.canonical.href}>
              Open canonical start
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={topic.links.maintenance.href}>Open maintenance rhythm</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href="/topics">Back to portfolio</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
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

        <Surface
          title="Working roots"
          description="The rendered topic home is a working view over these source-controlled roots. The canonical wiki remains the truth layer."
        >
          <div className="space-y-3 text-sm leading-6 text-muted-foreground">
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <FolderTree className="size-4" />
                Canonical wiki
              </div>
              <div className="mt-2 break-all font-mono text-xs">{topic.fileRoots.canonical}</div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Sparkles className="size-4" />
                Obsidian projection
              </div>
              <div className="mt-2 break-all font-mono text-xs">{topic.fileRoots.obsidian}</div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Gauge className="size-4" />
                Evaluation root
              </div>
              <div className="mt-2 break-all font-mono text-xs">{topic.fileRoots.evaluation}</div>
            </div>
          </div>
        </Surface>
      </div>

      {questionWorkflow ? (
        <Surface
          title="Question workflow"
          description="These questions should drive the next pass of reading, synthesis, or evidence gathering for this topic."
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
                    <Button asChild size="sm" variant="outline">
                      <Link href={question.links.sessionWorkspace.href}>
                        {question.hasActiveSession ? "Continue session" : "Open session"}
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link href={`/questions?topic=${topic.id}`}>Open topic question queue</Link>
              </Button>
              <Button asChild variant="ghost">
                <Link href="/questions">Open full question portfolio</Link>
              </Button>
            </div>
          </div>
        </Surface>
      ) : null}

      {sessionSummary ? (
        <Surface
          title="Research sessions"
          description="Sessions turn question state into actual bounded work: what we loaded, what changed, and what should harden next."
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
                      <div className="font-medium text-foreground">{sessionSummary.nextSession.title}</div>
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
                      <div className="font-medium text-foreground">{sessionSummary.recentSession.title}</div>
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
              <Button asChild variant="ghost">
                <Link href="/sessions">Open full session portfolio</Link>
              </Button>
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
        title="Why this page exists"
        description="A topic home should help you begin well, resume work quickly, and stay grounded in the same wiki that the rest of the product uses."
      >
        <div className="grid gap-4 lg:grid-cols-3">
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
