import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
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

type Locale = "en" | "zh";
type RuntimeBuckets = {
  downloads: string[];
  consoleErrors: string[];
  pageErrors: string[];
  failedResponses: string[];
};

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
  for (const label of loadingLabels) {
    const locator = page.getByText(label, { exact: true });

    if ((await locator.count()) === 0) {
      continue;
    }

    await expect(locator.first()).toBeHidden();
  }
}

async function expectLocale(page: Page, locale: Locale) {
  await expect(page.locator("html")).toHaveAttribute("lang", locale === "zh" ? "zh-CN" : "en");
}

async function expectHealthyPage(page: Page, locale: Locale) {
  await waitForSettled(page);
  await expect(page.getByRole("main").first()).toBeVisible();
  await expectLocale(page, locale);
  await expectNoVisibleLoading(page);
  await expectSafeAnchors(page);
}

function attachRuntimeWatchers(page: Page, buckets: RuntimeBuckets) {
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

async function switchShellLocale(page: Page, locale: Locale) {
  const label = locale === "zh" ? "中文" : "English";
  await page.locator("header").getByRole("button", { name: label }).first().click();
  await expectLocale(page, locale);
}

async function switchSettingsLocale(page: Page, locale: Locale) {
  const label = locale === "zh" ? "中文" : "English";
  await page.locator("main").getByRole("button", { name: label }).first().click();
  await expectLocale(page, locale);
}

async function clickAndWait(page: Page, selector: string, url: string | RegExp, index = 0) {
  const target = page.locator(selector).nth(index);
  await expect(target).toBeVisible();
  await Promise.all([
    page.waitForURL(url),
    target.click(),
  ]);
}

async function directOpen(page: Page, route: string, locale: Locale) {
  await page.goto(route);
  await expectHealthyPage(page, locale);
}

async function expectDashboardVisible(page: Page, locale: Locale) {
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectHealthyPage(page, locale);
  await expect(page.getByRole("heading", { name: /Research Wiki Demo/ })).toBeVisible();
  await expect(page.locator('main a[href="/topics"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/wiki"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/settings"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/topics/openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href^="/wiki?pageId="]').first()).toBeVisible();
}

async function expectTopicsVisible(page: Page, locale: Locale) {
  await expect(page).toHaveURL(/\/topics$/);
  await expectHealthyPage(page, locale);
  await expect(page.locator('main a[href="/topics/openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/examples/openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/topics/local-first-software"]').last()).toBeVisible();
}

async function expectTopicHomeVisible(page: Page, locale: Locale, slug: "openclaw" | "local-first-software") {
  await expect(page).toHaveURL(new RegExp(`/topics/${slug}(?:\\?pageId=.*)?$`));
  await expectHealthyPage(page, locale);
  await expect(page.locator(`main a[href="/questions?topic=${slug}"]`).first()).toBeVisible();
  await expect(page.locator(`main a[href="/sessions?topic=${slug}"]`).first()).toBeVisible();
  await expect(page.locator(`main a[href="/syntheses?topic=${slug}"]`).first()).toBeVisible();
  await expect(page.locator(`main a[href^="/topics/${slug}?pageId="]`).first()).toBeVisible();
}

async function expectQuestionsVisible(page: Page, locale: Locale) {
  await expect(page).toHaveURL(/\/questions\?topic=openclaw(?:&.+)?$/);
  await expectHealthyPage(page, locale);
  await expect(page.locator('main a[href="/topics/openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/sessions?topic=openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/syntheses?topic=openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href*="/sessions?topic=openclaw&question="]').first()).toBeVisible();
}

async function expectSessionsVisible(page: Page, locale: Locale) {
  await expect(page).toHaveURL(/\/sessions\?topic=openclaw(?:&.+)?$/);
  await expectHealthyPage(page, locale);
  await expect(page.locator('main a[href="/topics/openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/questions?topic=openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/syntheses?topic=openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href*="/syntheses?topic=openclaw&title="]').first()).toBeVisible();
}

async function expectSynthesesVisible(page: Page, locale: Locale) {
  await expect(page).toHaveURL(/\/syntheses\?topic=openclaw(?:&.+)?$/);
  await expectHealthyPage(page, locale);
  await expect(page.locator('main a[href="/topics/openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/questions?topic=openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/sessions?topic=openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href*="/syntheses?topic=openclaw&synthesis="]').first()).toBeVisible();
}

async function expectShowcaseVisible(page: Page, locale: Locale) {
  await expect(page).toHaveURL(/\/examples\/openclaw(?:\?pageId=.*)?$/);
  await expectHealthyPage(page, locale);
  await expect(page.locator('main a[href="/topics/openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/questions?topic=openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/sessions?topic=openclaw"]').first()).toBeVisible();
  await expect(page.locator('main a[href^="/examples/openclaw?pageId="]').first()).toBeVisible();
}

async function expectSettingsVisible(page: Page, locale: Locale) {
  await expect(page).toHaveURL(/\/settings$/);
  await expectHealthyPage(page, locale);

  if (locale === "zh") {
    await expect(page.getByText("界面语言")).toBeVisible();
    await expect(page.getByText("工作区应用与模型设置")).toBeVisible();
    return;
  }

  await expect(page.getByText("Interface language")).toBeVisible();
  await expect(page.getByText("Workspace apply and provider settings")).toBeVisible();
}

test.beforeAll(() => {
  resetDefaultDemoWorkspace();
});

test("important pages and button families stay healthy through exhaustive repeated bilingual use", async ({
  context,
  page,
}) => {
  test.slow();

  const buckets: RuntimeBuckets = {
    downloads: [],
    consoleErrors: [],
    pageErrors: [],
    failedResponses: [],
  };

  attachRuntimeWatchers(page, buckets);

  await directOpen(page, "/dashboard", "en");
  await expectDashboardVisible(page, "en");

  await clickAndWait(page, 'main a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "en");
  await clickAndWait(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await expectDashboardVisible(page, "en");

  await page.waitForTimeout(1_500);
  await clickAndWait(page, 'main a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "en");
  await clickAndWait(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await expectDashboardVisible(page, "en");

  await clickAndWait(page, 'main a[href="/wiki"]', /\/wiki$/);
  await expectHealthyPage(page, "en");
  await clickAndWait(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await expectDashboardVisible(page, "en");

  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "en", "openclaw");
  await clickAndWait(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await expectDashboardVisible(page, "en");

  await clickAndWait(page, 'main a[href="/settings"]', /\/settings$/);
  await expectSettingsVisible(page, "en");
  await clickAndWait(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await expectDashboardVisible(page, "en");

  await clickAndWait(page, 'main a[href^="/wiki?pageId="]', /\/wiki\?pageId=/, 0);
  await expectHealthyPage(page, "en");
  await clickAndWait(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await expectDashboardVisible(page, "en");

  await page.reload();
  await expectDashboardVisible(page, "en");
  await clickAndWait(page, 'main a[href^="/wiki?pageId="]', /\/wiki\?pageId=/, 1);
  await expectHealthyPage(page, "en");
  await clickAndWait(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await expectDashboardVisible(page, "en");

  await directOpen(page, "/topics", "en");
  await expectTopicsVisible(page, "en");

  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "en", "openclaw");
  await clickAndWait(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "en");

  await clickAndWait(page, 'main a[href="/examples/openclaw"]', /\/examples\/openclaw(?:\?pageId=.*)?$/);
  await expectShowcaseVisible(page, "en");
  await clickAndWait(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "en");

  await clickAndWait(page, 'main a[href="/topics/local-first-software"]', /\/topics\/local-first-software(?:\?pageId=.*)?$/, 1);
  await expectTopicHomeVisible(page, "en", "local-first-software");
  await clickAndWait(page, 'main a[href^="/topics/local-first-software?pageId="]', /\/topics\/local-first-software\?pageId=/);
  await expectTopicHomeVisible(page, "en", "local-first-software");
  await page.goBack();
  await expectTopicHomeVisible(page, "en", "local-first-software");
  await clickAndWait(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "en");

  await clickAndWait(page, 'aside a[href="/settings"]', /\/settings$/);
  await expectSettingsVisible(page, "en");
  await clickAndWait(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "en");

  await switchShellLocale(page, "zh");
  await expectTopicsVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "zh", "openclaw");
  await clickAndWait(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "zh");

  await page.waitForTimeout(1_500);
  await clickAndWait(page, 'main a[href="/examples/openclaw"]', /\/examples\/openclaw(?:\?pageId=.*)?$/);
  await expectShowcaseVisible(page, "zh");
  await clickAndWait(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "zh");

  await directOpen(page, "/topics/openclaw", "zh");
  await expectTopicHomeVisible(page, "zh", "openclaw");

  await clickAndWait(page, 'main a[href="/questions?topic=openclaw"]', /\/questions\?topic=openclaw$/);
  await expectQuestionsVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "zh", "openclaw");

  await clickAndWait(page, 'main a[href="/sessions?topic=openclaw"]', /\/sessions\?topic=openclaw$/);
  await expectSessionsVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "zh", "openclaw");

  await clickAndWait(page, 'main a[href="/syntheses?topic=openclaw"]', /\/syntheses\?topic=openclaw$/);
  await expectSynthesesVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "zh", "openclaw");

  await page.waitForTimeout(1_500);
  await clickAndWait(page, 'main a[href^="/topics/openclaw?pageId="]', /\/topics\/openclaw\?pageId=/);
  await expectTopicHomeVisible(page, "zh", "openclaw");
  await page.goBack();
  await expectTopicHomeVisible(page, "zh", "openclaw");

  await clickAndWait(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await expectDashboardVisible(page, "zh");
  await clickAndWait(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "zh", "openclaw");

  await switchShellLocale(page, "en");
  await expectTopicHomeVisible(page, "en", "openclaw");
  await clickAndWait(page, 'main a[href="/questions?topic=openclaw"]', /\/questions\?topic=openclaw$/);
  await expectQuestionsVisible(page, "en");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "en", "openclaw");

  await directOpen(page, "/questions?topic=openclaw", "en");
  await expectQuestionsVisible(page, "en");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "en", "openclaw");

  await directOpen(page, "/questions?topic=openclaw", "en");
  await expectQuestionsVisible(page, "en");
  await clickAndWait(page, 'main a[href="/sessions?topic=openclaw"]', /\/sessions\?topic=openclaw$/);
  await expectSessionsVisible(page, "en");
  await clickAndWait(page, 'main a[href="/questions?topic=openclaw"]', /\/questions\?topic=openclaw$/);
  await expectQuestionsVisible(page, "en");

  await clickAndWait(page, 'main a[href*="/sessions?topic=openclaw&question="]', /\/sessions\?topic=openclaw&question=/);
  await expectSessionsVisible(page, "en");
  await clickAndWait(page, 'main a[href="/questions?topic=openclaw"]', /\/questions\?topic=openclaw$/);
  await expectQuestionsVisible(page, "en");

  await switchShellLocale(page, "zh");
  await expectQuestionsVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "zh", "openclaw");

  await directOpen(page, "/sessions?topic=openclaw", "zh");
  await expectSessionsVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "zh", "openclaw");

  await directOpen(page, "/sessions?topic=openclaw", "zh");
  await expectSessionsVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/syntheses?topic=openclaw"]', /\/syntheses\?topic=openclaw$/);
  await expectSynthesesVisible(page, "zh");
  await page.goBack();
  await expectSessionsVisible(page, "zh");

  await clickAndWait(page, 'main a[href*="/syntheses?topic=openclaw&title="]', /\/syntheses\?topic=openclaw&title=/);
  await expectSynthesesVisible(page, "zh");
  await page.goBack();
  await expectSessionsVisible(page, "zh");

  await switchShellLocale(page, "en");
  await expectSessionsVisible(page, "en");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "en", "openclaw");

  await directOpen(page, "/syntheses?topic=openclaw", "en");
  await expectSynthesesVisible(page, "en");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "en", "openclaw");

  await directOpen(page, "/syntheses?topic=openclaw", "en");
  await expectSynthesesVisible(page, "en");
  await clickAndWait(page, 'main a[href="/questions?topic=openclaw"]', /\/questions\?topic=openclaw$/);
  await expectQuestionsVisible(page, "en");
  await page.goBack();
  await expectSynthesesVisible(page, "en");

  await clickAndWait(page, 'main a[href*="/syntheses?topic=openclaw&synthesis="]', /\/syntheses\?topic=openclaw&synthesis=/);
  await expectSynthesesVisible(page, "en");
  await page.goBack();
  await expectSynthesesVisible(page, "en");

  await switchShellLocale(page, "zh");
  await expectSynthesesVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "zh", "openclaw");

  await directOpen(page, "/examples/openclaw", "zh");
  await expectShowcaseVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "zh", "openclaw");
  await page.goBack();
  await expectShowcaseVisible(page, "zh");

  await clickAndWait(page, 'main a[href^="/examples/openclaw?pageId="]', /\/examples\/openclaw\?pageId=/, 0);
  await expectShowcaseVisible(page, "zh");
  await directOpen(page, "/examples/openclaw", "zh");
  await expectShowcaseVisible(page, "zh");

  await page.waitForTimeout(1_500);
  await clickAndWait(page, 'main a[href^="/examples/openclaw?pageId="]', /\/examples\/openclaw\?pageId=/, 1);
  await expectShowcaseVisible(page, "zh");
  await directOpen(page, "/examples/openclaw", "zh");
  await expectShowcaseVisible(page, "zh");

  await clickAndWait(page, 'main a[href="/questions?topic=openclaw"]', /\/questions\?topic=openclaw$/);
  await expectQuestionsVisible(page, "zh");
  await directOpen(page, "/examples/openclaw", "zh");
  await expectShowcaseVisible(page, "zh");

  await switchShellLocale(page, "en");
  await expectShowcaseVisible(page, "en");
  await clickAndWait(page, 'main a[href="/sessions?topic=openclaw"]', /\/sessions\?topic=openclaw$/);
  await expectSessionsVisible(page, "en");

  await directOpen(page, "/settings", "en");
  await expectSettingsVisible(page, "en");
  await switchSettingsLocale(page, "zh");
  await expectSettingsVisible(page, "zh");
  await expect.poll(() =>
    page.evaluate(() => window.localStorage.getItem("research-wiki.ui-locale")),
  ).toBe("zh");

  await page.reload();
  await expectSettingsVisible(page, "zh");

  await clickAndWait(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await expectDashboardVisible(page, "zh");
  await clickAndWait(page, 'main a[href="/settings"]', /\/settings$/);
  await expectSettingsVisible(page, "zh");

  await switchSettingsLocale(page, "en");
  await expectSettingsVisible(page, "en");
  await expect.poll(() =>
    page.evaluate(() => window.localStorage.getItem("research-wiki.ui-locale")),
  ).toBe("en");

  await page.reload();
  await expectSettingsVisible(page, "en");
  await clickAndWait(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "en");
  await clickAndWait(page, 'aside a[href="/settings"]', /\/settings$/);
  await expectSettingsVisible(page, "en");

  const secondPage = await context.newPage();
  attachRuntimeWatchers(secondPage, buckets);
  await directOpen(secondPage, "/settings", "en");
  await expectSettingsVisible(secondPage, "en");
  await directOpen(secondPage, "/examples/openclaw", "en");
  await expectShowcaseVisible(secondPage, "en");
  await secondPage.close();

  await directOpen(page, "/topics", "en");
  await expectTopicsVisible(page, "en");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "en", "openclaw");
  await clickAndWait(page, 'main a[href="/questions?topic=openclaw"]', /\/questions\?topic=openclaw$/);
  await expectQuestionsVisible(page, "en");
  await clickAndWait(page, 'main a[href="/sessions?topic=openclaw"]', /\/sessions\?topic=openclaw$/);
  await expectSessionsVisible(page, "en");
  await clickAndWait(page, 'main a[href="/syntheses?topic=openclaw"]', /\/syntheses\?topic=openclaw$/);
  await expectSynthesesVisible(page, "en");
  await clickAndWait(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await expectTopicHomeVisible(page, "en", "openclaw");

  expect(buckets.downloads).toEqual([]);
  expect(buckets.consoleErrors.filter((message) => message.includes("same key"))).toEqual([]);
  expect(buckets.pageErrors).toEqual([]);
  expect(buckets.failedResponses).toEqual([]);
});
