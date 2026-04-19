import { execFileSync } from "node:child_process";

import { expect, test, type Page } from "@playwright/test";

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
    // Ignore background polling that keeps the page from becoming fully idle.
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

function trackDownloads(page: Page) {
  const downloads: string[] = [];

  page.on("download", (download) => {
    downloads.push(download.suggestedFilename());
  });

  return downloads;
}

function expectNoDownloads(downloads: string[]) {
  expect(downloads).toEqual([]);
}

async function clickAndWaitForUrl(page: Page, options: {
  locator: string;
  url: string | RegExp;
  index?: number;
}) {
  const target = page.locator(options.locator).nth(options.index ?? 0);

  await expect(target).toBeVisible();
  await Promise.all([
    page.waitForURL(options.url),
    target.click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);
}

async function expectSettingsVisible(page: Page, locale: "en" | "zh") {
  if (locale === "zh") {
    await expect(page.getByText("界面语言")).toBeVisible();
    await expect(page.getByText("工作区应用与模型设置")).toBeVisible();
    await expect.poll(async () => page.locator("html").getAttribute("lang")).toBe("zh-CN");
  } else {
    await expect(page.getByText("Interface language")).toBeVisible();
    await expect(page.getByText("Workspace apply and provider settings")).toBeVisible();
    await expect.poll(async () => page.locator("html").getAttribute("lang")).toBe("en");
  }
}

test.beforeAll(() => {
  resetDefaultDemoWorkspace();
});

test("main-path navigation stays route-native after delayed clicks, reloads, and article hops", async ({
  page,
}) => {
  test.slow();

  const downloads: string[] = [];
  page.on("download", (download) => {
    downloads.push(download.suggestedFilename());
  });

  await page.goto("/dashboard");
  await waitForSettled(page);
  await page.waitForTimeout(400);
  await expect(page.locator('main a[href="/settings"]')).toBeVisible();
  await expect(page.getByRole("button", { name: "Workspace tools" })).toBeVisible();
  await expectSafeAnchors(page);

  await Promise.all([
    page.waitForURL("**/topics"),
    page.locator('main a[href="/topics"]').first().click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await page.waitForTimeout(2_500);
  await Promise.all([
    page.waitForURL("**/topics/openclaw"),
    page.locator('main a[href="/topics/openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await page.waitForTimeout(2_500);
  await page.reload();
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await Promise.all([
    page.waitForURL("**/questions?topic=openclaw"),
    page.locator('main a[href="/questions?topic=openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await page.waitForTimeout(1_800);
  await Promise.all([
    page.waitForURL("**/sessions?topic=openclaw"),
    page.locator('main a[href="/sessions?topic=openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await page.waitForTimeout(1_800);
  await Promise.all([
    page.waitForURL("**/syntheses?topic=openclaw"),
    page.locator('main a[href="/syntheses?topic=openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await page.goBack();
  await waitForSettled(page);
  await expect(page).toHaveURL(/\/sessions\?topic=openclaw$/);
  await expectSafeAnchors(page);

  await Promise.all([
    page.waitForURL("**/syntheses?topic=openclaw"),
    page.locator('main a[href="/syntheses?topic=openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await page.goto("/examples/openclaw");
  await waitForSettled(page);
  await page.waitForTimeout(2_500);
  await expectSafeAnchors(page);

  await Promise.all([
    page.waitForURL(/\/examples\/openclaw\?pageId=/),
    page.locator('main a[href^="/examples/openclaw?pageId="]').first().click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await page.waitForTimeout(2_000);
  await page.goto("/examples/openclaw");
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await Promise.all([
    page.waitForURL(/\/examples\/openclaw\?pageId=/),
    page.locator('main a[href^="/examples/openclaw?pageId="]').nth(1).click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);

  expect(downloads).toEqual([]);
});

test("delayed, repeated, and post-language-switch clicks never fall back to downloadable HTML", async ({
  page,
}) => {
  test.slow();

  const downloads = trackDownloads(page);

  await page.goto("/dashboard");
  await waitForSettled(page);
  await expectSafeAnchors(page);

  await clickAndWaitForUrl(page, {
    locator: 'main a[href="/topics"]',
    url: /\/topics$/,
  });

  await page.waitForTimeout(2_200);
  await clickAndWaitForUrl(page, {
    locator: 'main a[href="/topics/openclaw"]',
    url: /\/topics\/openclaw$/,
  });

  await page.waitForTimeout(2_200);
  await clickAndWaitForUrl(page, {
    locator: 'article a[href^="/topics/openclaw?pageId="]',
    url: /\/topics\/openclaw\?pageId=/,
  });

  await page.goBack();
  await waitForSettled(page);
  await expect(page).toHaveURL(/\/topics$/);
  await expectSafeAnchors(page);

  await page.waitForTimeout(1_500);
  await clickAndWaitForUrl(page, {
    locator: 'main a[href="/topics/openclaw"]',
    url: /\/topics\/openclaw$/,
  });

  await page.waitForTimeout(1_200);
  await clickAndWaitForUrl(page, {
    locator: 'article a[href^="/topics/openclaw?pageId="]',
    url: /\/topics\/openclaw\?pageId=/,
  });

  await page.goto("/topics/local-first-software");
  await waitForSettled(page);
  await page.waitForTimeout(1_800);
  await expectSafeAnchors(page);
  await clickAndWaitForUrl(page, {
    locator: 'article a[href^="/topics/local-first-software?pageId="]',
    url: /\/topics\/local-first-software\?pageId=/,
  });

  await page.goto("/questions?topic=openclaw");
  await waitForSettled(page);
  await expectSafeAnchors(page);
  await page.waitForTimeout(1_800);
  await clickAndWaitForUrl(page, {
    locator: 'main a[href="/sessions?topic=openclaw"]',
    url: /\/sessions\?topic=openclaw$/,
  });

  await page.waitForTimeout(1_500);
  await clickAndWaitForUrl(page, {
    locator: 'main a[href="/syntheses?topic=openclaw"]',
    url: /\/syntheses\?topic=openclaw$/,
  });

  await page.goBack();
  await waitForSettled(page);
  await expect(page).toHaveURL(/\/sessions\?topic=openclaw$/);
  await expectSafeAnchors(page);

  await page.waitForTimeout(1_500);
  await clickAndWaitForUrl(page, {
    locator: 'main a[href="/syntheses?topic=openclaw"]',
    url: /\/syntheses\?topic=openclaw$/,
  });

  await page.goto("/settings");
  await waitForSettled(page);
  await expectSafeAnchors(page);
  await page.locator("main").getByRole("button", { name: "中文" }).click();
  await expectSettingsVisible(page, "zh");
  await expectSafeAnchors(page);

  await clickAndWaitForUrl(page, {
    locator: 'aside a[href="/dashboard"]',
    url: /\/dashboard$/,
  });

  await page.goto("/examples/openclaw");
  await waitForSettled(page);
  await expectSafeAnchors(page);
  await page.waitForTimeout(2_200);
  await clickAndWaitForUrl(page, {
    locator: 'article a[href^="/examples/openclaw?pageId="]',
    url: /\/examples\/openclaw\?pageId=/,
    index: 1,
  });

  await page.reload();
  await waitForSettled(page);
  await expectSafeAnchors(page);
  await expect.poll(async () => page.locator("html").getAttribute("lang")).toBe("zh-CN");

  await page.goto("/settings");
  await waitForSettled(page);
  await expectSettingsVisible(page, "zh");
  await page.locator("main").getByRole("button", { name: "English" }).click();
  await expectSettingsVisible(page, "en");
  await expectSafeAnchors(page);

  await page.goto("/examples/openclaw");
  await waitForSettled(page);
  await expectSafeAnchors(page);
  await page.waitForTimeout(1_800);
  await clickAndWaitForUrl(page, {
    locator: 'article a[href^="/examples/openclaw?pageId="]',
    url: /\/examples\/openclaw\?pageId=/,
    index: 1,
  });

  await page.goto("/settings");
  await waitForSettled(page);
  await expectSettingsVisible(page, "en");
  await expectSafeAnchors(page);

  await expectNoDownloads(downloads);
});

test("settings routing, language switching, and persistence work in both English and Chinese", async ({
  page,
}) => {
  test.slow();

  const downloads: string[] = [];
  page.on("download", (download) => {
    downloads.push(download.suggestedFilename());
  });

  await page.goto("/dashboard");
  await waitForSettled(page);
  await Promise.all([
    page.waitForURL("**/settings"),
    page.locator('main a[href="/settings"]').first().click(),
  ]);
  await waitForSettled(page);
  await expect(page).toHaveURL(/\/settings$/);
  await expectSettingsVisible(page, "en");

  await page.locator('aside a[href="/settings"]').click();
  await waitForSettled(page);
  await expectSettingsVisible(page, "en");

  await page.goto("/dashboard");
  await waitForSettled(page);
  await page.waitForTimeout(2_500);
  await Promise.all([
    page.waitForURL("**/settings"),
    page.locator('main a[href="/settings"]').first().click(),
  ]);
  await waitForSettled(page);
  await expectSettingsVisible(page, "en");

  await page.goto("/settings");
  await waitForSettled(page);
  await expectSettingsVisible(page, "en");

  await page.locator("main").getByRole("button", { name: "中文" }).click();
  await expectSettingsVisible(page, "zh");

  await page.reload();
  await waitForSettled(page);
  await expectSettingsVisible(page, "zh");
  await expect.poll(async () =>
    page.evaluate(() => window.localStorage.getItem("research-wiki.ui-locale")),
  ).toBe("zh");

  await page.goto("/settings");
  await waitForSettled(page);
  await expectSettingsVisible(page, "zh");

  await page.goto("/topics");
  await waitForSettled(page);
  await Promise.all([
    page.waitForURL("**/settings"),
    page.locator('aside a[href="/settings"]').click(),
  ]);
  await waitForSettled(page);
  await expectSettingsVisible(page, "zh");

  await page.goto("/topics/openclaw");
  await waitForSettled(page);
  await page.waitForTimeout(1_500);
  await Promise.all([
    page.waitForURL("**/settings"),
    page.locator('aside a[href="/settings"]').click(),
  ]);
  await waitForSettled(page);
  await expectSettingsVisible(page, "zh");

  await page.locator('aside a[href="/settings"]').click();
  await waitForSettled(page);
  await expectSettingsVisible(page, "zh");

  await page.goto("/dashboard");
  await waitForSettled(page);
  await Promise.all([
    page.waitForURL("**/settings"),
    page.locator('main a[href="/settings"]').first().click(),
  ]);
  await waitForSettled(page);
  await expectSettingsVisible(page, "zh");

  await page.locator("main").getByRole("button", { name: "English" }).click();
  await expectSettingsVisible(page, "en");

  await page.reload();
  await waitForSettled(page);
  await expectSettingsVisible(page, "en");
  await expect.poll(async () =>
    page.evaluate(() => window.localStorage.getItem("research-wiki.ui-locale")),
  ).toBe("en");

  await page.goto("/topics/openclaw");
  await waitForSettled(page);
  await Promise.all([
    page.waitForURL("**/questions?topic=openclaw"),
    page.locator('main a[href="/questions?topic=openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await page.goBack();
  await waitForSettled(page);
  await Promise.all([
    page.waitForURL("**/settings"),
    page.locator('aside a[href="/settings"]').click(),
  ]);
  await waitForSettled(page);
  await expectSettingsVisible(page, "en");

  expect(downloads).toEqual([]);
});

test("the main showcase path stays usable in Chinese", async ({ page }) => {
  test.slow();

  const downloads: string[] = [];
  page.on("download", (download) => {
    downloads.push(download.suggestedFilename());
  });

  await page.goto("/settings");
  await waitForSettled(page);
  await page.locator("main").getByRole("button", { name: "中文" }).click();
  await expect.poll(async () => page.locator("html").getAttribute("lang")).toBe("zh-CN");

  await page.goto("/topics");
  await waitForSettled(page);
  await expect(page.getByText("选择一个主题")).toBeVisible();
  await expectSafeAnchors(page);

  await Promise.all([
    page.waitForURL("**/topics/openclaw"),
    page.locator('main a[href="/topics/openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await expect(page.locator("aside").getByRole("link", { name: "问题" }).first()).toBeVisible();
  await expectSafeAnchors(page);

  await Promise.all([
    page.waitForURL("**/questions?topic=openclaw"),
    page.locator('main a[href="/questions?topic=openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await expect(page.locator("aside").getByRole("link", { name: "轮次" }).first()).toBeVisible();
  await expectSafeAnchors(page);

  await Promise.all([
    page.waitForURL("**/sessions?topic=openclaw"),
    page.locator('main a[href="/sessions?topic=openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await expect(page.locator("aside").getByRole("link", { name: "综合" }).first()).toBeVisible();
  await expectSafeAnchors(page);

  await Promise.all([
    page.waitForURL("**/syntheses?topic=openclaw"),
    page.locator('main a[href="/syntheses?topic=openclaw"]').first().click(),
  ]);
  await waitForSettled(page);
  await expect(page.locator("aside").getByRole("link", { name: "综合" }).first()).toBeVisible();
  await expectSafeAnchors(page);

  await page.goto("/examples/openclaw");
  await waitForSettled(page);
  await expect(page.getByText("官方案例").first()).toBeVisible();
  await expect(page.getByText("从这里开始").first()).toBeVisible();
  await expectSafeAnchors(page);

  expect(downloads).toEqual([]);
});
