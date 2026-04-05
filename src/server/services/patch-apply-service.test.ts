import { describe, expect, it } from "vitest";

import { applyPatchHunksToMarkdownBody } from "@/server/services/patch-apply-service";

describe("patch apply service", () => {
  const baseBody = [
    "## Summary",
    "",
    "Local-first software keeps user knowledge visible.",
    "",
    "## Evidence",
    "",
    "Existing evidence paragraph.",
    "",
    "## Notes",
    "",
    "Keep this untouched.",
    "",
  ].join("\n");

  it("inserts content into an existing section before a local anchor", () => {
    const nextBody = applyPatchHunksToMarkdownBody(baseBody, [
      {
        sectionHeading: "Evidence",
        operation: "insert",
        beforeText: "Existing evidence paragraph.",
        afterText: "- New source-backed evidence.",
        citations: [],
      },
    ]);

    expect(nextBody).toContain("- New source-backed evidence.\nExisting evidence paragraph.");
  });

  it("replaces only the targeted local excerpt without rewriting unrelated sections", () => {
    const nextBody = applyPatchHunksToMarkdownBody(baseBody, [
      {
        sectionHeading: "Summary",
        operation: "replace",
        beforeText: "Local-first software keeps user knowledge visible.",
        afterText: "Local-first software keeps knowledge visible and reviewable.",
        citations: [],
      },
    ]);

    expect(nextBody).toContain("Local-first software keeps knowledge visible and reviewable.");
    expect(nextBody).toContain("## Notes\n\nKeep this untouched.");
    expect(nextBody).not.toContain("Local-first software keeps user knowledge visible.");
  });

  it("appends a missing section instead of rewriting the whole page", () => {
    const nextBody = applyPatchHunksToMarkdownBody(baseBody, [
      {
        sectionHeading: "Counterpoints",
        operation: "append",
        beforeText: null,
        afterText: "- Some sources argue for cloud-backed review trails.",
        citations: [],
      },
    ]);

    expect(nextBody).toContain("## Counterpoints\n\n- Some sources argue for cloud-backed review trails.");
    expect(nextBody).toContain("## Notes\n\nKeep this untouched.");
  });

  it("routes explicit conflict notes into a Counterpoints section by default", () => {
    const nextBody = applyPatchHunksToMarkdownBody(baseBody, [
      {
        sectionHeading: null,
        operation: "note_conflict",
        beforeText: null,
        afterText: "Conflicting evidence suggests some teams prefer hidden autosave memories.",
        citations: [],
      },
    ]);

    expect(nextBody).toContain(
      "## Counterpoints\n\nConflicting evidence suggests some teams prefer hidden autosave memories.",
    );
  });
});
