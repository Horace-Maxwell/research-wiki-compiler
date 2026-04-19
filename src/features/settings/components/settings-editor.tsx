"use client";

import type { FormEvent } from "react";
import { startTransition, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GitCommitHorizontal, KeyRound, RefreshCw, Save } from "lucide-react";

import { getLocaleCopy } from "@/lib/app-locale";
import {
  type WorkspaceSettings,
  workspaceSettingsResponseSchema,
} from "@/lib/contracts/workspace";
import { describeApiError, readResponseJson } from "@/lib/client-api";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/lib/constants";
import { useAppLocale } from "@/components/app-locale-provider";
import { FeedbackBanner } from "@/components/feedback-banner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SettingsEditorProps = {
  defaultWorkspaceRoot: string;
};

const SETTINGS_REQUEST_TIMEOUT_MS = 10_000;

export class SettingsRequestTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsRequestTimeoutError";
  }
}

const selectClassName =
  "flex h-11 w-full rounded-xl border border-border/60 bg-background/90 px-3.5 py-2 text-sm text-foreground shadow-none outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

const inputClassName =
  "h-11 rounded-xl border-border/60 bg-background/90 px-3.5 shadow-none";

const canvasClass =
  "overflow-hidden rounded-[30px] border border-border/55 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(247,245,240,0.98))] shadow-[0_28px_68px_-54px_rgba(15,23,42,0.24)]";

const sectionPanelClass =
  "rounded-[24px] border border-border/45 bg-[rgba(252,250,246,0.9)] p-5";

const togglePanelClass =
  "rounded-[22px] border border-border/45 bg-[rgba(255,255,255,0.82)] p-4";

const fieldLabelClass = "text-[13px] font-medium leading-5 text-foreground/80";

const helperTextClass = "text-[14px] leading-6 text-muted-foreground";

const sectionHeadingClass = "text-[1.08rem] font-semibold tracking-[-0.025em] text-foreground";

async function fetchWorkspaceSettings(workspaceRoot: string, fallbackMessage: string) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => {
    controller.abort("settings_request_timeout");
  }, SETTINGS_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `/api/settings?${new URLSearchParams({ workspaceRoot }).toString()}`,
      { cache: "no-store", signal: controller.signal },
    );
    const data = await readResponseJson(response);

    if (!response.ok) {
      throw new Error(describeApiError(data, fallbackMessage));
    }

    return workspaceSettingsResponseSchema.parse(data).settings;
  } catch (error) {
    if (
      controller.signal.aborted &&
      controller.signal.reason === "settings_request_timeout"
    ) {
      throw new SettingsRequestTimeoutError(fallbackMessage);
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function saveWorkspaceSettings(
  workspaceRoot: string,
  settings: WorkspaceSettings,
  fallbackMessage: string,
) {
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
    throw new Error(describeApiError(data, fallbackMessage));
  }

  return workspaceSettingsResponseSchema.parse(data).settings;
}

export function SettingsEditor({ defaultWorkspaceRoot }: SettingsEditorProps) {
  const { locale } = useAppLocale();
  const copy = getLocaleCopy(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryWorkspaceRoot = searchParams.get("workspaceRoot");
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [hasResolvedClientWorkspaceRoot, setHasResolvedClientWorkspaceRoot] = useState(false);

  useEffect(() => {
    const storedRoot =
      queryWorkspaceRoot ??
      window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ??
      defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);
    window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, storedRoot);
    setHasResolvedClientWorkspaceRoot(true);
  }, [defaultWorkspaceRoot, queryWorkspaceRoot]);

  useEffect(() => {
    let isActive = true;

    async function loadSettings() {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextSettings = await fetchWorkspaceSettings(
          workspaceRoot,
          copy.settings.failedLoad,
        );

        if (!isActive) {
          return;
        }

        setSettings(nextSettings);
      } catch (error) {
        if (!isActive) {
          return;
        }

        if (
          error instanceof SettingsRequestTimeoutError &&
          workspaceRoot !== defaultWorkspaceRoot
        ) {
          window.localStorage.setItem(
            ACTIVE_WORKSPACE_STORAGE_KEY,
            defaultWorkspaceRoot,
          );
          setSettings(null);
          setWorkspaceRoot(defaultWorkspaceRoot);
          setErrorMessage(null);

          if (queryWorkspaceRoot) {
            startTransition(() => {
              router.replace(pathname);
            });
          }

          return;
        }

        setSettings(null);
        setErrorMessage(error instanceof Error ? error.message : copy.settings.failedLoad);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    if (hasResolvedClientWorkspaceRoot && workspaceRoot) {
      void loadSettings();
    }

    return () => {
      isActive = false;
    };
  }, [
    copy.settings.failedLoad,
    defaultWorkspaceRoot,
    hasResolvedClientWorkspaceRoot,
    pathname,
    queryWorkspaceRoot,
    router,
    workspaceRoot,
  ]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!settings) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setNoticeMessage(null);

    try {
      const saved = await saveWorkspaceSettings(
        workspaceRoot,
        settings,
        copy.settings.failedSave,
      );

      startTransition(() => {
        setSettings(saved);
      });
      setNoticeMessage(copy.settings.saveNotice);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.settings.failedSave);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-full space-y-8">
      <PageHeader
        eyebrow={copy.settings.eyebrow}
        title={copy.settings.title}
        description={copy.settings.description}
        badge={copy.settings.badge}
      />

      {errorMessage ? <FeedbackBanner variant="error">{errorMessage}</FeedbackBanner> : null}

      {noticeMessage ? <FeedbackBanner variant="success">{noticeMessage}</FeedbackBanner> : null}

      <div className={canvasClass}>
        <div className="grid xl:grid-cols-[minmax(0,2.45fr)_300px] 2xl:grid-cols-[minmax(0,2.7fr)_320px]">
          <section className="min-w-0 border-b border-border/50 xl:border-b-0 xl:border-r xl:border-border/50">
            <div className="px-6 py-6 sm:px-7 sm:py-7 xl:px-8 xl:py-8">
              <div className="flex items-start gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-border/50 bg-background/90 text-primary shadow-[0_10px_30px_-26px_rgba(15,23,42,0.28)]">
                  <KeyRound className="size-5" />
                </div>
                <div className="space-y-2">
                  <div className="text-[1.22rem] font-semibold tracking-[-0.03em] text-foreground">
                    {copy.settings.llmSettingsTitle}
                  </div>
                  <div className={helperTextClass}>{copy.settings.llmSettingsDescription}</div>
                </div>
              </div>

              {isLoading || !settings ? (
                <div className="pt-8">
                  <div className={helperTextClass}>{copy.settings.loading}</div>
                </div>
              ) : (
                <form className="space-y-6 pt-8" onSubmit={handleSave}>
                  <div className={`${sectionPanelClass} space-y-5`}>
                    <div className="space-y-1.5">
                      <div className={sectionHeadingClass}>
                        {locale === "zh" ? "默认 provider 与模型" : "Default provider and model"}
                      </div>
                      <div className={helperTextClass}>
                        {locale === "zh"
                          ? "先选定当前工作区默认使用的 provider，再决定是否需要单独的模型覆盖。"
                          : "Choose the workspace default provider first, then add an override only when you want a specific model pinned."}
                      </div>
                    </div>

                    <div className="grid gap-5 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1fr)]">
                      <label className="space-y-2.5">
                        <span className={fieldLabelClass}>{copy.settings.activeProvider}</span>
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
                          <option value="">{copy.settings.noProviderSelected}</option>
                          <option value="openai">OpenAI</option>
                          <option value="anthropic">Anthropic</option>
                        </select>
                      </label>

                      <label className="space-y-2.5">
                        <span className={fieldLabelClass}>{copy.settings.activeModelOverride}</span>
                        <Input
                          className={inputClassName}
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
                          placeholder={copy.settings.activeModelPlaceholder}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-5 2xl:grid-cols-2">
                    <div className={`${sectionPanelClass} space-y-5`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[1.02rem] font-semibold tracking-[-0.02em] text-foreground">
                          OpenAI
                        </div>
                        <Badge variant="outline">{copy.settings.structuredOutput}</Badge>
                      </div>
                      <div className="grid gap-4">
                        <label className="space-y-2.5">
                          <span className={fieldLabelClass}>{copy.settings.apiKey}</span>
                          <Input
                            className={inputClassName}
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
                            placeholder={copy.settings.openAiPlaceholder}
                          />
                        </label>
                        <label className="space-y-2.5">
                          <span className={fieldLabelClass}>{copy.settings.defaultModel}</span>
                          <Input
                            className={inputClassName}
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
                            placeholder={copy.settings.openAiModelPlaceholder}
                          />
                        </label>
                      </div>
                    </div>

                    <div className={`${sectionPanelClass} space-y-5`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[1.02rem] font-semibold tracking-[-0.02em] text-foreground">
                          Anthropic
                        </div>
                        <Badge variant="outline">{copy.settings.toolOutput}</Badge>
                      </div>
                      <div className="grid gap-4">
                        <label className="space-y-2.5">
                          <span className={fieldLabelClass}>{copy.settings.apiKey}</span>
                          <Input
                            className={inputClassName}
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
                            placeholder={copy.settings.anthropicPlaceholder}
                          />
                        </label>
                        <label className="space-y-2.5">
                          <span className={fieldLabelClass}>{copy.settings.defaultModel}</span>
                          <Input
                            className={inputClassName}
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
                            placeholder={copy.settings.anthropicModelPlaceholder}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className={`${sectionPanelClass} space-y-5`}>
                    <div className="flex items-start gap-4">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border/45 bg-background/85 text-primary">
                        <GitCommitHorizontal className="size-5" />
                      </div>
                      <div className="space-y-1.5">
                        <div className={sectionHeadingClass}>{copy.settings.reviewApplyTitle}</div>
                        <div className={helperTextClass}>{copy.settings.reviewApplyDescription}</div>
                      </div>
                    </div>

                    <div className="grid gap-4 2xl:grid-cols-2">
                      <label className={`${togglePanelClass} flex items-start gap-3`}>
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
                        <div className="space-y-1.5">
                          <div className="text-sm font-semibold leading-5 text-foreground">
                            {copy.settings.autoDraftTitle}
                          </div>
                          <div className={helperTextClass}>{copy.settings.autoDraftDescription}</div>
                        </div>
                      </label>

                      <label className={`${togglePanelClass} flex items-start gap-3`}>
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
                        <div className="space-y-1.5">
                          <div className="text-sm font-semibold leading-5 text-foreground">
                            {copy.settings.gitCommitTitle}
                          </div>
                          <div className={helperTextClass}>{copy.settings.gitCommitDescription}</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-border/45 pt-6 2xl:flex-row 2xl:items-center 2xl:justify-between">
                    <div className="max-w-[54rem] text-[13px] leading-5 text-muted-foreground">
                      {copy.settings.keyStorageNote(workspaceRoot)}
                    </div>
                    <Button className="min-w-[176px]" size="lg" type="submit" disabled={isSaving}>
                      {isSaving ? <RefreshCw className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {copy.settings.saveSettings}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </section>

          <aside className="min-w-0 bg-[rgba(248,246,241,0.76)]">
            <div className="space-y-7 px-5 py-6 sm:px-6 sm:py-7 xl:sticky xl:top-7 xl:px-6 xl:py-8">
              <section className="space-y-4">
                <div className="space-y-1.5">
                  <div className={sectionHeadingClass}>{copy.language.settingsTitle}</div>
                  <div className={helperTextClass}>{copy.language.settingsDescription}</div>
                </div>
                <div className="rounded-[22px] border border-border/40 bg-background/78 p-4">
                  <LanguageSwitcher className="border-0 bg-transparent p-0 shadow-none" />
                </div>
              </section>

              <section className="space-y-4 border-t border-border/45 pt-6">
                <div className="space-y-1.5">
                  <div className={sectionHeadingClass}>{copy.settings.usageNotesTitle}</div>
                  <div className={helperTextClass}>{copy.settings.usageNotesDescription}</div>
                </div>

                <div className="space-y-0 overflow-hidden rounded-[22px] border border-border/40 bg-background/78">
                  <div className="space-y-2 p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                      {copy.settings.activeWorkspace}
                    </div>
                    <div className="break-all font-mono text-[12.5px] leading-6 text-foreground">
                      {workspaceRoot}
                    </div>
                  </div>
                  <div className="border-t border-border/40 px-4 py-4 text-sm leading-6 text-muted-foreground">
                    {copy.settings.summaryNote}
                  </div>
                  <div className="border-t border-border/40 px-4 py-4 text-sm leading-6 text-muted-foreground">
                    {copy.settings.reviewNote}
                  </div>
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
