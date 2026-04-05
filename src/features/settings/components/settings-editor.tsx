"use client";

import type { FormEvent } from "react";
import { startTransition, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { GitCommitHorizontal, KeyRound, RefreshCw, Save } from "lucide-react";

import {
  type WorkspaceSettings,
  workspaceSettingsResponseSchema,
} from "@/lib/contracts/workspace";
import { describeApiError, readResponseJson } from "@/lib/client-api";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/lib/constants";
import { FeedbackBanner } from "@/components/feedback-banner";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SettingsEditorProps = {
  defaultWorkspaceRoot: string;
};

const selectClassName =
  "flex h-10 w-full rounded-md border border-border bg-background/80 px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

async function fetchWorkspaceSettings(workspaceRoot: string) {
  const response = await fetch(
    `/api/settings?${new URLSearchParams({ workspaceRoot }).toString()}`,
    { cache: "no-store" },
  );
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to load settings."));
  }

  return workspaceSettingsResponseSchema.parse(data).settings;
}

async function saveWorkspaceSettings(workspaceRoot: string, settings: WorkspaceSettings) {
  const response = await fetch("/api/settings", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      workspaceRoot,
      llm: settings.llm,
      review: settings.review,
    }),
  });
  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to save settings."));
  }

  return workspaceSettingsResponseSchema.parse(data).settings;
}

export function SettingsEditor({ defaultWorkspaceRoot }: SettingsEditorProps) {
  const searchParams = useSearchParams();
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    const storedRoot =
      searchParams.get("workspaceRoot") ??
      window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ??
      defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, storedRoot);
  }, [defaultWorkspaceRoot, searchParams]);

  useEffect(() => {
    let isActive = true;

    async function loadSettings() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextSettings = await fetchWorkspaceSettings(workspaceRoot);

        if (!isActive) {
          return;
        }

        setSettings(nextSettings);
      } catch (error) {
        if (!isActive) {
          return;
        }

        setSettings(null);
        setErrorMessage(error instanceof Error ? error.message : "Failed to load settings.");
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    if (workspaceRoot) {
      void loadSettings();
    }

    return () => {
      isActive = false;
    };
  }, [workspaceRoot]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settings) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const saved = await saveWorkspaceSettings(workspaceRoot, settings);

      startTransition(() => {
        setSettings(saved);
      });
      setNoticeMessage("Workspace settings saved to .research-wiki/settings.json.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Workspace apply and provider settings"
        description="Provider credentials, model defaults, and review behavior stay inside the workspace so summarization, planning, and optional git commits remain local, explicit, and reproducible."
        badge="Workspace-local config"
      />

      {errorMessage ? <FeedbackBanner variant="error">{errorMessage}</FeedbackBanner> : null}

      {noticeMessage ? <FeedbackBanner variant="success">{noticeMessage}</FeedbackBanner> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center gap-3">
              <KeyRound className="size-5 text-primary" />
              <div className="space-y-2">
                <CardTitle>LLM Settings</CardTitle>
                <CardDescription>
                  Configure the provider and model used for source summarization and patch planning.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading || !settings ? (
              <div className="text-sm text-muted-foreground">Loading workspace settings...</div>
            ) : (
              <form className="space-y-6" onSubmit={handleSave}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Active provider</span>
                    <select
                      className={selectClassName}
                      value={settings.llm.provider ?? ""}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? {
                                ...current,
                                llm: {
                                  ...current.llm,
                                  provider:
                                    event.target.value === "openai" ||
                                    event.target.value === "anthropic"
                                      ? event.target.value
                                      : null,
                                },
                              }
                            : current,
                        )
                      }
                    >
                      <option value="">No provider selected</option>
                      <option value="openai">OpenAI</option>
                      <option value="anthropic">Anthropic</option>
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-foreground">Active model override</span>
                    <Input
                      value={settings.llm.model ?? ""}
                      onChange={(event) =>
                        setSettings((current) =>
                          current
                            ? {
                                ...current,
                                llm: {
                                  ...current.llm,
                                  model: event.target.value || null,
                                },
                              }
                            : current,
                        )
                      }
                      placeholder="Optional override for the selected provider"
                    />
                  </label>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-4 rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">OpenAI</div>
                      <Badge variant="outline">Structured output</Badge>
                    </div>
                    <label className="space-y-2">
                      <span className="text-sm text-muted-foreground">API key</span>
                      <Input
                        type="password"
                        value={settings.llm.openai.apiKey ?? ""}
                        onChange={(event) =>
                          setSettings((current) =>
                            current
                              ? {
                                  ...current,
                                  llm: {
                                    ...current.llm,
                                    openai: {
                                      ...current.llm.openai,
                                      apiKey: event.target.value || null,
                                    },
                                  },
                                }
                              : current,
                          )
                        }
                        placeholder="sk-..."
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-muted-foreground">Default model</span>
                      <Input
                        value={settings.llm.openai.model ?? ""}
                        onChange={(event) =>
                          setSettings((current) =>
                            current
                              ? {
                                  ...current,
                                  llm: {
                                    ...current.llm,
                                    openai: {
                                      ...current.llm.openai,
                                      model: event.target.value || null,
                                    },
                                  },
                                }
                              : current,
                          )
                        }
                        placeholder="gpt-4.1-mini or similar"
                      />
                    </label>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border/70 bg-background/60 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-foreground">Anthropic</div>
                      <Badge variant="outline">Tool output</Badge>
                    </div>
                    <label className="space-y-2">
                      <span className="text-sm text-muted-foreground">API key</span>
                      <Input
                        type="password"
                        value={settings.llm.anthropic.apiKey ?? ""}
                        onChange={(event) =>
                          setSettings((current) =>
                            current
                              ? {
                                  ...current,
                                  llm: {
                                    ...current.llm,
                                    anthropic: {
                                      ...current.llm.anthropic,
                                      apiKey: event.target.value || null,
                                    },
                                  },
                                }
                              : current,
                          )
                        }
                        placeholder="sk-ant-..."
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm text-muted-foreground">Default model</span>
                      <Input
                        value={settings.llm.anthropic.model ?? ""}
                        onChange={(event) =>
                          setSettings((current) =>
                            current
                              ? {
                                  ...current,
                                  llm: {
                                    ...current.llm,
                                    anthropic: {
                                      ...current.llm.anthropic,
                                      model: event.target.value || null,
                                    },
                                  },
                                }
                              : current,
                          )
                        }
                        placeholder="claude-sonnet-4-5 or similar"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save settings
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Keys are stored locally in `{workspaceRoot}/.research-wiki/settings.json`.
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Usage Notes</CardTitle>
            <CardDescription>
              These credentials are used for source summarization, patch planning, and
              answer generation in the local workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              Active workspace:
              <div className="mt-2 break-all font-mono text-xs text-foreground">{workspaceRoot}</div>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              Summary outputs remain file-backed. The model is used to create visible markdown and JSON artifacts, not hidden memory.
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/60 p-4">
              Review settings control explicit patch-apply behavior without introducing
              hidden automation.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-center gap-3">
            <GitCommitHorizontal className="size-5 text-primary" />
            <div className="space-y-2">
              <CardTitle>Review Apply Settings</CardTitle>
              <CardDescription>
                Control explicit review behavior. Git commits remain optional and never block a successful apply.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {!settings ? (
            <div className="text-sm text-muted-foreground">Loading workspace settings...</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 p-4">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-border"
                  checked={settings.review.autoDraftLowRiskPatches}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            review: {
                              ...current.review,
                              autoDraftLowRiskPatches: event.target.checked,
                            },
                          }
                        : current,
                    )
                  }
                />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Auto-draft low-risk proposals</div>
                  <div className="text-sm text-muted-foreground">
                    Keep this disabled unless you want future low-risk drafts generated automatically but still reviewed.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/60 p-4">
                <input
                  type="checkbox"
                  className="mt-1 size-4 rounded border-border"
                  checked={settings.review.gitCommitOnApply}
                  onChange={(event) =>
                    setSettings((current) =>
                      current
                        ? {
                            ...current,
                            review: {
                              ...current.review,
                              gitCommitOnApply: event.target.checked,
                            },
                          }
                        : current,
                    )
                  }
                />
                <div className="space-y-1">
                  <div className="text-sm font-medium text-foreground">Create git commit after apply</div>
                  <div className="text-sm text-muted-foreground">
                    If the workspace is a git repo, successful applies can stage only affected files and create a clear review-derived commit.
                  </div>
                </div>
              </label>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
