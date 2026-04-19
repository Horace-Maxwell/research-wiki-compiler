import Link from "next/link";

import { WikiBrowser } from "@/features/wiki/components/wiki-browser";
import type { WikiPageDetail, WikiPageSummary } from "@/lib/contracts/wiki";
import { getLocaleCopy } from "@/lib/app-locale";
import { readRequestLocale } from "@/lib/app-locale-server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildOpenClawExamplePageHref } from "@/server/lib/page-route-hrefs";
import { getWikiPageDetail, listWikiPages } from "@/server/services/wiki-page-service";
import {
  ensureOpenClawRenderedWorkspace,
  getOpenClawExampleManifest,
} from "@/server/services/openclaw-example-service";

export const dynamic = "force-dynamic";

type OpenClawExamplePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function ExampleCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-border/55 bg-card/70 p-5 shadow-[0_12px_32px_-30px_rgba(15,23,42,0.18)]">
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

export default async function OpenClawExamplePage({
  searchParams,
}: OpenClawExamplePageProps) {
  const locale = await readRequestLocale();
  const copy = getLocaleCopy(locale);
  const params = searchParams ? await searchParams : {};
  const requestedPageId = readParam(params.pageId);
  const workspaceRoot = await ensureOpenClawRenderedWorkspace();
  const manifest = await getOpenClawExampleManifest();
  const initialPages: WikiPageSummary[] = await listWikiPages(workspaceRoot);
  const initialPage =
    initialPages.find((page) => page.id === requestedPageId) ??
    initialPages.find((page) => page.path === "wiki/index.md") ??
    initialPages[0] ??
    null;
  const initialDetail: WikiPageDetail | null = initialPage
    ? await getWikiPageDetail(workspaceRoot, initialPage.id)
    : null;
  const isArticleDetailPage = initialPage?.path !== "wiki/index.md";

  const featuredPages = [
    {
      title: copy.showcase.pageTitles.exampleIndex,
      path: "wiki/index.md",
      href: buildOpenClawExamplePageHref("wiki/index.md"),
      note: copy.showcase.pageNotes.exampleIndex,
    },
    {
      title: copy.showcase.pageTitles.openclaw,
      path: "wiki/entities/openclaw.md",
      href: buildOpenClawExamplePageHref("wiki/entities/openclaw.md"),
      note: copy.showcase.pageNotes.openclaw,
    },
    {
      title: copy.showcase.pageTitles.watchpoints,
      path: "wiki/syntheses/openclaw-maintenance-watchpoints.md",
      href: buildOpenClawExamplePageHref("wiki/syntheses/openclaw-maintenance-watchpoints.md"),
      note: copy.showcase.pageNotes.watchpoints,
    },
    {
      title: copy.showcase.pageTitles.rhythm,
      path: "wiki/syntheses/openclaw-maintenance-rhythm.md",
      href: buildOpenClawExamplePageHref("wiki/syntheses/openclaw-maintenance-rhythm.md"),
      note: copy.showcase.pageNotes.rhythm,
    },
    {
      title: copy.showcase.pageTitles.tensions,
      path: "wiki/syntheses/openclaw-current-tensions.md",
      href: buildOpenClawExamplePageHref("wiki/syntheses/openclaw-current-tensions.md"),
      note: copy.showcase.pageNotes.tensions,
    },
    {
      title: copy.showcase.pageTitles.openQuestions,
      path: "wiki/notes/openclaw-open-questions.md",
      href: buildOpenClawExamplePageHref("wiki/notes/openclaw-open-questions.md"),
      note: copy.showcase.pageNotes.openQuestions,
    },
    {
      title: copy.showcase.pageTitles.upgradeNote,
      path: "wiki/notes/note-what-should-i-monitor-before-upgrading-openclaw.md",
      href: buildOpenClawExamplePageHref(
        "wiki/notes/note-what-should-i-monitor-before-upgrading-openclaw.md",
      ),
      note: copy.showcase.pageNotes.upgradeNote,
    },
  ];

  const intro = isArticleDetailPage ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border/52 bg-background/58 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="success">{copy.showcase.officialShowcase}</Badge>
        <Badge variant="outline">OpenClaw</Badge>
        <span className="text-sm leading-6 text-muted-foreground">
          {copy.showcase.renderedOpenClawArticle}
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link href="/topics/openclaw">{copy.showcase.openTopicHome}</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href={buildOpenClawExamplePageHref("wiki/index.md")}>
            {copy.showcase.exampleIndex}
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki/workspace/wiki">
            {copy.showcase.openMarkdownSource}
          </Link>
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,246,240,0.96))] p-6 ring-1 ring-border/55">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="success">{copy.showcase.officialShowcase}</Badge>
          <Badge variant="outline">OpenClaw</Badge>
          <Badge variant="outline">{copy.showcase.sourceExcerpts(manifest.corpusFiles.length)}</Badge>
          <Badge variant="outline">{copy.showcase.wikiPages(manifest.pages.length)}</Badge>
        </div>
        <div className="mt-4 max-w-4xl">
          <p className="text-lg font-medium text-foreground">
            {copy.showcase.titleLead}
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/topics/openclaw">{copy.showcase.openTopicHome}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/questions?topic=openclaw">{copy.showcase.openQuestionQueue}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sessions?topic=openclaw">{copy.showcase.openSessionQueue}</Link>
          </Button>
          <Button asChild>
            <Link href={buildOpenClawExamplePageHref("wiki/index.md")}>
              {copy.showcase.openExampleIndex}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki">
              {copy.showcase.openExampleFiles}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki/obsidian-vault">
              {copy.showcase.openObsidianVault}
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <ExampleCard
          title={copy.showcase.startHere}
          description={copy.showcase.startHereDescription}
        >
          <div className="space-y-3">
            {featuredPages.map((page) => (
              <div
                key={page.path}
                className="rounded-2xl border border-border/50 bg-background/62 p-4"
              >
                <div className="text-sm font-medium text-foreground">{page.title}</div>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{page.note}</p>
                <div className="mt-3">
                  <Button asChild size="sm" variant="outline">
                    <Link href={page.href}>{copy.showcase.open}</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ExampleCard>

        <ExampleCard
          title={copy.showcase.source}
          description={copy.showcase.sourceDescription}
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki">
                    {copy.showcase.openRepoExampleFolder}
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki/obsidian-vault">
                    {copy.showcase.openObsidianVault}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </ExampleCard>
      </div>
    </div>
  );

  return (
    <WikiBrowser
      allowCreate={false}
      allowEdit={false}
      allowRefreshLinks={false}
      defaultWorkspaceRoot={workspaceRoot}
      initialDetail={initialDetail}
      initialPages={initialPages}
      header={{
        eyebrow: copy.showcase.officialShowcase,
        title: copy.showcase.headerTitle,
        description: isArticleDetailPage
          ? copy.showcase.headerDescriptionArticle
          : copy.showcase.headerDescriptionIndex,
        badge: copy.showcase.headerBadge,
      }}
      internalLinkBasePath="/examples/openclaw"
      intro={intro}
      preferredInitialPagePath="wiki/index.md"
      showWorkspaceRootCard={false}
      workspaceRootMode="fixed"
    />
  );
}
