"use client";

import type { ChangeEvent, FormEvent, ReactNode } from "react";
import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DatabaseZap,
  FileSearch,
  FileJson2,
  FileStack,
  FileText,
  FolderInput,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  Upload,
} from "lucide-react";

import {
  type SourceDetail,
  type SourceImportRequest,
  type SourceSummary,
  listSourcesResponseSchema,
  sourceDetailSchema,
  sourceImportRequestSchema,
} from "@/lib/contracts/source";
import { describeApiError, readResponseJson } from "@/lib/client-api";
import { planSourcePatchesResponseSchema } from "@/lib/contracts/review";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SourceBrowserProps = {
  defaultWorkspaceRoot: string;
};

type ImportMode = "pasted_text" | "browser_file" | "local_file_path";
type FilterStatus = "" | SourceSummary["status"];
type FilterSourceType = "" | SourceSummary["sourceType"];

type SourceFilters = {
  status: FilterStatus;
  sourceType: FilterSourceType;
  importedAfter: string;
};

const defaultFilters: SourceFilters = {
  status: "",
  sourceType: "",
  importedAfter: "",
};

const sourceTypeLabels: Record<SourceSummary["sourceType"], string> = {
  markdown: "Markdown",
  text: "Text",
  unknown: "Unknown",
};

const statusLabels: Record<SourceSummary["status"], string> = {
  processed: "Processed",
  rejected: "Rejected",
};

const summaryStatusLabels: Record<SourceSummary["summaryStatus"], string> = {
  not_started: "Not summarized",
  running: "Running",
  completed: "Completed",
  failed: "Failed",
};

const ingestionMethodLabels: Record<SourceSummary["ingestionMethod"], string> = {
  pasted_text: "Pasted text",
  browser_file: "Browser file",
  local_file_path: "Local file path",
  reprocess: "Reprocess",
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

function Pane({
  title,
  actions,
  className,
  children,
}: {
  title: string;
  actions?: ReactNode;
  className?: string;
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

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="space-y-1.5 rounded-2xl border border-border/70 bg-background/60 p-3">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="break-words text-sm text-foreground">{value}</div>
    </div>
  );
}

function ListSection({
  title,
  items,
  renderItem,
  emptyState,
}: {
  title: string;
  items: readonly unknown[];
  renderItem: (item: unknown, index: number) => ReactNode;
  emptyState: string;
}) {
  return (
    <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-3">
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">{emptyState}</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="rounded-xl border border-border/70 bg-background/80 p-3 text-sm text-foreground"
            >
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatMetadataValue(value: unknown) {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function getSummaryBadgeVariant(status: SourceSummary["summaryStatus"]) {
  if (status === "completed") {
    return "success" as const;
  }

  if (status === "not_started") {
    return "outline" as const;
  }

  return "warning" as const;
}

async function fetchSourceList(workspaceRoot: string, filters: SourceFilters) {
  const params = new URLSearchParams({
    workspaceRoot,
  });

  if (filters.status) {
    params.set("status", filters.status);
  }

  if (filters.sourceType) {
    params.set("sourceType", filters.sourceType);
  }

  if (filters.importedAfter) {
    params.set("importedAfter", filters.importedAfter);
  }

  const response = await fetch(`/api/sources?${params.toString()}`, {
    cache: "no-store",
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to load sources."));
  }

  return listSourcesResponseSchema.parse(data).sources;
}

async function fetchSourceDetail(workspaceRoot: string, sourceId: string) {
  const response = await fetch(
    `/api/sources/${sourceId}?${new URLSearchParams({ workspaceRoot }).toString()}`,
    {
      cache: "no-store",
    },
  );
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to load source."));
  }

  return sourceDetailSchema.parse(data);
}

async function importSource(request: SourceImportRequest) {
  const response = await fetch("/api/sources/import", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sourceImportRequestSchema.parse(request)),
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to import source."));
  }

  return sourceDetailSchema.parse(data);
}

async function reprocessSource(workspaceRoot: string, sourceId: string) {
  const response = await fetch(`/api/sources/${sourceId}/reprocess`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspaceRoot,
    }),
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to reprocess source."));
  }

  return sourceDetailSchema.parse(data);
}

async function summarizeSource(workspaceRoot: string, sourceId: string) {
  const response = await fetch(`/api/sources/${sourceId}/summarize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspaceRoot,
    }),
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to summarize source."));
  }

  return sourceDetailSchema.parse(data);
}

async function planSourcePatches(workspaceRoot: string, sourceId: string) {
  const response = await fetch(`/api/sources/${sourceId}/plan-patches`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspaceRoot,
    }),
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to generate patch proposals."));
  }

  return planSourcePatchesResponseSchema.parse(data).proposals;
}

export function SourceBrowser({ defaultWorkspaceRoot }: SourceBrowserProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [detail, setDetail] = useState<SourceDetail | null>(null);
  const [filters, setFilters] = useState<SourceFilters>(defaultFilters);
  const [isLoadingSources, setIsLoadingSources] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isPlanningPatches, setIsPlanningPatches] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("pasted_text");
  const [importTitle, setImportTitle] = useState("");
  const [pastedFilename, setPastedFilename] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [selectedBrowserFile, setSelectedBrowserFile] = useState<File | null>(null);
  const [localFilePath, setLocalFilePath] = useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const queryWorkspaceRoot = searchParams.get("workspaceRoot");
  const selectedSourceId = searchParams.get("sourceId");

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

    async function loadSources() {
      setIsLoadingSources(true);
      setErrorMessage(null);

      try {
        const nextSources = await fetchSourceList(workspaceRoot, filters);

        if (!isActive) {
          return;
        }

        setSources(nextSources);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSources([]);
        setDetail(null);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load sources.");
      } finally {
        if (isActive) {
          setIsLoadingSources(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadSources();
    }

    return () => {
      isActive = false;
    };
  }, [workspaceRoot, filters]);

  useEffect(() => {
    if (isLoadingSources) {
      return;
    }

    if (sources.length === 0) {
      if (selectedSourceId) {
        const params = new URLSearchParams({
          workspaceRoot,
        });

        startTransition(() => {
          router.replace(`${pathname}?${params.toString()}`);
        });
      }

      return;
    }

    if (!selectedSourceId || !sources.some((source) => source.id === selectedSourceId)) {
      const params = new URLSearchParams({
        workspaceRoot,
        sourceId: sources[0].id,
      });

      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`);
      });
    }
  }, [isLoadingSources, pathname, router, selectedSourceId, sources, workspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadDetail() {
      if (!selectedSourceId) {
        setDetail(null);
        return;
      }

      setIsLoadingDetail(true);
      setErrorMessage(null);

      try {
        const nextDetail = await fetchSourceDetail(workspaceRoot, selectedSourceId);

        if (!isActive) {
          return;
        }

        setDetail(nextDetail);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setDetail(null);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load source.");
      } finally {
        if (isActive) {
          setIsLoadingDetail(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadDetail();
    }

    return () => {
      isActive = false;
    };
  }, [selectedSourceId, workspaceRoot]);

  function navigateToSource(sourceId: string, nextWorkspaceRoot: string, replace = false) {
    const params = new URLSearchParams({
      workspaceRoot: nextWorkspaceRoot,
      sourceId,
    });

    startTransition(() => {
      if (replace) {
        router.replace(`${pathname}?${params.toString()}`);
      } else {
        router.push(`${pathname}?${params.toString()}`);
      }
    });
  }

  function resetImportForm() {
    setImportTitle("");
    setPastedFilename("");
    setPastedText("");
    setSelectedBrowserFile(null);
    setLocalFilePath("");
    setFileInputKey((current) => current + 1);
  }

  async function refreshVisibleSources(nextFilters: SourceFilters, nextSourceId?: string) {
    const nextSources = await fetchSourceList(workspaceRoot, nextFilters);

    setSources(nextSources);

    if (nextSourceId) {
      navigateToSource(nextSourceId, workspaceRoot);
      return;
    }

    if (selectedSourceId && nextSources.some((source) => source.id === selectedSourceId)) {
      return;
    }

    if (nextSources[0]) {
      navigateToSource(nextSources[0].id, workspaceRoot, true);
      return;
    }

    const params = new URLSearchParams({
      workspaceRoot,
    });

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  async function handleImportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsImporting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      let request: SourceImportRequest;

      if (importMode === "pasted_text") {
        request = {
          workspaceRoot,
          importKind: "pasted_text",
          title: importTitle.trim() || undefined,
          filename: pastedFilename.trim() || undefined,
          text: pastedText,
        };
      } else if (importMode === "browser_file") {
        if (!selectedBrowserFile) {
          throw new Error("Select a markdown or text file before importing.");
        }

        request = {
          workspaceRoot,
          importKind: "browser_file",
          title: importTitle.trim() || undefined,
          filename: selectedBrowserFile.name,
          content: await selectedBrowserFile.text(),
        };
      } else {
        if (!localFilePath.trim()) {
          throw new Error("Enter a local file path before importing.");
        }

        request = {
          workspaceRoot,
          importKind: "local_file_path",
          title: importTitle.trim() || undefined,
          filePath: localFilePath.trim(),
        };
      }

      const imported = await importSource(request);
      const nextFilters = defaultFilters;

      setFilters(nextFilters);
      setDetail(imported);
      setNoticeMessage(
        imported.status === "processed"
          ? "Source imported into inbox, normalized, and indexed."
          : "Source import recorded, but normalization rejected it. Review the failure details below.",
      );
      resetImportForm();
      await refreshVisibleSources(nextFilters, imported.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to import source.");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleReprocess() {
    if (!detail) {
      return;
    }

    setIsReprocessing(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const updated = await reprocessSource(workspaceRoot, detail.id);

      setDetail(updated);
      setNoticeMessage("Source reprocessed with the current deterministic normalizer.");
      await refreshVisibleSources(filters, updated.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to reprocess source.");
    } finally {
      setIsReprocessing(false);
    }
  }

  async function handleSummarize() {
    if (!detail || detail.status !== "processed") {
      return;
    }

    setIsSummarizing(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const updated = await summarizeSource(workspaceRoot, detail.id);

      setDetail(updated);
      setNoticeMessage(
        updated.summary.status === "completed"
          ? "Summary artifacts compiled and written to the workspace."
          : "Summary run finished with a non-complete state.",
      );
      await refreshVisibleSources(filters, updated.id);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to summarize source.");
    } finally {
      setIsSummarizing(false);
    }
  }

  async function handlePlanPatches() {
    if (!detail || detail.summary.status !== "completed") {
      return;
    }

    setIsPlanningPatches(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const proposals = await planSourcePatches(workspaceRoot, detail.id);

      if (proposals[0]) {
        setNoticeMessage(
          `Generated ${proposals.length} reviewable patch proposal${proposals.length === 1 ? "" : "s"}.`,
        );
        startTransition(() => {
          router.push(
            `/reviews?${new URLSearchParams({
              workspaceRoot,
              reviewId: proposals[0]!.id,
              status: "pending",
            }).toString()}`,
          );
        });
        return;
      }

      setNoticeMessage("Patch planning completed, but no review proposals were generated.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to plan patch proposals.");
    } finally {
      setIsPlanningPatches(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedBrowserFile(event.target.files?.[0] ?? null);
  }

  const processedCount = sources.filter((source) => source.status === "processed").length;
  const rejectedCount = sources.filter((source) => source.status === "rejected").length;
  const summarizedCount = sources.filter((source) => source.summaryStatus === "completed").length;
  const failedSummaryCount = sources.filter((source) => source.summaryStatus === "failed").length;
  const metadataEntries = detail
    ? Object.entries(detail.metadataJson).sort(([left], [right]) => left.localeCompare(right))
    : [];
  const summaryArtifact = detail?.summary.artifact?.content ?? null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sources"
        title="Source intake and summary compilation"
        description="Sources remain the intake side of the compiler: raw material lands locally, is normalized deterministically, compiles into visible summary artifacts, and can draft reviewable patch proposals without mutating the wiki."
        badge="Compilation substrate"
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <CardTitle>Import Source Material</CardTitle>
                <CardDescription>
                  Bring text into the visible raw-source pipeline. Summarization is a separate,
                  explicit action on processed sources.
                </CardDescription>
              </div>
              <Badge variant="outline">Inbox to processed</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
            <div className="space-y-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Import method
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={importMode === "pasted_text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportMode("pasted_text")}
                >
                  <FileText className="size-4" />
                  Pasted text
                </Button>
                <Button
                  type="button"
                  variant={importMode === "browser_file" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportMode("browser_file")}
                >
                  <Upload className="size-4" />
                  Browser file
                </Button>
                <Button
                  type="button"
                  variant={importMode === "local_file_path" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setImportMode("local_file_path")}
                >
                  <FolderInput className="size-4" />
                  Local path
                </Button>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleImportSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Title override</span>
                  <Input
                    value={importTitle}
                    onChange={(event) => setImportTitle(event.target.value)}
                    placeholder="Optional canonical source title"
                  />
                </label>

                {importMode === "pasted_text" ? (
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Filename</span>
                    <Input
                      value={pastedFilename}
                      onChange={(event) => setPastedFilename(event.target.value)}
                      placeholder="Optional filename, for example local-first.md"
                    />
                  </label>
                ) : (
                  <div className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Workspace root</span>
                    <div className="rounded-md border border-border/70 bg-background/60 px-3 py-2 font-mono text-xs text-muted-foreground">
                      {workspaceRoot}
                    </div>
                  </div>
                )}
              </div>

              {importMode === "pasted_text" ? (
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Text or markdown</span>
                  <Textarea
                    value={pastedText}
                    onChange={(event) => setPastedText(event.target.value)}
                    className="min-h-56"
                    placeholder="Paste a markdown note, copied article excerpt, or plain text source..."
                    required
                  />
                </label>
              ) : null}

              {importMode === "browser_file" ? (
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Choose local text file</span>
                  <Input
                    key={fileInputKey}
                    type="file"
                    accept=".md,.markdown,.mdown,.txt,text/plain,text/markdown"
                    onChange={handleFileChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    The file is read locally in the browser and sent as explicit text content for
                    deterministic normalization.
                  </p>
                </label>
              ) : null}

              {importMode === "local_file_path" ? (
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">Local file path</span>
                  <Input
                    value={localFilePath}
                    onChange={(event) => setLocalFilePath(event.target.value)}
                    placeholder="~/Documents/research/local-first.txt"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The app copies the file into `raw/inbox` before normalization.
                  </p>
                </label>
              ) : null}

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isImporting}>
                  {isImporting ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Upload className="size-4" />
                  )}
                  Import source
                </Button>
                <div className="text-xs text-muted-foreground">
                  Supported formats: `.md`, `.markdown`, `.mdown`, `.txt`, or pasted text.
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center gap-3">
              <DatabaseZap className="size-5 text-primary" />
              <div className="space-y-2">
                <CardTitle>Compilation Snapshot</CardTitle>
                <CardDescription>
                  The source layer now ends in visible summary artifacts that later milestones can
                  consume.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Visible sources
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {formatCompactNumber(sources.length)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Processed
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {formatCompactNumber(processedCount)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Summarized
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {formatCompactNumber(summarizedCount)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Summary failures
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {formatCompactNumber(failedSummaryCount)}
                </div>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Rejected
                </div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                  {formatCompactNumber(rejectedCount)}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border/70 bg-background/60 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Current workspace
              </div>
              <div className="break-all font-mono text-xs leading-6 text-foreground">
                {workspaceRoot}
              </div>
            </div>

            <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-foreground">
                Product role
              </div>
              <p>
                This surface owns intake, normalization, summaries, and draft patch creation. Wiki
                mutation still happens explicitly through the review queue rather than here.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {errorMessage ? <FeedbackBanner variant="error">{errorMessage}</FeedbackBanner> : null}

      {noticeMessage ? <FeedbackBanner variant="success">{noticeMessage}</FeedbackBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_360px]">
        <Pane
          title="Source queue"
          actions={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void refreshVisibleSources(filters)}
              disabled={isLoadingSources}
            >
              <RefreshCw className={cn("size-4", isLoadingSources ? "animate-spin" : "")} />
              Refresh
            </Button>
          }
        >
          <div className="space-y-4 p-4">
            <div className="grid gap-3">
              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Status
                </span>
                <select
                  className={selectClassName}
                  value={filters.status}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      status: event.target.value as FilterStatus,
                    }))
                  }
                >
                  <option value="">All statuses</option>
                  <option value="processed">Processed</option>
                  <option value="rejected">Rejected</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Source type
                </span>
                <select
                  className={selectClassName}
                  value={filters.sourceType}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      sourceType: event.target.value as FilterSourceType,
                    }))
                  }
                >
                  <option value="">All source types</option>
                  <option value="markdown">Markdown</option>
                  <option value="text">Text</option>
                  <option value="unknown">Unknown</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Imported on or after
                </span>
                <Input
                  type="date"
                  value={filters.importedAfter}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      importedAfter: event.target.value,
                    }))
                  }
                />
              </label>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilters(defaultFilters)}
              >
                Clear filters
              </Button>
            </div>

            <div className="space-y-2">
              {isLoadingSources ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                  Loading sources...
                </div>
              ) : sources.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                  No sources match the current filters yet. Import a text or markdown source to seed
                  the raw materials queue.
                </div>
              ) : (
                sources.map((source) => {
                  const active = source.id === selectedSourceId;

                  return (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => navigateToSource(source.id, workspaceRoot)}
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                        active
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/70 bg-background/50 hover:border-primary/30 hover:bg-accent/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-2">
                          <div className="truncate font-medium text-foreground">{source.title}</div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={source.status === "processed" ? "success" : "warning"}>
                              {statusLabels[source.status]}
                            </Badge>
                            <Badge variant="outline">{sourceTypeLabels[source.sourceType]}</Badge>
                            <Badge variant={getSummaryBadgeVariant(source.summaryStatus)}>
                              {summaryStatusLabels[source.summaryStatus]}
                            </Badge>
                          </div>
                        </div>
                        <FileStack className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      </div>
                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <div>{formatDateTime(source.importedAt)}</div>
                        <div>
                          {formatCompactNumber(source.chunkCount)} chunks,{" "}
                          {formatCompactNumber(source.tokenEstimate)} estimated tokens
                        </div>
                        <div>Summary updated: {formatDateTime(source.summaryUpdatedAt)}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </Pane>

        <Pane title="Normalized source + summary">
          {isLoadingDetail ? (
            <div className="p-6 text-sm text-muted-foreground">Loading source detail...</div>
          ) : !detail ? (
            <div className="flex h-full min-h-[420px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Select a source from the queue to inspect its normalized body and summary artifacts.
            </div>
          ) : detail.status === "rejected" ? (
            <div className="space-y-4 p-6">
              <div className="flex items-center gap-3 text-amber-700">
                <TriangleAlert className="size-5" />
                <div className="font-medium">Normalization rejected this source.</div>
              </div>
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-900">
                {detail.failureReason ?? "No failure reason was recorded."}
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground">
                The original artifact is still preserved in `{detail.originalPath}` for review.
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col">
              <div className="flex flex-wrap items-center gap-3 border-b border-border/70 px-6 py-4 text-sm text-muted-foreground">
                <Badge variant="success">{statusLabels[detail.status]}</Badge>
                <Badge variant="outline">{sourceTypeLabels[detail.sourceType]}</Badge>
                <Badge variant={getSummaryBadgeVariant(detail.summary.status)}>
                  {summaryStatusLabels[detail.summary.status]}
                </Badge>
                <span>{formatCompactNumber(detail.chunkCount)} chunks</span>
                <span>{formatCompactNumber(detail.tokenEstimate)} estimated tokens</span>
              </div>
              <div className="min-h-0 flex-1 space-y-6 overflow-auto p-6">
                <section className="space-y-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Normalized source text
                  </div>
                  <pre className="whitespace-pre-wrap break-words rounded-2xl border border-border/70 bg-background/60 p-5 font-mono text-xs leading-6 text-foreground">
                    {detail.rawTextExtracted}
                  </pre>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Summary markdown
                    </div>
                  </div>

                  {detail.summary.status === "failed" ? (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-900">
                      {detail.summary.error ?? "The latest summary run failed."}
                    </div>
                  ) : null}

                  {detail.summary.markdown ? (
                    <pre className="whitespace-pre-wrap break-words rounded-2xl border border-border/70 bg-background/60 p-5 font-mono text-xs leading-6 text-foreground">
                      {detail.summary.markdown}
                    </pre>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 p-4 text-sm text-muted-foreground">
                      No summary artifact exists yet. Use the summarize action to compile this
                      source into visible markdown and JSON outputs.
                    </div>
                  )}
                </section>
              </div>
            </div>
          )}
        </Pane>

        <Pane
          title="Metadata + extraction"
          actions={
            detail ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSummarize}
                  disabled={
                    detail.status !== "processed" || isSummarizing || detail.summary.status === "running"
                  }
                >
                  {isSummarizing ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  {detail.summary.status === "completed" ? "Resummarize" : "Summarize"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePlanPatches}
                  disabled={
                    detail.summary.status !== "completed" || isPlanningPatches || isSummarizing
                  }
                >
                  <FileSearch className={cn("size-4", isPlanningPatches ? "animate-pulse" : "")} />
                  Plan patches
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReprocess}
                  disabled={isReprocessing}
                >
                  <RefreshCw className={cn("size-4", isReprocessing ? "animate-spin" : "")} />
                  Reprocess
                </Button>
              </div>
            ) : null
          }
        >
          {!detail ? (
            <div className="flex h-full min-h-[420px] items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Source metadata, summary status, and extraction detail appear here after selection.
            </div>
          ) : (
            <div className="space-y-4 overflow-auto p-4">
              <MetaRow label="Title" value={detail.title} />
              <MetaRow label="Status" value={statusLabels[detail.status]} />
              <MetaRow label="Summary status" value={summaryStatusLabels[detail.summary.status]} />
              <MetaRow label="Source type" value={sourceTypeLabels[detail.sourceType]} />
              <MetaRow label="Ingestion method" value={ingestionMethodLabels[detail.ingestionMethod]} />
              <MetaRow label="Imported at" value={formatDateTime(detail.importedAt)} />
              <MetaRow label="Processed at" value={formatDateTime(detail.processedAt)} />
              <MetaRow label="Summary updated" value={formatDateTime(detail.summary.updatedAt)} />
              <MetaRow label="Original path" value={<span className="font-mono text-xs">{detail.originalPath}</span>} />
              <MetaRow
                label="Normalized path"
                value={
                  detail.normalizedPath ? (
                    <span className="font-mono text-xs">{detail.normalizedPath}</span>
                  ) : (
                    "No normalized file"
                  )
                }
              />
              <MetaRow
                label="Summary markdown path"
                value={
                  detail.summary.markdownPath ? (
                    <span className="font-mono text-xs">{detail.summary.markdownPath}</span>
                  ) : (
                    "No summary markdown artifact"
                  )
                }
              />
              <MetaRow
                label="Summary JSON path"
                value={
                  detail.summary.jsonPath ? (
                    <span className="font-mono text-xs">{detail.summary.jsonPath}</span>
                  ) : (
                    "No summary JSON artifact"
                  )
                }
              />
              <MetaRow
                label="Summary provider"
                value={detail.summary.provider ? `${detail.summary.provider} / ${detail.summary.model}` : "Not recorded"}
              />
              <MetaRow
                label="Prompt hash"
                value={
                  detail.summary.promptHash ? (
                    <span className="font-mono text-xs">{detail.summary.promptHash}</span>
                  ) : (
                    "Not recorded"
                  )
                }
              />
              <MetaRow label="Checksum" value={<span className="font-mono text-xs">{detail.checksum}</span>} />
              <MetaRow label="Language" value={detail.language} />
              <MetaRow label="Processing version" value={detail.processingVersion} />
              <MetaRow label="Chunk count" value={formatCompactNumber(detail.chunkCount)} />
              <MetaRow label="Token estimate" value={formatCompactNumber(detail.tokenEstimate)} />

              {detail.summary.latestJobRun ? (
                <>
                  <MetaRow label="Latest summary run" value={detail.summary.latestJobRun.status} />
                  <MetaRow
                    label="Latest run duration"
                    value={
                      detail.summary.latestJobRun.durationMs !== null
                        ? `${formatCompactNumber(detail.summary.latestJobRun.durationMs)} ms`
                        : "Not available"
                    }
                  />
                  <MetaRow
                    label="Latest run error"
                    value={detail.summary.latestJobRun.error ?? "No error recorded"}
                  />
                </>
              ) : null}

              <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" />
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Summary overview
                  </div>
                </div>
                <div className="text-sm text-foreground">
                  {summaryArtifact?.conciseSummary ?? "No concise summary available yet."}
                </div>
              </div>

              <ListSection
                title="Key entities"
                items={summaryArtifact?.keyEntities ?? []}
                emptyState="No entities extracted yet."
                renderItem={(item) => {
                  const entity = item as NonNullable<typeof summaryArtifact>["keyEntities"][number];

                  return (
                    <div className="space-y-1">
                      <div className="font-medium">{entity.name}</div>
                      <div className="text-muted-foreground">{entity.description}</div>
                      {entity.aliases.length > 0 ? (
                        <div className="text-xs text-muted-foreground">
                          Aliases: {entity.aliases.join(", ")}
                        </div>
                      ) : null}
                    </div>
                  );
                }}
              />

              <ListSection
                title="Key concepts"
                items={summaryArtifact?.keyConcepts ?? []}
                emptyState="No concepts extracted yet."
                renderItem={(item) => {
                  const concept = item as NonNullable<typeof summaryArtifact>["keyConcepts"][number];

                  return (
                    <div className="space-y-1">
                      <div className="font-medium">{concept.name}</div>
                      <div className="text-muted-foreground">{concept.description}</div>
                    </div>
                  );
                }}
              />

              <ListSection
                title="Major claims"
                items={summaryArtifact?.majorClaims ?? []}
                emptyState="No claims extracted yet."
                renderItem={(item) => {
                  const claim = item as NonNullable<typeof summaryArtifact>["majorClaims"][number];

                  return (
                    <div className="space-y-2">
                      <div className="font-medium">{claim.text}</div>
                      <div className="text-xs text-muted-foreground">
                        {claim.polarity} / {claim.evidenceStrength}
                      </div>
                      <div className="text-muted-foreground">{claim.rationale}</div>
                    </div>
                  );
                }}
              />

              <ListSection
                title="Open questions"
                items={summaryArtifact?.openQuestions ?? []}
                emptyState="No open questions extracted yet."
                renderItem={(item) => <div>{item as string}</div>}
              />

              <ListSection
                title="Possible target page hints"
                items={summaryArtifact?.possibleTargetPageHints ?? []}
                emptyState="No page hints extracted yet."
                renderItem={(item) => {
                  const hint =
                    item as NonNullable<typeof summaryArtifact>["possibleTargetPageHints"][number];

                  return (
                    <div className="space-y-1">
                      <div className="font-medium">
                        {hint.title} <span className="text-xs text-muted-foreground">({hint.pageType})</span>
                      </div>
                      <div className="text-muted-foreground">{hint.rationale}</div>
                    </div>
                  );
                }}
              />

              <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-3">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Chunk map
                </div>
                {detail.chunks.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No chunks were stored for this source.</div>
                ) : (
                  <div className="space-y-2">
                    {detail.chunks.map((chunk) => (
                      <div
                        key={chunk.id}
                        className="rounded-xl border border-border/70 bg-background/80 p-3 text-xs text-muted-foreground"
                      >
                        <div className="flex items-center justify-between gap-3 text-foreground">
                          <span className="font-medium">Chunk {chunk.chunkIndex + 1}</span>
                          <span>{formatCompactNumber(chunk.tokenCount)} tokens</span>
                        </div>
                        <div className="mt-1">
                          offsets {chunk.startOffset} to {chunk.endOffset},{" "}
                          {formatCompactNumber(chunk.charCount)} characters
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2 rounded-2xl border border-border/70 bg-background/60 p-3">
                <div className="flex items-center gap-2">
                  <FileJson2 className="size-4 text-primary" />
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Normalizer metadata
                  </div>
                </div>
                {metadataEntries.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No metadata recorded.</div>
                ) : (
                  <div className="space-y-2">
                    {metadataEntries.map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded-xl border border-border/70 bg-background/80 p-3 text-xs"
                      >
                        <div className="font-mono uppercase tracking-[0.12em] text-muted-foreground">
                          {key}
                        </div>
                        <div className="mt-1 break-words text-foreground">
                          {formatMetadataValue(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </Pane>
      </div>
    </div>
  );
}
