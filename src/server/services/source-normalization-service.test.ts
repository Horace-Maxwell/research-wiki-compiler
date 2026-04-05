import { describe, expect, it } from "vitest";

import {
  computeChecksum,
  estimateTokenCount,
  normalizeSourceInput,
} from "@/server/services/source-normalization-service";

describe("source normalization service", () => {
  it("normalizes markdown and infers title from frontmatter", () => {
    const result = normalizeSourceInput({
      importRequest: {
        importKind: "browser_file",
        title: undefined,
      },
      originalFilename: "notes.md",
      rawBuffer: Buffer.from(
        `---\ntitle: Notes on Local First\n---\n\r\n# Ignored Heading\r\n\r\nBody text.\r\n`,
        "utf8",
      ),
    });

    expect(result.sourceType).toBe("markdown");
    expect(result.title).toBe("Notes on Local First");
    expect(result.normalizedText).toBe("# Ignored Heading\n\nBody text.\n");
  });

  it("computes stable checksums and token estimates", () => {
    expect(computeChecksum("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
    expect(estimateTokenCount("12345678")).toBe(2);
  });

  it("rejects unsupported file types deterministically", () => {
    expect(() =>
      normalizeSourceInput({
        importRequest: {
          importKind: "local_file_path",
          title: undefined,
        },
        originalFilename: "scan.pdf",
        rawBuffer: Buffer.from("%PDF-1.4", "utf8"),
      }),
    ).toThrowError("Unsupported source file type for scan.pdf.");
  });
});

