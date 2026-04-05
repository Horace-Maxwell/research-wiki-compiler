"use client";

import type { ChangeEvent, FormEvent, MouseEvent, ReactNode } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FilePlus2,
  FileText,
  Link2,
  PencilLine,
  RefreshCw,
  Save,
  X,
} from "lucide-react";

import {
  type WikiPageDetail,
  type WikiPageSummary,
  type WikiPageType,
  createWikiPageRequestSchema,
  listWikiPagesResponseSchema,
  updateWikiPageRequestSchema,
  wikiPageDetailSchema,
} from "@/lib/contracts/wiki";
import {
  ACTIVE_WORKSPACE_STORAGE_KEY,
  WIKI_PAGE_TYPE_LABELS,
  WIKI_PAGE_TYPES,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type WikiBrowserProps = {
  defaultWorkspaceRoot: string;
};

async function fetchPageList(workspaceRoot: string) {
  const response = await fetch(
    `/api/wiki/pages?${new URLSearchParams({ workspaceRoot }).toString()}`,
    {
      cache: "no-store",
    },
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Failed to load wiki pages.");
  }

  return listWikiPagesResponseSchema.parse(data).pages;
}

async function fetchPageDetail(workspaceRoot: string, pageId: string) {
  const response = await fetch(
    `/api/wiki/pages/${pageId}?${new URLSearchParams({ workspaceRoot }).toString()}`,
    {
      cache: "no-store",
    },
  );
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Failed to load wiki page.");
  }

  return wikiPageDetailSchema.parse(data);
}

function Pane({
  title,
  className,
  actions,
  children,
}: {
  title: string;
  className?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "flex min-h-[640px] flex-col rounded-[24px] border border-border/70 bg-card/80 shadow-[0_14px_50px_-34px_rgba(15,23,42,0.45)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </div>
        {actions}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

function groupPagesByType(pages: WikiPageSummary[]) {
  const groups = new Map<WikiPageType, WikiPageSummary[]>();

  for (const type of WIKI_PAGE_TYPES) {
    groups.set(type, []);
  }

  for (const page of pages) {
    groups.get(page.type)?.push(page);
  }

  return groups;
}

export function WikiBrowser({ defaultWorkspaceRoot }: WikiBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [pages, setPages] = useState<WikiPageSummary[]>([]);
  const [detail, setDetail] = useState<WikiPageDetail | null>(null);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<Exclude<WikiPageType, "index">>("note");

  const queryWorkspaceRoot = searchParams.get("workspaceRoot");
  const selectedPageId = searchParams.get("pageId");

  useEffect(() => {
    const storedRoot =
      queryWorkspaceRoot ??
      window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ??
      defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, storedRoot);
  }, [defaultWorkspaceRoot, queryWorkspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadPages() {
      setIsLoadingPages(true);
      setErrorMessage(null);

      try {
        const nextPages = await fetchPageList(workspaceRoot);

        if (!isActive) {
          return;
        }

        setPages(nextPages);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setPages([]);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load wiki pages.");
      } finally {
        if (isActive) {
          setIsLoadingPages(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadPages();
    }

    return () => {
      isActive = false;
    };
  }, [workspaceRoot]);

  useEffect(() => {
    if (isLoadingPages || pages.length === 0) {
      return;
    }

    if (!selectedPageId) {
      const params = new URLSearchParams({
        workspaceRoot,
        pageId: pages[0].id,
      });

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }
  }, [isLoadingPages, pages, pathname, router, selectedPageId, workspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadPageDetail() {
      if (!selectedPageId) {
        setDetail(null);
        setDraftContent("");
        return;
      }

      setIsLoadingDetail(true);
      setErrorMessage(null);

      try {
        const nextDetail = await fetchPageDetail(workspaceRoot, selectedPageId);

        if (!isActive) {
          return;
        }

        setDetail(nextDetail);
        setDraftContent(nextDetail.rawContent);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDetail(null);
        setDraftContent("");
        setErrorMessage(error instanceof Error ? error.message : "Failed to load wiki page.");
      } finally {
        if (isActive) {
          setIsLoadingDetail(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadPageDetail();
    }

    return () => {
      isActive = false;
    };
  }, [selectedPageId, workspaceRoot]);

  const groupedPages = useMemo(() => groupPagesByType(pages), [pages]);

  function navigateToPage(pageId: string, nextWorkspaceRoot: string, replace = false) {
    const params = new URLSearchParams({
      workspaceRoot: nextWorkspaceRoot,
      pageId,
    });

    startTransition(() => {
      if (replace) {
        router.replace(`${pathname}?${params.toString()}`);
      } else {
        router.push(`${pathname}?${params.toString()}`);
      }
    });
  }

  async function reloadPagesAndCurrentDetail(nextPageId?: string) {
    const nextPages = await fetchPageList(workspaceRoot);
    setPages(nextPages);

    const pageId = nextPageId ?? selectedPageId ?? nextPages[0]?.id ?? null;

    if (!pageId) {
      setDetail(null);
      setDraftContent("");
      return;
    }

    const nextDetail = await fetchPageDetail(workspaceRoot, pageId);

    setDetail(nextDetail);
    setDraftContent(nextDetail.rawContent);
    navigateToPage(pageId, workspaceRoot, true);
  }

  async function handleSave() {
    if (!detail) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = updateWikiPageRequestSchema.parse({
        workspaceRoot,
        rawContent: draftContent,
      });
      const response = await fetch(`/api/wiki/pages/${detail.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to save wiki page.");
      }

      const nextDetail = wikiPageDetailSchema.parse(data);

      setDetail(nextDetail);
      setDraftContent(nextDetail.rawContent);
      setIsEditing(false);
      await reloadPagesAndCurrentDetail(nextDetail.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save wiki page.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCreatePage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const payload = createWikiPageRequestSchema.parse({
        workspaceRoot,
        title: newTitle,
        type: newType,
      });
      const response = await fetch("/api/wiki/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to create wiki page.");
      }

      const nextDetail = wikiPageDetailSchema.parse(data);

      setShowCreateForm(false);
      setNewTitle("");
      setDetail(nextDetail);
      setDraftContent(nextDetail.rawContent);
      setIsEditing(true);
      await reloadPagesAndCurrentDetail(nextDetail.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to create wiki page.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRefreshLinks() {
    if (!detail) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/wiki/pages/${detail.id}/refresh-links`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceRoot,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message ?? "Failed to refresh wiki links.");
      }

      const nextDetail = wikiPageDetailSchema.parse(data);
      setDetail(nextDetail);
      await reloadPagesAndCurrentDetail(nextDetail.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to refresh wiki links.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleRenderedClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const anchor = target.closest("a");

    if (!anchor) {
      return;
    }

    const href = anchor.getAttribute("href");

    if (!href?.startsWith("/wiki?")) {
      return;
    }

    event.preventDefault();
    startTransition(() => {
      router.push(href);
    });
  }

  const leftPane = (
    <Pane
      title="Page Tree"
      className="xl:col-span-3"
      actions={
        <Button onClick={() => setShowCreateForm((current) => !current)} size="sm" variant="outline">
          <FilePlus2 className="size-4" />
          New Page
        </Button>
      }
    >
      <div className="space-y-4 p-4">
        <div className="rounded-2xl border border-border/70 bg-muted/35 p-3 text-xs leading-6 text-muted-foreground">
          <div className="font-mono uppercase tracking-[0.16em] text-foreground">
            Workspace
          </div>
          <div className="mt-2 break-all">{workspaceRoot}</div>
        </div>

        {showCreateForm ? (
          <form className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-3" onSubmit={handleCreatePage}>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Create from template
            </div>
            <Input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder="New page title"
            />
            <select
              className="flex h-10 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm outline-none"
              value={newType}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setNewType(event.target.value as Exclude<WikiPageType, "index">)
              }
            >
              {WIKI_PAGE_TYPES.filter((type) => type !== "index").map((type) => (
                <option key={type} value={type}>
                  {WIKI_PAGE_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button disabled={isSaving || !newTitle.trim()} size="sm" type="submit">
                Create
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {isLoadingPages ? (
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            Loading wiki pages...
          </div>
        ) : pages.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            No wiki pages were discovered. Initialize a workspace or create the first page
            from a template.
          </div>
        ) : (
          <div className="space-y-4">
            {Array.from(groupedPages.entries()).map(([type, items]) =>
              items.length === 0 ? null : (
                <div key={type} className="space-y-2">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {WIKI_PAGE_TYPE_LABELS[type]}
                  </div>
                  <div className="space-y-1.5">
                    {items.map((page) => (
                      <button
                        key={page.id}
                        className={cn(
                          "flex w-full items-start justify-between rounded-xl border px-3 py-3 text-left transition-colors",
                          selectedPageId === page.id
                            ? "border-primary/60 bg-primary/10 text-foreground"
                            : "border-border/70 bg-background/60 text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                        )}
                        onClick={() => navigateToPage(page.id, workspaceRoot)}
                        type="button"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{page.title}</div>
                          <div className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.14em]">
                            {page.path}
                          </div>
                        </div>
                        {page.unresolvedOutgoingCount > 0 ? (
                          <Badge variant="warning">{page.unresolvedOutgoingCount} unresolved</Badge>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>
    </Pane>
  );

  const centerPane = (
    <Pane
      title="Page View"
      className="xl:col-span-6"
      actions={
        <div className="flex gap-2">
          {detail ? (
            <>
              {isEditing ? (
                <>
                  <Button disabled={isSaving} onClick={handleSave} size="sm">
                    <Save className="size-4" />
                    Save
                  </Button>
                  <Button
                    disabled={isSaving}
                    onClick={() => {
                      setDraftContent(detail.rawContent);
                      setIsEditing(false);
                    }}
                    size="sm"
                    variant="ghost"
                  >
                    <X className="size-4" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)} size="sm" variant="outline">
                  <PencilLine className="size-4" />
                  Edit Markdown
                </Button>
              )}
            </>
          ) : null}
        </div>
      }
    >
      <div className="h-full p-4">
        {errorMessage ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isLoadingDetail ? (
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            Loading page...
          </div>
        ) : !detail ? (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border/70 bg-background/50 p-8 text-center text-sm leading-7 text-muted-foreground">
            Select a wiki page from the left pane to browse the compiled knowledge base.
          </div>
        ) : isEditing ? (
          <Textarea
            className="min-h-[700px] font-mono text-xs leading-6"
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
          />
        ) : (
          <div className="flex h-full flex-col gap-4">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {detail.type}
              </div>
              <h3 className="text-3xl font-semibold tracking-tight text-foreground">
                {detail.title}
              </h3>
            </div>
            <div
              className="wiki-render min-h-[620px] flex-1 overflow-auto rounded-2xl border border-border/70 bg-background/70 px-6 py-5 text-sm leading-8 text-foreground [&_a]:font-medium [&_a]:text-primary [&_a:hover]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1]:mt-2 [&_h1]:text-3xl [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-xl [&_li]:ml-4 [&_p]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:text-slate-100 [&_ul]:list-disc"
              dangerouslySetInnerHTML={{ __html: detail.renderedHtml }}
              onClick={handleRenderedClick}
            />
          </div>
        )}
      </div>
    </Pane>
  );

  const rightPane = (
    <Pane
      title="Metadata"
      className="xl:col-span-3"
      actions={
        detail ? (
          <Button disabled={isSaving} onClick={handleRefreshLinks} size="sm" variant="ghost">
            <RefreshCw className="size-4" />
            Refresh Links
          </Button>
        ) : null
      }
    >
      <div className="space-y-4 p-4 text-sm">
        {!detail ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-background/70 p-4 text-muted-foreground">
            Page metadata, links, and backlinks will appear here.
          </div>
        ) : (
          <>
            <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{detail.type}</Badge>
                <Badge variant="outline">{detail.reviewStatus}</Badge>
                <Badge variant="outline">{detail.status}</Badge>
              </div>
              <dl className="space-y-2">
                <div>
                  <dt className="text-muted-foreground">Path</dt>
                  <dd className="break-all font-mono text-xs text-foreground">{detail.path}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Slug</dt>
                  <dd className="text-foreground">{detail.slug}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last updated</dt>
                  <dd className="text-foreground">
                    {new Date(detail.updatedAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last indexed</dt>
                  <dd className="text-foreground">
                    {new Date(detail.lastIndexedAt).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Confidence</dt>
                  <dd className="text-foreground">{detail.confidence.toFixed(2)}</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Source refs
              </div>
              {detail.sourceRefs.length === 0 ? (
                <p className="mt-3 text-muted-foreground">No source refs yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {detail.sourceRefs.map((item) => (
                    <li key={item} className="rounded-lg bg-muted/50 px-3 py-2">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                <Link2 className="size-3.5" />
                Outgoing Links
              </div>
              {detail.outgoingLinks.length === 0 ? (
                <p className="mt-3 text-muted-foreground">No resolved wikilinks on this page.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {detail.outgoingLinks.map((link) => (
                    <button
                      key={link.id}
                      className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-muted/35 px-3 py-2 text-left hover:bg-accent/40"
                      onClick={() => navigateToPage(link.targetPageId, workspaceRoot)}
                      type="button"
                    >
                      <span>{link.displayText}</span>
                      <Badge variant="outline">{link.resolutionKind}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Unresolved Links
              </div>
              {detail.unresolvedLinks.length === 0 ? (
                <p className="mt-3 text-muted-foreground">No unresolved wikilinks.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {detail.unresolvedLinks.map((link) => (
                    <div
                      key={link.id}
                      className="rounded-xl border border-amber-300/50 bg-amber-400/10 px-3 py-2"
                    >
                      <div className="font-medium text-foreground">{link.displayText}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.12em] text-amber-800">
                        {link.reason}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Backlinks
              </div>
              {detail.backlinks.length === 0 ? (
                <p className="mt-3 text-muted-foreground">No backlinks yet.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {detail.backlinks.map((link) => (
                    <button
                      key={`${link.sourcePageId}-${link.sourcePath}`}
                      className="flex w-full items-start gap-3 rounded-xl border border-border/70 bg-muted/35 px-3 py-2 text-left hover:bg-accent/40"
                      onClick={() => navigateToPage(link.sourcePageId, workspaceRoot)}
                      type="button"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate text-foreground">{link.sourceTitle}</span>
                        <span className="block truncate font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {link.sourcePath}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Pane>
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Wiki browser"
        title="Browse the compiled wiki as files first"
        description="Read and edit durable markdown knowledge pages with validated frontmatter, wikilink navigation, backlinks, and synchronized SQLite metadata."
        badge="Compiled wiki"
      />
      <div className="grid gap-6 xl:grid-cols-12">
        {leftPane}
        {centerPane}
        {rightPane}
      </div>
    </div>
  );
}
