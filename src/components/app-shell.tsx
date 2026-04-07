"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookText,
  BotMessageSquare,
  CircleHelp,
  ClipboardCheck,
  Compass,
  DatabaseZap,
  FileStack,
  FlaskConical,
  LayoutDashboard,
  LibraryBig,
  Radar,
  RefreshCw,
  SearchCheck,
  Settings2,
  Sparkles,
} from "lucide-react";

import { APP_NAME, PRODUCT_SURFACE } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const navIconMap = {
  "/topics": LibraryBig,
  "/questions": CircleHelp,
  "/gaps": SearchCheck,
  "/acquisition": SearchCheck,
  "/sessions": FlaskConical,
  "/syntheses": Sparkles,
  "/changes": RefreshCw,
  "/monitoring": Radar,
  "/onboarding": Compass,
  "/dashboard": LayoutDashboard,
  "/sources": FileStack,
  "/wiki": BookText,
  "/reviews": ClipboardCheck,
  "/ask": BotMessageSquare,
  "/audits": DatabaseZap,
  "/settings": Settings2,
} as const;

const navGroups = [
  {
    title: "Daily use",
    items: ["/topics", "/questions", "/sessions", "/syntheses"],
  },
  {
    title: "Signals",
    items: ["/gaps", "/changes"],
  },
  {
    title: "Operations",
    items: ["/acquisition", "/monitoring"],
  },
  {
    title: "Workspace",
    items: ["/dashboard", "/onboarding"],
  },
  {
    title: "Knowledge",
    items: ["/wiki", "/sources", "/reviews"],
  },
  {
    title: "Grounding",
    items: ["/ask", "/audits"],
  },
  {
    title: "System",
    items: ["/settings"],
  },
] as const;

const surfaceCopy = {
  "/topics": {
    label: "Topic portfolio",
    detail:
      "Start here each day: choose a topic, open its home, and move into questions, sessions, or syntheses from there.",
  },
  "/questions": {
    label: "Research questions",
    detail:
      "This is the primary work queue after topic home: decide what to work next, what needs evidence, and what is ready to harden.",
  },
  "/gaps": {
    label: "Evidence blockers",
    detail:
      "A supporting lane for missing evidence when a topic, question, or synthesis tells you evidence is the blocker.",
  },
  "/acquisition": {
    label: "Acquisition operations",
    detail:
      "An operational lane for bounded evidence collection after a gap or monitor has already defined what to collect.",
  },
  "/sessions": {
    label: "Research sessions",
    detail:
      "After questions, run the next bounded pass, load the right context, and record what actually changed.",
  },
  "/syntheses": {
    label: "Synthesis loop",
    detail:
      "After sessions, harden durable judgment, publish what is ready, and see what changed in the canonical layer.",
  },
  "/dashboard": {
    label: "Workspace overview",
    detail: "A lower-frequency overview for setup, raw workflow status, and recent workspace activity.",
  },
  "/changes": {
    label: "Evidence shifts",
    detail:
      "A supporting lane for meaningful evidence shifts that may reopen questions or mark canonical pages for review.",
  },
  "/monitoring": {
    label: "Monitoring operations",
    detail:
      "A lower-frequency watch lane for signals that stay passive until they justify bounded new work.",
  },
  "/onboarding": {
    label: "Workspace setup",
    detail: "Initialize the local, file-backed environment that owns the wiki and its artifacts.",
  },
  "/sources": {
    label: "Source intake",
    detail: "Raw material arrives here before it becomes summaries, proposals, and wiki mutation.",
  },
  "/wiki": {
    label: "Compiled wiki",
    detail: "The durable markdown knowledge layer stays at the center of the product.",
  },
  "/reviews": {
    label: "Review gate",
    detail: "Every wiki mutation becomes explicit here before it is allowed into the durable layer.",
  },
  "/ask": {
    label: "Grounded answers",
    detail: "Ask retrieves from wiki pages first, then summaries, then raw chunks only as fallback.",
  },
  "/audits": {
    label: "Structural health",
    detail: "Coverage, contradictions, orphans, and unsupported claims stay visible instead of hidden.",
  },
  "/settings": {
    label: "Local configuration",
    detail: "Provider keys and workspace-level defaults remain explicit and file-backed.",
  },
} as const;

function normalizeActivePath(pathname: string) {
  if (pathname.startsWith("/topics/")) {
    return "/topics";
  }

  if (pathname.startsWith("/examples/")) {
    return "/topics";
  }

  if (pathname.startsWith("/questions")) {
    return "/questions";
  }

  if (pathname.startsWith("/gaps")) {
    return "/gaps";
  }

  if (pathname.startsWith("/acquisition")) {
    return "/acquisition";
  }

  if (pathname.startsWith("/sessions")) {
    return "/sessions";
  }

  if (pathname.startsWith("/syntheses")) {
    return "/syntheses";
  }

  if (pathname.startsWith("/changes")) {
    return "/changes";
  }

  if (pathname.startsWith("/monitoring")) {
    return "/monitoring";
  }

  const match = PRODUCT_SURFACE.find((item) => pathname === item.href);

  return match?.href ?? "/dashboard";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isExampleRoute = pathname.startsWith("/examples/");
  const isTopicDetailRoute = pathname.startsWith("/topics/");
  const activePath = normalizeActivePath(pathname);
  const activeItem = PRODUCT_SURFACE.find((item) => item.href === activePath);
  const primaryPaths = navGroups[0].items;
  const supportingGroups = navGroups.slice(1, 4);
  const currentSurface = isExampleRoute
    ? {
        label: "Rendered topic",
        detail:
          "A guided topic route that renders committed wiki markdown together with maturity and next-action context.",
      }
    : isTopicDetailRoute
      ? {
          label: "Topic workspace",
          detail:
            "The main working cockpit for a topic: start here, then move into questions, sessions, syntheses, and only pull in signals when needed.",
        }
      : surfaceCopy[activePath];

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(247,245,240,0.97),rgba(243,241,236,1))]">
      <div className="mx-auto flex min-h-screen max-w-[1720px] gap-4 px-4 py-4 lg:px-6 xl:px-8">
        <aside className="hidden w-[290px] shrink-0 lg:flex">
          <div className="sticky top-4 flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-[30px] border border-border/60 bg-sidebar/88 px-5 py-5 shadow-[0_18px_56px_-44px_rgba(15,23,42,0.18)] backdrop-blur-[4px]">
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {APP_NAME}
                </div>
                <div className="text-xl font-semibold tracking-tight text-foreground">
                  Knowledge portfolio
                </div>
                <p className="text-sm leading-7 text-muted-foreground">
                  Open a topic home first. Questions, sessions, and syntheses are the primary daily
                  loop; signals and operations stay available, but more contextual.
                </p>
              </div>
              <div className="rounded-[20px] border border-border/55 bg-background/58 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Daily path
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">local-first</Badge>
                  <Badge variant="outline">file-first</Badge>
                  <Badge variant="outline">review-first</Badge>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Topics -&gt; topic home -&gt; questions -&gt; sessions -&gt; syntheses.
                </p>
                <div className="mt-4 space-y-2">
                  <Button asChild className="w-full justify-start">
                    <Link href="/topics">
                      <LibraryBig className="size-4" />
                      Open topic portfolio
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="outline">
                    <Link href="/topics/openclaw">
                      <Sparkles className="size-4" />
                      Open official showcase
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="ghost">
                    <Link href="/questions">
                      <CircleHelp className="size-4" />
                      Open question queue
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="ghost">
                    <Link href="/sessions">
                      <FlaskConical className="size-4" />
                      Open session queue
                    </Link>
                  </Button>
                  <Button asChild className="w-full justify-start" variant="ghost">
                    <Link href="/syntheses">
                      <Sparkles className="size-4" />
                      Open synthesis queue
                    </Link>
                  </Button>
                </div>
                <div className="mt-4 rounded-[16px] border border-border/50 bg-background/62 px-3 py-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Signals when needed
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <Link className="rounded-full border border-border/60 px-2.5 py-1 hover:text-foreground" href="/gaps">
                      Gaps
                    </Link>
                    <Link className="rounded-full border border-border/60 px-2.5 py-1 hover:text-foreground" href="/changes">
                      Changes
                    </Link>
                    <Link className="rounded-full border border-border/60 px-2.5 py-1 hover:text-foreground" href="/acquisition">
                      Acquisition
                    </Link>
                    <Link className="rounded-full border border-border/60 px-2.5 py-1 hover:text-foreground" href="/monitoring">
                      Monitoring
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1">
              {navGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <div className="px-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {group.title}
                  </div>
                  <nav className="space-y-1.5">
                    {group.items.map((href) => {
                      const item = PRODUCT_SURFACE.find((surface) => surface.href === href);

                      if (!item) {
                        return null;
                      }

                      const Icon = navIconMap[item.href];
                      const active = activePath === item.href;

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "group flex items-center gap-3 rounded-[16px] border px-3 py-3 transition-colors",
                            active
                              ? "border-border/55 bg-background/84 text-foreground shadow-[0_8px_24px_-22px_rgba(15,23,42,0.2)]"
                              : "border-transparent text-muted-foreground hover:bg-background/68 hover:text-foreground",
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-full border border-current/18 p-2",
                              active
                                ? "bg-primary/10 text-primary"
                                : "bg-background/54 text-muted-foreground group-hover:text-foreground",
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium">{item.label}</div>
                            <div
                              className={cn(
                                "truncate text-xs",
                                active ? "text-foreground/70" : "text-muted-foreground",
                              )}
                            >
                              {surfaceCopy[item.href].label}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[20px] border border-border/55 bg-background/54 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Default path
              </div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <div>
                  topics -&gt; topic home -&gt; questions -&gt; sessions -&gt; syntheses
                </div>
                <div>Signals: gaps + changes. Operations: acquisition + monitoring.</div>
                <div>The wiki stays durable; evaluation exists to improve work, not to gamify it.</div>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="min-h-screen rounded-[32px] border border-border/60 bg-background/90 shadow-[0_24px_72px_-56px_rgba(15,23,42,0.2)] backdrop-blur-[4px]">
            <header className="border-b border-border/60 px-5 py-4 lg:px-7">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {isExampleRoute
                      ? "Rendered topic"
                      : isTopicDetailRoute
                        ? "Topic workspace"
                        : activeItem?.label ?? "Workspace"}
                  </div>
                  <div className="text-base font-medium text-foreground">
                    {currentSurface?.label ??
                      "A local-first research wiki with visible compilation and review loops."}
                  </div>
                  <div className="text-sm leading-6 text-muted-foreground">
                    {currentSurface?.detail ??
                      "The wiki remains the durable center of gravity for the product."}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/topics">Topics</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <Link href="/questions">Questions</Link>
                  </Button>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/topics/openclaw">
                      <Sparkles className="size-4" />
                      Flagship
                    </Link>
                  </Button>
                </div>
              </div>

              <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {primaryPaths.map((href) => {
                  const item = PRODUCT_SURFACE.find((surface) => surface.href === href);

                  if (!item) {
                    return null;
                  }

                  const Icon = navIconMap[item.href];
                  const active = activePath === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background/80 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-3 space-y-2 lg:hidden">
                {supportingGroups.map((group) => (
                  <div key={group.title} className="space-y-2">
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {group.title}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((href) => {
                        const item = PRODUCT_SURFACE.find((surface) => surface.href === href);

                        if (!item) {
                          return null;
                        }

                        const Icon = navIconMap[item.href];
                        const active = activePath === item.href;

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                              "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                              active
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background/80 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            <Icon className="size-3.5" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <nav className="mt-3 flex flex-wrap gap-2 lg:hidden">
                {["/wiki", "/sources", "/reviews", "/ask", "/audits", "/settings"].map((href) => {
                  const item = PRODUCT_SURFACE.find((surface) => surface.href === href);

                  if (!item) {
                    return null;
                  }

                  const Icon = navIconMap[item.href];
                  const active = activePath === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors",
                        active
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background/80 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="size-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </header>

            <main className="px-5 py-6 lg:px-7 lg:py-7">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
}
