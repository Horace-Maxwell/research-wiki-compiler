import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  FlaskConical,
  SearchCheck,
  Sparkles,
} from "lucide-react";

import type {
  AcquisitionTaskItem,
  AcquisitionTaskOverview,
} from "@/lib/contracts/acquisition-task";
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

function statusVariant(status: AcquisitionTaskItem["status"]) {
  switch (status) {
    case "active":
      return "default";
    case "captured":
      return "warning";
    case "integrated":
      return "success";
    case "queued":
    default:
      return "outline";
  }
}

function priorityVariant(priority: AcquisitionTaskItem["priority"]) {
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

function TaskCard({
  task,
  showTopic = true,
}: {
  task: AcquisitionTaskItem;
  showTopic?: boolean;
}) {
  const integratedDate = formatDate(task.integratedAt);

  return (
    <div className="rounded-[22px] border border-border/50 bg-background/62 px-4 py-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={statusVariant(task.status)}>{humanize(task.status)}</Badge>
        <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
        <Badge variant="outline">{humanize(task.taskType)}</Badge>
        {showTopic ? (
          <Badge variant={stageVariant(task.topicMaturityStage)}>{task.topicTitle}</Badge>
        ) : null}
      </div>
      <div className="mt-3 text-[15px] font-medium leading-7 text-foreground">{task.title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{task.summary}</p>
      <div className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
        <div>
          <span className="font-medium text-foreground">Collect:</span> {task.evidenceTypeToCollect}
        </div>
        {task.nextSessionTitle ? (
          <div>
            <span className="font-medium text-foreground">Session:</span> {task.nextSessionTitle}
          </div>
        ) : null}
        {task.linkedEvidenceGapTitles.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Closes gaps:</span>{" "}
            {task.linkedEvidenceGapTitles.join("; ")}
          </div>
        ) : null}
        {task.linkedSyntheses.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Unlocks syntheses:</span>{" "}
            {task.linkedSyntheses.join("; ")}
          </div>
        ) : null}
        {task.maturityBlockerStages.length > 0 ? (
          <div>
            <span className="font-medium text-foreground">Maturity impact:</span>{" "}
            {task.maturityBlockerStages.join("; ")}
          </div>
        ) : null}
        {task.status === "integrated" && integratedDate ? (
          <div>
            <span className="font-medium text-foreground">Integrated:</span> {integratedDate}
          </div>
        ) : null}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={task.links.task.href}>Open task</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={task.links.session.href}>
            {task.nextSessionStatus === "active" ? "Continue session" : "Open session"}
          </Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={task.links.canonicalReview.href}>
            Review target
            <ArrowUpRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function AcquisitionTaskView({
  overview,
}: {
  overview: AcquisitionTaskOverview;
}) {
  const focusedTopic = overview.focusedTopic;
  const focusTask = overview.focusTask;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Acquisition"
        title={
          focusedTopic
            ? `${focusedTopic.title} acquisition queue`
            : "Acquisition turns missing evidence into bounded work"
        }
        description={
          focusedTopic
            ? "Use this topic-focused acquisition queue to see which evidence-collection pass should become the next session, what to inspect first, and how the result should flow back into syntheses, maintenance, and canonical review."
            : "Acquisition is now a first-class workflow lane across the portfolio. Use it to turn evidence gaps into bounded collection work with explicit session handoffs, ingestion steps, and maturity consequences."
        }
        badge={`${overview.summary.totalTasks} tasks`}
        actions={
          <div className="flex flex-wrap gap-2">
            {focusedTopic ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/acquisition">Open full acquisition portfolio</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href={`/gaps?topic=${focusedTopic.id}`}>Open topic gap lane</Link>
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
            label="Tasks"
            value={String(overview.summary.totalTasks)}
            detail="Meaningful acquisition tasks currently modeled in the selected workspace scope."
          />
          <Metric
            label="High priority"
            value={String(overview.summary.highPriority)}
            detail="Collection passes likely to move questions, syntheses, or maturity next."
          />
          <Metric
            label="Session ready"
            value={String(overview.summary.readyForSession)}
            detail="Tasks that already have a clear session handoff, context packs, and success criteria."
          />
          <Metric
            label="Awaiting ingestion"
            value={String(overview.summary.awaitingIngestion)}
            detail="Tasks where evidence was captured, but the system still needs the result integrated."
          />
          <Metric
            label="Maturity blockers"
            value={String(overview.summary.maturityBlockers)}
            detail="Tasks tied to advancing a real maturity step rather than just adding more work."
          />
          <Metric
            label="Integrated"
            value={String(overview.summary.integrated)}
            detail="Acquisition passes already folded back into the knowledge system."
          />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Focus task
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                What should we collect next?
              </h2>
            </div>
            <SearchCheck className="size-5 text-muted-foreground" />
          </div>
          <div className="px-5 py-5">
            {focusTask ? (
              <div className="space-y-4 rounded-[22px] border border-border/50 bg-background/62 px-5 py-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusVariant(focusTask.status)}>
                    {humanize(focusTask.status)}
                  </Badge>
                  <Badge variant={priorityVariant(focusTask.priority)}>{focusTask.priority}</Badge>
                  <Badge variant="outline">{humanize(focusTask.taskType)}</Badge>
                  <Badge variant={stageVariant(focusTask.topicMaturityStage)}>
                    {focusTask.topicTitle}
                  </Badge>
                  {formatDate(focusTask.integratedAt) ? (
                    <Badge variant="outline">{formatDate(focusTask.integratedAt)}</Badge>
                  ) : null}
                </div>
                <div>
                  <div className="text-lg font-semibold tracking-tight text-foreground">
                    {focusTask.title}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusTask.summary}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Why it matters</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusTask.whyItMatters}
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">Evidence to collect</div>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {focusTask.evidenceTypeToCollect}
                  </p>
                </div>
                {focusTask.suggestedSourceTargets.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">Start with these sources</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {focusTask.suggestedSourceTargets.map((source) => (
                        <Badge key={source} variant="outline">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {focusTask.suggestedContextPackTitles.length > 0 ? (
                  <div>
                    <div className="text-sm font-medium text-foreground">Load these context packs</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {focusTask.suggestedContextPackTitles.map((pack) => (
                        <Badge key={pack} variant="outline">
                          {pack}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div>
                  <div className="text-sm font-medium text-foreground">Done means</div>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {focusTask.successCriteria.map((criterion) => (
                      <li key={criterion}>- {criterion}</li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild>
                    <Link href={focusTask.links.session.href}>
                      {focusTask.nextSessionStatus === "active" ? "Continue session" : "Open session"}
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href={focusTask.links.sources.href}>Open first inspection surface</Link>
                  </Button>
                  <Button asChild variant="ghost">
                    <Link href={focusTask.links.canonicalReview.href}>
                      Review target
                      <ArrowUpRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[22px] border border-border/50 bg-background/62 px-5 py-5 text-sm leading-6 text-muted-foreground">
                No acquisition task is seeded yet for the selected scope.
              </div>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Integration
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                How it feeds back in
              </h2>
            </div>
            <Sparkles className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Closes evidence gaps</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusTask?.linkedEvidenceGapTitles.length
                  ? focusTask.linkedEvidenceGapTitles.join("; ")
                  : "No explicit evidence gap is linked to the focused task."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Unlocks questions or syntheses</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusTask
                  ? [
                      focusTask.linkedQuestions.length
                        ? `Questions: ${focusTask.linkedQuestions.join("; ")}`
                        : null,
                      focusTask.linkedSyntheses.length
                        ? `Syntheses: ${focusTask.linkedSyntheses.join("; ")}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "Select a task to see which research surfaces it is meant to unlock."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Ingestion next step</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusTask?.ingestionNextStep ?? "No ingestion step is recorded for the focused task."}
              </div>
            </div>
            <div className="rounded-[18px] border border-border/50 bg-background/60 px-4 py-4">
              <div className="text-sm font-medium text-foreground">Recent result or change impact</div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                {focusTask?.resultSummary ??
                  (focusTask?.resultChangeTitles.length
                    ? focusTask.resultChangeTitles.join("; ")
                    : "No downstream change or integrated result is recorded yet.")}
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
              <FlaskConical className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-3 px-5 py-5">
              {bucket.tasks.length > 0 ? (
                bucket.tasks.map((task) => (
                  <TaskCard
                    key={`${bucket.id}-${task.id}`}
                    showTopic={!focusedTopic}
                    task={task}
                  />
                ))
              ) : (
                <div className="rounded-[22px] border border-border/50 bg-background/62 px-5 py-5 text-sm leading-6 text-muted-foreground">
                  No task currently lands in this bucket.
                </div>
              )}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
