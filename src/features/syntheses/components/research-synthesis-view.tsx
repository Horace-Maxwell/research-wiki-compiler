import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  FileSymlink,
  GitBranchPlus,
  Lightbulb,
  Radar,
  Scale,
} from "lucide-react";

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

function humanizeStatus(status: ResearchSynthesisItem["status"]) {
  return status.replace(/-/g, " ");
}

function humanizeDecisionType(type: ResearchSynthesisDecisionType) {
  switch (type) {
    case "not-enough-evidence":
      return "not enough evidence";
    default:
      return type.replace(/-/g, " ");
  }
}

function humanizeQuestionEffect(effect: ResearchSynthesisItem["questionImpacts"][number]["effect"]) {
  return effect.replace(/-/g, " ");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
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

export function ResearchSynthesisView({
  overview,
}: {
  overview: ResearchSynthesisOverview;
}) {
  const focusedTopic = overview.focusedTopic;
  const focusSynthesis = overview.focusSynthesis;
  const decisionLoopCount = overview.summary.candidate + overview.summary.inProgress;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Research syntheses"
        title={
          focusSynthesis
            ? focusedTopic
              ? `${focusedTopic.title} synthesis loop`
              : "Syntheses turn research into durable judgment"
            : "Syntheses turn research into durable judgment"
        }
        description={
          focusedTopic
            ? "Use this topic-focused synthesis lane to see what is ready to publish, what still belongs in the decision loop, which sessions contributed, and what canonical or maintenance surfaces should change next."
            : "Syntheses are now a first-class operating surface across the portfolio. Use them to decide when evidence is strong enough to harden, what stays provisional, and what changed in the canonical wiki because a synthesis was published."
        }
        badge={`${overview.summary.totalSyntheses} syntheses`}
        actions={
          <div className="flex flex-wrap gap-2">
            {focusedTopic ? (
              <Button asChild variant="outline">
                <Link href="/syntheses">Open full synthesis portfolio</Link>
              </Button>
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
            label="Syntheses"
            value={String(overview.summary.totalSyntheses)}
            detail="Explicit synthesis objects currently modeled in the selected workspace scope."
          />
          <Metric
            label="Ready"
            value={String(overview.summary.ready)}
            detail="Syntheses that should plausibly publish on the next bounded pass."
          />
          <Metric
            label="Decision loop"
            value={String(decisionLoopCount)}
            detail="Candidates and in-progress syntheses still converting session evidence into durable judgment."
          />
          <Metric
            label="Published"
            value={String(overview.summary.published)}
            detail="Durable syntheses already shaping the canonical and maintenance layers."
          />
          <Metric
            label="Changed canon"
            value={String(overview.summary.changedCanonical)}
            detail="Syntheses that already changed a canonical page or visibly narrowed durable guidance."
          />
          <Metric
            label="Watch impact"
            value={String(overview.summary.introducedWatchpoints)}
            detail="Syntheses that introduced or sharpened monitoring and watchpoint logic."
          />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Focus synthesis
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                What is this synthesis changing?
              </h2>
            </div>
            <Lightbulb className="size-5 text-muted-foreground" />
          </div>
          <div className="px-5 py-5">
            {focusSynthesis ? (
              <div className="space-y-4 rounded-[22px] border border-border/50 bg-background/62 px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(focusSynthesis.status)}>
                    {humanizeStatus(focusSynthesis.status)}
                  </Badge>
                  <Badge variant="outline">{focusSynthesis.confidencePercent}% confidence</Badge>
                  <Badge variant={stageVariant(focusSynthesis.topicMaturityStage)}>
                    {focusSynthesis.topicTitle}
                  </Badge>
                  <Badge variant="outline">{formatDate(focusSynthesis.updatedAt)}</Badge>
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
                    <div className="text-sm font-medium text-foreground">Source questions</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusSynthesis.sourceQuestions.join("; ")}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Source sessions</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusSynthesis.sourceSessions.length > 0
                        ? focusSynthesis.sourceSessions.join("; ")
                        : "No source sessions are explicitly linked yet."}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Durable conclusion</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusSynthesis.durableConclusion}
                  </p>
                </div>
                {focusSynthesis.provisionalBoundary ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">Still provisional</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusSynthesis.provisionalBoundary}
                    </p>
                  </div>
                ) : null}
                {focusSynthesis.changedCanonicalSummary ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">Canonical change</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusSynthesis.changedCanonicalSummary}
                    </p>
                  </div>
                ) : null}
                <div>
                  <div className="text-sm font-medium text-foreground">Decision layer</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {focusSynthesis.decisions.map((decision) => (
                      <div
                        key={`${focusSynthesis.id}-${decision.title}`}
                        className="rounded-[18px] border border-border/50 bg-background/75 px-4 py-4"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={decisionVariant(decision.type)}>
                            {humanizeDecisionType(decision.type)}
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
                    <div className="text-sm font-medium text-foreground">Question effects</div>
                    <div className="mt-3 space-y-2">
                      {focusSynthesis.questionImpacts.map((impact) => (
                        <div
                          key={`${focusSynthesis.id}-${impact.questionId}-${impact.effect}`}
                          className="rounded-[16px] border border-border/50 bg-background/75 px-3 py-3 text-sm leading-6 text-muted-foreground"
                        >
                          <span className="font-medium text-foreground">
                            {humanizeQuestionEffect(impact.effect)}:
                          </span>{" "}
                          {impact.note}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={focusSynthesis.links.questionQueue.href}>Question queue</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={focusSynthesis.links.sessionWorkspace.href}>Source sessions</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusSynthesis.links.maintenance.href}>Maintenance rhythm</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusSynthesis.links.publishedPage.href}>
                      {focusSynthesis.hasPublishedPage ? "Published page" : "Synthesis target"}
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusSynthesis.links.canonicalTarget.href}>
                      Canonical target
                      <FileSymlink className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[18px] bg-background/65 px-4 py-5 text-sm leading-6 text-muted-foreground">
                No syntheses are currently seeded.
              </div>
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
                Read syntheses by workflow need
              </h2>
            </div>
            <Radar className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            {overview.buckets.map((bucket) => (
              <div key={bucket.id} className="rounded-[20px] border border-border/50 bg-background/62 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{bucket.syntheses.length}</Badge>
                  <div className="text-sm font-medium text-foreground">{bucket.title}</div>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{bucket.description}</p>
                <div className="mt-3 space-y-2">
                  {bucket.syntheses.slice(0, 3).map((synthesis) => (
                    <Link
                      key={`${bucket.id}-${synthesis.topicId}-${synthesis.id}`}
                      href={synthesis.links.synthesis.href}
                      className="block rounded-[16px] border border-border/50 bg-background/75 px-3 py-3 transition-colors hover:bg-background"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusVariant(synthesis.status)}>
                          {humanizeStatus(synthesis.status)}
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
              Topic syntheses
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              How durable synthesis depth differs by topic
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
                      href={`/syntheses?topic=${topic.topicId}`}
                      className="text-lg font-semibold tracking-tight text-foreground"
                    >
                      {topic.topicTitle}
                    </Link>
                    <Badge variant={stageVariant(topic.topicMaturityStage)}>
                      {topic.topicMaturityStage}
                    </Badge>
                    <Badge variant="outline">{topic.synthesisCount} syntheses</Badge>
                  </div>
                  <p className="max-w-[75ch] text-sm leading-7 text-muted-foreground">{topic.summary}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span>{topic.readyCount} ready</span>
                    <span>{topic.inProgressCount} in progress</span>
                    <span>{topic.publishedCount} published</span>
                    <span>{topic.changedCanonicalCount} changed canonical</span>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Next synthesis
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {topic.nextSynthesis?.title ?? "No active synthesis candidate is currently seeded."}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {topic.nextSynthesis?.recommendedNextStep ??
                          "The next durable synthesis will appear here once the topic accumulates one."}
                      </div>
                    </div>
                    <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Recent durable synthesis
                      </div>
                      <div className="mt-2 text-sm font-medium text-foreground">
                        {topic.recentPublished?.title ?? "No published synthesis yet."}
                      </div>
                      <div className="mt-1 text-sm leading-6 text-muted-foreground">
                        {topic.recentPublished?.changedCanonicalSummary ??
                          topic.recentPublished?.durableConclusion ??
                          "Once a synthesis publishes, its canonical effect will surface here."}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button asChild variant="outline">
                    <Link href={`/syntheses?topic=${topic.topicId}`}>Topic syntheses</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={`/topics/${topic.topicId}`}>Topic home</Link>
                  </Button>
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
              <Scale className="size-4" />
              Publish honestly
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ready and in-progress syntheses now stay separate from published pages, so provisional judgment does not quietly masquerade as durable knowledge.
            </p>
          </div>
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ArrowUpRight className="size-4" />
              Show canonical effects
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Each synthesis now makes its canonical targets, maintenance updates, and watchpoint consequences explicit instead of leaving them implicit in prose.
            </p>
          </div>
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileSymlink className="size-4" />
              Keep decisions resumable
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Decision cards, question effects, and source-session links make it much clearer why a synthesis advanced and what should happen next.
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
}
