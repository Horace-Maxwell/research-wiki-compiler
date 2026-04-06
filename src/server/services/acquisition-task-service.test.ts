import { describe, expect, it } from "vitest";

import {
  getAcquisitionTaskOverview,
  getTopicAcquisitionTaskSummary,
} from "@/server/services/acquisition-task-service";

describe("acquisition task service", () => {
  it("aggregates acquisition tasks into actionable collection lanes", async () => {
    const overview = await getAcquisitionTaskOverview();

    expect(overview.summary.totalTasks).toBeGreaterThan(0);
    expect(overview.summary.readyForSession).toBeGreaterThan(0);
    expect(overview.summary.highPriority).toBeGreaterThan(0);
    expect(overview.focusTask).toBeTruthy();
    expect(
      overview.buckets.find((bucket) => bucket.id === "next-acquisition")?.tasks.length,
    ).toBeGreaterThan(0);
  });

  it("supports focusing the acquisition lane down to a single topic and task", async () => {
    const overview = await getAcquisitionTaskOverview({
      focusTopicId: "openclaw",
      focusTaskId: "openclaw-upgrade-trigger-comparison-pass",
    });

    expect(overview.focusedTopic?.id).toBe("openclaw");
    expect(overview.focusedTask?.taskId).toBe("openclaw-upgrade-trigger-comparison-pass");
    expect(overview.focusTask?.topicId).toBe("openclaw");
    expect(overview.focusTask?.readyForSession).toBe(true);
    expect(overview.focusTask?.taskType).toBe("comparison-pass");
  });

  it("returns topic-level acquisition summaries for rendered topic homes", async () => {
    const localFirst = await getTopicAcquisitionTaskSummary("local-first-software");

    expect(localFirst).toBeTruthy();
    expect(localFirst?.topicId).toBe("local-first-software");
    expect(localFirst?.tasks.every((task) => task.topicId === "local-first-software")).toBe(true);
    expect(
      (localFirst?.readyForSessionCount ?? 0) + (localFirst?.maturityBlockerCount ?? 0),
    ).toBeGreaterThan(0);
  });
});
