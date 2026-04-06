import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Radar,
  RefreshCw,
  SearchCheck,
} from "lucide-react";

import type { MonitoringItem, MonitoringOverview } from "@/lib/contracts/monitoring-item";
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

function statusVariant(status: MonitoringItem["status"]) {
  switch (status) {
    case "spawned-acquisition":
    case "triggered":
      return "default";
    case "review-needed":
      return "warning";
    case "stable":
      return "success";
    case "watching":
    default:
      return "outline";
  }
}

function priorityVariant(priority: MonitoringItem["priority"]) {
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

function humanize(value: string) {
  return value.replace(/-/g, " ");
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

function MonitoringCard({
  item,
  showTopic = true,
}: {
  item: MonitoringItem;
  showTopic?: boolean;
}) {
  const signalDate = formatDate(item.triggeredAt ?? item.stableSince ?? item.lastCheckedAt);

  return (
    <div className="rounded-[22px] border border-border/50 bg-background/62 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(item.status)}>{humanize(item.status)}</Badge>
        <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
        <Badge variant="outline">{humanize(item.mode)}</Badge>
        <Badge variant="outline">{humanize(item.triggerAction)}</Badge>
        {showTopic ? (
          <Badge variant={stageVariant(item.topicMaturityStage)}>{item.topicTitle}</Badge>
        ) : null}
      </div>
      <div className="mt-3 text-[15px] font-medium leading-7 text-foreground">{item.title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">Latest signal:</span>{" "}
          {item.latestSignalSummary}
        </div>
        {item.linkedAcquisitionTaskTitles.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Linked acquisition:</span>{" "}
            {item.linkedAcquisitionTaskTitles.join("; ")}
          </div>
        ) : null}
        {item.canonicalReviewTitles.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Review surfaces:</span>{" "}
            {item.canonicalReviewTitles.join("; ")}
          </div>
        ) : null}
        {signalDate ? (
          <div>
            <span className="font-medium text-foreground">Latest checkpoint:</span> {signalDate}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={item.links.monitor.href}>Open monitor</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={item.links.acquisition.href}>Acquisition</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={item.links.canonicalReview.href}>
            Review target
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function MonitoringView({
  overview,
}: {
  overview: MonitoringOverview;
}) {
  const focusedTopic = overview.focusedTopic;
  const focusMonitor = overview.focusMonitor;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Monitoring"
        title={
          focusedTopic
            ? `${focusedTopic.title} monitoring queue`
            : "Monitoring decides when watchpoints become work"
        }
        description={
          focusedTopic
            ? "Use this topic-focused monitoring queue to see which signals stay passive, which ones only mark review, and which ones should spawn new acquisition or reopen work."
            : "Monitoring is now a first-class workflow lane across the portfolio. Use it to distinguish passive watchfulness from the events that should trigger bounded review, new acquisition, or research reopen actions."
        }
        badge={`${overview.summary.totalItems} monitors`}
        actions={
          <div className="flex flex-wrap gap-2">
            {focusedTopic ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/monitoring">Open full monitoring portfolio</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/acquisition?topic=${focusedTopic.id}`}>Open acquisition queue</Link>
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
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Monitors"
            value={String(overview.summary.totalItems)}
            detail="Meaningful monitoring items currently modeled in the selected workspace scope."
          />
          <Metric
            label="Spawn work"
            value={String(overview.summary.spawnedAcquisition)}
            detail="Monitoring signals already strong enough to spawn bounded acquisition work."
          />
          <Metric
            label="Review needed"
            value={String(overview.summary.reviewNeeded)}
            detail="Signals that should mark bounded review without necessarily reopening all work."
          />
          <Metric
            label="Triggered"
            value={String(overview.summary.triggered)}
            detail="Monitoring items actively signaling that something changed and needs attention."
          />
          <Metric
            label="Periodic review"
            value={String(overview.summary.periodicReview)}
            detail="Watch surfaces that need a cadence because they are not yet background-stable."
          />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Focus monitor
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                What should we watch or escalate?
              </h2>
            </div>
            <Radar className="size-5 text-muted-foreground" />
          </div>
          <div className="px-5 py-5">
            {focusMonitor ? (
              <div className="space-y-4 rounded-[22px] border border-border/50 bg-background/62 px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(focusMonitor.status)}>
                    {humanize(focusMonitor.status)}
                  </Badge>
                  <Badge variant={priorityVariant(focusMonitor.priority)}>
                    {focusMonitor.priority}
                  </Badge>
                  <Badge variant="outline">{humanize(focusMonitor.mode)}</Badge>
                  <Badge variant="outline">{humanize(focusMonitor.triggerAction)}</Badge>
                  <Badge variant={stageVariant(focusMonitor.topicMaturityStage)}>
                    {focusMonitor.topicTitle}
                  </Badge>
                  {formatDate(focusMonitor.triggeredAt ?? focusMonitor.stableSince ?? focusMonitor.lastCheckedAt) ? (
                    <Badge variant="outline">
                      {formatDate(
                        focusMonitor.triggeredAt ??
                          focusMonitor.stableSince ??
                          focusMonitor.lastCheckedAt,
                      )}
                    </Badge>
                  ) : null}
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    {focusMonitor.title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusMonitor.summary}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Why it matters</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusMonitor.whyItMatters}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Latest signal</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusMonitor.latestSignalSummary}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Trigger signals</div>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {focusMonitor.triggerSignals.map((signal) => (
                      <li key={signal}>- {signal}</li>
                    ))}
                  </ul>
                </div>
                {focusMonitor.suggestedContextPackTitles.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">Load these context packs</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {focusMonitor.suggestedContextPackTitles.map((pack) => (
                        <Badge key={pack} variant="outline">
                          {pack}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={focusMonitor.links.acquisition.href}>Open linked acquisition</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={focusMonitor.links.maintenance.href}>Open maintenance rhythm</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusMonitor.links.canonicalReview.href}>
                      Review target
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-border/50 bg-background/62 px-5 py-5 text-sm leading-6 text-muted-foreground">
                No monitoring item is seeded yet for the selected scope.
              </div>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Consequences
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Review, reopen, or keep watching
              </h2>
            </div>
            <RefreshCw className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Recommended action</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusMonitor?.recommendedAction ??
                  "Select a monitoring item to see the recommended escalation or review action."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Linked acquisition work</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusMonitor?.linkedAcquisitionTaskTitles.length
                  ? focusMonitor.linkedAcquisitionTaskTitles.join("; ")
                  : "No acquisition task is explicitly linked to the focused monitor."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Recent evidence changes</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusMonitor?.linkedChangeTitles.length
                  ? focusMonitor.linkedChangeTitles.join("; ")
                  : "No specific evidence change is linked to the focused monitor."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Canonical review surfaces</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusMonitor?.canonicalReviewTitles.length
                  ? focusMonitor.canonicalReviewTitles.join("; ")
                  : "This monitoring item does not currently point at a canonical review target."}
              </div>
            </div>
          </div>
        </Surface>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {overview.buckets.map((bucket) => (
          <Surface key={bucket.id}>
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div className="space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {bucket.id}
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">
                  {bucket.title}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">{bucket.description}</p>
              </div>
              <SearchCheck className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-3 px-5 py-5">
              {bucket.items.length > 0 ? (
                bucket.items.map((item) => (
                  <MonitoringCard
                    key={`${bucket.id}-${item.id}`}
                    item={item}
                    showTopic={!focusedTopic}
                  />
                ))
              ) : (
                <div className="rounded-[22px] border border-border/50 bg-background/62 px-5 py-5 text-sm leading-6 text-muted-foreground">
                  No monitoring item currently lands in this bucket.
                </div>
              )}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
