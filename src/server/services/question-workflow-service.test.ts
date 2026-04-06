import { describe, expect, it } from "vitest";

import {
  getQuestionWorkflowOverview,
  getTopicQuestionWorkflow,
} from "@/server/services/question-workflow-service";

describe("question workflow service", () => {
  it("aggregates cross-topic research questions into actionable workflow lanes", async () => {
    const overview = await getQuestionWorkflowOverview();

    expect(overview.summary.totalQuestions).toBeGreaterThan(0);
    expect(overview.summary.readyForSynthesis).toBeGreaterThan(0);
    expect(overview.summary.needsSources).toBeGreaterThan(0);
    expect(overview.summary.watchForReopen).toBeGreaterThan(0);
    expect(overview.focusQueue.some((question) => question.topicId === "openclaw")).toBe(true);
    expect(
      overview.buckets.find((bucket) => bucket.id === "ready-for-synthesis")?.questions.length,
    ).toBeGreaterThan(0);
  });

  it("supports filtering the question queue down to a single topic workspace", async () => {
    const localFirst = await getTopicQuestionWorkflow("local-first-software");

    expect(localFirst).toBeTruthy();
    expect(localFirst?.topicId).toBe("local-first-software");
    expect(localFirst?.questions.every((question) => question.topicId === "local-first-software")).toBe(
      true,
    );
    expect(localFirst?.questionCount).toBeGreaterThan(0);
  });
});
