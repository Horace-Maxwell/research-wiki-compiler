import { execFileSync } from "node:child_process";

import { expect, test, type BrowserContext, type Page } from "@playwright/test";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

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

async function expectSafeAnchors(page: Page) {
  const unsafeCounts = await page.locator("a[href]").evaluateAll((anchors) => ({
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

  expect(unsafeCounts.pagePathCount).toBe(0);
  expect(unsafeCounts.workspaceRootCount).toBe(0);
  expect(unsafeCounts.htmlHrefCount).toBe(0);
  expect(unsafeCounts.markdownHrefCount).toBe(0);
}

async function expectNoVisibleLoading(page: Page) {
  const loadingLabels = [
    "Loading settings...",
    "Loading wiki pages...",
    "Loading page...",
    "Loading dashboard...",
    "Loading topics...",
    "正在加载设置…",
    "正在加载知识库页面…",
    "正在加载页面…",
    "正在加载仪表盘…",
    "正在加载主题…",
  ];

  for (const label of loadingLabels) {
    const locator = page.getByText(label, { exact: true });

    if ((await locator.count()) === 0) {
      continue;
    }

    await expect(locator.first()).toBeHidden();
  }
}

async function expectHealthyPage(page: Page) {
  await waitForSettled(page);
  await expectSafeAnchors(page);
  await expectNoVisibleLoading(page);
}

async function clickAndWaitForUrl(
  page: Page,
  selector: string,
  url: string | RegExp,
  options: { index?: number; delayMs?: number } = {},
) {
  if (options.delayMs) {
    await page.waitForTimeout(options.delayMs);
  }

  const target = page.locator(selector).nth(options.index ?? 0);

  await expect(target).toBeVisible();
  await Promise.all([
    page.waitForURL(url),
    target.click(),
  ]);
  await expectHealthyPage(page);
}

function attachRuntimeWatchers(
  page: Page,
  buckets: {
    downloads: string[];
    consoleErrors: string[];
    pageErrors: string[];
    failedResponses: string[];
  },
) {
  page.on("download", (download) => {
    buckets.downloads.push(download.suggestedFilename());
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      buckets.consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    buckets.pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      buckets.failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
}

async function expectLocale(page: Page, locale: "en" | "zh") {
  const htmlLang = locale === "zh" ? "zh-CN" : "en";

  await expect.poll(async () => page.locator("html").getAttribute("lang")).toBe(htmlLang);
}

async function switchLocale(page: Page, locale: "en" | "zh") {
  const buttonName = locale === "zh" ? "中文" : "English";
  await page.locator("main").getByRole("button", { name: buttonName }).click();
  await expectLocale(page, locale);
}

async function runOpenClawMainPath(page: Page) {
  await clickAndWaitForUrl(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await clickAndWaitForUrl(page, 'main a[href="/questions?topic=openclaw"]', /\/questions\?topic=openclaw$/);
  await clickAndWaitForUrl(page, 'main a[href="/sessions?topic=openclaw"]', /\/sessions\?topic=openclaw$/);
  await clickAndWaitForUrl(page, 'main a[href="/syntheses?topic=openclaw"]', /\/syntheses\?topic=openclaw$/);
}

async function runReentryCheck(
  context: BrowserContext,
  locale: "en" | "zh",
  buckets: {
    downloads: string[];
    consoleErrors: string[];
    pageErrors: string[];
    failedResponses: string[];
  },
) {
  const page = await context.newPage();
  attachRuntimeWatchers(page, buckets);

  try {
    await page.goto("/dashboard");
    await expectHealthyPage(page);
    await expectLocale(page, locale);
    await clickAndWaitForUrl(page, 'main a[href="/topics"]', /\/topics$/);
    await clickAndWaitForUrl(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
    await clickAndWaitForUrl(page, 'aside a[href="/settings"]', /\/settings$/);
    await expectLocale(page, locale);
  } finally {
    await page.close();
  }
}

test.beforeAll(() => {
  resetDefaultDemoWorkspace();
});

test("main routes stay stable through repeated use, locale persistence, and re-entry", async ({
  context,
  page,
}) => {
  test.slow();

  const buckets = {
    downloads: [] as string[],
    consoleErrors: [] as string[],
    pageErrors: [] as string[],
    failedResponses: [] as string[],
  };

  attachRuntimeWatchers(page, buckets);

  await page.goto("/dashboard");
  await expectHealthyPage(page);
  await expectLocale(page, "en");

  await clickAndWaitForUrl(page, 'main a[href="/topics"]', /\/topics$/);
  await clickAndWaitForUrl(
    page,
    'main a[href="/topics/openclaw"]',
    /\/topics\/openclaw(?:\?pageId=.*)?$/,
    { delayMs: 2_200 },
  );

  await clickAndWaitForUrl(
    page,
    'article a[href^="/topics/openclaw?pageId="]',
    /\/topics\/openclaw\?pageId=/,
    { delayMs: 1_400 },
  );
  await page.goBack();
  await expectHealthyPage(page);

  await clickAndWaitForUrl(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await page.goBack();
  await expectHealthyPage(page);

  await clickAndWaitForUrl(
    page,
    'main a[href="/topics/openclaw"]',
    /\/topics\/openclaw(?:\?pageId=.*)?$/,
    { delayMs: 1_500 },
  );

  await clickAndWaitForUrl(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await page.waitForTimeout(4_000);
  await clickAndWaitForUrl(page, 'main a[href="/topics"]', /\/topics$/);

  await runOpenClawMainPath(page);

  await page.goto("/examples/openclaw");
  await expectHealthyPage(page);
  await clickAndWaitForUrl(
    page,
    'article a[href^="/examples/openclaw?pageId="]',
    /\/examples\/openclaw\?pageId=/,
    { index: 1, delayMs: 1_800 },
  );
  await page.reload();
  await expectHealthyPage(page);

  await page.goto("/settings");
  await expectHealthyPage(page);
  await switchLocale(page, "zh");
  await page.reload();
  await expectHealthyPage(page);
  await expectLocale(page, "zh");
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("research-wiki.ui-locale")),
    )
    .toBe("zh");

  await page.goto("/topics");
  await expectHealthyPage(page);
  await expectLocale(page, "zh");
  await runOpenClawMainPath(page);

  await page.goto("/examples/openclaw");
  await expectHealthyPage(page);
  await clickAndWaitForUrl(
    page,
    'article a[href^="/examples/openclaw?pageId="]',
    /\/examples\/openclaw\?pageId=/,
    { index: 1, delayMs: 1_500 },
  );

  await runReentryCheck(context, "zh", buckets);

  await page.goto("/settings");
  await expectHealthyPage(page);
  await switchLocale(page, "en");
  await page.reload();
  await expectHealthyPage(page);
  await expectLocale(page, "en");
  await expect
    .poll(() =>
      page.evaluate(() => window.localStorage.getItem("research-wiki.ui-locale")),
    )
    .toBe("en");

  await runReentryCheck(context, "en", buckets);

  expect(buckets.downloads).toEqual([]);
  expect(buckets.consoleErrors).toEqual([]);
  expect(buckets.pageErrors).toEqual([]);
  expect(buckets.failedResponses).toEqual([]);
});
