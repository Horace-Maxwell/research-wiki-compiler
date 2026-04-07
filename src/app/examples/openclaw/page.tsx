import Link from "next/link";

import { WikiBrowser } from "@/features/wiki/components/wiki-browser";
import type { WikiPageDetail, WikiPageSummary } from "@/lib/contracts/wiki";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const params = searchParams ? await searchParams : {};
  const requestedPageId = readParam(params.pageId);
  const requestedPagePath = readParam(params.pagePath);
  const workspaceRoot = await ensureOpenClawRenderedWorkspace();
  const manifest = await getOpenClawExampleManifest();
  const initialPages: WikiPageSummary[] = await listWikiPages(workspaceRoot);
  const initialPage =
    initialPages.find((page) => page.id === requestedPageId) ??
    initialPages.find((page) => page.path === requestedPagePath) ??
    initialPages.find((page) => page.path === "wiki/index.md") ??
    initialPages[0] ??
    null;
  const initialDetail: WikiPageDetail | null = initialPage
    ? await getWikiPageDetail(workspaceRoot, initialPage.id)
    : null;
  const isArticleDetailPage = initialPage?.path !== "wiki/index.md";

  const featuredPages = [
    {
      title: "Example index",
      path: "wiki/index.md",
      note: "Start with the curated landing page for the rendered example.",
    },
    {
      title: "OpenClaw",
      path: "wiki/entities/openclaw.md",
      note: "The core entity page compiled from the source corpus.",
    },
    {
      title: "OpenClaw maintenance watchpoints",
      path: "wiki/syntheses/openclaw-maintenance-watchpoints.md",
      note: "A synthesis page that shows the compiled-wiki outcome clearly.",
    },
    {
      title: "OpenClaw maintenance rhythm",
      path: "wiki/syntheses/openclaw-maintenance-rhythm.md",
      note: "The daily maintenance surface for revisit order, stale context packs, and next syntheses.",
    },
    {
      title: "OpenClaw current tensions",
      path: "wiki/syntheses/openclaw-current-tensions.md",
      note: "The fastest way to see what still feels unstable or strategically important.",
    },
    {
      title: "OpenClaw open questions",
      path: "wiki/notes/openclaw-open-questions.md",
      note: "A durable next-work page for unresolved questions and future source collection.",
    },
    {
      title: "Upgrade monitoring note",
      path: "wiki/notes/note-what-should-i-monitor-before-upgrading-openclaw.md",
      note: "An archived answer page that re-entered the wiki.",
    },
  ];

  const intro = isArticleDetailPage ? (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border/52 bg-background/58 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="success">Official showcase</Badge>
        <Badge variant="outline">OpenClaw</Badge>
        <span className="text-sm leading-6 text-muted-foreground">
          Committed article, rendered from Markdown source of truth.
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild size="sm" variant="ghost">
          <Link href="/topics/openclaw">Open topic home</Link>
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href="/examples/openclaw?pagePath=wiki/index.md">Back to example index</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki/workspace/wiki">
            Open markdown source
          </Link>
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,246,240,0.96))] p-6 ring-1 ring-border/55">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="success">Official showcase</Badge>
          <Badge variant="outline">OpenClaw</Badge>
          <Badge variant="outline">{manifest.corpusFiles.length} source excerpts</Badge>
          <Badge variant="outline">{manifest.pages.length} wiki pages</Badge>
        </div>
        <div className="mt-4 max-w-4xl space-y-3">
          <p className="text-lg font-medium text-foreground">
            This route is the guided official showcase for the OpenClaw example.
          </p>
          <p className="text-sm leading-7 text-muted-foreground">
            The Markdown files in <code>examples/openclaw-wiki/workspace/wiki/</code>{" "}
            remain the source of truth. This page renders those same files through the app&apos;s
            wiki browser so GitHub visitors can understand both layers: the raw artifact layer in
            the repository and the rendered wiki experience in the product.
          </p>
          <p className="text-sm leading-7 text-muted-foreground">
            The strongest daily-use path still starts at <code>/topics/openclaw</code>. Use this
            showcase route when you want the cleanest demonstration of how canonical wiki,
            questions, sessions, syntheses, signals, and Obsidian all fit together in one case.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/topics/openclaw">Open topic home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/questions?topic=openclaw">Open question queue</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/sessions?topic=openclaw">Open session queue</Link>
          </Button>
          <Button asChild>
            <Link href="/examples/openclaw?pagePath=wiki/index.md">Open the example index</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki">
              Open example files
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki/obsidian-vault">
              Open Obsidian vault
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ExampleCard
          title="Why This Showcase"
          description="OpenClaw is the best single case for understanding the product because it keeps the workflow loop, the durable wiki, and the file-backed artifact trail visible at the same time."
        >
          <div className="space-y-3 text-sm leading-7 text-foreground">
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Full loop
              </div>
              <div className="mt-2">
                Source to summary to question to session to synthesis to evidence gap and change to
                acquisition and monitoring to canonical wiki.
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Same knowledge, three views
              </div>
              <div className="mt-2">
                Canonical Markdown stays authoritative; the app renders it; the Obsidian vault
                reorganizes it for day-to-day reading.
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Honest reproducibility
              </div>
              <div className="mt-2">
                Reference mode is deterministic and validated. Live mode stays real, not fake-stable.
              </div>
            </div>
          </div>
        </ExampleCard>

        <ExampleCard
          title="Best App Walkthrough"
          description="Use the topic home as the working cockpit, then move through the main research path before opening supporting lanes."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Daily path
              </div>
              <div className="mt-2 text-sm leading-6 text-foreground">
                /topics to /topics/openclaw to /questions to /sessions to /syntheses
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/topics/openclaw">Topic home</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/questions?topic=openclaw">Questions</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/sessions?topic=openclaw">Sessions</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/syntheses?topic=openclaw">Syntheses</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Supporting lanes
              </div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                Open these only when the main path points to missing evidence or changed assumptions.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="ghost">
                  <Link href="/gaps?topic=openclaw">Gaps</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/changes?topic=openclaw">Changes</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/acquisition?topic=openclaw">Acquisition</Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href="/monitoring?topic=openclaw">Monitoring</Link>
                </Button>
              </div>
            </div>
          </div>
        </ExampleCard>

        <ExampleCard
          title="Inspect The Layers"
          description="The same example should make sense whether you approach it as rendered product, canonical wiki files, or Obsidian working environment."
        >
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Canonical wiki
              </div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                Start at the committed index, entity page, and maintenance rhythm.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/examples/openclaw?pagePath=wiki/index.md">Index</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/examples/openclaw?pagePath=wiki/entities/openclaw.md">Entity page</Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="/examples/openclaw?pagePath=wiki/syntheses/openclaw-maintenance-rhythm.md">
                    Maintenance rhythm
                  </Link>
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Obsidian projection
              </div>
              <div className="mt-2 text-sm leading-6 text-muted-foreground">
                Use Start Here, Topic Map, and Maintenance Rhythm as the working trio.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki/obsidian-vault">
                    Open vault folder
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </ExampleCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ExampleCard
          title="Start Here"
          description="Open the rendered pages that best demonstrate the compile, review, ask, archive, audit, and ongoing-knowledge-work loop."
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
                    <Link href={`/examples/openclaw?pagePath=${encodeURIComponent(page.path)}`}>
                      Open rendered page
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ExampleCard>

        <ExampleCard
          title="Working Sets"
          description="This example now exposes the pages you would actually keep active for orientation, maintenance review, and next-question planning."
        >
          <div className="space-y-3 text-sm leading-7 text-foreground">
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Orientation bundle
              </div>
              <div className="mt-2">OpenClaw / current tensions / maintenance watchpoints.</div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Maintenance bundle
              </div>
              <div className="mt-2">
                Maintenance rhythm / release cadence / plugin compatibility / provider
                dependency risk / archived upgrade note.
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Next-work bundle
              </div>
              <div className="mt-2">
                Current tensions / open questions / maintenance rhythm / reviews / audit report
                for the next refinement pass.
              </div>
            </div>
          </div>
        </ExampleCard>

        <ExampleCard
          title="Artifact Layers"
          description="GitHub shows the committed source layer directly, while the app and the Obsidian projection give two different working views over that same artifact base."
        >
          <div className="space-y-3 text-sm leading-7 text-muted-foreground">
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                Raw source corpus
              </div>
              <div className="mt-2 break-all font-mono text-xs">
                examples/openclaw-wiki/source-corpus/
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                Wiki markdown pages
              </div>
              <div className="mt-2 break-all font-mono text-xs">
                examples/openclaw-wiki/workspace/wiki/
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                Obsidian working projection
              </div>
              <div className="mt-2 break-all font-mono text-xs">
                examples/openclaw-wiki/obsidian-vault/
              </div>
            </div>
            <div className="rounded-2xl border border-border/50 bg-background/62 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                Example guide
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki">
                    Open repo example folder
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki/obsidian-vault">
                    Open Obsidian vault
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
        eyebrow: "Official showcase",
        title: "Explore OpenClaw as the flagship rendered example",
        description: isArticleDetailPage
          ? "Read a committed OpenClaw showcase article in the product's rendered wiki view. The underlying Markdown remains the durable source of truth."
          : "This route is the official showcase layer for OpenClaw. It explains how the rendered app, the canonical Markdown wiki, and the Obsidian projection all describe the same example.",
        badge: "Official showcase",
      }}
      internalLinkBasePath="/examples/openclaw"
      intro={intro}
      preferredInitialPagePath="wiki/index.md"
      showWorkspaceRootCard={false}
      workspaceRootMode="fixed"
    />
  );
}
