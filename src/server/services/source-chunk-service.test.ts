import { describe, expect, it } from "vitest";

import { chunkNormalizedSourceText } from "@/server/services/source-chunk-service";

describe("source chunk service", () => {
  it("chunks long text deterministically with offsets and checksums", () => {
    const text = `${"alpha ".repeat(300)}\n\n${"beta ".repeat(300)}`;
    const chunks = chunkNormalizedSourceText(text);

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]?.startOffset).toBe(0);
    expect(chunks[0]?.endOffset).toBeGreaterThan(chunks[0]?.startOffset ?? 0);
    expect(chunks[0]?.checksum).toHaveLength(64);
  });
});

