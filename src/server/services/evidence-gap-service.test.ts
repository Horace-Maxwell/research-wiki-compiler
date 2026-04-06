import { describe, expect, it } from "vitest";

import {
  getEvidenceGapOverview,
  getTopicEvidenceGapSummary,
} from "@/server/services/evidence-gap-service";

describe("evidence gap service", () => {
  it("aggregates evidence gaps into acquisition-focused workflow lanes", async () => {
    const overview = await getEvidenceGapOverview();

    expect(overview.summary.totalGaps).toBeGreaterThan(0);
    expect(overview.summary.highPriority).toBeGreaterThan(0);
    expect(overview.summary.blockedQuestions).toBeGreaterThan(0);
    expect(overview.summary.maturityBlockers).toBeGreaterThan(0);
    expect(overview.focusGap).toBeTruthy();
    expect(
      overview.buckets.find((bucket) => bucket.id === "next-evidence")?.gaps.length,
    ).toBeGreaterThan(0);
  });

  it("supports focusing the gap lane down to a single topic and gap", async () => {
    const overview = await getEvidenceGapOverview({
      focusTopicId: "openclaw",
      focusGapId: "openclaw-upgrade-trigger-comparison-gap",
    });

    expect(overview.focusedTopic?.id).toBe("openclaw");
    expect(overview.focusedGap?.gapId).toBe("openclaw-upgrade-trigger-comparison-gap");
    expect(overview.focusGap?.topicId).toBe("openclaw");
    expect(overview.focusGap?.acquisitionReady).toBe(true);
    expect(overview.focusGap?.blocksSyntheses).toBe(true);
  });

  it("returns topic-level evidence-gap summaries for rendered topic homes", async () => {
    const localFirst = await getTopicEvidenceGapSummary("local-first-software");

    expect(localFirst).toBeTruthy();
    expect(localFirst?.topicId).toBe("local-first-software");
    expect(localFirst?.gaps.every((gap) => gap.topicId === "local-first-software")).toBe(true);
    expect((localFirst?.blockedQuestionCount ?? 0) + (localFirst?.maturityBlockerCount ?? 0)).toBeGreaterThan(0);
  });
});
