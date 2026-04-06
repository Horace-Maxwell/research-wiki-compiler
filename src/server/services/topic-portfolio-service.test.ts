import { describe, expect, it } from "vitest";

import { getTopicPortfolioOverview } from "@/server/services/topic-portfolio-service";

describe("topic portfolio service", () => {
  it("aggregates the flagship example and starter topics into a comparable portfolio", async () => {
    const portfolio = await getTopicPortfolioOverview();
    const openClaw = portfolio.topics.find((topic) => topic.id === "openclaw");
    const localFirst = portfolio.topics.find((topic) => topic.id === "local-first-software");

    expect(openClaw).toBeTruthy();
    expect(localFirst).toBeTruthy();
    expect(openClaw?.maturityStage).toBe("flagship");
    expect(localFirst?.maturityStage).toBe("starter");
    expect(openClaw?.links.home.href).toBe("/topics/openclaw");
    expect(localFirst?.links.home.href).toBe("/topics/local-first-software");
    expect(portfolio.comparisonSpotlight?.leaderId).toBe("openclaw");
    expect(portfolio.comparisonSpotlight?.challengerId).toBe("local-first-software");
    expect(
      portfolio.actionQueue.some(
        (action) =>
          action.topicId === "local-first-software" &&
          action.title === "Populate the next real workflow layers",
      ),
    ).toBe(true);
  });
});
