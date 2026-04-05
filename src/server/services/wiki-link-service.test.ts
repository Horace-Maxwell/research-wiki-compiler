import { describe, expect, it } from "vitest";

import { parseWikilinks, resolveWikiLinkTarget } from "@/server/services/wiki-link-service";

const pages = [
  {
    id: "page_index",
    title: "Research Wiki Demo",
    canonicalTitle: "Research Wiki Demo",
    slug: "index",
    aliases: ["Home"],
  },
  {
    id: "page_local_first",
    title: "Local First",
    canonicalTitle: "Local First",
    slug: "local-first",
    aliases: ["LF"],
  },
] as const;

describe("wiki link service", () => {
  it("parses basic and aliased wikilinks", () => {
    const tokens = parseWikilinks("See [[Local First]] and [[Research Wiki Demo|Home]].");

    expect(tokens).toHaveLength(2);
    expect(tokens[0]?.target).toBe("Local First");
    expect(tokens[1]?.alias).toBe("Home");
  });

  it("resolves wikilinks by title", () => {
    const resolved = resolveWikiLinkTarget(
      "Local First",
      pages.map((page) => ({
        ...page,
        type: "topic",
        path: "wiki/topics/local-first.md",
        folder: "wiki/topics",
        tags: [],
        sourceRefs: [],
        pageRefs: [],
        confidence: 0.8,
        status: "draft",
        reviewStatus: "pending",
        updatedAt: "2026-04-04T00:00:00.000Z",
        lastIndexedAt: "2026-04-04T00:00:00.000Z",
        unresolvedOutgoingCount: 0,
      })),
      "/tmp/wiki",
    );

    expect("targetPageId" in resolved ? resolved.targetPageId : null).toBe(
      "page_local_first",
    );
  });

  it("resolves wikilinks by alias", () => {
    const resolved = resolveWikiLinkTarget(
      "Home",
      pages.map((page) => ({
        ...page,
        type: "topic",
        path: "wiki/topics/local-first.md",
        folder: "wiki/topics",
        tags: [],
        sourceRefs: [],
        pageRefs: [],
        confidence: 0.8,
        status: "draft",
        reviewStatus: "pending",
        updatedAt: "2026-04-04T00:00:00.000Z",
        lastIndexedAt: "2026-04-04T00:00:00.000Z",
        unresolvedOutgoingCount: 0,
      })),
      "/tmp/wiki",
    );

    expect("targetPageId" in resolved ? resolved.targetPageId : null).toBe("page_index");
  });

  it("marks missing wikilinks as unresolved", () => {
    const resolved = resolveWikiLinkTarget(
      "Missing Page",
      pages.map((page) => ({
        ...page,
        type: "topic",
        path: "wiki/topics/local-first.md",
        folder: "wiki/topics",
        tags: [],
        sourceRefs: [],
        pageRefs: [],
        confidence: 0.8,
        status: "draft",
        reviewStatus: "pending",
        updatedAt: "2026-04-04T00:00:00.000Z",
        lastIndexedAt: "2026-04-04T00:00:00.000Z",
        unresolvedOutgoingCount: 0,
      })),
      "/tmp/wiki",
    );

    expect("reason" in resolved ? resolved.reason : null).toBe("missing");
  });
});

