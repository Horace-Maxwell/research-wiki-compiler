import { ArrowRight } from "lucide-react";

import { AppRouteLink } from "@/components/app-route-link";
import type { AppLocale } from "@/lib/app-locale";
import { getLocaleCopy, getTopicMaturityStageLabel } from "@/lib/app-locale";
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

function TopicRow({
  topic,
  locale,
}: {
  topic: TopicPortfolioOverview["topics"][number];
  locale: AppLocale;
}) {
  const copy = getLocaleCopy(locale);
  const isOfficialShowcase = topic.id === "openclaw";

  return (
    <div className="border-t border-border/60 px-5 py-5 first:border-t-0">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <AppRouteLink
              href={topic.links.home.href}
              className="text-lg font-semibold tracking-tight text-foreground transition-colors hover:text-primary"
            >
              {topic.title}
            </AppRouteLink>
            <Badge variant={stageVariant(topic.maturityStage)}>
              {getTopicMaturityStageLabel(locale, topic.maturityStage)}
            </Badge>
            {isOfficialShowcase ? <Badge variant="outline">{copy.topics.showcase}</Badge> : null}
          </div>
          <p className="max-w-[64ch] text-sm leading-6 text-muted-foreground">{topic.description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-center">
          <Button asChild className="min-w-[6.5rem] justify-center" size="sm" variant="outline">
            <AppRouteLink href={topic.links.home.href}>{copy.topics.open}</AppRouteLink>
          </Button>
          {isOfficialShowcase ? (
            <Button asChild className="min-w-[7.75rem] justify-center" size="sm" variant="outline">
              <AppRouteLink href="/examples/openclaw">{copy.topics.walkthrough}</AppRouteLink>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TopicPortfolioView({
  portfolio,
  locale,
}: {
  portfolio: TopicPortfolioOverview;
  locale: AppLocale;
}) {
  const copy = getLocaleCopy(locale);
  const showcaseTopic = portfolio.topics.find((topic) => topic.id === "openclaw") ?? portfolio.topics[0] ?? null;
  const topics = portfolio.topics.filter((topic) => topic.id !== showcaseTopic?.id);
  const listTitle = showcaseTopic && topics.length > 0 ? copy.topics.otherTopics : copy.topics.topics;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={copy.topics.eyebrow} title={copy.topics.title} />

      {showcaseTopic ? (
        <Surface className="overflow-hidden">
          <div className="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="success">{copy.topics.officialShowcase}</Badge>
                <Badge variant={stageVariant(showcaseTopic.maturityStage)}>
                  {getTopicMaturityStageLabel(locale, showcaseTopic.maturityStage)}
                </Badge>
              </div>
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {showcaseTopic.title}
                </h2>
                <p className="max-w-[62ch] text-sm leading-6 text-muted-foreground">
                  {showcaseTopic.description}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:justify-end">
              <Button asChild className="min-w-[10.75rem] justify-center" size="lg">
                <AppRouteLink href={showcaseTopic.links.home.href}>
                  {copy.topics.openShowcase}
                  <ArrowRight className="size-4" />
                </AppRouteLink>
              </Button>
              <Button asChild className="min-w-[9.25rem] justify-center" size="lg" variant="outline">
                <AppRouteLink href="/examples/openclaw">{copy.topics.walkthrough}</AppRouteLink>
              </Button>
            </div>
          </div>
        </Surface>
      ) : null}

      {topics.length > 0 ? (
        <Surface>
          <div className="border-b border-border/60 px-5 py-4">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{listTitle}</h2>
          </div>
          <div>
            {topics.map((topic) => (
              <TopicRow key={topic.id} topic={topic} locale={locale} />
            ))}
          </div>
        </Surface>
      ) : null}
    </div>
  );
}
