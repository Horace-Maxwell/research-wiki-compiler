// @vitest-environment jsdom

import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import { AppLocaleProvider } from "@/components/app-locale-provider";
import {
  SettingsEditor,
  SettingsRequestTimeoutError,
} from "@/features/settings/components/settings-editor";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/lib/constants";

const replaceMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/settings",
  useSearchParams: () => currentSearchParams,
}));

function renderWithLocale(ui: ReactNode) {
  return render(<AppLocaleProvider initialLocale="en">{ui}</AppLocaleProvider>);
}

function createWorkspaceSettingsResponse(workspaceRoot: string) {
  return {
    settings: {
      version: "0.1.0",
      workspaceName: "Research Wiki Demo",
      workspaceRoot,
      initializeGit: true,
      llm: {
        provider: "openai",
        model: "gpt-5.1",
        openai: {
          apiKey: null,
          model: "gpt-5.1",
        },
        anthropic: {
          apiKey: null,
          model: null,
        },
      },
      review: {
        autoDraftLowRiskPatches: true,
        gitCommitOnApply: false,
      },
      createdAt: "2026-04-05T18:00:00.000Z",
      updatedAt: "2026-04-05T18:05:00.000Z",
    },
  };
}

describe("settings editor", () => {
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
    vi.restoreAllMocks();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it(
    "falls back to the default workspace when a stored workspace root leaves settings loading forever",
    async () => {
      const staleWorkspaceRoot = "/Volumes/disconnected-workspace";
      const defaultWorkspaceRoot = "/tmp/research-demo";

      window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, staleWorkspaceRoot);

      vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
        const url = String(input);

        if (url.includes(encodeURIComponent(staleWorkspaceRoot))) {
          return Promise.reject(
            new SettingsRequestTimeoutError("Settings request timed out."),
          );
        }

        if (url.includes(encodeURIComponent(defaultWorkspaceRoot))) {
          return Promise.resolve(
            new Response(
              JSON.stringify(createWorkspaceSettingsResponse(defaultWorkspaceRoot)),
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

      renderWithLocale(
        <SettingsEditor defaultWorkspaceRoot={defaultWorkspaceRoot} />,
      );

      expect(await screen.findByText("Active provider")).toBeTruthy();
      expect(window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)).toBe(
        defaultWorkspaceRoot,
      );
      expect(screen.queryByText("Loading settings...")).toBeNull();
      expect(replaceMock).not.toHaveBeenCalled();
    },
    15_000,
  );
});
