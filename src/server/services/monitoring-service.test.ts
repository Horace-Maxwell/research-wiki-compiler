import { describe, expect, it } from "vitest";

import {
  getMonitoringOverview,
  getTopicMonitoringSummary,
} from "@/server/services/monitoring-service";

describe("monitoring service", () => {
  it("aggregates monitoring items into acquisition, review, and keep-watching lanes", async () => {
    const overview = await getMonitoringOverview();

    expect(overview.summary.totalItems).toBeGreaterThan(0);
    expect(overview.summary.periodicReview).toBeGreaterThan(0);
    expect(
      overview.summary.spawnedAcquisition + overview.summary.reviewNeeded,
    ).toBeGreaterThan(0);
    expect(overview.focusMonitor).toBeTruthy();
    expect(
      overview.buckets.find((bucket) => bucket.id === "spawn-acquisition")?.items.length,
    ).toBeGreaterThan(0);
  });

  it("supports focusing the monitoring lane down to a single topic and item", async () => {
    const overview = await getMonitoringOverview({
      focusTopicId: "openclaw",
      focusMonitorId: "openclaw-provider-restriction-monitor",
    });

    expect(overview.focusedTopic?.id).toBe("openclaw");
    expect(overview.focusedMonitor?.monitorId).toBe("openclaw-provider-restriction-monitor");
    expect(overview.focusMonitor?.topicId).toBe("openclaw");
    expect(overview.focusMonitor?.spawnsAcquisition).toBe(true);
    expect(overview.focusMonitor?.mode).toBe("event-triggered");
  });

  it("does not repeat the same monitor across multiple lower-frequency buckets", async () => {
    const overview = await getMonitoringOverview({
      focusTopicId: "openclaw",
    });

    const bucketItemIds = overview.buckets.flatMap((bucket) => bucket.items.map((item) => item.id));
    const uniqueBucketItemIds = new Set(bucketItemIds);

    expect(bucketItemIds.length).toBe(uniqueBucketItemIds.size);
    expect(bucketItemIds).toContain("openclaw-plugin-drift-stability-monitor");
  });

  it("returns topic-level monitoring summaries for rendered topic homes", async () => {
    const localFirst = await getTopicMonitoringSummary("local-first-software");

    expect(localFirst).toBeTruthy();
    expect(localFirst?.topicId).toBe("local-first-software");
    expect(localFirst?.items.every((item) => item.topicId === "local-first-software")).toBe(true);
    expect(
      (localFirst?.spawnedAcquisitionCount ?? 0) + (localFirst?.periodicReviewCount ?? 0),
    ).toBeGreaterThan(0);
  });
});
