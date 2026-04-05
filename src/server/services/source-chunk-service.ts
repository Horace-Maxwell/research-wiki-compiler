import crypto from "node:crypto";

import {
  SOURCE_DEFAULT_CHUNK_SIZE,
  SOURCE_DEFAULT_SOFT_BREAK_LOOKBACK,
} from "@/lib/constants";
import { estimateTokenCount } from "@/server/services/source-normalization-service";

export type DeterministicChunk = {
  chunkIndex: number;
  content: string;
  tokenCount: number;
  charCount: number;
  startOffset: number;
  endOffset: number;
  checksum: string;
};

function checksumChunk(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}

function chooseBreakPosition(text: string, start: number, hardEnd: number) {
  if (hardEnd >= text.length) {
    return text.length;
  }

  const minBreak = Math.max(start + SOURCE_DEFAULT_CHUNK_SIZE - SOURCE_DEFAULT_SOFT_BREAK_LOOKBACK, start + 1);
  const slice = text.slice(minBreak, hardEnd);
  const paragraphBreak = slice.lastIndexOf("\n\n");

  if (paragraphBreak >= 0) {
    return minBreak + paragraphBreak + 2;
  }

  const lineBreak = slice.lastIndexOf("\n");

  if (lineBreak >= 0) {
    return minBreak + lineBreak + 1;
  }

  const spaceBreak = slice.lastIndexOf(" ");

  if (spaceBreak >= 0) {
    return minBreak + spaceBreak + 1;
  }

  return hardEnd;
}

export function chunkNormalizedSourceText(text: string) {
  const normalizedText = text.trim();

  if (!normalizedText) {
    return [] as DeterministicChunk[];
  }

  const chunks: DeterministicChunk[] = [];
  let start = 0;
  let chunkIndex = 0;

  while (start < normalizedText.length) {
    const hardEnd = Math.min(normalizedText.length, start + SOURCE_DEFAULT_CHUNK_SIZE);
    const end = chooseBreakPosition(normalizedText, start, hardEnd);
    const content = normalizedText.slice(start, end).trim();

    if (!content) {
      break;
    }

    chunks.push({
      chunkIndex,
      content,
      tokenCount: estimateTokenCount(content),
      charCount: content.length,
      startOffset: start,
      endOffset: end,
      checksum: checksumChunk(content),
    });

    start = end;
    chunkIndex += 1;
  }

  return chunks;
}

