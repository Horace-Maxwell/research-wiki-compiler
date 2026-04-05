import { describe, expect, it } from "vitest";

import {
  parseWikiDocument,
  serializeWikiDocument,
} from "@/server/services/wiki-frontmatter-service";

describe("wiki frontmatter service", () => {
  it("parses valid wiki frontmatter and body", () => {
    const document = parseWikiDocument({
      relativePath: "wiki/topics/local-first.md",
      rawContent: `---
title: Local First
slug: local-first
type: topic
created_at: 2026-04-04T00:00:00.000Z
updated_at: 2026-04-04T00:00:00.000Z
status: draft
aliases:
  - Local-first
tags:
  - architecture
source_refs: []
page_refs: []
confidence: 0.7
review_status: pending
---

# Local First

Notes here.
`,
    });

    expect(document.frontmatter.title).toBe("Local First");
    expect(document.frontmatter.aliases).toEqual(["Local-first"]);
    expect(document.body).toContain("Notes here.");
  });

  it("rejects mismatched frontmatter type and path", () => {
    expect(() =>
      parseWikiDocument({
        relativePath: "wiki/entities/local-first.md",
        rawContent: `---
title: Local First
slug: local-first
type: topic
created_at: 2026-04-04T00:00:00.000Z
updated_at: 2026-04-04T00:00:00.000Z
status: draft
aliases: []
tags: []
source_refs: []
page_refs: []
confidence: 0.7
review_status: pending
---

# Local First
`,
      }),
    ).toThrowError("Frontmatter type 'topic' does not match page path");
  });

  it("serializes normalized frontmatter ordering", () => {
    const serialized = serializeWikiDocument(
      {
        title: "Local First",
        slug: "local-first",
        type: "topic",
        created_at: "2026-04-04T00:00:00.000Z",
        updated_at: "2026-04-04T00:00:00.000Z",
        status: "draft",
        aliases: [],
        tags: ["architecture"],
        source_refs: [],
        page_refs: [],
        confidence: 0.5,
        review_status: "pending",
      },
      "# Local First\n",
    );

    expect(serialized).toContain("title: Local First");
    expect(serialized).toContain("slug: local-first");
    expect(serialized).toContain("# Local First");
  });
});

