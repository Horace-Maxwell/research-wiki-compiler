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

test("runs an orphan audit and displays its findings and report", async ({ page }) => {
  test.slow();

  const workspaceRoot = seedDemoWorkspace("audits");

  try {
    await page.goto(workspaceUrl("/audits", workspaceRoot));

    await page.getByRole("button", { name: "Run Orphan audit" }).click();

    await expect(page.getByText(/Orphan audit completed with \d+ finding/)).toBeVisible();
    await expect(page.getByText("Wiki page is structurally orphaned")).toBeVisible();
    await expect(page.getByText("wiki/notes/weekly-research-cadence-note.md")).toBeVisible();
    await expect(page.getByText("Human-readable report artifact")).toBeVisible();
  } finally {
    removeWorkspace(workspaceRoot);
  }
});
