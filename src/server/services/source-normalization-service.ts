import crypto from "node:crypto";
import path from "node:path";

import matter from "gray-matter";

import { AppError } from "@/server/lib/errors";
import {
  inferSourceTypeFromFilename,
} from "@/server/services/source-file-service";

type SupportedSourceType = "markdown" | "text";

function normalizeNewlines(input: string) {
  return input.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

export function computeChecksum(input: string | Buffer) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

export function estimateTokenCount(input: string) {
  return Math.max(1, Math.ceil(input.length / 4));
}

function inferTitleFromBody(body: string) {
  const headingMatch = body.match(/^#\s+(.+)$/m);

  if (headingMatch?.[1]?.trim()) {
    return {
      title: headingMatch[1].trim(),
      method: "heading" as const,
    };
  }

  const firstLine = body
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (firstLine) {
    return {
      title: firstLine.slice(0, 140),
      method: "first_line" as const,
    };
  }

  return null;
}

function inferTitleFromFilename(filename: string) {
  const stem = path.basename(filename, path.extname(filename));
  const cleaned = stem.replace(/[-_]+/g, " ").trim();

  return cleaned
    ? {
        title: cleaned.replace(/\b\w/g, (match) => match.toUpperCase()),
        method: "filename" as const,
      }
    : null;
}

function normalizeMarkdownSource(rawText: string) {
  const parsed = matter(rawText);
  const normalizedBody = normalizeNewlines(parsed.content).trim();
  const frontmatterTitle =
    typeof parsed.data.title === "string" && parsed.data.title.trim()
      ? {
          title: parsed.data.title.trim(),
          method: "frontmatter" as const,
        }
      : null;

  return {
    normalizedBody: `${normalizedBody}\n`,
    titleCandidate: frontmatterTitle ?? inferTitleFromBody(normalizedBody),
    frontmatterRemoved: Object.keys(parsed.data).length > 0,
  };
}

function normalizePlainTextSource(rawText: string) {
  const normalizedBody = normalizeNewlines(rawText).trim();

  return {
    normalizedBody: `${normalizedBody}\n`,
    titleCandidate: inferTitleFromBody(normalizedBody),
    frontmatterRemoved: false,
  };
}

type SourceNormalizationContext = {
  importKind: "pasted_text" | "browser_file" | "local_file_path" | "reprocess";
  title?: string;
};

export function normalizeSourceInput(params: {
  importRequest: SourceNormalizationContext;
  originalFilename: string;
  rawBuffer: Buffer;
}) {
  const rawChecksum = computeChecksum(params.rawBuffer);
  const inferredType = inferSourceTypeFromFilename(params.originalFilename);

  if (inferredType === "unknown" && params.importRequest.importKind !== "pasted_text") {
    throw new AppError(
      `Unsupported source file type for ${params.originalFilename}.`,
      422,
      "unsupported_source_type",
      {
        rawChecksum,
      },
    );
  }

  const rawText = normalizeNewlines(params.rawBuffer.toString("utf8"));
  const isMarkdown =
    inferredType === "markdown" ||
    (params.importRequest.importKind === "pasted_text" &&
      /(^#\s)|(^[-*]\s)|(\[[^[\]]+\]\([^)]+\))|(```)/m.test(rawText));
  const sourceType: SupportedSourceType = isMarkdown ? "markdown" : "text";
  const normalized = isMarkdown
    ? normalizeMarkdownSource(rawText)
    : normalizePlainTextSource(rawText);

  if (!normalized.normalizedBody.trim()) {
    throw new AppError(
      "Imported source did not contain any usable text after normalization.",
      422,
      "empty_source_after_normalization",
      {
        rawChecksum,
      },
    );
  }

  const explicitTitle = params.importRequest.title?.trim()
    ? {
        title: params.importRequest.title.trim(),
        method: "request" as const,
      }
    : null;
  const title =
    explicitTitle ??
    normalized.titleCandidate ??
    inferTitleFromFilename(params.originalFilename) ??
    {
      title: "Untitled Source",
      method: "fallback" as const,
    };
  const checksum = computeChecksum(normalized.normalizedBody);

  return {
    sourceType,
    title: title.title,
    titleMethod: title.method,
    normalizedText: normalized.normalizedBody,
    checksum,
    rawChecksum,
    tokenEstimate: estimateTokenCount(normalized.normalizedBody),
    language: "und",
    metadataJson: {
      originalFilename: params.originalFilename,
      originalExtension: path.extname(params.originalFilename).toLowerCase(),
      normalizedFormat: sourceType,
      normalizationVersion: "m2-normalizer-v1",
      frontmatterRemoved: normalized.frontmatterRemoved,
      titleInference: title.method,
      lineCount: normalized.normalizedBody.split("\n").length,
      characterCount: normalized.normalizedBody.length,
    } satisfies Record<string, unknown>,
  };
}
