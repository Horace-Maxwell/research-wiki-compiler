// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { AskWorkbench } from "@/features/ask/components/ask-workbench";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
  }),
  usePathname: () => "/ask",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

function createAnswerPayload(overrides?: Record<string, unknown>) {
  return {
    id: "ans_123",
    question: "What is local-first software?",
    shortAnswer:
      "Local-first software keeps important user data visible and under direct control.",
    detailedAnswer:
      "The compiled wiki and supporting summaries both describe local-first software as visible and user-controlled.",
    citations: [
      {
        referenceId: "wiki_page:page_local_first",
        layer: "wiki_page",
        pageId: "page_local_first",
        pageTitle: "Local-first software",
        pagePath: "wiki/concepts/local-first-software.md",
        sourceId: null,
        sourceTitle: null,
        chunkId: null,
        locator: "wiki/concepts/local-first-software.md",
        note: "The concept page provides the core framing.",
      },
    ],
    basedOnPageIds: ["page_local_first"],
    basedOnPages: [
      {
        id: "page_local_first",
        title: "Local-first software",
        slug: "local-first-software",
        path: "wiki/concepts/local-first-software.md",
        type: "concept",
        href: "/wiki?pageId=page_local_first",
      },
    ],
    caveats: ["This answer reflects the currently compiled workspace."],
    followUpQuestions: ["What tradeoffs come with local-first architecture?"],
    archivedPageId: null,
    archivedPage: null,
    metadata: {
      provider: "openai",
      model: "gpt-test",
      promptHash: "hash",
      promptVersion: "0.6.0-m6",
      insufficientKnowledge: false,
      recommendedSourceTypes: [],
      retrieval: {
        order: ["wiki_pages", "source_summaries", "raw_chunks"],
        wikiPageIds: ["page_local_first"],
        sourceIds: ["src_1"],
        chunkIds: [],
        usedSummaryFallback: false,
        usedChunkFallback: false,
      },
    },
    createdAt: "2026-04-05T12:00:00.000Z",
    updatedAt: "2026-04-05T12:00:00.000Z",
    ...overrides,
  };
}

describe("ask workbench", () => {
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
    replaceMock.mockReset();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("renders a returned answer artifact with citations and based-on pages", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          answer: createAnswerPayload(),
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      ),
    );

    render(<AskWorkbench defaultWorkspaceRoot="/tmp/research-demo" />);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Ask a synthesis question grounded in the compiled wiki...",
      ),
      {
        target: {
          value: "What is local-first software?",
        },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(
      await screen.findByText(
        "Local-first software keeps important user data visible and under direct control.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("The concept page provides the core framing.")).toBeTruthy();
    expect(screen.getAllByText("Local-first software").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalled();
    });
  });

  it("archives a grounded answer artifact into the wiki from the Ask UI", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            answer: createAnswerPayload(),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            answer: createAnswerPayload({
              archivedPageId: "page_synthesis_1",
              archivedPage: {
                id: "page_synthesis_1",
                title: "Local-first software synthesis",
                slug: "local-first-software-synthesis",
                path: "wiki/syntheses/local-first-software-synthesis.md",
                type: "synthesis",
                href: "/wiki?pageId=page_synthesis_1",
              },
            }),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      );

    render(<AskWorkbench defaultWorkspaceRoot="/tmp/research-demo" />);

    fireEvent.change(
      screen.getByPlaceholderText(
        "Ask a synthesis question grounded in the compiled wiki...",
      ),
      {
        target: {
          value: "What is local-first software?",
        },
      },
    );

    fireEvent.click(screen.getByRole("button", { name: "Ask" }));

    expect(
      await screen.findByText(
        "Local-first software keeps important user data visible and under direct control.",
      ),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Archive as synthesis" }));

    expect(
      await screen.findByText("This answer artifact has already been archived into the wiki."),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Answer archived into wiki/syntheses/local-first-software-synthesis.md successfully.",
      ),
    ).toBeTruthy();
    expect(screen.getByText("Local-first software synthesis")).toBeTruthy();
  });
});
