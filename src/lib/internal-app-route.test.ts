import { describe, expect, it } from "vitest";

import { isInternalAppPath, normalizeInternalAppRouteHref } from "@/lib/internal-app-route";

describe("internal app route normalization", () => {
  it("recognizes app-managed route prefixes", () => {
    expect(isInternalAppPath("/topics")).toBe(true);
    expect(isInternalAppPath("/topics/openclaw")).toBe(true);
    expect(isInternalAppPath("/examples/openclaw")).toBe(true);
    expect(isInternalAppPath("/outside")).toBe(false);
  });

  it("strips workspace-scoped query leakage from internal routes", () => {
    expect(
      normalizeInternalAppRouteHref(
        "/topics/openclaw?workspaceRoot=%2Ftmp%2Frendered&pagePath=wiki%2Findex.md&pageId=page_1",
      ),
    ).toBe("/topics/openclaw?pageId=page_1");
  });

  it("normalizes exported internal html paths back to route-native paths", () => {
    expect(normalizeInternalAppRouteHref("/topics/openclaw/index.html")).toBe("/topics/openclaw");
    expect(normalizeInternalAppRouteHref("/examples/openclaw.html")).toBe("/examples/openclaw");
  });

  it("leaves external hrefs untouched", () => {
    expect(normalizeInternalAppRouteHref("https://example.com/docs")).toBe(
      "https://example.com/docs",
    );
  });
});
