import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  isPathWithinRoot,
  normalizeWorkspaceRoot,
  resolveWithinWorkspaceRoot,
} from "@/server/lib/path-safety";

describe("path safety helpers", () => {
  it("normalizes a relative workspace path", () => {
    const normalized = normalizeWorkspaceRoot("./demo-workspace");

    expect(normalized).toBe(path.resolve("./demo-workspace"));
  });

  it("rejects the filesystem root as a workspace", () => {
    expect(() => normalizeWorkspaceRoot("/")).toThrowError(
      "Workspace path cannot be the filesystem root.",
    );
  });

  it("keeps resolved paths inside the workspace root", () => {
    const root = path.resolve("/tmp/research-workspace");
    const result = resolveWithinWorkspaceRoot(root, "wiki", "index.md");

    expect(result).toBe(path.join(root, "wiki", "index.md"));
    expect(isPathWithinRoot(root, result)).toBe(true);
  });

  it("rejects traversal outside the workspace root", () => {
    const root = path.resolve("/tmp/research-workspace");

    expect(() => resolveWithinWorkspaceRoot(root, "..", "etc", "passwd")).toThrowError(
      "Resolved path escapes the workspace root:",
    );
  });
});

