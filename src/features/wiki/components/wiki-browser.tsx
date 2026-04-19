"use client";

import type { ChangeEvent, FormEvent, MouseEvent, ReactNode } from "react";
import { startTransition, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  FilePlus2,
  FileText,
  PencilLine,
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
  WIKI_PAGE_TYPES,
} from "@/lib/constants";
import {
  getLocaleCopy,
  getReviewStatusLabel,
  getWikiEntryMeta,
  getWikiLinkGapReasonLabel,
  getWikiLinkResolutionKindLabel,
  getWikiPageTypeLabel,
  getWorkingCueDefinitions,
  localeToIntlTag,
} from "@/lib/app-locale";
import { cn } from "@/lib/utils";
import { useAppLocale } from "@/components/app-locale-provider";
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
  topicHomePagePath?: string;
  internalLinkBasePath?: string;
  workspaceRootMode?: "sticky" | "fixed";
  showWorkspaceRootCard?: boolean;
  allowCreate?: boolean;
  allowEdit?: boolean;
  allowRefreshLinks?: boolean;
  header?: {
    eyebrow: string;
    title: string;
    description?: string;
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

const WIKI_REQUEST_TIMEOUT_MS = 10_000;
const WIKI_WORKSPACE_RECOVERY_STORAGE_KEY = "research-wiki.workspace-root-recovery";

class WikiRequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WikiRequestTimeoutError";
  }
}

function isWikiTimeoutError(error: unknown) {
  return error instanceof Error && error.name === "WikiRequestTimeoutError";
}

async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchPageList(workspaceRoot: string, fallbackMessage: string) {
  const controller = new AbortController();
  let timeoutId: number | null = null;

  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(
          `/api/wiki/pages?${new URLSearchParams({ workspaceRoot }).toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await readResponseJson(response);

        if (!response.ok) {
          throw new Error((data as { message?: string } | null)?.message ?? fallbackMessage);
        }

        return listWikiPagesResponseSchema.parse(data).pages;
      })(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new WikiRequestTimeoutError(fallbackMessage));
          queueMicrotask(() => {
            controller.abort();
          });
        }, WIKI_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function fetchPageDetail(workspaceRoot: string, pageId: string, fallbackMessage: string) {
  const controller = new AbortController();
  let timeoutId: number | null = null;

  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(
          `/api/wiki/pages/${pageId}?${new URLSearchParams({ workspaceRoot }).toString()}`,
          {
            cache: "no-store",
            signal: controller.signal,
          },
        );
        const data = await readResponseJson(response);

        if (!response.ok) {
          throw new Error((data as { message?: string } | null)?.message ?? fallbackMessage);
        }

        return wikiPageDetailSchema.parse(data);
      })(),
      new Promise<never>((_resolve, reject) => {
        timeoutId = window.setTimeout(() => {
          reject(new WikiRequestTimeoutError(fallbackMessage));
          queueMicrotask(() => {
            controller.abort();
          });
        }, WIKI_REQUEST_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

function LocalizedDateTime({
  locale,
  value,
}: {
  locale: "en" | "zh";
  value: string;
}) {
  return (
    <time dateTime={value} suppressHydrationWarning>
      {new Intl.DateTimeFormat(localeToIntlTag(locale), {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))}
    </time>
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
    <div className="grid grid-cols-[62px_minmax(0,1fr)] items-start gap-2.5 py-1">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="text-[13px] leading-5 text-foreground">{value}</div>
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

const INTERNAL_APP_HREF_PREFIXES = [
  "/dashboard",
  "/topics",
  "/examples",
  "/wiki",
  "/questions",
  "/sessions",
  "/syntheses",
  "/gaps",
  "/changes",
  "/acquisition",
  "/monitoring",
  "/settings",
] as const;

function isInternalAppPath(pathname: string) {
  return INTERNAL_APP_HREF_PREFIXES.some(
    (prefix) =>
      pathname === prefix ||
      pathname.startsWith(`${prefix}/`) ||
      pathname.startsWith(`${prefix}?`),
  );
}

function findPageByPath(pages: WikiPageSummary[], pagePath: string | null) {
  if (!pagePath) {
    return null;
  }

  return pages.find((page) => page.path === pagePath) ?? null;
}

function normalizeExportedHtmlPathToWikiPath(pathname: string) {
  if (!pathname.endsWith(".html")) {
    return null;
  }

  const cleanedPath = pathname.replace(/\/+$/, "");

  if (cleanedPath === "" || cleanedPath === "/index.html") {
    return "wiki/index.md";
  }

  if (cleanedPath.endsWith("/index.html")) {
    const withoutIndex = cleanedPath.slice(0, -"/index.html".length).replace(/^\/+/, "");
    return withoutIndex.length > 0 ? `wiki/${withoutIndex}.md` : "wiki/index.md";
  }

  const withoutExtension = cleanedPath.slice(0, -".html".length).replace(/^\/+/, "");

  if (withoutExtension.length === 0) {
    return "wiki/index.md";
  }

  return withoutExtension.startsWith("wiki/")
    ? `${withoutExtension}.md`
    : `wiki/${withoutExtension}.md`;
}

function normalizeMarkdownPathToWikiPath(pathname: string) {
  if (!pathname.endsWith(".md")) {
    return null;
  }

  const cleanedPath = pathname.replace(/\/+$/, "").replace(/^\/+/, "");

  if (cleanedPath.length === 0) {
    return null;
  }

  return cleanedPath.startsWith("wiki/") ? cleanedPath : `wiki/${cleanedPath}`;
}

function buildInternalWikiPageHref(
  page: WikiPageSummary,
  internalLinkBasePath: string,
) {
  const params = new URLSearchParams({
    pageId: page.id,
  });

  return `${internalLinkBasePath}?${params.toString()}`;
}

function normalizeInternalAppHref(
  href: string,
  internalLinkBasePath: string,
  pages: WikiPageSummary[],
) {
  const decodedHref = decodeHtmlEntities(href);

  try {
    const url = new URL(decodedHref, "http://localhost");
    const exportedPagePath = normalizeExportedHtmlPathToWikiPath(url.pathname);
    const markdownPagePath = normalizeMarkdownPathToWikiPath(url.pathname);

    if (exportedPagePath) {
      const page = findPageByPath(pages, exportedPagePath);

      if (!page) {
        return null;
      }

      return buildInternalWikiPageHref(page, internalLinkBasePath);
    }

    if (markdownPagePath) {
      const page = findPageByPath(pages, markdownPagePath);

      if (!page) {
        return null;
      }

      return buildInternalWikiPageHref(page, internalLinkBasePath);
    }

    if (!isInternalAppPath(url.pathname)) {
      return null;
    }

    if (url.searchParams.has("pagePath") && !url.searchParams.has("pageId")) {
      const page = findPageByPath(pages, url.searchParams.get("pagePath"));

      if (page) {
        url.searchParams.set("pageId", page.id);
      }
    }

    url.searchParams.delete("workspaceRoot");
    url.searchParams.delete("pagePath");

    if (internalLinkBasePath !== "/wiki") {
      if (url.pathname === "/wiki") {
        url.pathname = internalLinkBasePath;
      }
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function rewriteRenderedHtmlLinks(
  renderedHtml: string,
  internalLinkBasePath: string,
  pages: WikiPageSummary[],
) {
  return renderedHtml.replace(/href=(["'])(.*?)\1/g, (match, quote, href: string) => {
    const nextHref = normalizeInternalAppHref(href, internalLinkBasePath, pages);

    if (!nextHref) {
      return match;
    }

    return `href=${quote}${nextHref.replaceAll("&", "&amp;")}${quote}`;
  });
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )
    .replace(/&#(\d+);/g, (_match, numeric: string) =>
      String.fromCharCode(Number.parseInt(numeric, 10)),
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function createBrowserRouteParams({
  pageId,
  workspaceRoot,
  workspaceRootMode,
  defaultWorkspaceRoot,
}: {
  pageId?: string | null;
  workspaceRoot: string;
  workspaceRootMode: "sticky" | "fixed";
  defaultWorkspaceRoot: string;
}) {
  const params = new URLSearchParams();

  if (workspaceRootMode === "sticky" && workspaceRoot !== defaultWorkspaceRoot) {
    params.set("workspaceRoot", workspaceRoot);
  }

  if (pageId) {
    params.set("pageId", pageId);
  }

  return params;
}

function buildPathWithParams(pathname: string, params: URLSearchParams) {
  const query = params.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
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
  pages: WikiPageSummary[],
): EnhancedRenderedArticle {
  let html = rewriteRenderedHtmlLinks(renderedHtml, internalLinkBasePath, pages);
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

function buildWorkingCueSections(
  locale: "en" | "zh",
  detail: WikiPageDetail,
  pages: WikiPageSummary[],
) {
  const cueDefinitions = getWorkingCueDefinitions(locale);

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
  topicHomePagePath,
  internalLinkBasePath = "/wiki",
  workspaceRootMode = "sticky",
  showWorkspaceRootCard = true,
  allowCreate = true,
  allowEdit = true,
  allowRefreshLinks = true,
  header,
  intro,
}: WikiBrowserProps) {
  const { locale } = useAppLocale();
  const copy = getLocaleCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [workspaceRootOverride, setWorkspaceRootOverride] = useState<string | null>(null);
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
  const hasLegacyPagePath = searchParams.has("pagePath");

  useEffect(() => {
    const recoveryWorkspaceRoot =
      workspaceRootMode === "sticky"
        ? window.sessionStorage.getItem(WIKI_WORKSPACE_RECOVERY_STORAGE_KEY)
        : null;
    const storedRoot =
      workspaceRootMode === "sticky"
        ? recoveryWorkspaceRoot ??
          workspaceRootOverride ??
          queryWorkspaceRoot ??
          window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ??
          defaultWorkspaceRoot
        : defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
    if (workspaceRootMode === "sticky") {
      window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, storedRoot);
    }
  }, [defaultWorkspaceRoot, queryWorkspaceRoot, workspaceRootMode, workspaceRootOverride]);

  useEffect(() => {
    if (workspaceRootOverride && queryWorkspaceRoot === null) {
      setWorkspaceRootOverride(null);
    }
  }, [queryWorkspaceRoot, workspaceRootOverride]);

  useEffect(() => {
    if (
      workspaceRootMode === "sticky" &&
      workspaceRoot === defaultWorkspaceRoot &&
      loadedPagesWorkspaceRoot === defaultWorkspaceRoot
    ) {
      window.sessionStorage.removeItem(WIKI_WORKSPACE_RECOVERY_STORAGE_KEY);
    }
  }, [
    defaultWorkspaceRoot,
    loadedPagesWorkspaceRoot,
    workspaceRoot,
    workspaceRootMode,
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadPages() {
      if (workspaceRoot === loadedPagesWorkspaceRoot) {
        return;
      }

      setIsLoadingPages(true);
      setErrorMessage(null);

      try {
        const nextPages = await fetchPageList(workspaceRoot, copy.wikiBrowser.failedToLoadPages);

        if (!isActive) {
          return;
        }

        setPages(nextPages);
        setLoadedPagesWorkspaceRoot(workspaceRoot);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (
          isWikiTimeoutError(error) &&
          workspaceRootMode === "sticky" &&
          workspaceRoot !== defaultWorkspaceRoot
        ) {
          window.localStorage.setItem(
            ACTIVE_WORKSPACE_STORAGE_KEY,
            defaultWorkspaceRoot,
          );
          window.sessionStorage.setItem(
            WIKI_WORKSPACE_RECOVERY_STORAGE_KEY,
            defaultWorkspaceRoot,
          );
          setWorkspaceRootOverride(defaultWorkspaceRoot);
          setWorkspaceRoot(defaultWorkspaceRoot);
          setPages([]);
          setDetail(null);
          setDraftContent("");
          setLoadedPagesWorkspaceRoot(null);
          setLoadedDetailKey(null);
          setErrorMessage(null);
          setIsEditing(false);
          setShowCreateForm(false);
          startTransition(() => {
            router.replace(pathname);
          });
          return;
        }

        setPages([]);
        setErrorMessage(
          error instanceof Error ? error.message : copy.wikiBrowser.failedToLoadPages,
        );
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
  }, [
    copy.wikiBrowser.failedToLoadPages,
    defaultWorkspaceRoot,
    loadedPagesWorkspaceRoot,
    pathname,
    router,
    workspaceRoot,
    workspaceRootMode,
  ]);

  useEffect(() => {
    if (isLoadingPages || pages.length === 0) {
      return;
    }

    if (!selectedPageId) {
      const preferredPage =
        pages.find((page) => page.path === preferredInitialPagePath) ?? pages[0];

      if (!preferredPage) {
        return;
      }

      const params = createBrowserRouteParams({
        pageId: preferredPage.id,
        workspaceRoot,
        workspaceRootMode,
        defaultWorkspaceRoot,
      });

      startTransition(() => {
        router.replace(buildPathWithParams(pathname, params));
      });
    }
  }, [
    defaultWorkspaceRoot,
    isLoadingPages,
    pages,
    pathname,
    preferredInitialPagePath,
    router,
    selectedPageId,
    workspaceRoot,
    workspaceRootMode,
  ]);

  useEffect(() => {
    if (!selectedPageId || !hasLegacyPagePath) {
      return;
    }

    const params = createBrowserRouteParams({
      pageId: selectedPageId,
      workspaceRoot,
      workspaceRootMode,
      defaultWorkspaceRoot,
    });

    startTransition(() => {
      router.replace(buildPathWithParams(pathname, params));
    });
  }, [
    defaultWorkspaceRoot,
    hasLegacyPagePath,
    pathname,
    router,
    selectedPageId,
    workspaceRoot,
    workspaceRootMode,
  ]);

  useEffect(() => {
    let isActive = true;

    async function loadPageDetail() {
      if (!selectedPageId) {
        const fallbackPage = pages.find((page) => page.path === preferredInitialPagePath) ?? pages[0];

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
        const nextDetail = await fetchPageDetail(
          workspaceRoot,
          selectedPageId,
          copy.wikiBrowser.failedToLoadPage,
        );

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

        if (
          isWikiTimeoutError(error) &&
          workspaceRootMode === "sticky" &&
          workspaceRoot !== defaultWorkspaceRoot
        ) {
          window.localStorage.setItem(
            ACTIVE_WORKSPACE_STORAGE_KEY,
            defaultWorkspaceRoot,
          );
          window.sessionStorage.setItem(
            WIKI_WORKSPACE_RECOVERY_STORAGE_KEY,
            defaultWorkspaceRoot,
          );
          setWorkspaceRootOverride(defaultWorkspaceRoot);
          setWorkspaceRoot(defaultWorkspaceRoot);
          setPages([]);
          setDetail(null);
          setDraftContent("");
          setLoadedPagesWorkspaceRoot(null);
          setLoadedDetailKey(null);
          setErrorMessage(null);
          setIsEditing(false);
          setShowCreateForm(false);
          startTransition(() => {
            router.replace(pathname);
          });
          return;
        }

        setDetail(null);
        setDraftContent("");
        setErrorMessage(
          error instanceof Error ? error.message : copy.wikiBrowser.failedToLoadPage,
        );
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
    copy.wikiBrowser.failedToLoadPage,
    defaultWorkspaceRoot,
    detail,
    loadedDetailKey,
    pathname,
    pages,
    preferredInitialPagePath,
    router,
    selectedPageId,
    workspaceRoot,
    workspaceRootMode,
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

    return enhanceRenderedArticle(detail.renderedHtml, internalLinkBasePath, pages);
  }, [detail, internalLinkBasePath, pages]);

  const articleLead = renderedArticle.leadHtml;
  const articleLeadText = renderedArticle.leadText;
  const articleHeadings = renderedArticle.headings;
  const articleMeta = detail ? getWikiEntryMeta(locale, detail.type) : null;
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
  const isTopicWorkspaceView = internalLinkBasePath !== "/wiki";
  const isTopicHomeEntry =
    isTopicWorkspaceView && !!detail && detail.path === topicHomePagePath && !isEditing;
  const articleSummaryFacts = detail
    ? ((
        isTopicHomeEntry
          ? []
          : [
              {
                label: copy.wikiBrowser.entry,
                value: articleMeta?.label ?? getWikiPageTypeLabel(locale, detail.type),
              },
              knowledgeRole ? { label: copy.wikiBrowser.role, value: knowledgeRole } : null,
              surfaceKind ? { label: copy.wikiBrowser.surface, value: surfaceKind } : null,
              revisitCadence ? { label: copy.wikiBrowser.cadence, value: revisitCadence } : null,
              {
                label: copy.wikiBrowser.coverage,
                value:
                  locale === "zh"
                    ? `${detail.sourceRefs.length} 条来源引用`
                    : `${detail.sourceRefs.length} source ref${detail.sourceRefs.length === 1 ? "" : "s"}`,
              },
              {
                label: copy.wikiBrowser.revised,
                value: <LocalizedDateTime locale={locale} value={detail.updatedAt} />,
              },
            ]
      ).filter(Boolean) as Array<{ label: string; value: ReactNode }>)
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

    return buildWorkingCueSections(locale, detail, pages);
  }, [detail, locale, pages]);
  const articleNavigation = useMemo(() => {
    const items = articleHeadings.filter((heading) => heading.level === 2);

    if (detail && !isTopicHomeEntry) {
      items.push(
        {
          id: "references",
          text: copy.wikiBrowser.references,
          level: 2,
        },
        {
          id: "related-pages",
          text: copy.wikiBrowser.relatedPages,
          level: 2,
        },
      );
    }

    const uniqueItems = items.filter(
      (heading, index) => items.findIndex((candidate) => candidate.id === heading.id) === index,
    );

    return isTopicHomeEntry ? [] : uniqueItems.slice(0, 6);
  }, [articleHeadings, copy.wikiBrowser.references, copy.wikiBrowser.relatedPages, detail, isTopicHomeEntry]);
  const showFullPageHeader = !detail || (allowEdit && isEditing);
  const showLeftRail = !isTopicHomeEntry;
  const showRightRail = !detail || (allowEdit && isEditing);

  function navigateToPage(pageId: string, nextWorkspaceRoot: string, replace = false) {
    const params = createBrowserRouteParams({
      pageId,
      workspaceRoot: nextWorkspaceRoot,
      workspaceRootMode,
      defaultWorkspaceRoot,
    });
    const href = buildPathWithParams(pathname, params);

    startTransition(() => {
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    });
  }

  async function reloadPagesAndCurrentDetail(nextPageId?: string) {
    const nextPages = await fetchPageList(workspaceRoot, copy.wikiBrowser.failedToLoadPages);
    setPages(nextPages);
    setLoadedPagesWorkspaceRoot(workspaceRoot);

    const pageId = nextPageId ?? selectedPageId ?? nextPages[0]?.id ?? null;

    if (!pageId) {
      setDetail(null);
      setDraftContent("");
      return;
    }

    const nextDetail = await fetchPageDetail(
      workspaceRoot,
      pageId,
      copy.wikiBrowser.failedToLoadPage,
    );

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
        throw new Error(data.message ?? copy.wikiBrowser.failedToSavePage);
      }

      const nextDetail = wikiPageDetailSchema.parse(data);

      setDetail(nextDetail);
      setDraftContent(nextDetail.rawContent);
      setIsEditing(false);
      await reloadPagesAndCurrentDetail(nextDetail.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.wikiBrowser.failedToSavePage);
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
        throw new Error(data.message ?? copy.wikiBrowser.failedToCreatePage);
      }

      const nextDetail = wikiPageDetailSchema.parse(data);

      setShowCreateForm(false);
      setNewTitle("");
      setDetail(nextDetail);
      setDraftContent(nextDetail.rawContent);
      setIsEditing(true);
      await reloadPagesAndCurrentDetail(nextDetail.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : copy.wikiBrowser.failedToCreatePage,
      );
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
        throw new Error(data.message ?? copy.wikiBrowser.failedToRefreshLinks);
      }

      const nextDetail = wikiPageDetailSchema.parse(data);
      setDetail(nextDetail);
      setLoadedDetailKey(`${workspaceRoot}:${nextDetail.id}`);
      await reloadPagesAndCurrentDetail(nextDetail.id);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : copy.wikiBrowser.failedToRefreshLinks,
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

    const rawHref = anchor.getAttribute("href");

    if (!rawHref) {
      return;
    }

    const normalizedHref = normalizeInternalAppHref(rawHref, internalLinkBasePath, pages);
    const isUnsafeInternalFallback =
      rawHref.includes("pagePath=") ||
      rawHref.includes("workspaceRoot=") ||
      /\.html(?:$|[?#])/.test(rawHref) ||
      /\.md(?:$|[?#])/.test(rawHref);

    if (!normalizedHref) {
      if (isUnsafeInternalFallback) {
        event.preventDefault();
      }
      return;
    }

    event.preventDefault();
    startTransition(() => {
      router.push(normalizedHref);
    });
  }

  const leftRail = (
    <aside className="order-2 self-start border-t border-border/55 pt-6 2xl:order-1 2xl:border-t-0 2xl:pt-0 2xl:sticky 2xl:top-6">
      <div className="space-y-5 2xl:border-r 2xl:border-border/55 2xl:pr-5">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {copy.wikiBrowser.pages}
              </div>
            <div className="flex items-center gap-2">
              <div className="text-[11px] leading-5 text-muted-foreground">{pages.length}</div>
              {allowCreate ? (
                <Button
                  onClick={() => setShowCreateForm((current) => !current)}
                  size="sm"
                  variant="ghost"
                >
                  <FilePlus2 className="size-4" />
                  {copy.wikiBrowser.new}
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        {showWorkspaceRootCard ? (
            <div className="space-y-1 border-t border-border/55 pt-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {copy.wikiBrowser.workspace}
              </div>
            <div className="break-all font-mono text-[11px] leading-6 text-foreground/88">
              {workspaceRoot}
            </div>
          </div>
        ) : null}

        {allowCreate && showCreateForm ? (
          <form className="space-y-3 border-t border-border/55 pt-4" onSubmit={handleCreatePage}>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {copy.wikiBrowser.createFromTemplate}
            </div>
            <Input
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
              placeholder={copy.wikiBrowser.newPageTitle}
            />
            <select
              className="flex h-10 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none"
              value={newType}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                setNewType(event.target.value as Exclude<WikiPageType, "index">)
              }
            >
              {WIKI_PAGE_TYPES.filter((type) => type !== "index").map((type) => (
                <option key={type} value={type}>
                  {getWikiPageTypeLabel(locale, type)}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button disabled={isSaving || !newTitle.trim()} size="sm" type="submit">
                {copy.wikiBrowser.create}
              </Button>
              <Button
                onClick={() => setShowCreateForm(false)}
                size="sm"
                type="button"
                variant="ghost"
              >
                {copy.wikiBrowser.cancel}
              </Button>
            </div>
          </form>
        ) : null}

        {isLoadingPages ? (
          <div className="text-sm leading-7 text-muted-foreground">{copy.wikiBrowser.loadingPages}</div>
        ) : pages.length === 0 ? (
          <div className="text-sm leading-7 text-muted-foreground">
            {copy.wikiBrowser.noPages}
            {allowCreate
              ? ` ${copy.wikiBrowser.noPagesCreateHint}`
              : ` ${copy.wikiBrowser.noPagesBrowseHint}`}
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(groupedPages.entries()).map(([type, items]) =>
              items.length === 0 ? null : (
                <section key={type} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {getWikiPageTypeLabel(locale, type)}
                    </div>
                    <div className="text-[11px] leading-5 text-muted-foreground">{items.length}</div>
                  </div>
                  <div className="space-y-1">
                    {items.map((page) => (
                      <button
                        key={page.id}
                        className={cn(
                          "w-full border-l px-3 py-2 text-left transition-colors",
                          selectedPageId === page.id
                            ? "border-foreground/45 text-foreground"
                            : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                        )}
                        onClick={() => navigateToPage(page.id, workspaceRoot)}
                        type="button"
                      >
                        <div className="truncate text-sm font-medium">{page.title}</div>
                        <div className="mt-0.5 truncate font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {page.path}
                        </div>
                        {page.unresolvedOutgoingCount > 0 ? (
                          <div className="mt-1 text-[11px] leading-5 text-amber-800">
                            {locale === "zh"
                              ? `${page.unresolvedOutgoingCount} 条${copy.wikiBrowser.unresolved}`
                              : `${page.unresolvedOutgoingCount} unresolved`}
                          </div>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </section>
              ),
            )}
          </div>
        )}
      </div>
    </aside>
  );

  const centerColumn = (
    <main className="order-1 min-w-0">
      <div className="space-y-8">
        {intro ? <div className="mx-auto max-w-[84ch]">{intro}</div> : null}

        {errorMessage ? (
          <div className="mx-auto max-w-[78ch] border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm leading-7 text-destructive">
            {errorMessage}
          </div>
        ) : null}

        {isLoadingDetail ? (
          <div className="mx-auto max-w-[78ch] text-sm leading-7 text-muted-foreground">
            {copy.wikiBrowser.loadingPage}
          </div>
        ) : !detail ? (
          <div className="mx-auto max-w-[78ch] text-sm leading-7 text-muted-foreground">
            {copy.wikiBrowser.selectPage}
          </div>
        ) : (
          <>
            <header className="mx-auto max-w-[84ch] space-y-4 border-b border-border/60 pb-7">
              <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_210px]">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {!isTopicHomeEntry ? (
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {articleMeta?.label ?? getWikiPageTypeLabel(locale, detail.type)}
                      </div>
                    ) : null}
                    {!isTopicHomeEntry ? (
                      <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground/80">
                        {detail.path}
                      </div>
                    ) : null}
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <h1
                        className={cn(
                          "max-w-[24ch] text-balance font-semibold leading-[1.03] tracking-[-0.05em] text-foreground",
                          isTopicHomeEntry
                            ? "text-[clamp(1.95rem,2.2vw,2.85rem)]"
                            : "text-[clamp(2.15rem,2.45vw,3.3rem)]",
                        )}
                      >
                        {isTopicHomeEntry && header?.title ? header.title : detail.title}
                      </h1>
                      <div className="flex flex-wrap gap-2">
                        {allowEdit && isEditing ? (
                          <>
                            <Button disabled={isSaving} onClick={handleSave} size="sm">
                              <Save className="size-4" />
                              {copy.wikiBrowser.saveMarkdown}
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
                              {copy.wikiBrowser.cancel}
                            </Button>
                          </>
                        ) : allowEdit ? (
                          <Button onClick={() => setIsEditing(true)} size="sm" variant="ghost">
                            <PencilLine className="size-4" />
                            {copy.wikiBrowser.editSource}
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {articleLead ? (
                      <div
                        className={cn(
                          "max-w-[64ch] font-serif text-foreground/88 [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/25 [&_a]:underline-offset-4 [&_strong]:font-semibold",
                          isTopicHomeEntry
                            ? "text-[0.98rem] leading-[1.78]"
                            : "text-[1.02rem] leading-[1.85]",
                        )}
                        dangerouslySetInnerHTML={{ __html: articleLead }}
                      />
                    ) : articleLeadText ? (
                      <p
                        className={cn(
                          "max-w-[64ch] font-serif text-foreground/88",
                          isTopicHomeEntry
                            ? "text-[0.98rem] leading-[1.78]"
                            : "text-[1.02rem] leading-[1.85]",
                        )}
                      >
                        {articleLeadText}
                      </p>
                    ) : (
                      <p className="max-w-[64ch] text-sm leading-7 text-muted-foreground">
                        {articleMeta?.description ?? copy.wikiBrowser.pageFallbackDescription}
                      </p>
                    )}
                  </div>
                </div>

                {articleSummaryFacts.length > 0 ? (
                  <aside className="space-y-2.5 xl:border-l xl:border-border/55 xl:pl-5">
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {copy.wikiBrowser.atAGlance}
                    </div>
                    <div className="space-y-1">
                      {articleSummaryFacts.map((fact) => (
                        <SummaryFact key={fact.label} label={fact.label} value={fact.value} />
                      ))}
                    </div>
                    {detail.tags.length > 0 && !isTopicHomeEntry ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {detail.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </aside>
                ) : null}
              </div>

              {!isTopicHomeEntry ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12.5px] leading-5 text-muted-foreground">
                  <span>{copy.wikiBrowser.review} {getReviewStatusLabel(locale, detail.reviewStatus)}</span>
                  <span>{copy.wikiBrowser.status} {detail.status}</span>
                  <span>
                    {copy.wikiBrowser.sourceRefs(detail.sourceRefs.length)}
                  </span>
                  <span>
                    {copy.wikiBrowser.revisedAt} <LocalizedDateTime locale={locale} value={detail.updatedAt} />
                  </span>
                  {allowRefreshLinks ? (
                    <button
                      className="font-medium text-foreground transition-colors hover:text-primary"
                      disabled={isSaving}
                      onClick={handleRefreshLinks}
                      type="button"
                    >
                      {copy.wikiBrowser.refreshLinks}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {articleNavigation.length > 0 ? (
                <nav className="border-t border-border/55 pt-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {copy.wikiBrowser.jumpTo}
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {articleNavigation.map((heading) => (
                      <a
                        key={heading.id}
                        className="text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground"
                        href={`#${heading.id}`}
                      >
                        {heading.text}
                      </a>
                    ))}
                  </div>
                </nav>
              ) : null}
            </header>

            {allowEdit && isEditing ? (
          <div className="mx-auto max-w-[84ch] space-y-3">
                <div className="text-sm leading-7 text-muted-foreground">
                  {copy.wikiBrowser.editingMarkdown}
                </div>
                <Textarea
                  className="min-h-[760px] rounded-[24px] border-border/70 bg-background/80 font-mono text-xs leading-6"
                  value={draftContent}
                  onChange={(event) => setDraftContent(event.target.value)}
                />
              </div>
            ) : (
              <>
                <article
                  className="wiki-render font-serif text-[15.8px] leading-[1.96] text-foreground [&_a]:text-primary [&_a]:underline [&_a]:decoration-primary/25 [&_a]:underline-offset-4 [&_a:hover]:decoration-primary/55 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_h1:first-child]:hidden [&_h2]:scroll-mt-28 [&_h2]:font-sans [&_h2]:mt-16 [&_h2]:border-b [&_h2]:border-border/55 [&_h2]:pb-3 [&_h2]:text-[1.7rem] [&_h2]:font-semibold [&_h2]:tracking-[-0.04em] [&_h3]:scroll-mt-28 [&_h3]:font-sans [&_h3]:mt-10 [&_h3]:text-[1.14rem] [&_h3]:font-semibold [&_h3]:tracking-[-0.03em] [&_hr]:my-10 [&_li]:ml-4 [&_li]:leading-8 [&_ol]:list-decimal [&_p]:my-4 [&_pre]:overflow-auto [&_pre]:rounded-2xl [&_pre]:bg-slate-950 [&_pre]:p-4 [&_pre]:font-mono [&_pre]:text-slate-100 [&_strong]:font-semibold [&_ul]:list-disc"
                  onClickCapture={handleRenderedClick}
                >
                  <div
                    className="mx-auto max-w-[78ch]"
                    dangerouslySetInnerHTML={{ __html: renderedArticle.html }}
                  />
                </article>

                <section
                  className="mx-auto mt-12 max-w-[78ch] border-t border-border/60 pt-8"
                  id="references"
                >
                  <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.04em] text-foreground">
                    {copy.wikiBrowser.references}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {copy.wikiBrowser.sourceReferencesForPage}
                  </p>
                  {detail.sourceRefs.length === 0 ? (
                    <div className="mt-4 text-sm leading-7 text-muted-foreground">
                      {copy.wikiBrowser.noSourceReferences}
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
                              {copy.wikiBrowser.sourceLabel}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <section
                  className="mx-auto mt-12 max-w-[78ch] border-t border-border/60 pt-8"
                  id="related-pages"
                >
                  <h2 className="font-sans text-[1.5rem] font-semibold tracking-[-0.04em] text-foreground">
                    {copy.wikiBrowser.relatedPages}
                  </h2>

                  {relatedReferencePages.length > 0 ? (
                    <section className="mt-5 space-y-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {copy.wikiBrowser.seeAlso}
                      </div>
                      <div className="divide-y divide-border/55 border-y border-border/55">
                        {relatedReferencePages.map((item) =>
                          item.page ? (
                            <button
                              key={item.reference}
                              className="block w-full py-3 text-left text-sm leading-7 text-foreground transition-colors first:pt-3 last:pb-3 hover:text-foreground/80"
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
                              className="py-3 text-sm leading-7 text-muted-foreground first:pt-3 last:pb-3"
                            >
                              {item.reference}
                            </div>
                          ),
                        )}
                      </div>
                    </section>
                  ) : null}

                  <div className="mt-8 grid gap-8 lg:grid-cols-2">
                    <section className="space-y-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {copy.wikiBrowser.backlinks}
                      </div>
                      {detail.backlinks.length === 0 ? (
                        <div className="text-sm leading-7 text-muted-foreground">
                          {copy.wikiBrowser.noBacklinks}
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
                        {copy.wikiBrowser.linkedConcepts}
                      </div>
                      {detail.outgoingLinks.length === 0 ? (
                        <div className="text-sm leading-7 text-muted-foreground">
                          {copy.wikiBrowser.noResolvedLinks}
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
                              <Badge variant="outline">
                                {getWikiLinkResolutionKindLabel(locale, link.resolutionKind)}
                              </Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  </div>

                  {detail.unresolvedLinks.length > 0 ? (
                    <div className="mt-8 space-y-3">
                      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {copy.wikiBrowser.openLinkGaps}
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
                              {getWikiLinkGapReasonLabel(locale, link.reason)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </section>

                <footer className="mx-auto mt-10 max-w-[78ch] space-y-3 border-t border-border/55 pt-5 text-[13px] leading-6 text-muted-foreground">
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                      {detail.path}
                    </span>
                    <span>
                      {copy.wikiBrowser.indexed} <LocalizedDateTime locale={locale} value={detail.lastIndexedAt} />
                    </span>
                    {detail.aliases.length > 0 ? (
                      <span>{copy.wikiBrowser.aliases} {detail.aliases.join(", ")}</span>
                    ) : null}
                    {refreshTriggers.length > 0 ? (
                      <span>{copy.wikiBrowser.refresh} {refreshTriggers.join("; ")}</span>
                    ) : null}
                  </div>
                  {detail.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {detail.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </footer>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );

  const rightRail = (
    <aside className="order-3 self-start border-t border-border/55 pt-6 2xl:border-t-0 2xl:pt-0 2xl:sticky 2xl:top-6">
      <div className="space-y-6 2xl:border-l 2xl:border-border/55 2xl:pl-5">
        <div className="space-y-1.5">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {copy.wikiBrowser.nearbyPages}
          </div>
        </div>

        {!detail ? (
          <div className="text-sm leading-7 text-muted-foreground">
            {copy.wikiBrowser.selectPageForNearby}
          </div>
        ) : (
          <>
            {workingCueSections.length > 0 ? (
              <section className="space-y-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  {copy.wikiBrowser.workNext}
                </div>
                <div className="space-y-3">
                  {workingCueSections.slice(0, 2).map((section) => (
                    <div key={section.title} className="space-y-1.5">
                      <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                        {section.title}
                      </div>
                      <div className="space-y-1">
                        {section.items.slice(0, 3).map((item) => {
                          const targetPage = item.targetTitle
                            ? resolvePageReference(item.targetTitle, pages)
                            : null;

                          return targetPage ? (
                            <button
                              key={`${section.title}:${item.label}`}
                              className="block w-full text-left text-sm leading-6 text-foreground transition-colors hover:text-primary"
                              onClick={() => navigateToPage(targetPage.id, workspaceRoot)}
                              type="button"
                            >
                              {item.label}
                            </button>
                          ) : (
                            <div
                              key={`${section.title}:${item.label}`}
                              className="text-sm leading-6 text-muted-foreground"
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

            <section className="space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {copy.wikiBrowser.seeAlso}
              </div>
              {relatedReferencePages.length === 0 ? (
                <div className="text-sm leading-7 text-muted-foreground">{copy.wikiBrowser.noLinkedPages}</div>
              ) : (
                <div className="space-y-2">
                  {relatedReferencePages.map((item) =>
                    item.page ? (
                      <button
                        key={item.reference}
                        className="block w-full text-left text-sm leading-6 text-foreground transition-colors hover:text-primary"
                        onClick={() => navigateToPage(item.page!.id, workspaceRoot)}
                        type="button"
                      >
                        <span className="font-medium">{item.page!.title}</span>
                        <span className="mt-0.5 block font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {item.page!.path}
                        </span>
                      </button>
                    ) : (
                      <div
                        key={item.reference}
                        className="text-sm leading-7 text-muted-foreground"
                      >
                        {item.reference}
                      </div>
                    ),
                  )}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {copy.wikiBrowser.pageNotes}
              </div>
              <div className="space-y-1">
                {surfaceKind ? <SummaryFact label={copy.wikiBrowser.surface} value={surfaceKind} /> : null}
                {revisitCadence ? <SummaryFact label={copy.wikiBrowser.cadence} value={revisitCadence} /> : null}
                <SummaryFact
                  label={copy.wikiBrowser.path}
                  value={<span className="font-mono text-xs">{detail.path}</span>}
                />
                <SummaryFact label={copy.wikiBrowser.slug} value={detail.slug} />
                <SummaryFact
                  label={copy.wikiBrowser.indexed}
                  value={<LocalizedDateTime locale={locale} value={detail.lastIndexedAt} />}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );

  return (
    <div className="space-y-5">
      {showFullPageHeader ? (
        <PageHeader
          eyebrow={header?.eyebrow ?? copy.wikiBrowser.wikiBrowser}
          title={header?.title ?? copy.wikiBrowser.browseWiki}
          description={header?.description}
          badge={header?.badge ?? copy.wikiBrowser.wiki}
          compact
        />
      ) : detail ? (
        isTopicHomeEntry ? null : (
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/55 pb-4">
            <div className="space-y-1">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                {header?.eyebrow ?? copy.wikiBrowser.wikiBrowser}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {header?.badge ? <Badge variant="outline">{header.badge}</Badge> : null}
                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  {detail.path}
                </span>
              </div>
            </div>
          </div>
        )
      ) : null}
      <div
        className={cn(
          "grid gap-8 2xl:gap-10",
          showLeftRail && showRightRail
            ? "2xl:grid-cols-[196px_minmax(0,1fr)_256px]"
            : showLeftRail
              ? "2xl:grid-cols-[196px_minmax(0,1fr)]"
              : showRightRail
                ? "2xl:grid-cols-[minmax(0,1fr)_256px]"
                : undefined,
        )}
      >
        {showLeftRail ? leftRail : null}
        {centerColumn}
        {showRightRail ? rightRail : null}
      </div>
    </div>
  );
}
