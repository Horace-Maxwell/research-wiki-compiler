// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AuditBrowser } from "@/features/audits/components/audit-browser";

const replaceMock = vi.fn();
const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: pushMock,
  }),
  usePathname: () => "/audits",
  useSearchParams: () => currentSearchParams,
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function createAuditSummaryPayload(overrides?: Record<string, unknown>) {
  return {
    id: "audit_1",
    mode: "coverage",
    status: "completed",
    reportPath: "audits/2026-04-05-coverage-audit_1.md",
    findingCount: 1,
    severityCounts: {
      low: 0,
      medium: 1,
      high: 0,
    },
    createdAt: "2026-04-05T18:00:00.000Z",
    completedAt: "2026-04-05T18:01:00.000Z",
    ...overrides,
  };
}

function createAuditDetailPayload(overrides?: Record<string, unknown>) {
  return {
    ...createAuditSummaryPayload(),
    findings: [
      {
        id: "finding_1",
        mode: "coverage",
        severity: "medium",
        title: "Recurring concept lacks wiki coverage",
        note: "Knowledge compiler appears across two summarized sources but does not yet have a matching durable wiki page.",
        relatedPageIds: [],
        relatedPagePaths: [],
        relatedSourceIds: ["src_1", "src_2"],
        metadata: {
          mentionType: "concept",
        },
      },
    ],
    reportMarkdown: "# Coverage Audit\n\n## Finding 1: Recurring concept lacks wiki coverage\n",
    ...overrides,
  };
}

describe("audit browser", () => {
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
    currentSearchParams = new URLSearchParams();
    replaceMock.mockReset();
    pushMock.mockReset();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("renders audit history and detail findings from the API", async () => {
    currentSearchParams = new URLSearchParams({
      workspaceRoot: "/tmp/research-demo",
      auditId: "audit_1",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      const url = String(input);

      if (url.startsWith("/api/audits?")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              audits: [createAuditSummaryPayload()],
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          ),
        );
      }

      if (url.startsWith("/api/audits/audit_1?")) {
        return Promise.resolve(
          new Response(JSON.stringify(createAuditDetailPayload()), {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          }),
        );
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    render(<AuditBrowser defaultWorkspaceRoot="/tmp/research-demo" />);

    expect(await screen.findByText("Recurring concept lacks wiki coverage")).toBeTruthy();
    expect(
      screen.getByText(
        "Knowledge compiler appears across two summarized sources but does not yet have a matching durable wiki page.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("audits/2026-04-05-coverage-audit_1.md")).toBeTruthy();
    expect(screen.getByText((content) => content.includes("# Coverage Audit"))).toBeTruthy();
    expect(screen.getByText("1 finding")).toBeTruthy();
  });

  it("runs a new audit from the UI and shows the resulting report", async () => {
    currentSearchParams = new URLSearchParams({
      workspaceRoot: "/tmp/research-demo",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
      const url = String(input);

      if (url.startsWith("/api/audits?")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              audits: [],
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          ),
        );
      }

      if (url === "/api/audits/run" && init?.method === "POST") {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              audit: createAuditDetailPayload(),
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
              },
            },
          ),
        );
      }

      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    render(<AuditBrowser defaultWorkspaceRoot="/tmp/research-demo" />);

    fireEvent.click(screen.getByRole("button", { name: "Run Coverage audit" }));

    expect(await screen.findByText("Coverage audit completed with 1 finding.")).toBeTruthy();
    expect(screen.getByText("Recurring concept lacks wiki coverage")).toBeTruthy();

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });
  });
});
