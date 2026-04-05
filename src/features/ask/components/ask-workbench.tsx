"use client";

import type { FormEvent, ReactNode } from "react";
import Link from "next/link";
import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  SearchCheck,
  SendHorizontal,
} from "lucide-react";

import type { AnswerArtifact, AnswerCitation } from "@/lib/contracts/answer";
import {
  answerArtifactSchema,
  archiveAnswerRequestSchema,
  archiveAnswerResponseSchema,
  askRequestSchema,
  askResponseSchema,
} from "@/lib/contracts/answer";
import { describeApiError, readResponseJson } from "@/lib/client-api";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

type AskWorkbenchProps = {
  defaultWorkspaceRoot: string;
};

async function askQuestion(workspaceRoot: string, question: string) {
  const response = await fetch("/api/ask", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      askRequestSchema.parse({
        workspaceRoot,
        question,
      }),
    ),
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Ask request failed."));
  }

  return askResponseSchema.parse(data).answer;
}

async function fetchAnswerArtifact(workspaceRoot: string, answerId: string) {
  const response = await fetch(
    `/api/answers/${answerId}?${new URLSearchParams({ workspaceRoot }).toString()}`,
    {
      cache: "no-store",
    },
  );
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to load answer artifact."));
  }

  return answerArtifactSchema.parse(data);
}

async function archiveAnswer(
  workspaceRoot: string,
  answerId: string,
  archiveType: "synthesis" | "note",
) {
  const response = await fetch(`/api/answers/${answerId}/archive`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      archiveAnswerRequestSchema.parse({
        workspaceRoot,
        archiveType,
      }),
    ),
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to archive answer artifact."));
  }

  return archiveAnswerResponseSchema.parse(data).answer;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function readStoredWorkspaceRoot() {
  if (typeof window === "undefined") {
    return null;
  }

  const storage = window.localStorage;

  if (!storage || typeof storage.getItem !== "function") {
    return null;
  }

  return storage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}

function persistWorkspaceRoot(workspaceRoot: string) {
  if (typeof window === "undefined") {
    return;
  }

  const storage = window.localStorage;

  if (!storage || typeof storage.setItem !== "function") {
    return;
  }

  storage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceRoot);
}

function citationLabel(citation: AnswerCitation) {
  if (citation.layer === "wiki_page") {
    return citation.pageTitle ?? citation.pageId ?? "Wiki page";
  }

  if (citation.layer === "source_summary") {
    return citation.sourceTitle ?? citation.sourceId ?? "Source summary";
  }

  return citation.sourceTitle ?? citation.chunkId ?? "Raw chunk";
}

function citationMeta(citation: AnswerCitation) {
  if (citation.layer === "raw_chunk") {
    return citation.locator ? `Chunk ${citation.locator}` : "Raw chunk fallback";
  }

  return citation.locator ?? "Compiled evidence";
}

function Pane({
  title,
  actions,
  children,
  className,
}: {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b border-border/70 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {title}
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-5">{children}</CardContent>
    </Card>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-background/50 px-5 py-10 text-center">
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-2 text-sm text-muted-foreground">{description}</div>
    </div>
  );
}

export function AskWorkbench({ defaultWorkspaceRoot }: AskWorkbenchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerArtifact | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [archivingType, setArchivingType] = useState<"synthesis" | "note" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const queryWorkspaceRoot = searchParams.get("workspaceRoot");
  const answerId = searchParams.get("answerId");

  useEffect(() => {
    const storedRoot =
      queryWorkspaceRoot ?? readStoredWorkspaceRoot() ?? defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
    persistWorkspaceRoot(storedRoot);
  }, [defaultWorkspaceRoot, queryWorkspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadAnswer() {
      if (!answerId) {
        if (isActive) {
          setAnswer(null);
        }
        return;
      }

      setIsLoadingAnswer(true);
      setErrorMessage(null);

      try {
        const nextAnswer = await fetchAnswerArtifact(workspaceRoot, answerId);

        if (!isActive) {
          return;
        }

        setAnswer(nextAnswer);
        setQuestion(nextAnswer.question);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setAnswer(null);
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load answer artifact.",
        );
      } finally {
        if (isActive) {
          setIsLoadingAnswer(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadAnswer();
    }

    return () => {
      isActive = false;
    };
  }, [answerId, workspaceRoot]);

  function updateUrl(nextAnswerId: string | null) {
    const params = new URLSearchParams({
      workspaceRoot,
    });

    if (nextAnswerId) {
      params.set("answerId", nextAnswerId);
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!question.trim()) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const nextAnswer = await askQuestion(workspaceRoot, question.trim());
      setAnswer(nextAnswer);
      updateUrl(nextAnswer.id);
      setNoticeMessage("Answer artifact saved to the local workspace database.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Ask request failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchive(archiveType: "synthesis" | "note") {
    if (!answer) {
      return;
    }

    setArchivingType(archiveType);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const nextAnswer = await archiveAnswer(workspaceRoot, answer.id, archiveType);
      const archiveFolder = archiveType === "synthesis" ? "wiki/syntheses/" : "wiki/notes/";

      setAnswer(nextAnswer);
      setNoticeMessage(
        `Answer archived into ${nextAnswer.archivedPage?.path ?? archiveFolder} successfully.`,
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to archive answer artifact.",
      );
    } finally {
      setArchivingType(null);
    }
  }

  const canArchiveAnswer = Boolean(
    answer &&
      !answer.archivedPageId &&
      !answer.metadata.insufficientKnowledge &&
      answer.citations.length > 0,
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Ask"
        title="Query the compiled wiki"
        description="Ask from compiled knowledge, not from a black-box file dump. Retrieval checks wiki pages first, then source summaries, then raw chunks only if the earlier layers are not enough, and grounded answers can be archived back into the wiki."
        badge="Wiki-first QA"
      />

      {errorMessage ? <FeedbackBanner variant="error">{errorMessage}</FeedbackBanner> : null}

      {noticeMessage ? <FeedbackBanner variant="success">{noticeMessage}</FeedbackBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <Pane
            title="Question"
            actions={
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <SearchCheck className="size-4" />
                wiki {"->"} summaries {"->"} chunks
              </div>
            }
          >
            <form className="space-y-4" onSubmit={handleSubmit}>
              <Textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                className="min-h-[140px]"
                placeholder="Ask a synthesis question grounded in the compiled wiki..."
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={isSubmitting || !question.trim()}>
                  {isSubmitting ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <SendHorizontal className="size-4" />
                  )}
                  Ask
                </Button>
                <div className="text-xs text-muted-foreground">
                  Active workspace: <span className="font-mono">{workspaceRoot}</span>
                </div>
              </div>
            </form>
          </Pane>

          {isLoadingAnswer ? (
            <Pane title="Answer">
              <div className="text-sm text-muted-foreground">Loading answer artifact...</div>
            </Pane>
          ) : answer ? (
            <Pane
              title="Answer"
              actions={
                <div className="flex flex-wrap items-center gap-2">
                  {answer.metadata.insufficientKnowledge ? (
                    <Badge variant="warning">Insufficient knowledge</Badge>
                  ) : answer.archivedPageId ? (
                    <Badge variant="success">Archived</Badge>
                  ) : (
                    <Badge variant="success">Grounded answer</Badge>
                  )}
                  <Badge variant="outline">{formatDateTime(answer.createdAt)}</Badge>
                </div>
              }
            >
              <div className="space-y-5">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Short answer
                  </div>
                  <div className="mt-3 text-base font-medium leading-7 text-foreground">
                    {answer.shortAnswer}
                  </div>
                </div>

                {answer.metadata.insufficientKnowledge ? (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="mt-0.5 size-5 text-amber-700" />
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-amber-900">
                          Compiled knowledge is currently insufficient
                        </div>
                        <div className="text-sm leading-7 text-amber-900/90">
                          {answer.metadata.recommendedSourceTypes.length > 0
                            ? `Recommended next inputs: ${answer.metadata.recommendedSourceTypes.join(", ")}.`
                            : "Ingest more relevant sources before relying on this answer."}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Detailed synthesis
                  </div>
                  <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-foreground">
                    {answer.detailedAnswer}
                  </div>
                </div>

                {answer.followUpQuestions.length > 0 ? (
                  <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      Suggested follow-up questions
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {answer.followUpQuestions.map((followUp) => (
                        <button
                          key={followUp}
                          type="button"
                          className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent/50"
                          onClick={() => setQuestion(followUp)}
                        >
                          {followUp}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </Pane>
          ) : (
            <EmptyState
              title="Ask from compiled knowledge"
              description="Submit a question to generate a cited answer artifact grounded in the wiki first, then summaries, then chunks only if needed. For the seeded demo workspace, you can also open an existing answer from Dashboard recent activity."
            />
          )}
        </div>

        <div className="space-y-5">
          <Pane title="Retrieval policy">
            <div className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm leading-7 text-foreground">
                The Ask pipeline follows a fixed order:
              </div>
              <div className="space-y-2">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3 text-sm text-foreground">
                  1. Wiki pages
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3 text-sm text-foreground">
                  2. Source summaries
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3 text-sm text-foreground">
                  3. Raw chunks only when the earlier layers are not enough
                </div>
              </div>
            </div>
          </Pane>

          <Pane title="Based-on pages">
            {!answer ? (
              <div className="text-sm text-muted-foreground">
                Answer artifacts will list the wiki pages that most directly grounded the answer.
              </div>
            ) : answer.basedOnPages.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No compiled wiki pages directly grounded this answer.
              </div>
            ) : (
              <div className="space-y-3">
                {answer.basedOnPages.map((page) => (
                  <Link
                    key={page.id}
                    href={page.href}
                    className="block rounded-2xl border border-border/70 bg-background/60 p-4 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-foreground">{page.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{page.path}</div>
                      </div>
                      <ExternalLink className="size-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Pane>

          <Pane title="Archive">
            {!answer ? (
              <div className="text-sm text-muted-foreground">
                Grounded answer artifacts can be archived into the wiki as synthesis pages or notes. Open a saved answer from Dashboard recent activity or ask a new question first.
              </div>
            ) : answer.archivedPage ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-7 text-emerald-900">
                  This answer artifact has already been archived into the wiki.
                </div>
                <Link
                  href={answer.archivedPage.href}
                  className="block rounded-2xl border border-border/70 bg-background/60 p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {answer.archivedPage.title}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {answer.archivedPage.type} • {answer.archivedPage.path}
                      </div>
                    </div>
                    <ExternalLink className="size-4 text-muted-foreground" />
                  </div>
                </Link>
              </div>
            ) : answer.metadata.insufficientKnowledge || answer.citations.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Only grounded answers with citations can be archived into the wiki.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-4 text-sm leading-7 text-foreground">
                  Archive this answer artifact into the durable wiki as a synthesis page or a note.
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    onClick={() => void handleArchive("synthesis")}
                    disabled={!canArchiveAnswer || archivingType !== null}
                  >
                    {archivingType === "synthesis" ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : null}
                    Archive as synthesis
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleArchive("note")}
                    disabled={!canArchiveAnswer || archivingType !== null}
                  >
                    {archivingType === "note" ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : null}
                    Archive as note
                  </Button>
                </div>
              </div>
            )}
          </Pane>

          <Pane title="Citations">
            {!answer ? (
              <div className="text-sm text-muted-foreground">
                Cited evidence will appear here after a question is answered.
              </div>
            ) : answer.citations.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No citations were available because the knowledge was insufficient.
              </div>
            ) : (
              <div className="space-y-3">
                {answer.citations.map((citation) => (
                  <div
                    key={`${citation.referenceId}-${citation.note}`}
                    className="rounded-2xl border border-border/70 bg-background/60 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{citation.layer.replace("_", " ")}</Badge>
                      <div className="text-sm font-medium text-foreground">
                        {citationLabel(citation)}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {citationMeta(citation)}
                    </div>
                    <div className="mt-3 text-sm leading-7 text-foreground">{citation.note}</div>
                  </div>
                ))}
              </div>
            )}
          </Pane>

          <Pane title="Caveats">
            {!answer ? (
              <div className="text-sm text-muted-foreground">
                Caveats and scope limits will be surfaced with each answer artifact.
              </div>
            ) : answer.caveats.length === 0 ? (
              <div className="text-sm text-muted-foreground">No caveats recorded.</div>
            ) : (
              <div className="space-y-2">
                {answer.caveats.map((caveat) => (
                  <div
                    key={caveat}
                    className="rounded-2xl border border-border/70 bg-background/60 p-3 text-sm leading-7 text-foreground"
                  >
                    {caveat}
                  </div>
                ))}
              </div>
            )}
          </Pane>

          <Pane title="Answer artifact">
            {!answer ? (
              <div className="text-sm text-muted-foreground">
                Answer artifacts are persisted in SQLite and can be explicitly archived into the wiki from this page.
              </div>
            ) : (
              <div className="space-y-3 text-sm text-foreground">
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Artifact id
                  </div>
                  <div className="mt-2 break-all font-mono text-xs">{answer.id}</div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Model context
                  </div>
                  <div className="mt-2 text-sm leading-7">
                    Provider: {answer.metadata.provider ?? "deterministic"}<br />
                    Model: {answer.metadata.model ?? "n/a"}<br />
                    Prompt version: {answer.metadata.promptVersion ?? "n/a"}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Retrieval usage
                  </div>
                  <div className="mt-2 text-sm leading-7">
                    Wiki pages: {answer.metadata.retrieval.wikiPageIds.length}<br />
                    Source summaries: {answer.metadata.retrieval.sourceIds.length}<br />
                    Raw chunks: {answer.metadata.retrieval.chunkIds.length}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/60 p-3">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    Archive state
                  </div>
                  <div className="mt-2 text-sm leading-7">
                    {answer.archivedPage ? (
                      <>
                        Archived to: {answer.archivedPage.path}
                        <br />
                        Page type: {answer.archivedPage.type}
                      </>
                    ) : (
                      "Not archived yet."
                    )}
                  </div>
                </div>
              </div>
            )}
          </Pane>
        </div>
      </div>
    </div>
  );
}
