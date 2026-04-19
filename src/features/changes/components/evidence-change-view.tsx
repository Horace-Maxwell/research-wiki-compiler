import Link from "next/link";
import { ArrowRight, ArrowUpRight, GitBranchPlus, Radar, RefreshCw, Scale } from "lucide-react";

import type {
  EvidenceChangeItem,
  EvidenceChangeOverview,
} from "@/lib/contracts/evidence-change";
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

function stateVariant(state: EvidenceChangeItem["state"]) {
  switch (state) {
    case "reopened":
      return "default";
    case "review-needed":
      return "warning";
    case "stabilized":
    default:
      return "success";
  }
}

function priorityVariant(priority: EvidenceChangeItem["priority"]) {
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

function humanizeState(state: EvidenceChangeItem["state"]) {
  return state.replace(/-/g, " ");
}

function humanizeType(changeType: EvidenceChangeItem["changeType"]) {
  return changeType.replace(/-/g, " ");
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

function ChangeCard({
  change,
  showTopic = true,
}: {
  change: EvidenceChangeItem;
  showTopic?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-border/50 bg-background/62 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={stateVariant(change.state)}>{humanizeState(change.state)}</Badge>
        <Badge variant={priorityVariant(change.priority)}>{change.priority}</Badge>
        <Badge variant="outline">{humanizeType(change.changeType)}</Badge>
        {showTopic ? (
          <Badge variant={stageVariant(change.topicMaturityStage)}>{change.topicTitle}</Badge>
        ) : null}
      </div>
      <div className="mt-3 text-[15px] font-medium leading-7 text-foreground">{change.title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{change.summary}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">Changed:</span> {formatDate(change.changedAt)}
        </div>
        <div>
          <span className="font-medium text-foreground">Impact:</span> {change.impactSummary}
        </div>
        {change.reopenQuestions.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Reopens:</span>{" "}
            {change.reopenQuestions.join("; ")}
          </div>
        ) : null}
        {change.canonicalReviewTitles.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Review:</span>{" "}
            {change.canonicalReviewTitles.join("; ")}
          </div>
        ) : null}
        {change.likelyStableTitles.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Likely stable:</span>{" "}
            {change.likelyStableTitles.join("; ")}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={change.links.change.href}>Open change</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/monitoring?topic=${change.topicId}`}>Monitoring queue</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={change.links.maintenance.href}>Maintenance</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={change.links.canonicalReview.href}>
            Review target
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function EvidenceChangeView({
  overview,
}: {
  overview: EvidenceChangeOverview;
}) {
  const focusedTopic = overview.focusedTopic;
  const focusChange = overview.focusChange;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evidence changes"
        title={
          focusedTopic ? `${focusedTopic.title} changes` : "Evidence changes"
        }
        badge={`${overview.summary.totalChanges} changes`}
        actions={
          <div className="flex flex-wrap gap-2">
            {focusedTopic ? (
              <Button asChild variant="outline">
                <Link href={`/syntheses?topic=${focusedTopic.id}`}>Syntheses</Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href="/topics">Topics</Link>
              </Button>
            )}
            <Button asChild>
              <Link href={focusedTopic ? `/topics/${focusedTopic.id}` : "/topics/openclaw"}>
                {focusedTopic ? "Topic" : "Showcase"}
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <Surface className="px-5 py-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
          <Metric label="Changes" value={String(overview.summary.totalChanges)} />
          <Metric label="Reopen" value={String(overview.summary.reopened)} />
          <Metric label="Review" value={String(overview.summary.reviewNeeded)} />
          <Metric label="Stable" value={String(overview.summary.stabilized)} />
          <Metric label="Canon" value={String(overview.summary.canonicalReview)} />
          <Metric label="Questions" value={String(overview.summary.reopenedQuestions)} />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Focus</h2>
            <RefreshCw className="size-5 text-muted-foreground" />
          </div>
          <div className="px-5 py-5">
            {focusChange ? (
              <div className="space-y-4 rounded-[22px] border border-border/50 bg-background/62 px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={stateVariant(focusChange.state)}>
                    {humanizeState(focusChange.state)}
                  </Badge>
                  <Badge variant={priorityVariant(focusChange.priority)}>
                    {focusChange.priority}
                  </Badge>
                  <Badge variant="outline">{humanizeType(focusChange.changeType)}</Badge>
                  <Badge variant={stageVariant(focusChange.topicMaturityStage)}>
                    {focusChange.topicTitle}
                  </Badge>
                  <Badge variant="outline">{formatDate(focusChange.changedAt)}</Badge>
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    {focusChange.title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusChange.summary}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Why it matters</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusChange.whyItMatters}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Impact summary</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusChange.impactSummary}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Evidence bundles</div>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {focusChange.evidenceBundles.map((bundle) => (
                      <div
                        key={bundle.id}
                        className="rounded-[18px] border border-border/50 bg-background/75 px-4 py-4"
                      >
                        <div className="text-sm font-medium text-foreground">{bundle.title}</div>
                        <div className="mt-1 text-sm leading-6 text-muted-foreground">
                          {bundle.summary}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={focusChange.links.maintenance.href}>Maintenance</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/monitoring?topic=${focusChange.topicId}`}>Monitoring</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={focusChange.links.questionQueue.href}>Questions</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusChange.links.canonicalReview.href}>
                      Review target
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-border/50 bg-background/62 px-5 py-5 text-sm leading-6 text-muted-foreground">
                No evidence changes are seeded yet for the selected scope.
              </div>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Impact</h2>
            <Scale className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Questions reopened</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusChange?.reopenQuestions.length
                  ? focusChange.reopenQuestions.join("; ")
                  : "No reopened questions."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Syntheses to re-check</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusChange?.staleSyntheses.length
                  ? focusChange.staleSyntheses.join("; ")
                  : "No synthesis was explicitly marked stale by the focused change."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Review targets</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusChange?.canonicalReviewTitles.length
                  ? focusChange.canonicalReviewTitles.join("; ")
                  : "No review targets."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Likely stable surfaces</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusChange?.likelyStableTitles.length
                  ? focusChange.likelyStableTitles.join("; ")
                  : "No explicit stable surfaces were called out for the focused change."}
              </div>
            </div>
            {focusChange ? (
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <GitBranchPlus className="size-4" />
                  Recommended next move
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  {focusChange.recommendedAction}
                </div>
              </div>
            ) : null}
          </div>
        </Surface>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {overview.buckets.map((bucket) => (
          <Surface key={bucket.id}>
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div className="space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {bucket.changes.length} changes
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {bucket.title}
                </h2>
              </div>
              <Radar className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-3 px-5 py-5">
              {bucket.changes.length > 0 ? (
                bucket.changes.map((change) => (
                  <ChangeCard
                    key={`${bucket.id}-${change.id}`}
                    change={change}
                    showTopic={!focusedTopic}
                  />
                ))
              ) : (
                <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4 text-sm leading-6 text-muted-foreground">
                  Nothing here.
                </div>
              )}
            </div>
          </Surface>
        ))}
      </div>

      <Surface>
        <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
          <div className="space-y-2">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Topic summaries
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Which topics moved most?
            </h2>
          </div>
          <GitBranchPlus className="size-5 text-muted-foreground" />
        </div>
        <div className="grid gap-4 px-5 py-5 xl:grid-cols-2">
          {overview.topics.map((topic) => (
            <div
              key={topic.topicId}
              className="rounded-[22px] border border-border/50 bg-background/62 px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={stageVariant(topic.topicMaturityStage)}>{topic.topicTitle}</Badge>
                <Badge variant="outline">{topic.changeCount} changes</Badge>
                <Badge variant="outline">{topic.reopenedCount} reopened</Badge>
                <Badge variant="outline">{topic.reviewNeededCount} review needed</Badge>
                <Badge variant="outline">{topic.canonicalReviewCount} review</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{topic.summary}</p>
              {topic.latestChange ? (
                <div className="mt-3 rounded-[18px] border border-border/50 bg-background/75 px-4 py-4">
                  <div className="text-sm font-medium text-foreground">Latest change</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">{topic.latestChange.title}</span>
                    {" - "}
                    {topic.latestChange.impactSummary}
                  </div>
                </div>
              ) : null}
              {topic.nextReview ? (
                <div className="mt-3 rounded-[18px] border border-border/50 bg-background/75 px-4 py-4">
                  <div className="text-sm font-medium text-foreground">Next review</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {topic.nextReview.recommendedAction}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/changes?topic=${topic.topicId}`}>Open topic changes</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/topics/${topic.topicId}`}>Topic home</Link>
                </Button>
                {topic.latestChange ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={topic.latestChange.links.change.href}>
                      Focus latest
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
