import { execFileSync } from "node:child_process";

import { expect, test, type Locator, type Page } from "@playwright/test";

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
    // Ignore background activity that never goes fully idle.
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

async function expectDashboardVisible(page: Page, locale: "en" | "zh") {
  await expect(page).toHaveURL(/\/dashboard$/);
  await expectSafeAnchors(page);
  await expect(page.getByRole("heading", { name: /Research Wiki Demo/ })).toBeVisible();

  if (locale === "zh") {
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.locator('main a[href="/topics"]').first()).toBeVisible();
    await expect(page.locator('main a[href^="/wiki?pageId="]').first()).toBeVisible();
    await expect(page.locator('main a[href="/topics/openclaw"]').first()).toBeVisible();
    await expect(page.locator('main a[href="/settings"]').first()).toBeVisible();
  } else {
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator('main a[href="/topics"]').first()).toBeVisible();
    await expect(page.locator('main a[href^="/wiki?pageId="]').first()).toBeVisible();
    await expect(page.locator('main a[href="/topics/openclaw"]').first()).toBeVisible();
    await expect(page.locator('main a[href="/settings"]').first()).toBeVisible();
  }
}

async function clickAndAssertRoute(
  page: Page,
  target: Locator,
  url: string | RegExp,
) {
  await expect(target).toBeVisible();
  await Promise.all([
    page.waitForURL(url),
    target.click(),
  ]);
  await waitForSettled(page);
  await expectSafeAnchors(page);
}

async function returnToDashboard(page: Page) {
  if (/\/dashboard$/.test(page.url())) {
    await expectDashboardVisible(page, (await page.locator("html").getAttribute("lang")) === "zh-CN" ? "zh" : "en");
    return;
  }

  await clickAndAssertRoute(page, page.locator('aside a[href="/dashboard"]').first(), /\/dashboard$/);
  await expectDashboardVisible(page, (await page.locator("html").getAttribute("lang")) === "zh-CN" ? "zh" : "en");
}

test.beforeAll(() => {
  resetDefaultDemoWorkspace();
});

test("dashboard CTAs stay route-native through delayed clicks, reloads, locale changes, and route returns", async ({
  page,
}) => {
  test.slow();

  const downloads: string[] = [];
  page.on("download", (download) => {
    downloads.push(download.suggestedFilename());
  });

  await page.goto("/dashboard");
  await waitForSettled(page);
  await expectDashboardVisible(page, "en");

  await clickAndAssertRoute(page, page.locator('main a[href="/topics"]').first(), /\/topics$/);
  await returnToDashboard(page);

  await clickAndAssertRoute(
    page,
    page.locator('main a[href^="/wiki?pageId="]').first(),
    /\/wiki(?:\?pageId=.*)?$/,
  );
  await returnToDashboard(page);

  await clickAndAssertRoute(page, page.locator('main a[href="/topics/openclaw"]').first(), /\/topics\/openclaw$/);
  await returnToDashboard(page);

  await clickAndAssertRoute(page, page.locator('main a[href="/settings"]').first(), /\/settings$/);
  await returnToDashboard(page);

  await page.waitForTimeout(2_500);
  await clickAndAssertRoute(page, page.locator('main a[href="/topics"]').first(), /\/topics$/);
  await returnToDashboard(page);

  await page.waitForTimeout(1_800);
  await clickAndAssertRoute(page, page.locator('main a[href="/topics"]').first(), /\/topics$/);
  await returnToDashboard(page);

  await page.reload();
  await waitForSettled(page);
  await expectDashboardVisible(page, "en");
  await clickAndAssertRoute(page, page.locator('main a[href="/settings"]').first(), /\/settings$/);
  await returnToDashboard(page);

  await page.locator("header").getByRole("button", { name: "中文" }).click();
  await expectDashboardVisible(page, "zh");
  await clickAndAssertRoute(page, page.locator('main a[href="/settings"]').first(), /\/settings$/);
  await clickAndAssertRoute(page, page.locator('aside a[href="/dashboard"]').first(), /\/dashboard$/);
  await expectDashboardVisible(page, "zh");

  await clickAndAssertRoute(page, page.locator('main a[href^="/wiki?pageId="]').nth(1), /\/wiki\?pageId=/);
  await returnToDashboard(page);

  await clickAndAssertRoute(page, page.locator('main a[href="/wiki"]').first(), /\/wiki$/);
  await returnToDashboard(page);

  await clickAndAssertRoute(page, page.locator('main a[href="/topics/openclaw"]').first(), /\/topics\/openclaw$/);
  await clickAndAssertRoute(page, page.locator('aside a[href="/dashboard"]').first(), /\/dashboard$/);
  await expectDashboardVisible(page, "zh");
  await clickAndAssertRoute(page, page.locator('main a[href="/topics"]').first(), /\/topics$/);

  expect(downloads).toEqual([]);
});
