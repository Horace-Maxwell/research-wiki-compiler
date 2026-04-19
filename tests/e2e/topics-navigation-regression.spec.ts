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
    // Ignore background polling that prevents full idleness.
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

async function expectTopicsVisible(page: Page, locale: "en" | "zh") {
  await expect(page).toHaveURL(/\/topics$/);
  await expectSafeAnchors(page);

  if (locale === "zh") {
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByRole("heading", { name: "选择一个主题" })).toBeVisible();
    await expect(page.locator('main a[href="/topics/openclaw"]').first()).toHaveText("打开案例");
    await expect(page.locator('main a[href="/examples/openclaw"]').first()).toHaveText("导览");
    await expect(page.locator('main a[href="/topics/local-first-software"]').last()).toHaveText("打开");
    return;
  }

  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { name: "Choose a topic" })).toBeVisible();
  await expect(page.locator('main a[href="/topics/openclaw"]').first()).toHaveText("Open showcase");
  await expect(page.locator('main a[href="/examples/openclaw"]').first()).toHaveText("Walkthrough");
  await expect(page.locator('main a[href="/topics/local-first-software"]').last()).toHaveText("Open");
}

async function clickAndAssertUrl(
  page: Page,
  selector: string,
  url: string | RegExp,
  index = 0,
) {
  const target = page.locator(selector).nth(index);
  await expect(target).toBeVisible();

  await Promise.all([
    page.waitForURL(url),
    target.click(),
  ]);

  await waitForSettled(page);
  await expectSafeAnchors(page);
}

test.beforeAll(() => {
  resetDefaultDemoWorkspace();
});

test("topics CTAs stay route-native through delayed clicks, repeat clicks, locale switches, reloads, and route returns", async ({
  page,
}) => {
  test.slow();

  const downloads: string[] = [];
  page.on("download", (download) => {
    downloads.push(download.suggestedFilename());
  });

  await page.goto("/topics");
  await waitForSettled(page);
  await expectTopicsVisible(page, "en");

  await clickAndAssertUrl(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await page.goBack();
  await waitForSettled(page);
  await expectTopicsVisible(page, "en");

  await clickAndAssertUrl(page, 'main a[href="/examples/openclaw"]', /\/examples\/openclaw(?:\?pageId=.*)?$/);
  await page.goBack();
  await waitForSettled(page);
  await expectTopicsVisible(page, "en");

  await clickAndAssertUrl(
    page,
    'main a[href="/topics/local-first-software"]',
    /\/topics\/local-first-software(?:\?pageId=.*)?$/,
    1,
  );
  await page.goBack();
  await waitForSettled(page);
  await expectTopicsVisible(page, "en");

  await page.waitForTimeout(2_500);
  await clickAndAssertUrl(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await page.goBack();
  await waitForSettled(page);
  await expectTopicsVisible(page, "en");

  await clickAndAssertUrl(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await page.goBack();
  await waitForSettled(page);
  await clickAndAssertUrl(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await page.goBack();
  await waitForSettled(page);
  await expectTopicsVisible(page, "en");

  await page.reload();
  await waitForSettled(page);
  await expectTopicsVisible(page, "en");

  await page.locator("header").getByRole("button", { name: "中文" }).click();
  await waitForSettled(page);
  await expectTopicsVisible(page, "zh");

  await clickAndAssertUrl(page, 'main a[href="/topics/openclaw"]', /\/topics\/openclaw(?:\?pageId=.*)?$/);
  await page.goBack();
  await waitForSettled(page);
  await expectTopicsVisible(page, "zh");

  await clickAndAssertUrl(page, 'main a[href="/examples/openclaw"]', /\/examples\/openclaw(?:\?pageId=.*)?$/);
  await page.goBack();
  await waitForSettled(page);
  await expectTopicsVisible(page, "zh");

  await clickAndAssertUrl(page, 'aside a[href="/settings"]', /\/settings$/);
  await clickAndAssertUrl(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "zh");

  await clickAndAssertUrl(page, 'aside a[href="/dashboard"]', /\/dashboard$/);
  await clickAndAssertUrl(page, 'aside a[href="/topics"]', /\/topics$/);
  await expectTopicsVisible(page, "zh");

  await clickAndAssertUrl(
    page,
    'main a[href="/topics/local-first-software"]',
    /\/topics\/local-first-software(?:\?pageId=.*)?$/,
    1,
  );

  expect(downloads).toEqual([]);
});
