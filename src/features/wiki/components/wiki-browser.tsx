"use client";

import type { ChangeEvent, FormEvent, MouseEvent, ReactNode } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FilePlus2,
  FileText,
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
  initialPages?: WikiPageSummary[];
  initialDetail?: WikiPageDetail | null;
  preferredInitialPagePath?: string;
  internalLinkBasePath?: string;
  workspaceRootMode?: "sticky" | "fixed";
  showWorkspaceRootCard?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowRefreshLinks?: boolean;
  header?: {
    eyebrow: string;
    title: string;
    description: string;
    badge?: string;
  };
  intro?: ReactNode;
};

type ArticleHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

type EnhancedRenderedArticle = {
  html: string;
  headings: ArticleHeading[];
  leadHtml: string | null;
  leadText: string | null;
};

type WorkingCueItem = {
  label: string;
  targetTitle: string | null;
};

type WorkingCueSection = {
  title: string;
  items: WorkingCueItem[];
};

const ARTICLE_ENTRY_META: Record<
  WikiPageType,
  {
    label: string;
    description: string;
  }
> = {
  index: {
    label: "Index entry",
    description: "An entry page that helps readers navigate a broader area of the wiki.",
  },
  topic: {
    label: "Topic overview",
    description: "A broad explanatory article that organizes a larger subject into a durable entry.",
  },
  concept: {
    label: "Concept entry",
    description: "A reference article that defines a reusable idea and its place in the knowledge base.",
  },
  entity: {
    label: "Entity entry",
    description: "A durable reference entry for a named system, actor, tool, or artifact.",
  },
  timeline: {
    label: "Timeline entry",
    description: "A chronology-focused article that helps track change over time.",
  },
  synthesis: {
    label: "Research synthesis",
    description: "A compiled article that combines multiple materials into one reviewable synthesis.",
  },
  note: {
    label: "Wiki note",
    description: "A durable note or archived answer that remains integrated with the rest of the wiki.",
  },
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

function Surface({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
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

function SurfaceHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/60 px-5 py-3.5">
      <div className="space-y-1.5">
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {title}
        </div>
        {description ? (
          <div className="text-sm leading-6 text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {actions}
    </div>
  );
}

function MetaBlock({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="border-l border-border/65 pl-3.5">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 break-words text-sm leading-6 text-foreground">{value}</div>
    </div>
  );
}

function SummaryFact({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-start gap-3 border-t border-border/55 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="text-sm leading-6 text-foreground">{value}</div>
    </div>
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

function rewriteRenderedHtmlLinks(renderedHtml: string, internalLinkBasePath: string) {
  if (internalLinkBasePath === "/wiki") {
    return renderedHtml;
  }

  return renderedHtml.replaceAll('href="/wiki?', `href="${internalLinkBasePath}?`);
}

function decodeHtmlEntities(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function stripHtml(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function createHeadingSlug(value: string) {
  return stripHtml(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function enhanceRenderedArticle(
  renderedHtml: string,
  internalLinkBasePath: string,
): EnhancedRenderedArticle {
  let html = rewriteRenderedHtmlLinks(renderedHtml, internalLinkBasePath);
  let leadHtml: string | null = null;
  let leadText: string | null = null;

  const summaryLeadMatch = html.match(
    /^\s*<h([23])>(Summary|Overview|Introduction)<\/h\1>\s*<p>([\s\S]*?)<\/p>/i,
  );

  if (summaryLeadMatch) {
    leadHtml = `<p>${summaryLeadMatch[3]}</p>`;
    leadText = stripHtml(summaryLeadMatch[3]);
    html = html.replace(summaryLeadMatch[0], "");
  }

  const leadMatch = !leadHtml ? html.match(/<p>([\s\S]*?)<\/p>/i) : null;

  if (leadMatch) {
    leadHtml = `<p>${leadMatch[1]}</p>`;
    leadText = stripHtml(leadMatch[1]);
    html = html.replace(leadMatch[0], "");
  }

  const headings: ArticleHeading[] = [];
  const headingCounts = new Map<string, number>();

  html = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_match, levelValue, innerHtml) => {
    const text = stripHtml(innerHtml);
    const baseId = createHeadingSlug(text) || `section-${headings.length + 1}`;
    const nextCount = (headingCounts.get(baseId) ?? 0) + 1;

    headingCounts.set(baseId, nextCount);

    const id = nextCount === 1 ? baseId : `${baseId}-${nextCount}`;
    const level = Number(levelValue) as 2 | 3;

    headings.push({
      id,
      text,
      level,
    });

    return `<h${levelValue} id="${id}" data-wiki-heading="true">${innerHtml}</h${levelValue}>`;
  });

  return {
    html,
    headings,
    leadHtml,
    leadText,
  };
}

function normalizeReferenceKey(value: string) {
  return value.trim().toLowerCase();
}

function resolvePageReference(reference: string, pages: WikiPageSummary[]) {
  const targetKey = normalizeReferenceKey(reference);

  return (
    pages.find((page) => normalizeReferenceKey(page.title) === targetKey) ??
    pages.find((page) => normalizeReferenceKey(page.canonicalTitle) === targetKey) ??
    pages.find((page) => page.aliases.some((alias) => normalizeReferenceKey(alias) === targetKey)) ??
    null
  );
}

function readFrontmatterStringValue(frontmatter: Record<string, unknown>, key: string) {
  const value = frontmatter[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function readFrontmatterStringArrayValue(frontmatter: Record<string, unknown>, key: string) {
  const value = frontmatter[key];

  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function extractMarkdownSection(body: string, headingNames: string[]) {
  for (const heading of headingNames) {
    const pattern = new RegExp(
      `^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$\\n([\\s\\S]*?)(?=^##\\s+|\\Z)`,
      "m",
    );
    const match = body.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}

function stripMarkdownInline(value: string) {
  return value
    .replace(/\[\[([^[\]|]+?)\|([^[\]]+?)\]\]/g, "$2")
    .replace(/\[\[([^[\]]+?)\]\]/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .trim();
}

function parseWorkingCueItems(sectionMarkdown: string) {
  const listItems = sectionMarkdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^([-*]|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^([-*]|\d+\.)\s+/, "").trim())
    .filter(Boolean);

  if (listItems.length === 0) {
    const firstParagraph = sectionMarkdown
      .split(/\n\s*\n/)
      .map((block) => block.trim())
      .find(Boolean);

    if (!firstParagraph) {
      return [] as WorkingCueItem[];
    }

    return [
      {
        label: stripMarkdownInline(firstParagraph),
        targetTitle: null,
      },
    ];
  }

  return listItems.map((item) => {
    const wikiMatch = item.match(/\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/);

    if (wikiMatch) {
      return {
        label: stripMarkdownInline(item),
        targetTitle: wikiMatch[1]!.trim(),
      };
    }

    return {
      label: stripMarkdownInline(item),
      targetTitle: null,
    };
  });
}

function buildWorkingCueSections(detail: WikiPageDetail, pages: WikiPageSummary[]) {
  const cueDefinitions = [
    {
      title: "Start here",
      headings: ["Start here", "Key pages", "Primary reading path"],
    },
    {
      title: "Reading path",
      headings: ["Reading path", "Reading paths", "Orientation pass"],
    },
    {
      title: "Watchpoints",
      headings: ["Watchpoints", "Monitoring", "What to monitor"],
    },
    {
      title: "Current tensions",
      headings: ["Current tensions", "Open fronts", "Tensions"],
    },
    {
      title: "Open questions",
      headings: ["Open questions", "Follow-up questions", "Questions"],
    },
    {
      title: "Artifact ladder",
      headings: ["Artifact ladder", "Visible artifacts", "Artifact trail"],
    },
    {
      title: "Revisit next",
      headings: ["Revisit next", "Review cadence", "Resume without rereading everything"],
    },
    {
      title: "Context refresh",
      headings: ["Context packs to refresh", "Feed to the model", "Available packs"],
    },
    {
      title: "Synthesis candidates",
      headings: [
        "Synthesis candidates",
        "Synthesis decisions",
        "Published syntheses",
        "What should become synthesis next",
        "What might become synthesis next",
      ],
    },
    {
      title: "Working surfaces",
      headings: ["Canonical vs working surfaces", "Maintenance surfaces", "Working surfaces"],
    },
  ] as const;

  const sections = cueDefinitions
    .map((cue) => {
      const section = extractMarkdownSection(detail.body, [...cue.headings]);

      if (!section) {
        return null;
      }

      const items = parseWorkingCueItems(section).map((item) => {
        if (!item.targetTitle) {
          return item;
        }

        const resolved = resolvePageReference(item.targetTitle, pages);

        return {
          label: item.label,
          targetTitle: resolved?.title ?? item.targetTitle,
        };
      });

      if (items.length === 0) {
        return null;
      }

      return {
        title: cue.title,
        items,
      } satisfies WorkingCueSection;
    })
    .filter(Boolean);

  return sections as WorkingCueSection[];
}

export function WikiBrowser({
  defaultWorkspaceRoot,
  initialPages = [],
  initialDetail = null,
  preferredInitialPagePath,
  internalLinkBasePath = "/wiki",
  workspaceRootMode = "sticky",
  showWorkspaceRootCard = true,
  allowCreate = true,
  allowEdit = true,
  allowRefreshLinks = true,
  header,
  intro,
}: WikiBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [pages, setPages] = useState<WikiPageSummary[]>(initialPages);
  const [detail, setDetail] = useState<WikiPageDetail | null>(initialDetail);
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftContent, setDraftContent] = useState(initialDetail?.rawContent ?? "");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<Exclude<WikiPageType, "index">>("note");
  const [loadedPagesWorkspaceRoot, setLoadedPagesWorkspaceRoot] = useState<string | null>(
    initialPages.length > 0 || initialDetail ? defaultWorkspaceRoot : null,
  );
  const [loadedDetailKey, setLoadedDetailKey] = useState<string | null>(
    initialDetail ? `${defaultWorkspaceRoot}:${initialDetail.id}` : null,
  );

  const queryWorkspaceRoot = searchParams.get("workspaceRoot");
  const selectedPageId = searchParams.get("pageId");
  const selectedPagePath = searchParams.get("pagePath");

  useEffect(() => {
    const storedRoot =
      workspaceRootMode === "sticky"
        ? queryWorkspaceRoot ??
          window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ??
          defaultWorkspaceRoot
        : queryWorkspaceRoot ?? defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
    if (workspaceRootMode === "sticky") {
      window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, storedRoot);
    }
  }, [defaultWorkspaceRoot, queryWorkspaceRoot, workspaceRootMode]);

  useEffect(() => {
    let isActive = true;

    async function loadPages() {
      if (workspaceRoot === loadedPagesWorkspaceRoot) {
        return;
      }

      setIsLoadingPages(true);
      setErrorMessage(null);

      try {
        const nextPages = await fetchPageList(workspaceRoot);

        if (!isActive) {
          return;
        }

        setPages(nextPages);
        setLoadedPagesWorkspaceRoot(workspaceRoot);
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
  }, [loadedPagesWorkspaceRoot, workspaceRoot]);

  useEffect(() => {
    if (isLoadingPages || pages.length === 0) {
      return;
    }

    if (!selectedPageId) {
      const preferredPage =
        pages.find((page) => page.path === selectedPagePath) ??
        pages.find((page) => page.path === preferredInitialPagePath) ??
        pages[0];

      if (!preferredPage) {
        return;
      }

      const params = new URLSearchParams({
        workspaceRoot,
        pageId: preferredPage.id,
      });

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }
  }, [
    isLoadingPages,
    pages,
    pathname,
    preferredInitialPagePath,
    router,
    selectedPageId,
    selectedPagePath,
    workspaceRoot,
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadPageDetail() {
      if (!selectedPageId) {
        const fallbackPage =
          pages.find((page) => page.path === selectedPagePath) ??
          pages.find((page) => page.path === preferredInitialPagePath) ??
          pages[0];

        if (fallbackPage && detail?.id === fallbackPage.id) {
          setDraftContent(detail.rawContent);
          return;
        }

        setDetail(null);
        setDraftContent("");
        return;
      }

      if (`${workspaceRoot}:${selectedPageId}` === loadedDetailKey) {
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
        setLoadedDetailKey(`${workspaceRoot}:${nextDetail.id}`);
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
  }, [
    detail,
    loadedDetailKey,
    pages,
    preferredInitialPagePath,
    selectedPageId,
    selectedPagePath,
    workspaceRoot,
  ]);

  const groupedPages = useMemo(() => groupPagesByType(pages), [pages]);
  const renderedArticle = useMemo(() => {
    if (!detail) {
      return {
        html: "",
        headings: [],
        leadHtml: null,
        leadText: null,
      } satisfies EnhancedRenderedArticle;
    }

    return enhanceRenderedArticle(detail.renderedHtml, internalLinkBasePath);
  }, [detail, internalLinkBasePath]);

  const articleLead = renderedArticle.leadHtml;
  const articleLeadText = renderedArticle.leadText;
  const articleHeadings = renderedArticle.headings;
  const articleMeta = detail ? ARTICLE_ENTRY_META[detail.type] : null;
  const knowledgeRole = detail
    ? readFrontmatterStringValue(detail.frontmatter, "knowledge_role")
    : null;
  const surfaceKind = detail
    ? readFrontmatterStringValue(detail.frontmatter, "surface_kind")
    : null;
  const revisitCadence = detail
    ? readFrontmatterStringValue(detail.frontmatter, "revisit_cadence")
    : null;
  const refreshTriggers = detail
    ? readFrontmatterStringArrayValue(detail.frontmatter, "refresh_triggers")
    : [];
  const relatedReferencePages = useMemo(() => {
    if (!detail) {
      return [] as Array<{ reference: string; page: WikiPageSummary | null }>;
    }

    return detail.pageRefs
      .map((reference) => ({
        reference,
        page: resolvePageReference(reference, pages),
      }))
      .slice(0, 6);
  }, [detail, pages]);
  const workingCueSections = useMemo(() => {
    if (!detail) {
      return [] as WorkingCueSection[];
    }

    return buildWorkingCueSections(detail, pages);
  }, [detail, pages]);
  const articleNavigation = useMemo(() => {
    const items = [...articleHeadings];

    if (detail) {
      items.push(
        {
          id: "references",
          text: "References",
          level: 2,
        },
        {
          id: "related-knowledge",
          text: "Related knowledge",
          level: 2,
        },
      );
    }

    return items;
  }, [articleHeadings, detail]);
  const showFullPageHeader =
    !detail || detail.path === "wiki/index.md" || (allowEdit && isEditing);
  const showRightRail = !detail || (allowEdit && isEditing);

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
    setLoadedPagesWorkspaceRoot(workspaceRoot);

    const pageId = nextPageId ?? selectedPageId ?? nextPages[0]?.id ?? null;

    if (!pageId) {
      setDetail(null);
      setDraftContent("");
      return;
    }

    const nextDetail = await fetchPageDetail(workspaceRoot, pageId);

    setDetail(nextDetail);
    setDraftContent(nextDetail.rawContent);
    setLoadedDetailKey(`${workspaceRoot}:${nextDetail.id}`);
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
      setLoadedDetailKey(`${workspaceRoot}:${nextDetail.id}`);
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
      router.push(`${internalLinkBasePath}${href.slice("/wiki".length)}`);
    });
  }

  const leftRail = (
    <div className="space-y-4 xl:sticky xl:top-6">
      <Surface className="overflow-hidden bg-background/72 shadow-none">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Knowledge index
              </div>
              <div className="text-sm leading-6 text-muted-foreground">
                {pages.length} indexed page{pages.length === 1 ? "" : "s"} organized as durable
                article pages.
              </div>
            </div>
            {allowCreate ? (
              <Button
                onClick={() => setShowCreateForm((current) => !current)}
                size="sm"
                variant="outline"
              >
                <FilePlus2 className="size-4" />
                New page
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 px-4 py-4">
          {showWorkspaceRootCard ? (
            <div className="border-b border-border/60 px-1 pb-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Workspace
              </div>
              <div className="mt-2 break-all font-mono text-[11px] leading-6 text-foreground/90">
                {workspaceRoot}
              </div>
            </div>
          ) : null}

          {allowCreate && showCreateForm ? (
            <form
              className="space-y-3 rounded-[20px] bg-background/70 p-4 ring-1 ring-border/60"
              onSubmit={handleCreatePage}
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Create from template
              </div>
              <Input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="New page title"
              />
              <select
                className="flex h-10 w-full rounded-xl border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm outline-none"
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
            <div className="rounded-[18px] bg-muted/55 px-4 py-4 text-sm text-muted-foreground">
              Loading wiki pages...
            </div>
          ) : pages.length === 0 ? (
            <div className="rounded-[18px] bg-muted/55 px-4 py-5 text-sm leading-7 text-muted-foreground">
              No wiki pages were discovered yet.
              {allowCreate
                ? " Create the first page from a template or initialize a populated workspace."
                : " Load a workspace snapshot to browse its compiled knowledge."}
            </div>
          ) : (
            <div className="space-y-5">
              {Array.from(groupedPages.entries()).map(([type, items]) =>
                items.length === 0 ? null : (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between gap-3 px-1">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {WIKI_PAGE_TYPE_LABELS[type]}
                      </div>
                      <div className="text-xs text-muted-foreground">{items.length}</div>
                    </div>
                    <div className="space-y-1.5">
                      {items.map((page) => (
                        <button
                          key={page.id}
                          className={cn(
                            "flex w-full items-start justify-between rounded-[14px] border-l-[3px] px-3 py-3 text-left transition-colors",
                            selectedPageId === page.id
                              ? "border-primary bg-foreground/[0.03] text-foreground"
                              : "border-transparent bg-transparent text-muted-foreground hover:bg-foreground/[0.035] hover:text-foreground",
                          )}
                          onClick={() => navigateToPage(page.id, workspaceRoot)}
                          type="button"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{page.title}</div>
                            <div
                              className={cn(
                                "mt-1 truncate font-mono text-[11px] uppercase tracking-[0.14em]",
                                selectedPageId === page.id
                                  ? "text-foreground/65"
                                  : "text-muted-foreground",
                              )}
                            >
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
      </Surface>
    </div>
  );

  const centerColumn = (
    <Surface className="overflow-hidden bg-card/88 shadow-[0_18px_48px_-38px_rgba(15,23,42,0.2)]">
      <div className="space-y-5 px-6 py-6">
        {errorMessage ? (
          <div className="rounded-[22px] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm leading-7 text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isLoadingDetail ? (
          <div className="rounded-[24px] bg-muted/55 px-5 py-6 text-sm text-muted-foreground">
            Loading page...
          </div>
        ) : !detail ? (
          <div className="rounded-[24px] bg-muted/45 px-5 py-12 text-center text-sm leading-7 text-muted-foreground">
            Select a wiki page from the left rail to enter the compiled knowledge base.
          </div>
        ) : (
          <>
            <div className="space-y-6 border-b border-border/60 px-1 pb-7">
              <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-[68ch] space-y-5">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            {articleMeta?.label ?? WIKI_PAGE_TYPE_LABELS[detail.type]}
                          </div>
                          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
                            {detail.path}
                          </div>
                        </div>
                        <h1 className="max-w-[16ch] text-[clamp(2.5rem,3vw,4rem)] font-semibold leading-[0.98] tracking-[-0.055em] text-foreground">
                          {detail.title}
                        </h1>
                        <p className="max-w-[64ch] text-sm leading-7 text-muted-foreground">
                          {articleMeta?.description ??
                            "A durable wiki entry in the compiled knowledge base."}
                        </p>
                      </div>
                      {articleLead ? (
                        <div
                          className="max-w-[66ch] font-serif text-[1.14rem] leading-[2] text-foreground/88 [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/25 [&_a]:underline-offset-4 [&_strong]:font-semibold"
                          dangerouslySetInnerHTML={{ __html: articleLead }}
                        />
                      ) : articleLeadText ? (
                        <p className="max-w-[66ch] font-serif text-[1.14rem] leading-[2] text-foreground/88">
                          {articleLeadText}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {allowEdit && isEditing ? (
                        <>
                          <Button disabled={isSaving} onClick={handleSave} size="sm">
                            <Save className="size-4" />
                            Save markdown
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
                      ) : allowEdit ? (
                        <Button onClick={() => setIsEditing(true)} size="sm" variant="ghost">
                          <PencilLine className="size-4" />
                          Edit source
                        </Button>
                      ) : (
                        <Badge variant="outline">Article view</Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] leading-6 text-muted-foreground">
                    <span>
                      <span className="font-medium text-foreground/86">Review</span>{" "}
                      {detail.reviewStatus}
                    </span>
                    <span>
                      <span className="font-medium text-foreground/86">Status</span> {detail.status}
                    </span>
                    <span>
                      <span className="font-medium text-foreground/86">Coverage</span>{" "}
                      {detail.sourceRefs.length} source ref
                      {detail.sourceRefs.length === 1 ? "" : "s"}
                    </span>
                    <span>
                      <span className="font-medium text-foreground/86">Revised</span>{" "}
                      {new Date(detail.updatedAt).toLocaleString()}
                    </span>
                  </div>

                  {articleNavigation.length > 0 ? (
                    <nav className="border-y border-border/55 py-5">
                      <div className="grid gap-4 md:grid-cols-[108px_minmax(0,1fr)]">
                        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                          Contents
                        </div>
                        <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                          {articleNavigation.map((heading) => (
                            <a
                              key={heading.id}
                              className={cn(
                                "text-sm leading-7 text-muted-foreground transition-colors hover:text-foreground",
                                heading.level === 3 ? "sm:pl-4" : "",
                              )}
                              href={`#${heading.id}`}
                            >
                              {heading.text}
                            </a>
                          ))}
                        </div>
                      </div>
                    </nav>
                  ) : null}
                </div>

                <aside className="rounded-[24px] border border-border/55 bg-background/68 px-4 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)]">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Article summary
                  </div>
                  <div className="mt-4 border-y border-border/55 py-1">
                    <SummaryFact
                      label="Entry"
                      value={articleMeta?.label ?? WIKI_PAGE_TYPE_LABELS[detail.type]}
                    />
                    {knowledgeRole ? (
                      <SummaryFact label="Role" value={knowledgeRole} />
                    ) : null}
                    {surfaceKind ? (
                      <SummaryFact label="Surface" value={surfaceKind} />
                    ) : null}
                    {detail.aliases.length > 0 ? (
                      <SummaryFact label="Aliases" value={detail.aliases.join(", ")} />
                    ) : null}
                    <SummaryFact
                      label="Coverage"
                      value={`${detail.sourceRefs.length} source ref${detail.sourceRefs.length === 1 ? "" : "s"}`}
                    />
                    {revisitCadence ? (
                      <SummaryFact label="Cadence" value={revisitCadence} />
                    ) : null}
                    {refreshTriggers.length > 0 ? (
                      <SummaryFact label="Refresh" value={refreshTriggers.join("; ")} />
                    ) : null}
                    <SummaryFact label="Confidence" value={detail.confidence.toFixed(2)} />
                    <SummaryFact
                      label="Revised"
                      value={new Date(detail.updatedAt).toLocaleString()}
                    />
                    <SummaryFact
                      label="Indexed"
                      value={new Date(detail.lastIndexedAt).toLocaleString()}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Page cues
                    </div>
                    <div className="space-y-2 text-sm leading-6 text-foreground">
                      <div className="border-l border-border/60 pl-3">
                        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Path
                        </div>
                        <div className="mt-1 break-all font-mono text-xs text-foreground/88">
                          {detail.path}
                        </div>
                      </div>
                      <div className="border-l border-border/60 pl-3">
                        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          Slug
                        </div>
                        <div className="mt-1 text-sm text-foreground/88">{detail.slug}</div>
                      </div>
                    </div>
                  </div>
                  {detail.tags.length > 0 ? (
                    <div className="mt-4 space-y-2">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Categories
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {detail.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </aside>
              </div>

              <div className="flex flex-wrap items-start justify-between gap-4 border-t border-border/55 pt-4">
                <div className="space-y-1 border-l border-border/55 pl-3">
                  <div className="text-sm leading-6 text-muted-foreground">
                    {detail.sourceRefs.length} references · {detail.backlinks.length} related pages
                    · Last revised {new Date(detail.updatedAt).toLocaleString()}
                  </div>
                </div>
                {allowRefreshLinks ? (
                  <Button
                    disabled={isSaving}
                    onClick={handleRefreshLinks}
                    size="sm"
                    variant="ghost"
                  >
                    <RefreshCw className="size-4" />
                    Refresh links
                  </Button>
                ) : null}
              </div>

              {workingCueSections.length > 0 ? (
                <section className="rounded-[24px] border border-border/55 bg-background/62 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Working cues
                    </div>
                    <div className="text-sm leading-6 text-muted-foreground">
                      Use the sections already inside this page as the next-step work surface.
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    {workingCueSections.map((section) => (
                      <div
                        key={section.title}
                        className="rounded-[18px] border border-border/50 bg-card/72 px-4 py-4"
                      >
                        <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                          {section.title}
                        </div>
                        <div className="mt-3 space-y-2">
                          {section.items.map((item) => {
                            const targetPage = item.targetTitle
                              ? resolvePageReference(item.targetTitle, pages)
                              : null;

                            return targetPage ? (
                              <button
                                key={`${section.title}:${item.label}`}
                                className="block w-full rounded-[14px] border border-border/45 px-3 py-2 text-left text-sm leading-6 text-foreground transition-colors hover:bg-foreground/[0.03]"
                                onClick={() => navigateToPage(targetPage.id, workspaceRoot)}
                                type="button"
                              >
                                {item.label}
                              </button>
                            ) : (
                              <div
                                key={`${section.title}:${item.label}`}
                                className="rounded-[14px] border border-border/35 px-3 py-2 text-sm leading-6 text-muted-foreground"
                              >
                                {item.label}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            {allowEdit && isEditing ? (
              <div className="space-y-3">
                <div className="rounded-[22px] bg-muted/55 px-4 py-3 text-sm leading-7 text-muted-foreground">
                  Editing raw Markdown. Frontmatter remains validated against the page path and the
                  saved file stays the source of truth.
                </div>
                <Textarea
                  className="min-h-[760px] rounded-[24px] border-border/70 bg-background/80 font-mono text-xs leading-6"
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                />
              </div>
            ) : (
              <div className="rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(249,248,244,0.97))] px-8 py-9 shadow-[inset_0_1px_0_rgba(255,255,255,0.74)] ring-1 ring-border/50">
                <article
                  className="wiki-render px-1 font-serif text-[15.8px] leading-[1.98] text-foreground [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/25 [&_a]:underline-offset-4 [&_a:hover]:decoration-primary/55 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1:first-child]:hidden [&_h2]:scroll-mt-28 [&_h2]:font-sans [&_h2]:mt-16 [&_h2]:border-b [&_h2]:border-border/55 [&_h2]:pb-3 [&_h2]:text-[1.72rem] [&_h2]:font-semibold [&_h2]:tracking-[-0.04em] [&_h3]:scroll-mt-28 [&_h3]:font-sans [&_h3]:mt-10 [&_h3]:text-[1.16rem] [&_h3]:font-semibold [&_h3]:tracking-[-0.03em] [&_hr]:my-10 [&_li]:ml-4 [&_li]:leading-8 [&_ol]:list-decimal [&_p]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-slate-100 [&_strong]:font-semibold [&_ul]:list-disc"
                  onClick={handleRenderedClick}
                >
                  <div
                    className="mx-auto max-w-[72ch]"
                    dangerouslySetInnerHTML={{ __html: renderedArticle.html }}
                  />
                </article>

                <section
                  className="mx-auto mt-12 max-w-[72ch] border-t border-border/60 pt-8"
                  id="references"
                >
                  <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.04em] text-foreground">
                    References
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    This article is grounded in imported source artifacts tracked inside the local
                    workspace.
                  </p>
                  {detail.sourceRefs.length === 0 ? (
                    <div className="mt-4 text-sm leading-7 text-muted-foreground">
                      No source references have been attached to this article yet.
                    </div>
                  ) : (
                    <ol className="mt-5 space-y-3">
                      {detail.sourceRefs.map((item, index) => (
                        <li
                          key={item}
                          className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 text-sm leading-7 text-foreground"
                        >
                          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                            [{index + 1}]
                          </span>
                          <span className="border-l border-border/60 pl-3">
                            <span className="block text-[15px] leading-7 text-foreground">
                              {item}
                            </span>
                            <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                              Imported source artifact
                            </span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section
                  className="mx-auto mt-12 max-w-[72ch] border-t border-border/60 pt-8"
                  id="related-knowledge"
                >
                  <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.04em] text-foreground">
                    Related knowledge
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Use nearby entries, backlinks, and linked concepts to move outward from the
                    current article.
                  </p>

                  {relatedReferencePages.length > 0 ? (
                    <section className="mt-6 space-y-3 border-b border-border/55 pb-6">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        See also
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {relatedReferencePages.map((item) =>
                          item.page ? (
                            <button
                              key={item.reference}
                              className="rounded-[18px] border border-border/50 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.03]"
                              onClick={() => navigateToPage(item.page!.id, workspaceRoot)}
                              type="button"
                            >
                              <span className="block text-sm font-medium text-foreground">
                                {item.page!.title}
                              </span>
                              <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                {item.page!.path}
                              </span>
                            </button>
                          ) : (
                            <div
                              key={item.reference}
                              className="rounded-[18px] border border-border/50 px-4 py-3 text-sm leading-7 text-muted-foreground"
                            >
                              {item.reference}
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                  ) : null}

                  <div className="mt-6 grid gap-8 lg:grid-cols-2">
                    <section className="space-y-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Backlinks
                      </div>
                      {detail.backlinks.length === 0 ? (
                        <div className="text-sm leading-7 text-muted-foreground">
                          No related article backlinks yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/55">
                          {detail.backlinks.map((link) => (
                            <button
                              key={`${link.sourcePageId}-${link.sourcePath}`}
                              className="flex w-full items-start gap-3 py-3 text-left transition-colors first:pt-0 last:pb-0 hover:text-foreground"
                              onClick={() => navigateToPage(link.sourcePageId, workspaceRoot)}
                              type="button"
                            >
                              <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {link.sourceTitle}
                                </span>
                                <span className="block truncate font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                  {link.sourcePath}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>

                    <section className="space-y-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Linked concepts
                      </div>
                      {detail.outgoingLinks.length === 0 ? (
                        <div className="text-sm leading-7 text-muted-foreground">
                          No resolved linked concepts or related pages yet.
                        </div>
                      ) : (
                        <div className="divide-y divide-border/55">
                          {detail.outgoingLinks.map((link) => (
                            <button
                              key={link.id}
                              className="flex w-full items-center justify-between py-3 text-left transition-colors first:pt-0 last:pb-0 hover:text-foreground"
                              onClick={() => navigateToPage(link.targetPageId, workspaceRoot)}
                              type="button"
                            >
                              <span className="text-sm text-foreground">{link.displayText}</span>
                              <Badge variant="outline">{link.resolutionKind}</Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  {detail.unresolvedLinks.length > 0 ? (
                    <div className="mt-8 space-y-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Open link gaps
                      </div>
                      <div className="space-y-2">
                        {detail.unresolvedLinks.map((link) => (
                          <div
                            key={link.id}
                            className="rounded-[16px] bg-amber-400/10 px-3 py-3 ring-1 ring-amber-300/45"
                          >
                            <div className="text-sm font-medium text-foreground">
                              {link.displayText}
                            </div>
                            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-amber-900">
                              {link.reason}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-8 grid gap-8 border-t border-border/55 pt-6 md:grid-cols-[minmax(0,1fr)_220px]">
                    <section className="space-y-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Article cues
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <MetaBlock
                          label="Path"
                          value={<span className="font-mono text-xs">{detail.path}</span>}
                        />
                        <MetaBlock label="Slug" value={detail.slug} />
                        <MetaBlock
                          label="Last indexed"
                          value={new Date(detail.lastIndexedAt).toLocaleString()}
                        />
                      </div>
                    </section>

                    <section className="space-y-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        Categories
                      </div>
                      {detail.tags.length === 0 ? (
                        <div className="text-sm leading-7 text-muted-foreground">
                          No categories or tags are attached to this article yet.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {detail.tags.map((tag) => (
                            <Badge key={tag} variant="outline">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </div>
    </Surface>
  );

  const rightRail = (
    <div className="space-y-4 xl:sticky xl:top-6">
      <Surface className="overflow-hidden bg-background/72 shadow-none">
        <SurfaceHeader
          title="Knowledge navigation"
          description="Use wiki relationships and page cues to move to adjacent entries without overwhelming the article."
        />
        {!detail ? (
          <div className="px-5 py-5 text-sm leading-7 text-muted-foreground">
            Related entries and page-level wiki cues appear here once an article is selected.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {workingCueSections.length > 0 ? (
              <div className="space-y-4 px-5 py-5">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Work next
                </div>
                <div className="space-y-4">
                  {workingCueSections.slice(0, 3).map((section) => (
                    <div key={section.title} className="space-y-2">
                      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {section.title}
                      </div>
                      <div className="space-y-2">
                        {section.items.slice(0, 3).map((item) => {
                          const targetPage = item.targetTitle
                            ? resolvePageReference(item.targetTitle, pages)
                            : null;

                          return targetPage ? (
                            <button
                              key={`${section.title}:${item.label}`}
                              className="block w-full rounded-[14px] border border-border/45 px-3 py-2 text-left text-sm leading-6 text-foreground transition-colors hover:bg-foreground/[0.03]"
                              onClick={() => navigateToPage(targetPage.id, workspaceRoot)}
                              type="button"
                            >
                              {item.label}
                            </button>
                          ) : (
                            <div
                              key={`${section.title}:${item.label}`}
                              className="rounded-[14px] border border-border/35 px-3 py-2 text-sm leading-6 text-muted-foreground"
                            >
                              {item.label}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-4 px-5 py-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                See also
              </div>
              {relatedReferencePages.length === 0 ? (
                <div className="text-sm leading-7 text-muted-foreground">
                  No explicit see-also references are attached to this article yet.
                </div>
              ) : (
                <div className="divide-y divide-border/55">
                  {relatedReferencePages.map((item) =>
                    item.page ? (
                      <button
                        key={item.reference}
                        className="block w-full py-3 text-left text-sm leading-7 text-foreground transition-colors first:pt-0 last:pb-0 hover:text-foreground/80"
                        onClick={() => navigateToPage(item.page!.id, workspaceRoot)}
                        type="button"
                      >
                        <span className="font-medium">{item.page!.title}</span>
                        <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {item.page!.path}
                        </span>
                      </button>
                    ) : (
                      <div
                        key={item.reference}
                        className="py-3 text-sm leading-7 text-muted-foreground first:pt-0 last:pb-0"
                      >
                        {item.reference}
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Page cues
              </div>
              <div className="space-y-4">
                {surfaceKind ? <MetaBlock label="Surface" value={surfaceKind} /> : null}
                {revisitCadence ? <MetaBlock label="Cadence" value={revisitCadence} /> : null}
                <MetaBlock label="Path" value={<span className="font-mono text-xs">{detail.path}</span>} />
                <MetaBlock label="Slug" value={detail.slug} />
                <MetaBlock
                  label="Last indexed"
                  value={new Date(detail.lastIndexedAt).toLocaleString()}
                />
              </div>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Categories
              </div>
              {detail.tags.length === 0 ? (
                <div className="text-sm leading-7 text-muted-foreground">
                  No categories or tags are attached to this article yet.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {detail.tags.map((tag) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Surface>
    </div>
  );

  return (
    <div className="space-y-6">
      {showFullPageHeader ? (
        <PageHeader
          eyebrow={header?.eyebrow ?? "Wiki browser"}
          title={header?.title ?? "Enter the compiled wiki"}
          description={
            header?.description ??
            "Read durable markdown knowledge pages with clear provenance, wikilink navigation, backlinks, and synchronized local metadata."
          }
          badge={header?.badge ?? "Compiled wiki"}
          compact
        />
      ) : detail ? (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-border/55 bg-background/62 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.34)]">
          <div className="space-y-1.5">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {header?.eyebrow ?? "Wiki browser"}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {header?.badge ? <Badge variant="outline">{header.badge}</Badge> : null}
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {detail.path}
              </span>
            </div>
          </div>
          <div className="max-w-[44ch] text-sm leading-6 text-muted-foreground">
            Markdown remains the source of truth; this page renders it as an article inside the
            product.
          </div>
        </div>
      ) : null}
      {intro}
      <div
        className={cn(
          "grid gap-6",
          showRightRail
            ? "xl:grid-cols-[218px_minmax(0,1.4fr)_254px]"
            : "xl:grid-cols-[198px_minmax(0,1fr)]",
        )}
      >
        {leftRail}
        {centerColumn}
        {showRightRail ? rightRail : null}
      </div>
    </div>
  );
}
