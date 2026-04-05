import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
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

function findReadyToArchiveAnswerId(workspaceRoot: string) {
  const dbPath = path.join(workspaceRoot, ".research-wiki", "app.db");
  const sqlite = new Database(dbPath, {
    readonly: true,
    fileMustExist: true,
  });

  try {
    const row = sqlite
      .prepare(
        "select id from answer_artifacts where archived_page_id is null order by updated_at desc limit 1",
      )
      .get() as { id: string } | undefined;

    if (!row) {
      throw new Error("Expected a seeded answer artifact that is still ready to archive.");
    }

    return row.id;
  } finally {
    sqlite.close();
  }
}

test("archives a seeded grounded answer into the wiki", async ({ page }) => {
  test.slow();

  const workspaceRoot = seedDemoWorkspace("ask-archive");
  const answerId = findReadyToArchiveAnswerId(workspaceRoot);

  try {
    await page.goto(workspaceUrl("/ask", workspaceRoot, { answerId }));

    await expect(
      page.getByText(
        "Grounded answers should return to the wiki as explicit synthesis pages or notes that preserve the question, citations, and page context.",
      ),
    ).toBeVisible();

    await page.getByRole("button", { name: "Archive as note" }).click();

    await expect(
      page.getByText("This answer artifact has already been archived into the wiki."),
    ).toBeVisible();
    const archivedLink = page.getByRole("link", {
      name: /Note: How does the compiled research wiki archive grounded answers/i,
    });
    await expect(archivedLink).toBeVisible();
    await archivedLink.click();

    await expect(
      page.getByText("How does the compiled research wiki archive grounded answers?"),
    ).toBeVisible();
    await expect(page.getByText("Archive kind: note")).toBeVisible();
  } finally {
    removeWorkspace(workspaceRoot);
  }
});
