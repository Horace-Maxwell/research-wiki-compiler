import { describe, expect, it } from "vitest";

import { evaluateTopicQuality, renderTopicEvaluationMarkdown } from "@/server/services/topic-evaluation-service";

const STAGE_ORDER = ["starter", "developing", "maintained", "mature", "flagship"] as const;

describe("topic evaluation service", () => {
  it("distinguishes the flagship OpenClaw example from the starter dry-run topic", async () => {
    const openClaw = await evaluateTopicQuality({
      example: "openclaw",
      writeReport: false,
    });
    const localFirst = await evaluateTopicQuality({
      slug: "local-first-software",
      writeReport: false,
    });

    expect(openClaw.maturity.stage).toBe("flagship");
    expect(localFirst.maturity.stage).toBe("starter");
    expect(openClaw.overall.score).toBeGreaterThan(localFirst.overall.score);
    expect(
      STAGE_ORDER.indexOf(openClaw.maturity.stage),
    ).toBeGreaterThan(STAGE_ORDER.indexOf(localFirst.maturity.stage));
    expect(localFirst.recommendedNextSteps.some((step) => step.includes("summarize / review / audit"))).toBe(
      true,
    );
  });

  it("renders a readable markdown report", async () => {
    const report = await evaluateTopicQuality({
      slug: "local-first-software",
      writeReport: false,
    });

    const markdown = renderTopicEvaluationMarkdown(report);

    expect(markdown).toContain("# Topic Evaluation: Local-First Software");
    expect(markdown).toContain("## Dimension scorecard");
    expect(markdown).toContain("## Recommended next improvements");
    expect(markdown).toContain("Maturity stage: **starter**");
  });
});
