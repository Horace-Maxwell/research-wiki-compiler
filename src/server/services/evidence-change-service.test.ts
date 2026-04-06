import { describe, expect, it } from "vitest";

import {
  getEvidenceChangeOverview,
  getTopicEvidenceChangeSummary,
} from "@/server/services/evidence-change-service";

describe("evidence change service", () => {
  it("aggregates meaningful evidence shifts into reopen, review, and stabilization lanes", async () => {
    const overview = await getEvidenceChangeOverview();

    expect(overview.summary.totalChanges).toBeGreaterThan(0);
    expect(overview.summary.reviewNeeded).toBeGreaterThan(0);
    expect(overview.summary.reopened).toBeGreaterThan(0);
    expect(overview.summary.stabilized).toBeGreaterThan(0);
    expect(overview.focusChange).toBeTruthy();
    expect(overview.buckets.find((bucket) => bucket.id === "reopen")?.changes.length).toBeGreaterThan(0);
  });

  it("supports focusing the change lane down to a single topic and change", async () => {
    const overview = await getEvidenceChangeOverview({
      focusTopicId: "openclaw",
      focusChangeId: "openclaw-provider-signal-reopens-instability-framing",
    });

    expect(overview.focusedTopic?.id).toBe("openclaw");
    expect(overview.focusedChange?.changeId).toBe(
      "openclaw-provider-signal-reopens-instability-framing",
    );
    expect(overview.focusChange?.topicId).toBe("openclaw");
    expect(overview.focusChange?.reopensWork).toBe(true);
    expect(overview.focusChange?.needsCanonicalReview).toBe(true);
  });

  it("returns topic-level evidence summaries for rendered topic homes", async () => {
    const localFirst = await getTopicEvidenceChangeSummary("local-first-software");

    expect(localFirst).toBeTruthy();
    expect(localFirst?.topicId).toBe("local-first-software");
    expect(localFirst?.changes.every((change) => change.topicId === "local-first-software")).toBe(
      true,
    );
    expect((localFirst?.reviewNeededCount ?? 0) + (localFirst?.stabilizedCount ?? 0)).toBeGreaterThan(0);
  });
});
