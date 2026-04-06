import { describe, expect, it } from "vitest";

import {
  getResearchSessionOverview,
  getTopicResearchSessionSummary,
} from "@/server/services/research-session-service";

describe("research session service", () => {
  it("aggregates seeded sessions into actionable workflow buckets", async () => {
    const overview = await getResearchSessionOverview();

    expect(overview.summary.totalSessions).toBeGreaterThan(0);
    expect(overview.summary.active).toBeGreaterThan(0);
    expect(overview.summary.completed).toBeGreaterThan(0);
    expect(overview.summary.readyForSynthesis).toBeGreaterThan(0);
    expect(overview.focusSession).toBeTruthy();
    expect(overview.buckets.find((bucket) => bucket.id === "queue")?.sessions.length).toBeGreaterThan(0);
  });

  it("supports filtering to a focused question inside a single topic", async () => {
    const overview = await getResearchSessionOverview({
      focusTopicId: "openclaw",
      focusQuestionId: "upgrade-regression-triggers",
    });

    expect(overview.focusedTopic?.id).toBe("openclaw");
    expect(overview.focusedQuestion?.questionId).toBe("upgrade-regression-triggers");
    expect(overview.focusSession?.questionId).toBe("upgrade-regression-triggers");
  });

  it("returns topic-level session summaries for rendered topic homes", async () => {
    const localFirst = await getTopicResearchSessionSummary("local-first-software");

    expect(localFirst).toBeTruthy();
    expect(localFirst?.topicId).toBe("local-first-software");
    expect(localFirst?.sessions.every((session) => session.topicId === "local-first-software")).toBe(
      true,
    );
    expect((localFirst?.activeCount ?? 0) + (localFirst?.queuedCount ?? 0)).toBeGreaterThan(0);
  });
});
