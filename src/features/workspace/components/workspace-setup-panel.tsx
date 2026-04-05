"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

import {
  type WorkspaceStatus,
  workspaceStatusSchema,
} from "@/lib/contracts/workspace";
import { describeApiError, readResponseJson } from "@/lib/client-api";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/lib/constants";
import { FeedbackBanner } from "@/components/feedback-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type WorkspaceSetupPanelProps = {
  defaultWorkspaceRoot: string;
  onStatusChange?: (status: WorkspaceStatus) => void;
};

async function getWorkspaceStatus(workspaceRoot: string) {
  const response = await fetch(
    `/api/workspace/status?${new URLSearchParams({ workspaceRoot }).toString()}`,
    {
      cache: "no-store",
    },
  );

  const data = await readResponseJson(response);

  if (!response.ok) {
    throw new Error(describeApiError(data, "Failed to load workspace status."));
  }

  return workspaceStatusSchema.parse(data);
}

export function WorkspaceSetupPanel({
  defaultWorkspaceRoot,
  onStatusChange,
}: WorkspaceSetupPanelProps) {
  const [workspaceRoot, setWorkspaceRoot] = useState(defaultWorkspaceRoot);
  const [workspaceName, setWorkspaceName] = useState("Research Wiki");
  const [initializeGit, setInitializeGit] = useState(true);
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStatus = useCallback(
    async function refreshStatus(nextRoot: string) {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const nextStatus = await getWorkspaceStatus(nextRoot);
        setStatus(nextStatus);
        onStatusChange?.(nextStatus);

        if (nextStatus.settings?.workspaceName) {
          setWorkspaceName(nextStatus.settings.workspaceName);
        }
      } catch (error) {
        setStatus(null);
        setErrorMessage(error instanceof Error ? error.message : "Status request failed.");
      } finally {
        setIsLoading(false);
      }
    },
    [onStatusChange],
  );

  useEffect(() => {
    const storedRoot =
      window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ?? defaultWorkspaceRoot;

    setWorkspaceRoot(storedRoot);

    void refreshStatus(storedRoot);
  }, [defaultWorkspaceRoot, refreshStatus]);

  async function handleInitialize(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/workspace/init", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceRoot,
          workspaceName,
          initializeGit,
        }),
      });

      const data = await readResponseJson(response);

      if (!response.ok) {
        throw new Error(describeApiError(data, "Workspace initialization failed."));
      }

      const nextStatus = workspaceStatusSchema.parse(data);
      window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceRoot);
      setStatus(nextStatus);
      onStatusChange?.(nextStatus);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Workspace initialization failed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Workspace Initialization</CardTitle>
          <CardDescription>
            Initialize the local-first workspace structure, copy visible prompt files,
            bootstrap SQLite, and optionally start git.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleInitialize}>
            <div className="space-y-2">
              <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Workspace Root
              </label>
              <Input
                value={workspaceRoot}
                onChange={(event) => setWorkspaceRoot(event.target.value)}
                placeholder={defaultWorkspaceRoot}
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Workspace Name
              </label>
              <Input
                value={workspaceName}
                onChange={(event) => setWorkspaceName(event.target.value)}
                placeholder="Research Wiki"
              />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/40 px-4 py-3 text-sm text-foreground">
              <input
                className="size-4 rounded border-border accent-[var(--primary)]"
                type="checkbox"
                checked={initializeGit}
                onChange={(event) => setInitializeGit(event.target.checked)}
              />
              Initialize git inside the workspace by default
            </label>
            <div className="flex flex-wrap gap-3">
              <Button disabled={isLoading} type="submit">
                {isLoading ? "Working..." : "Initialize Workspace"}
              </Button>
              <Button
                disabled={isLoading}
                type="button"
                variant="outline"
                onClick={() => void refreshStatus(workspaceRoot)}
              >
                Refresh Status
              </Button>
            </div>
            {errorMessage ? <FeedbackBanner variant="error">{errorMessage}</FeedbackBanner> : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workspace Snapshot</CardTitle>
          <CardDescription>
            Visible local state from the current workspace root so you can confirm the
            file-backed workspace, database, and settings are healthy before driving the
            higher-level knowledge loops.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant={status?.initialized ? "success" : "outline"}>
              {status?.initialized ? "Initialized" : "Not initialized"}
            </Badge>
            <Badge variant={status?.databaseInitialized ? "success" : "outline"}>
              {status?.databaseInitialized ? "SQLite ready" : "DB missing"}
            </Badge>
            <Badge variant={status?.gitInitialized ? "success" : "outline"}>
              {status?.gitInitialized ? "Git ready" : "Git missing"}
            </Badge>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Tables
              </div>
              <ul className="mt-3 space-y-2 text-sm text-foreground">
                {(status?.databaseTables.length ? status.databaseTables : ["No tables yet"]).map(
                  (tableName) => (
                    <li key={tableName}>{tableName}</li>
                  ),
                )}
              </ul>
            </div>
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Workspace Record
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Root</dt>
                  <dd className="break-all text-foreground">
                    {status?.workspaceRoot ?? workspaceRoot}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Name</dt>
                  <dd className="text-foreground">
                    {status?.workspaceRecord?.name ?? status?.settings?.workspaceName ?? "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="text-foreground">
                    {status?.workspaceRecord?.status ?? "uninitialized"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Required paths
            </div>
            <div className="max-h-[360px] overflow-auto rounded-2xl border border-border/70 bg-muted/20">
              <table className="min-w-full text-left text-sm">
                <thead className="sticky top-0 bg-card/95 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Relative path</th>
                    <th className="px-4 py-3 font-medium">Kind</th>
                    <th className="px-4 py-3 font-medium">State</th>
                  </tr>
                </thead>
                <tbody>
                  {(status?.requiredPaths ?? []).map((entry) => (
                    <tr key={entry.relativePath} className="border-t border-border/60">
                      <td className="px-4 py-3 font-mono text-xs text-foreground">
                        {entry.relativePath}
                      </td>
                      <td className="px-4 py-3 capitalize text-muted-foreground">
                        {entry.kind}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={entry.exists ? "success" : "outline"}>
                          {entry.exists ? "Present" : "Missing"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Settings JSON
            </div>
            <pre className="overflow-auto rounded-2xl border border-border/70 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
              {JSON.stringify(status?.settings ?? null, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
