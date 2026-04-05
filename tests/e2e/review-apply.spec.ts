import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

function seedDemoWorkspace(label: string) {
  const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), `rwc-${label}-`));

  execFileSync(npmCommand, ["run", "demo:reset", "--", workspaceRoot], {
    cwd: process.cwd(),
    stdio: "pipe",
  });

  return workspaceRoot;
}

function removeWorkspace(workspaceRoot: string) {
  fs.rmSync(workspaceRoot, { recursive: true, force: true });
}

function workspaceUrl(
  routePath: string,
  workspaceRoot: string,
  query: Record<string, string> = {},
) {
  const params = new URLSearchParams({
    workspaceRoot,
    ...query,
  });

  return `${routePath}?${params.toString()}`;
}

test("approves the seeded pending proposal and shows the applied wiki mutation", async ({
  page,
}) => {
  test.slow();

  const workspaceRoot = seedDemoWorkspace("review-apply");

  try {
    await page.goto(workspaceUrl("/reviews", workspaceRoot, { status: "pending" }));

    await expect(
      page.getByRole("heading", {
        name: "Add counterpoints on aggressive automation to Compiled research wiki",
      }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Approve", exact: true }).click();

    await expect(page.getByText("Proposal approved and patch applied to the wiki.")).toBeVisible();

    await page.goto(workspaceUrl("/wiki", workspaceRoot));
    await page.locator("button").filter({ hasText: "Compiled research wiki" }).first().click();

    await expect(
      page.getByText(
        "Auto-applied research updates can create drift when they rewrite major sections without review.",
      ),
    ).toBeVisible();
  } finally {
    removeWorkspace(workspaceRoot);
  }
});
