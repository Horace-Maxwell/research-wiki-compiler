import Link from "next/link";
import { ArrowRight, FolderTree, Gauge, Radar, Sparkles } from "lucide-react";

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
}: {
  topic: TopicPortfolioItem;
  comparisonSpotlight: TopicPortfolioComparison | null;
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
