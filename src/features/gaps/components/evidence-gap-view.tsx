import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  Gauge,
  Radar,
  SearchCheck,
  Scale,
} from "lucide-react";

import type { EvidenceGapItem, EvidenceGapOverview } from "@/lib/contracts/evidence-gap";
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

function statusVariant(status: EvidenceGapItem["status"]) {
  switch (status) {
    case "in-session":
      return "default";
    case "resolved":
      return "success";
    case "planned":
      return "warning";
    case "open":
    default:
      return "outline";
  }
}

function priorityVariant(priority: EvidenceGapItem["priority"]) {
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

function humanizeStatus(status: EvidenceGapItem["status"]) {
  return status.replace(/-/g, " ");
}

function humanizeType(gapType: EvidenceGapItem["gapType"]) {
  return gapType.replace(/-/g, " ");
}

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

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

function GapCard({
  gap,
  showTopic = true,
}: {
  gap: EvidenceGapItem;
  showTopic?: boolean;
}) {
  const resolvedDate = formatDate(gap.resolvedAt);

  return (
    <div className="rounded-[22px] border border-border/50 bg-background/62 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(gap.status)}>{humanizeStatus(gap.status)}</Badge>
        <Badge variant={priorityVariant(gap.priority)}>{gap.priority}</Badge>
        <Badge variant="outline">{humanizeType(gap.gapType)}</Badge>
        {showTopic ? (
          <Badge variant={stageVariant(gap.topicMaturityStage)}>{gap.topicTitle}</Badge>
        ) : null}
      </div>
      <div className="mt-3 text-[15px] font-medium leading-7 text-foreground">{gap.title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{gap.summary}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">Missing:</span> {gap.missingEvidence}
        </div>
        <div>
          <span className="font-medium text-foreground">Collect next:</span>{" "}
          {gap.nextEvidenceToAcquire}
        </div>
        {gap.acquisitionSessionTitle ? (
          <div>
            <span className="font-medium text-foreground">Session:</span>{" "}
            {gap.acquisitionSessionTitle}
          </div>
        ) : null}
        {gap.advancesQuestions.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Questions advance:</span>{" "}
            {gap.advancesQuestions.join("; ")}
          </div>
        ) : null}
        {gap.advancesSyntheses.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Syntheses advance:</span>{" "}
            {gap.advancesSyntheses.join("; ")}
          </div>
        ) : null}
        {gap.maturityBlockerStages.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Blocks maturity:</span>{" "}
            {gap.maturityBlockerStages.join("; ")}
          </div>
        ) : null}
        {gap.status === "resolved" && resolvedDate ? (
          <div>
            <span className="font-medium text-foreground">Resolved:</span> {resolvedDate}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={gap.links.gap.href}>Open gap</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={`/acquisition?topic=${gap.topicId}`}>Acquisition queue</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={gap.links.session.href}>
            {gap.acquisitionSessionStatus === "active" ? "Continue session" : "Acquisition session"}
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={gap.links.maintenance.href}>Maintenance</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={gap.links.canonicalReview.href}>
            Review target
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function EvidenceGapView({
  overview,
}: {
  overview: EvidenceGapOverview;
}) {
  const focusedTopic = overview.focusedTopic;
  const focusGap = overview.focusGap;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evidence gaps"
        title={
          focusedTopic ? `${focusedTopic.title} gaps` : "Evidence gaps"
        }
        badge={`${overview.summary.totalGaps} gaps`}
        actions={
          <div className="flex flex-wrap gap-2">
            {focusedTopic ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/questions?topic=${focusedTopic.id}`}>Questions</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/acquisition?topic=${focusedTopic.id}`}>Acquisition</Link>
                </Button>
              </>
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
          <Metric label="Gaps" value={String(overview.summary.totalGaps)} />
          <Metric label="High" value={String(overview.summary.highPriority)} />
          <Metric label="Questions" value={String(overview.summary.blockedQuestions)} />
          <Metric label="Syntheses" value={String(overview.summary.blockedSyntheses)} />
          <Metric label="Maturity" value={String(overview.summary.maturityBlockers)} />
          <Metric label="Resolved" value={String(overview.summary.resolved)} />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Focus</h2>
            <SearchCheck className="size-5 text-muted-foreground" />
          </div>
          <div className="px-5 py-5">
            {focusGap ? (
              <div className="space-y-4 rounded-[22px] border border-border/50 bg-background/62 px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(focusGap.status)}>
                    {humanizeStatus(focusGap.status)}
                  </Badge>
                  <Badge variant={priorityVariant(focusGap.priority)}>{focusGap.priority}</Badge>
                  <Badge variant="outline">{humanizeType(focusGap.gapType)}</Badge>
                  <Badge variant={stageVariant(focusGap.topicMaturityStage)}>
                    {focusGap.topicTitle}
                  </Badge>
                  {formatDate(focusGap.resolvedAt) ? (
                    <Badge variant="outline">{formatDate(focusGap.resolvedAt)}</Badge>
                  ) : null}
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    {focusGap.title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusGap.summary}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Why it matters</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusGap.whyItMatters}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Missing evidence</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusGap.missingEvidence}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Highest-leverage next acquisition</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusGap.nextEvidenceToAcquire}
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <div className="text-sm font-medium text-foreground">Context packs</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusGap.preferredContextPackTitles.length > 0
                        ? focusGap.preferredContextPackTitles.join("; ")
                        : "No preferred context packs are seeded yet."}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">First surfaces to inspect</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusGap.firstPageTitles.length > 0
                        ? focusGap.firstPageTitles.join("; ")
                        : "No first-pass page bundle is seeded yet."}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">First sources</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusGap.firstSourceTitles.length > 0
                        ? focusGap.firstSourceTitles.join("; ")
                        : "No first source bundle is seeded yet."}
                    </p>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">Success looks like</div>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {focusGap.successCriteria.join("; ")}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={focusGap.links.session.href}>
                      {focusGap.acquisitionSessionStatus === "active"
                        ? "Continue"
                        : "Session"}
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={`/acquisition?topic=${focusGap.topicId}`}>Acquisition</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={focusGap.links.questionQueue.href}>Questions</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusGap.links.canonicalReview.href}>
                      Page
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-border/50 bg-background/62 px-5 py-5 text-sm leading-6 text-muted-foreground">
                No gaps yet.
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
              <div className="text-sm font-medium text-foreground">Questions that advance</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusGap?.advancesQuestions.length
                  ? focusGap.advancesQuestions.join("; ")
                  : "No linked questions."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Syntheses that advance</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusGap?.advancesSyntheses.length
                  ? focusGap.advancesSyntheses.join("; ")
                  : "No linked syntheses."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Review targets</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusGap?.canonicalReviewTitles.length
                  ? focusGap.canonicalReviewTitles.join("; ")
                  : "No review targets."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Maturity and quality impact</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusGap
                  ? [
                      focusGap.maturityBlockerStages.length > 0
                        ? `Blocks ${focusGap.maturityBlockerStages.join("; ")}`
                        : null,
                      ...focusGap.qualityBlockerNotes,
                    ]
                      .filter(Boolean)
                      .join("; ") || "No extra impact notes."
                  : "Select a gap to see impact."}
              </div>
            </div>
            {focusGap?.resolutionSummary ? (
              <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Gauge className="size-4" />
                  Resolution note
                </div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">
                  {focusGap.resolutionSummary}
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
                  {bucket.gaps.length} gaps
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {bucket.title}
                </h2>
              </div>
              <Radar className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-3 px-5 py-5">
              {bucket.gaps.length > 0 ? (
                bucket.gaps.map((gap) => (
                  <GapCard key={`${bucket.id}-${gap.id}`} gap={gap} showTopic={!focusedTopic} />
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
              Which topics are most blocked?
            </h2>
          </div>
          <FlaskConical className="size-5 text-muted-foreground" />
        </div>
        <div className="grid gap-4 px-5 py-5 xl:grid-cols-2">
          {overview.topics.map((topic) => (
            <div
              key={topic.topicId}
              className="rounded-[22px] border border-border/50 bg-background/62 px-4 py-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={stageVariant(topic.topicMaturityStage)}>{topic.topicTitle}</Badge>
                <Badge variant="outline">{topic.gapCount} gaps</Badge>
                <Badge variant="outline">{topic.highPriorityCount} high priority</Badge>
                <Badge variant="outline">{topic.maturityBlockerCount} maturity blockers</Badge>
                <Badge variant="outline">{topic.blockedQuestionCount} questions blocked</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{topic.summary}</p>
              {topic.nextGap ? (
                <div className="mt-3 rounded-[18px] border border-border/50 bg-background/75 px-4 py-4">
                  <div className="text-sm font-medium text-foreground">Next evidence to acquire</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">{topic.nextGap.title}</span>
                    {" - "}
                    {topic.nextGap.nextEvidenceToAcquire}
                  </div>
                </div>
              ) : null}
              {topic.recentlyResolved ? (
                <div className="mt-3 rounded-[18px] border border-border/50 bg-background/75 px-4 py-4">
                  <div className="text-sm font-medium text-foreground">Recently resolved</div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    <span className="font-medium text-foreground">{topic.recentlyResolved.title}</span>
                    {" - "}
                    {topic.recentlyResolved.resolutionSummary ?? topic.recentlyResolved.summary}
                  </div>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <Link href={`/gaps?topic=${topic.topicId}`}>Open topic gaps</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/topics/${topic.topicId}`}>Topic home</Link>
                </Button>
                {topic.nextGap ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={topic.nextGap.links.gap.href}>
                      Focus next
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
