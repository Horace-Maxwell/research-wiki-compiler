import { z } from "zod";

import { WIKI_PAGE_TYPES } from "@/lib/constants";

export const wikiPageTypeSchema = z.enum(WIKI_PAGE_TYPES);
export type WikiPageType = z.infer<typeof wikiPageTypeSchema>;

export const wikiFrontmatterSchema = z
  .object({
    title: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    type: wikiPageTypeSchema,
    created_at: z.preprocess(
      (value) => (value instanceof Date ? value.toISOString() : value),
      z.string().datetime(),
    ),
    updated_at: z.preprocess(
      (value) => (value instanceof Date ? value.toISOString() : value),
      z.string().datetime(),
    ),
    status: z.string().trim().min(1),
    aliases: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    source_refs: z.array(z.string()).default([]),
    page_refs: z.array(z.string()).default([]),
    confidence: z.coerce.number().min(0).max(1),
    review_status: z.string().trim().min(1),
  })
  .passthrough();

export type WikiFrontmatter = z.infer<typeof wikiFrontmatterSchema>;

export const wikilinkTokenSchema = z.object({
  raw: z.string(),
  target: z.string(),
  alias: z.string().nullable(),
  displayText: z.string(),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
});

export type WikilinkToken = z.infer<typeof wikilinkTokenSchema>;

export const resolvedWikiLinkSchema = z.object({
  id: z.string(),
  sourcePageId: z.string(),
  targetPageId: z.string(),
  targetTitle: z.string(),
  displayText: z.string(),
  resolutionKind: z.enum(["title", "canonicalTitle", "slug", "alias"]),
  href: z.string(),
});

export type ResolvedWikiLink = z.infer<typeof resolvedWikiLinkSchema>;

export const unresolvedWikiLinkSchema = z.object({
  id: z.string(),
  sourcePageId: z.string(),
  target: z.string(),
  displayText: z.string(),
  reason: z.enum(["missing", "ambiguous"]),
});

export type UnresolvedWikiLink = z.infer<typeof unresolvedWikiLinkSchema>;

export const wikiPageSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  canonicalTitle: z.string(),
  slug: z.string(),
  type: wikiPageTypeSchema,
  path: z.string(),
  folder: z.string(),
  aliases: z.array(z.string()),
  tags: z.array(z.string()),
  sourceRefs: z.array(z.string()),
  pageRefs: z.array(z.string()),
  confidence: z.number(),
  status: z.string(),
  reviewStatus: z.string(),
  updatedAt: z.string().datetime(),
  lastIndexedAt: z.string().datetime(),
  unresolvedOutgoingCount: z.number().int().nonnegative(),
});

export type WikiPageSummary = z.infer<typeof wikiPageSummarySchema>;

export const wikiPageDetailSchema = wikiPageSummarySchema.extend({
  rawContent: z.string(),
  renderedHtml: z.string(),
  frontmatter: wikiFrontmatterSchema,
  body: z.string(),
  outgoingLinks: z.array(resolvedWikiLinkSchema),
  backlinks: z.array(
    z.object({
      sourcePageId: z.string(),
      sourceTitle: z.string(),
      sourcePath: z.string(),
      href: z.string(),
    }),
  ),
  unresolvedLinks: z.array(unresolvedWikiLinkSchema),
});

export type WikiPageDetail = z.infer<typeof wikiPageDetailSchema>;

export const listWikiPagesQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const listWikiPagesResponseSchema = z.object({
  pages: z.array(wikiPageSummarySchema),
});

export const getWikiPageQuerySchema = z.object({
  workspaceRoot: z.string().min(1),
});

export const createWikiPageRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  type: wikiPageTypeSchema.exclude(["index"]),
  slug: z.string().trim().min(1).max(200).optional(),
  aliases: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const updateWikiPageRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
  rawContent: z.string().min(1),
});

export const refreshWikiPageLinksRequestSchema = z.object({
  workspaceRoot: z.string().min(1),
});
