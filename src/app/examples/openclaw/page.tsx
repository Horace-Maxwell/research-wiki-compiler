import Link from "next/link";

import { WikiBrowser } from "@/features/wiki/components/wiki-browser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ensureOpenClawRenderedWorkspace,
  getOpenClawExampleManifest,
} from "@/server/services/openclaw-example-service";

export const dynamic = "force-dynamic";

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
    <section className="rounded-[24px] border border-border/70 bg-card/80 p-5 shadow-[0_14px_50px_-34px_rgba(15,23,42,0.45)]">
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

export default async function OpenClawExamplePage() {
  const workspaceRoot = await ensureOpenClawRenderedWorkspace();
  const manifest = await getOpenClawExampleManifest();

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
      title: "Upgrade monitoring note",
      path: "wiki/notes/note-what-should-i-monitor-before-upgrading-openclaw.md",
      note: "An archived answer page that re-entered the wiki.",
    },
  ];

  const intro = (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-border/70 bg-[linear-gradient(135deg,rgba(207,167,78,0.17),rgba(255,255,255,0.7))] p-6 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.55)]">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="success">Rendered example</Badge>
          <Badge variant="outline">OpenClaw</Badge>
          <Badge variant="outline">{manifest.corpusFiles.length} source excerpts</Badge>
          <Badge variant="outline">{manifest.pages.length} wiki pages</Badge>
        </div>
        <div className="mt-4 max-w-4xl space-y-3">
          <p className="text-lg font-medium text-foreground">
            This route is the guided, rendered entry point for the OpenClaw example.
          </p>
          <p className="text-sm leading-7 text-muted-foreground">
            The Markdown files in <code>examples/openclaw-wiki/workspace/wiki/</code>{" "}
            remain the source of truth. This page renders those same files through the app&apos;s
            wiki browser so GitHub visitors can understand both layers: the raw artifact layer in
            the repository and the rendered wiki experience in the product.
          </p>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/examples/openclaw?pagePath=wiki/index.md">Open the example index</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki">
              Open example files
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki/source-corpus">
              Open source corpus
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <ExampleCard
          title="Start Here"
          description="Open the rendered pages that best demonstrate the compile, review, ask, archive, and audit loop."
        >
          <div className="space-y-3">
            {featuredPages.map((page) => (
              <div
                key={page.path}
                className="rounded-2xl border border-border/70 bg-background/70 p-4"
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
          title="Workflow Coverage"
          description="This example is not a static bundle. It exercises the actual product loops and keeps the resulting artifacts visible."
        >
          <ul className="space-y-2 text-sm leading-7 text-foreground">
            <li>Import and normalize source excerpts from the user corpus.</li>
            <li>Generate visible Markdown and JSON source summaries.</li>
            <li>Plan reviewable patch proposals and preserve one rejected proposal.</li>
            <li>Apply approved proposals into section-level wiki mutations.</li>
            <li>Run Ask, archive a useful answer, and fold it back into the wiki.</li>
            <li>Run a coverage audit and keep the report on disk.</li>
          </ul>
        </ExampleCard>

        <ExampleCard
          title="Source Of Truth"
          description="GitHub shows the committed source layer directly. The app renders that same layer into the wiki experience."
        >
          <div className="space-y-3 text-sm leading-7 text-muted-foreground">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                Raw source corpus
              </div>
              <div className="mt-2 break-all font-mono text-xs">
                examples/openclaw-wiki/source-corpus/
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                Wiki markdown pages
              </div>
              <div className="mt-2 break-all font-mono text-xs">
                examples/openclaw-wiki/workspace/wiki/
              </div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                Example guide
              </div>
              <div className="mt-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="https://github.com/Horace-Maxwell/research-wiki-compiler/tree/main/examples/openclaw-wiki">
                    Open repo example folder
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
      header={{
        eyebrow: "Rendered example",
        title: "Explore the OpenClaw example as a rendered wiki",
        description:
          "This route showcases the committed OpenClaw example in the app's rendered wiki view. The underlying Markdown files remain the source of truth; this page is the product layer that renders them.",
        badge: "Showcase route",
      }}
      internalLinkBasePath="/examples/openclaw"
      intro={intro}
      preferredInitialPagePath="wiki/index.md"
      showWorkspaceRootCard={false}
      workspaceRootMode="fixed"
    />
  );
}
