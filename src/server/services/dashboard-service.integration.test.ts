import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getDashboardOverview } from "@/server/services/dashboard-service";
import { resetAndSeedDemoWorkspace } from "@/server/services/demo-workspace-service";
import { listRecentActivityLogs } from "@/server/services/logs-service";

describe("dashboard and logs integration", () => {
  let workspaceRoot = "";

  beforeEach(async () => {
    workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "research-dashboard-demo-"));
    await fs.rm(workspaceRoot, { recursive: true, force: true });

    await resetAndSeedDemoWorkspace({
      workspaceRoot,
      datasetRoot: path.resolve(process.cwd(), "demo-data"),
    });
  });

  afterEach(async () => {
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("summarizes the seeded MVP workspace for the dashboard", async () => {
    const overview = await getDashboardOverview(workspaceRoot);

    expect(overview.initialized).toBe(true);
    expect(overview.workspaceName).toBe("Research Wiki Demo");
    expect(overview.gitInitialized).toBe(true);
    expect(overview.counts?.wikiPages.total).toBeGreaterThanOrEqual(6);
    expect(overview.counts?.sources.total).toBe(3);
    expect(overview.counts?.reviews.byStatus.pending).toBe(1);
    expect(overview.counts?.reviews.byStatus.approved).toBe(1);
    expect(overview.counts?.reviews.byStatus.rejected).toBe(1);
    expect(overview.counts?.answers.archived).toBe(1);
    expect(overview.counts?.audits.total).toBe(2);
    expect(overview.recentActivity.length).toBeGreaterThan(0);
    expect(overview.recentActivity.some((entry) => entry.kind === "review")).toBe(true);
    expect(overview.recentActivity.some((entry) => entry.kind === "answer")).toBe(true);
    expect(overview.recentActivity.some((entry) => entry.kind === "audit")).toBe(true);
  });

  it("returns lightweight recent activity logs with stable links and limits", async () => {
    const logs = await listRecentActivityLogs(workspaceRoot, 8);

    expect(logs).toHaveLength(8);
    expect(logs.some((entry) => entry.href?.startsWith("/reviews?"))).toBe(true);
    expect(logs.some((entry) => entry.href?.startsWith("/ask?"))).toBe(true);
    expect(logs.some((entry) => entry.href?.startsWith("/audits?"))).toBe(true);
  });
});
