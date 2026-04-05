// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { DashboardWorkbench } from "@/features/dashboard/components/dashboard-workbench";

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/features/workspace/components/workspace-setup-panel", () => ({
  WorkspaceSetupPanel: () => <div>Workspace setup panel</div>,
}));

function createDashboardPayload() {
  return {
    dashboard: {
      workspaceRoot: "/tmp/research-demo",
      initialized: true,
      workspaceName: "Research Wiki Demo",
      gitInitialized: true,
      databaseInitialized: true,
      counts: {
        wikiPages: {
          total: 6,
          byType: {
            concept: 1,
            topic: 1,
            entity: 1,
            timeline: 0,
            synthesis: 1,
            note: 1,
            index: 1,
          },
        },
        sources: {
          total: 3,
          byStatus: {
            processed: 3,
          },
          bySummaryStatus: {
            completed: 3,
          },
        },
        reviews: {
          total: 3,
          byStatus: {
            pending: 1,
            approved: 1,
            rejected: 1,
          },
        },
        answers: {
          total: 1,
          archived: 1,
        },
        audits: {
          total: 2,
          byStatus: {
            completed: 2,
          },
        },
        jobs: {
          total: 8,
          byStatus: {
            completed: 8,
          },
        },
      },
      featuredPages: [
        {
          id: "page_1",
          title: "Compiled research wiki",
          type: "topic",
          path: "wiki/topics/compiled-research-wiki.md",
          reviewStatus: "approved",
          sourceRefCount: 2,
          pageRefCount: 1,
          updatedAt: "2026-04-05T18:00:00.000Z",
          href: "/wiki?workspaceRoot=%2Ftmp%2Fresearch-demo&pageId=page_1",
        },
      ],
      recentSources: [
        {
          id: "src_1",
          title: "Local-first systems digest",
          sourceType: "markdown",
          status: "processed",
          summaryStatus: "completed",
          importedAt: "2026-04-05T17:30:00.000Z",
          updatedAt: "2026-04-05T17:31:00.000Z",
          href: "/sources?workspaceRoot=%2Ftmp%2Fresearch-demo&sourceId=src_1",
        },
      ],
      reviewFocus: [
        {
          id: "review_1",
          title: "Patch proposal approved",
          status: "approved",
          riskLevel: "low",
          proposalType: "update_page",
          targetPageTitle: "Local-first software",
          updatedAt: "2026-04-05T18:00:00.000Z",
          href: "/reviews?workspaceRoot=%2Ftmp%2Fresearch-demo&status=approved&reviewId=review_1",
        },
      ],
      archivedAnswers: [
        {
          id: "ans_1",
          question: "Why does a compiled research wiki use reviewable patches?",
          archivedPageTitle: "Weekly research cadence note",
          archivedPagePath: "wiki/notes/weekly-research-cadence-note.md",
          updatedAt: "2026-04-05T18:10:00.000Z",
          href: "/ask?workspaceRoot=%2Ftmp%2Fresearch-demo&answerId=ans_1",
        },
      ],
      recentAudits: [
        {
          id: "audit_1",
          mode: "coverage",
          status: "completed",
          findingsCount: 1,
          highestSeverity: "medium",
          completedAt: "2026-04-05T18:20:00.000Z",
          href: "/audits?workspaceRoot=%2Ftmp%2Fresearch-demo&auditId=audit_1",
        },
      ],
      recentActivity: [
        {
          id: "review:1",
          timestamp: "2026-04-05T18:00:00.000Z",
          kind: "review",
          status: "approved",
          title: "Patch proposal approved",
          description: "Add reviewable mutation evidence to Local-first software",
          href: "/reviews?workspaceRoot=%2Ftmp%2Fresearch-demo&status=approved&reviewId=review_1",
        },
      ],
    },
  };
}

describe("dashboard workbench", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
        removeItem: (key: string) => {
          storage.delete(key);
        },
        clear: () => {
          storage.clear();
        },
        key: (index: number) => [...storage.keys()][index] ?? null,
        get length() {
          return storage.size;
        },
      } satisfies Storage,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("renders workspace metrics and recent activity from the dashboard API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(createDashboardPayload()), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    render(<DashboardWorkbench defaultWorkspaceRoot="/tmp/research-demo" />);

    expect(await screen.findByText(/Research Wiki Demo/)).toBeTruthy();
    expect(screen.getByText("Open wiki")).toBeTruthy();
    expect(screen.getAllByText("Knowledge workspace").length).toBeGreaterThan(0);
    expect(screen.getByText("Pages worth opening next")).toBeTruthy();
    expect(screen.getByText("Review focus")).toBeTruthy();
    expect(screen.getByText("Recent movement")).toBeTruthy();
    expect(screen.getAllByText("Patch proposal approved").length).toBeGreaterThan(0);
  });

  it("shows an inline error when the dashboard API request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Dashboard overview failed.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    render(<DashboardWorkbench defaultWorkspaceRoot="/tmp/research-demo" />);

    expect(await screen.findByText("Dashboard overview failed.")).toBeTruthy();
  });
});
