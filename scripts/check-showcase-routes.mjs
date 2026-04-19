import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

import { chromium } from "@playwright/test";

// This script is the automated guard for the historical route regression where
// app links could degrade into pagePath- or .html-based navigation and trigger
// download-like behavior instead of clean in-app routing.

const EXTERNAL_BASE_URL = process.env.VERIFY_ROUTES_BASE_URL?.trim() || null;
const PORT = process.env.VERIFY_ROUTES_PORT?.trim() || "3126";
const BASE_URL = EXTERNAL_BASE_URL || `http://127.0.0.1:${PORT}`;
const OUTPUT_PATH = path.join(process.cwd(), "output", "playwright", "verify-routes.json");
const START_LOG_PATH = path.join(process.cwd(), "output", "playwright", "verify-routes-start.log");

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function ensureServerReady(baseUrl) {
  let lastError = null;

  for (let attempt = 0; attempt < 45; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/topics`, {
        redirect: "follow",
      });

      if (response.ok) {
        return;
      }

      lastError = new Error(`Server responded with ${response.status}.`);
    } catch (error) {
      lastError = error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw lastError ?? new Error("Timed out waiting for the production server.");
}

async function startServer() {
  const npmCommand = getNpmCommand();
  const logStream = await fs.open(START_LOG_PATH, "w");
  const child = spawn(npmCommand, ["run", "start", "--", "--hostname", "127.0.0.1", "--port", PORT], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", async (chunk) => {
    await logStream.appendFile(chunk);
  });
  child.stderr.on("data", async (chunk) => {
    await logStream.appendFile(chunk);
  });

  await ensureServerReady(BASE_URL);

  return {
    child,
    async close() {
      child.kill("SIGTERM");
      await new Promise((resolve) => {
        child.once("exit", () => resolve());
        setTimeout(() => {
          child.kill("SIGKILL");
          resolve();
        }, 5000);
      });
      await logStream.close();
    },
  };
}

async function waitForSettled(page) {
  await page.waitForLoadState("domcontentloaded");

  try {
    await page.waitForLoadState("networkidle", { timeout: 5000 });
  } catch {
    // Ignore background activity that never fully goes idle.
  }
}

async function collectUnsafeHrefStats(page) {
  return page.locator("a[href]").evaluateAll((anchors) => ({
    pagePathCount: anchors.filter((anchor) =>
      (anchor.getAttribute("href") || "").includes("pagePath="),
    ).length,
    workspaceRootCount: anchors.filter((anchor) =>
      (anchor.getAttribute("href") || "").includes("workspaceRoot="),
    ).length,
    htmlHrefCount: anchors.filter((anchor) =>
      /\.html(?:$|[?#])/.test(anchor.getAttribute("href") || ""),
    ).length,
    markdownHrefCount: anchors.filter((anchor) =>
      /\.md(?:$|[?#])/.test(anchor.getAttribute("href") || ""),
    ).length,
  }));
}

function hasUnsafeHrefStats(stats) {
  return (
    stats.pagePathCount > 0 ||
    stats.workspaceRootCount > 0 ||
    stats.htmlHrefCount > 0 ||
    stats.markdownHrefCount > 0
  );
}

async function recordCheck(page, checks, route, status, details = {}) {
  const unsafeHrefStats = await collectUnsafeHrefStats(page);

  checks.push({
    route,
    status,
    unsafeHrefStats,
    ...details,
  });
}

async function clickAndWaitForUrl(page, locator, expectedUrl, options = {}) {
  const target = page.locator(locator).nth(options.index ?? 0);

  await target.waitFor({ state: "visible", timeout: 8000 });
  await Promise.all([
    page.waitForURL(expectedUrl, { timeout: 8000 }),
    target.click(),
  ]);
  await waitForSettled(page);
}

async function main() {
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  const server = EXTERNAL_BASE_URL
    ? {
        async close() {
          // External server lifecycle is managed by the caller.
        },
      }
    : await startServer();

  await ensureServerReady(BASE_URL);

  try {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1024 },
      acceptDownloads: true,
    });
    const page = await context.newPage();
    const downloads = [];

    page.on("download", (download) => {
      downloads.push({
        url: download.url(),
        suggestedFilename: download.suggestedFilename(),
      });
    });

    const checks = [];

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);
    await recordCheck(page, checks, "/dashboard", "loaded");

    await clickAndWaitForUrl(page, 'main a[href="/settings"]', `${BASE_URL}/settings`);
    await page.waitForTimeout(1500);
    await recordCheck(page, checks, "/settings", "dashboard-settings-immediate");

    await clickAndWaitForUrl(page, 'aside a[href="/dashboard"]', `${BASE_URL}/dashboard`);
    await recordCheck(page, checks, "/dashboard", "settings-return");

    await clickAndWaitForUrl(page, 'main a[href="/topics"]', `${BASE_URL}/topics`);
    await recordCheck(page, checks, "/topics", "dashboard-topics");

    await page.waitForTimeout(2500);
    await clickAndWaitForUrl(page, 'main a[href="/topics/openclaw"]', `${BASE_URL}/topics/openclaw`);
    await recordCheck(page, checks, "/topics/openclaw", "topic-home-delayed");

    await page.waitForTimeout(2000);
    await clickAndWaitForUrl(
      page,
      'article a[href^="/topics/openclaw?pageId="]',
      /\/topics\/openclaw\?pageId=/,
    );
    await recordCheck(page, checks, "/topics/openclaw?pageId=*", "topic-article-immediate");

    await page.goBack();
    await waitForSettled(page);
    await recordCheck(page, checks, "/topics", "topic-return");

    await page.waitForTimeout(1500);
    await clickAndWaitForUrl(page, 'main a[href="/topics/openclaw"]', `${BASE_URL}/topics/openclaw`);
    await recordCheck(page, checks, "/topics/openclaw", "topic-home-second-entry");

    await page.waitForTimeout(1200);
    await clickAndWaitForUrl(
      page,
      'article a[href^="/topics/openclaw?pageId="]',
      /\/topics\/openclaw\?pageId=/,
    );
    await recordCheck(page, checks, "/topics/openclaw?pageId=*", "topic-article-second-click");

    await page.goto(`${BASE_URL}/topics/local-first-software`, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);
    await page.waitForTimeout(1800);
    await recordCheck(page, checks, "/topics/local-first-software", "loaded");

    await clickAndWaitForUrl(
      page,
      'article a[href^="/topics/local-first-software?pageId="]',
      /\/topics\/local-first-software\?pageId=/,
    );
    await recordCheck(page, checks, "/topics/local-first-software?pageId=*", "topic-article-delayed");

    await page.goto(`${BASE_URL}/questions?topic=openclaw`, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);
    await recordCheck(page, checks, "/questions?topic=openclaw", "loaded");

    await page.waitForTimeout(1600);
    await clickAndWaitForUrl(
      page,
      'main a[href="/sessions?topic=openclaw"]',
      `${BASE_URL}/sessions?topic=openclaw`,
    );
    await recordCheck(page, checks, "/sessions?topic=openclaw", "questions-to-sessions");

    await page.waitForTimeout(1500);
    await clickAndWaitForUrl(
      page,
      'main a[href="/syntheses?topic=openclaw"]',
      `${BASE_URL}/syntheses?topic=openclaw`,
    );
    await recordCheck(page, checks, "/syntheses?topic=openclaw", "sessions-to-syntheses");

    await page.goBack();
    await waitForSettled(page);
    await recordCheck(page, checks, "/sessions?topic=openclaw", "sessions-return");

    await page.waitForTimeout(1500);
    await clickAndWaitForUrl(
      page,
      'main a[href="/syntheses?topic=openclaw"]',
      `${BASE_URL}/syntheses?topic=openclaw`,
    );
    await recordCheck(page, checks, "/syntheses?topic=openclaw", "syntheses-second-click");

    await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);
    await recordCheck(page, checks, "/settings", "loaded-direct");

    await page.getByRole("button", { name: "中文" }).click();
    await page.waitForFunction(() => document.documentElement.lang === "zh-CN");
    await recordCheck(page, checks, "/settings", "locale-switch-zh");

    await clickAndWaitForUrl(page, 'aside a[href="/dashboard"]', `${BASE_URL}/dashboard`);
    await recordCheck(page, checks, "/dashboard", "post-locale-dashboard");

    await page.goto(`${BASE_URL}/examples/openclaw`, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);
    await page.waitForTimeout(2200);
    await recordCheck(page, checks, "/examples/openclaw", "loaded");

    await clickAndWaitForUrl(
      page,
      'article a[href^="/examples/openclaw?pageId="]',
      /\/examples\/openclaw\?pageId=/,
      { index: 1 },
    );
    await recordCheck(page, checks, "/examples/openclaw?pageId=*", "showcase-article-delayed");

    await page.reload({ waitUntil: "domcontentloaded" });
    await waitForSettled(page);
    await recordCheck(page, checks, "/examples/openclaw?pageId=*", "showcase-reload");

    await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);
    await page.getByRole("button", { name: "English" }).click();
    await page.waitForFunction(() => document.documentElement.lang === "en");
    await recordCheck(page, checks, "/settings", "locale-switch-en");

    await page.goto(`${BASE_URL}/examples/openclaw`, { waitUntil: "domcontentloaded" });
    await waitForSettled(page);
    await page.waitForTimeout(1800);
    await clickAndWaitForUrl(
      page,
      'article a[href^="/examples/openclaw?pageId="]',
      /\/examples\/openclaw\?pageId=/,
      { index: 1 },
    );
    await recordCheck(page, checks, "/examples/openclaw?pageId=*", "showcase-post-locale-article");

    const result = {
      generatedAt: new Date().toISOString(),
      baseUrl: BASE_URL,
      serverMode: EXTERNAL_BASE_URL ? "external" : "managed",
      checks,
      downloads,
      ok:
        downloads.length === 0 &&
        checks.every(
          (check) =>
            !hasUnsafeHrefStats(check.unsafeHrefStats),
        ),
    };

    await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    console.log(JSON.stringify(result, null, 2));

    await browser.close();

    if (!result.ok) {
      throw new Error("Route verification failed. See output/playwright/verify-routes.json.");
    }
  } finally {
    await server.close();
  }
}

main().catch((error) => {
  console.error("Showcase route verification failed.");
  console.error(error);
  process.exitCode = 1;
});
