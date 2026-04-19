import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const staleWorkspaceRoot = "/Volumes/disconnected-workspace";
const defaultWorkspaceRoot =
  "/Users/horace/Desktop/Researcher Wiki Compiler/demo-workspace";
function resetDefaultDemoWorkspace() {
  execFileSync(npmCommand, ["run", "demo:reset"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });
}

async function waitForSettled(page: Page) {
  await page.waitForLoadState("domcontentloaded");

  try {
    await page.waitForLoadState("networkidle", { timeout: 5_000 });
  } catch {
    // Ignore background work that keeps the page from reaching a fully idle state.
  }
}

test.beforeAll(() => {
  resetDefaultDemoWorkspace();
});

test("settings and wiki recover from stalled stale-workspace requests instead of hanging forever", async ({
  page,
}) => {
  test.slow();

  const downloads: string[] = [];
  const consoleErrors: string[] = [];

  page.on("download", (download) => {
    downloads.push(download.suggestedFilename());
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.addInitScript(({ stalledWorkspaceRoot }) => {
    const originalFetch = window.fetch.bind(window);

    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : input.toString();
      const stallMode = window.localStorage.getItem("research-wiki.test-stall-mode");
      const targetsStaleWorkspace = url.includes(encodeURIComponent(stalledWorkspaceRoot));
      const isSettingsRequest =
        stallMode === "settings" && url.includes("/api/settings?");
      const isWikiRequest =
        stallMode === "wiki" &&
        (/\/api\/wiki\/pages\?workspaceRoot=.*disconnected-workspace/.test(url) ||
          /\/api\/wiki\/pages\/.+\?workspaceRoot=.*disconnected-workspace/.test(url));

      if (!targetsStaleWorkspace || (!isSettingsRequest && !isWikiRequest)) {
        return originalFetch(input, init);
      }

      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            reject(new DOMException("The operation was aborted.", "AbortError"));
          },
          { once: true },
        );
      });
    };
  }, { stalledWorkspaceRoot: staleWorkspaceRoot });

  await page.goto("/dashboard");
  await waitForSettled(page);

  await page.evaluate((workspaceRoot) => {
    window.localStorage.setItem("research-wiki.active-workspace-root", workspaceRoot);
    window.localStorage.setItem("research-wiki.test-stall-mode", "settings");
  }, staleWorkspaceRoot);

  await page.goto("/settings");
  await expect(page.getByText("Loading settings...")).toBeVisible();
  await expect(page.getByText("Active provider")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Loading settings...")).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("research-wiki.active-workspace-root"),
      ),
    )
    .toBe(defaultWorkspaceRoot);

  await page.evaluate((workspaceRoot) => {
    window.localStorage.setItem("research-wiki.active-workspace-root", workspaceRoot);
    window.localStorage.setItem("research-wiki.test-stall-mode", "wiki");
  }, staleWorkspaceRoot);

  await page.goto("/wiki");
  await expect(page.getByText("Loading wiki pages...")).toBeVisible();
  await expect(page.getByText("Loading page...")).toBeVisible();
  await expect(page.getByText("Loading wiki pages...")).toBeHidden({ timeout: 15_000 });
  await expect(page.getByText("Loading page...")).toBeHidden({ timeout: 15_000 });
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.localStorage.getItem("research-wiki.active-workspace-root"),
      ),
    )
    .toBe(defaultWorkspaceRoot);
  await expect
    .poll(() => page.url())
    .toMatch(/\/wiki\?pageId=/);

  await page.evaluate(() => {
    window.localStorage.removeItem("research-wiki.test-stall-mode");
  });

  expect(downloads).toEqual([]);
  expect(consoleErrors.filter((message) => message.includes("same key"))).toEqual([]);
});
