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

    expect(await screen.findByText("Visible control surface for the local research workspace")).toBeTruthy();
    expect(screen.getByText("Workspace setup panel")).toBeTruthy();
    expect(screen.getByText("Wiki pages")).toBeTruthy();
    expect(screen.getByText("Imported sources")).toBeTruthy();
    expect(screen.getByText("Review queue")).toBeTruthy();
    expect(screen.getByText("Recent local activity")).toBeTruthy();
    expect(screen.getByText("Patch proposal approved")).toBeTruthy();
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
