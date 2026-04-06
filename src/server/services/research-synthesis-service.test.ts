import { describe, expect, it } from "vitest";

import {
  getResearchSynthesisOverview,
  getTopicResearchSynthesisSummary,
} from "@/server/services/research-synthesis-service";

describe("research synthesis service", () => {
  it("aggregates syntheses into publishable and maintenance-aware workflow lanes", async () => {
    const overview = await getResearchSynthesisOverview();

    expect(overview.summary.totalSyntheses).toBeGreaterThan(0);
    expect(overview.summary.ready).toBeGreaterThan(0);
    expect(overview.summary.published).toBeGreaterThan(0);
    expect(overview.summary.changedCanonical).toBeGreaterThan(0);
    expect(overview.focusSynthesis).toBeTruthy();
    expect(overview.buckets.find((bucket) => bucket.id === "ready")?.syntheses.length).toBeGreaterThan(0);
  });

  it("supports focusing a synthesis lane inside a single topic", async () => {
    const overview = await getResearchSynthesisOverview({
      focusTopicId: "openclaw",
      focusSynthesisId: "openclaw-upgrade-regression-triggers",
    });

    expect(overview.focusedTopic?.id).toBe("openclaw");
    expect(overview.focusedSynthesis?.synthesisId).toBe("openclaw-upgrade-regression-triggers");
    expect(overview.focusSynthesis?.topicId).toBe("openclaw");
    expect(overview.focusSynthesis?.title).toBe("OpenClaw upgrade regression triggers");
  });

  it("returns topic-level synthesis summaries for rendered topic homes", async () => {
    const localFirst = await getTopicResearchSynthesisSummary("local-first-software");

    expect(localFirst).toBeTruthy();
    expect(localFirst?.topicId).toBe("local-first-software");
    expect(localFirst?.syntheses.every((synthesis) => synthesis.topicId === "local-first-software")).toBe(
      true,
    );
    expect((localFirst?.readyCount ?? 0) + (localFirst?.publishedCount ?? 0)).toBeGreaterThan(0);
  });
});
