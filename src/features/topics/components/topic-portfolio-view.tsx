import Link from "next/link";
import { ArrowRight, ArrowUpRight, Layers3, Radar, Scale, Sparkles } from "lucide-react";

import type { TopicPortfolioOverview } from "@/lib/contracts/topic-portfolio";
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

function TopicRow({
  topic,
}: {
  topic: TopicPortfolioOverview["topics"][number];
}) {
  return (
    <div className="border-t border-border/60 px-5 py-5 first:border-t-0">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={topic.links.home.href} className="text-lg font-semibold tracking-tight text-foreground">
              {topic.title}
            </Link>
            <Badge variant={stageVariant(topic.maturityStage)}>{topic.maturityStage}</Badge>
            <Badge variant="outline">{topic.kind === "example" ? "example" : "topic"}</Badge>
            <Badge variant="outline">{topic.overallScore}/5</Badge>
          </div>
          <p className="max-w-[75ch] text-sm leading-7 text-muted-foreground">{topic.summary}</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span>{topic.corpusFileCount} corpus files</span>
            <span>{topic.pageCount} pages</span>
            <span>{topic.contextPackCount} context packs</span>
            <span>{topic.auditCount} audits</span>
            <span>{topic.promotionReadinessPercent}% to {topic.nextStage ?? "top stage"}</span>
          </div>
          <div className="rounded-[18px] bg-background/65 px-4 py-3 ring-1 ring-border/50">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Highest-leverage next action
            </div>
            <div className="mt-2 text-sm font-medium text-foreground">{topic.nextActions[0]?.title}</div>
            <div className="mt-1 text-sm leading-6 text-muted-foreground">
              {topic.nextActions[0]?.summary}
            </div>
          </div>
          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-3">
            <div className="rounded-[16px] border border-border/50 bg-background/60 px-3 py-3">
              <div className="font-mono uppercase tracking-[0.14em]">canonical</div>
              <div className="mt-2 break-all">{topic.fileRoots.canonical}</div>
            </div>
            <div className="rounded-[16px] border border-border/50 bg-background/60 px-3 py-3">
              <div className="font-mono uppercase tracking-[0.14em]">obsidian</div>
              <div className="mt-2 break-all">{topic.fileRoots.obsidian}</div>
            </div>
            <div className="rounded-[16px] border border-border/50 bg-background/60 px-3 py-3">
              <div className="font-mono uppercase tracking-[0.14em]">evaluation</div>
              <div className="mt-2 break-all">{topic.fileRoots.evaluation}</div>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href={topic.links.home.href}>Open topic home</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={topic.links.maintenance.href}>Maintenance</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link href={topic.links.evaluation.href}>Evaluation</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TopicPortfolioView({
  portfolio,
}: {
  portfolio: TopicPortfolioOverview;
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Topic portfolio"
        title="Navigate the knowledge environments"
        description="Treat each topic as a real knowledge workspace, not a loose folder. Compare maturity, see what is strong or missing, and move directly from evaluation into the next useful upgrade."
        badge={`${portfolio.summary.totalTopics} topics`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/questions">Open research questions</Link>
            </Button>
            <Button asChild>
              <Link href="/topics/openclaw">
                Open flagship topic
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        }
      />

      <Surface className="px-5 py-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          <Metric
            label="Portfolio"
            value={String(portfolio.summary.totalTopics)}
            detail="Known topics and examples currently available in the workspace."
          />
          <Metric
            label="Flagship"
            value={String(portfolio.summary.flagshipTopics)}
            detail="Topics that already clear the showcase bar."
          />
          <Metric
            label="Starter"
            value={String(portfolio.summary.starterTopics)}
            detail="Topics that still need real workflow evidence before they should be treated as mature."
          />
          <Metric
            label="Needs grounding"
            value={String(portfolio.summary.needsWorkflowGrounding)}
            detail="Topics whose next upgrade still centers on workflow and provenance."
          />
          <Metric
            label="Action queue"
            value={String(portfolio.summary.actionItems)}
            detail="High-signal next upgrades currently surfaced across the portfolio."
          />
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Portfolio comparison
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                Why the topics are not at the same level
              </h2>
            </div>
            <Scale className="size-5 text-muted-foreground" />
          </div>
          <div className="space-y-4 px-5 py-5">
            <p className="max-w-[75ch] text-sm leading-7 text-muted-foreground">
              {portfolio.comparisonSpotlight?.summary ??
                "Add more topics to make comparison more meaningful."}
            </p>
            {portfolio.comparisonSpotlight ? (
              <div className="grid gap-3 md:grid-cols-3">
                {portfolio.comparisonSpotlight.decisiveDifferences.map((item) => (
                  <div
                    key={item}
                    className="rounded-[18px] border border-border/50 bg-background/62 px-4 py-4 text-sm leading-6 text-foreground"
                  >
                    {item}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Action queue
              </div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">
                What to do next across the portfolio
              </h2>
            </div>
            <Radar className="size-5 text-muted-foreground" />
          </div>
          <div className="px-5 py-4">
            {portfolio.actionQueue.length === 0 ? (
              <div className="rounded-[18px] bg-background/65 px-4 py-5 text-sm leading-6 text-muted-foreground">
                No action items are currently queued.
              </div>
            ) : (
              <div className="space-y-3">
                {portfolio.actionQueue.map((action) => (
                  <Link
                    key={`${action.topicId}-${action.title}`}
                    href={action.href}
                    className="group block rounded-[18px] border border-border/50 bg-background/60 px-4 py-4 transition-colors hover:bg-background"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={priorityVariant(action.priority)}>{action.priority}</Badge>
                      <Badge variant={stageVariant(action.maturityStage)}>{action.maturityStage}</Badge>
                      <span className="text-sm font-medium text-foreground">{action.topicTitle}</span>
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div className="space-y-1.5">
                        <div className="text-sm font-medium text-foreground">{action.title}</div>
                        <div className="text-sm leading-6 text-muted-foreground">{action.summary}</div>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Surface>
      </div>

      <div className="space-y-6">
        {portfolio.buckets.map((bucket) => (
          <Surface key={bucket.stage}>
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-5 py-4">
              <div className="space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {bucket.stage}
                </div>
                <h2 className="text-xl font-semibold tracking-tight text-foreground">{bucket.title}</h2>
                <p className="max-w-[78ch] text-sm leading-7 text-muted-foreground">
                  {bucket.description}
                </p>
              </div>
              <Badge variant={stageVariant(bucket.stage)}>{bucket.topics.length}</Badge>
            </div>
            <div>
              {bucket.topics.map((topic) => (
                <TopicRow key={topic.id} topic={topic} />
              ))}
            </div>
          </Surface>
        ))}
      </div>

      <Surface className="px-5 py-5">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline">knowledge portfolio</Badge>
          <Badge variant="outline">local-first</Badge>
          <Badge variant="outline">evaluation drives work</Badge>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Layers3 className="size-4" />
              Topic switching
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use the portfolio first, then drop into a topic home when you want article reading, maintenance work, or a maturity review.
            </p>
          </div>
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="size-4" />
              Flagship bar
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              OpenClaw remains the reference bar for what a showcase-grade topic looks like when workflow evidence and product entry points are both strong.
            </p>
          </div>
          <div className="rounded-[20px] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Radar className="size-4" />
              Actionability
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The maturity model is there to guide the next useful move, not to gamify scores or turn topics into generic project cards.
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
}
