import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    rootPath: text("root_path").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull(),
    gitEnabled: integer("git_enabled", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [uniqueIndex("workspaces_root_path_idx").on(table.rootPath)],
);

export const sourceDocuments = sqliteTable(
  "source_documents",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    slug: text("slug").notNull(),
    sourceType: text("source_type").notNull().default("unknown"),
    originalPath: text("original_path"),
    ingestionMethod: text("ingestion_method").notNull(),
    checksum: text("checksum").notNull().default(""),
    importedAt: integer("imported_at", { mode: "timestamp_ms" }),
    processedAt: integer("processed_at", { mode: "timestamp_ms" }),
    language: text("language").notNull().default("und"),
    metadataJson: text("metadata_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    rawTextExtracted: text("raw_text_extracted").notNull().default(""),
    tokenEstimate: integer("token_estimate").notNull().default(0),
    failureReason: text("failure_reason"),
    originalExternalPath: text("original_external_path"),
    summaryStatus: text("summary_status").notNull().default("not_started"),
    summaryMarkdownPath: text("summary_markdown_path"),
    summaryJsonPath: text("summary_json_path"),
    summaryPromptHash: text("summary_prompt_hash"),
    summaryProvider: text("summary_provider"),
    summaryModel: text("summary_model"),
    summaryUpdatedAt: integer("summary_updated_at", { mode: "timestamp_ms" }),
    summaryError: text("summary_error"),
    summaryMetadataJson: text("summary_metadata_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    canonicalUrl: text("canonical_url"),
    author: text("author"),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    rawPath: text("raw_path"),
    normalizedPath: text("normalized_path"),
    processingVersion: text("processing_version").notNull(),
    status: text("status").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("source_documents_workspace_idx").on(table.workspaceId),
    index("source_documents_slug_idx").on(table.slug),
    index("source_documents_status_idx").on(table.status),
  ],
);

export const sourceChunks = sqliteTable(
  "source_chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenCount: integer("token_count"),
    charCount: integer("char_count"),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    checksum: text("checksum").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("source_chunks_document_idx").on(table.documentId, table.chunkIndex)],
);

export const wikiPages = sqliteTable(
  "wiki_pages",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    canonicalTitle: text("canonical_title").notNull(),
    slug: text("slug").notNull(),
    type: text("type").notNull(),
    path: text("path").notNull(),
    folder: text("folder").notNull(),
    aliasesJson: text("aliases_json", { mode: "json" }).$type<string[]>().notNull(),
    tagsJson: text("tags_json", { mode: "json" }).$type<string[]>().notNull(),
    sourceRefsJson: text("source_refs_json", { mode: "json" }).$type<string[]>().notNull(),
    pageRefsJson: text("page_refs_json", { mode: "json" }).$type<string[]>().notNull(),
    confidence: real("confidence").notNull().default(0),
    importanceScore: real("importance_score").notNull().default(0),
    qualityScore: real("quality_score").notNull().default(0),
    sourceCoverageScore: real("source_coverage_score").notNull().default(0),
    reviewStatus: text("review_status").notNull(),
    status: text("status").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    lastIndexedAt: integer("last_indexed_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("wiki_pages_workspace_idx").on(table.workspaceId),
    index("wiki_pages_slug_idx").on(table.slug),
    uniqueIndex("wiki_pages_workspace_path_idx").on(table.workspaceId, table.path),
  ],
);

export const pageLinks = sqliteTable(
  "page_links",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourcePageId: text("source_page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    targetPageId: text("target_page_id").references(() => wikiPages.id, {
      onDelete: "set null",
    }),
    targetTitle: text("target_title").notNull(),
    linkText: text("link_text"),
    resolutionKind: text("resolution_kind"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("page_links_workspace_idx").on(table.workspaceId),
    index("page_links_source_idx").on(table.sourcePageId),
  ],
);

export const entityMentions = sqliteTable(
  "entity_mentions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: text("page_id").references(() => wikiPages.id, { onDelete: "cascade" }),
    documentId: text("document_id").references(() => sourceDocuments.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    mentionCount: integer("mention_count").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("entity_mentions_workspace_idx").on(table.workspaceId),
    index("entity_mentions_normalized_name_idx").on(table.normalizedName),
  ],
);

export const conceptMentions = sqliteTable(
  "concept_mentions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: text("page_id").references(() => wikiPages.id, { onDelete: "cascade" }),
    documentId: text("document_id").references(() => sourceDocuments.id, {
      onDelete: "cascade",
    }),
    name: text("name").notNull(),
    normalizedName: text("normalized_name").notNull(),
    mentionCount: integer("mention_count").notNull().default(1),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("concept_mentions_workspace_idx").on(table.workspaceId),
    index("concept_mentions_normalized_name_idx").on(table.normalizedName),
  ],
);

export const claims = sqliteTable(
  "claims",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: text("page_id").references(() => wikiPages.id, { onDelete: "cascade" }),
    documentId: text("document_id").references(() => sourceDocuments.id, {
      onDelete: "cascade",
    }),
    text: text("text").notNull(),
    polarity: text("polarity").notNull(),
    evidenceStrength: text("evidence_strength").notNull(),
    contradictionGroupId: text("contradiction_group_id"),
    citationsJson: text("citations_json", { mode: "json" })
      .$type<Array<{ sourceId: string; note?: string }>>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("claims_workspace_idx").on(table.workspaceId),
    index("claims_contradiction_group_idx").on(table.contradictionGroupId),
  ],
);

export const patchProposals = sqliteTable(
  "patch_proposals",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceDocumentId: text("source_document_id").references(() => sourceDocuments.id, {
      onDelete: "set null",
    }),
    targetPageId: text("target_page_id").references(() => wikiPages.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    status: text("status").notNull(),
    proposalType: text("proposal_type").notNull().default("update_page"),
    riskLevel: text("risk_level").notNull(),
    promptVersion: text("prompt_version").notNull(),
    promptHash: text("prompt_hash"),
    provider: text("provider"),
    model: text("model"),
    rationale: text("rationale").notNull(),
    targetPageTitle: text("target_page_title"),
    proposedPageTitle: text("proposed_page_title"),
    artifactMarkdownPath: text("artifact_markdown_path"),
    artifactJsonPath: text("artifact_json_path"),
    affectedSectionsJson: text("affected_sections_json", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    reviewNote: text("review_note"),
    appliedAt: integer("applied_at", { mode: "timestamp_ms" }),
    applyError: text("apply_error"),
    appliedPageId: text("applied_page_id").references(() => wikiPages.id, {
      onDelete: "set null",
    }),
    applyMetadataJson: text("apply_metadata_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("patch_proposals_workspace_idx").on(table.workspaceId),
    index("patch_proposals_status_idx").on(table.status),
    index("patch_proposals_source_document_idx").on(table.sourceDocumentId),
  ],
);

export const patchHunks = sqliteTable(
  "patch_hunks",
  {
    id: text("id").primaryKey(),
    proposalId: text("proposal_id")
      .notNull()
      .references(() => patchProposals.id, { onDelete: "cascade" }),
    sectionHeading: text("section_heading"),
    operation: text("operation").notNull(),
    beforeText: text("before_text"),
    afterText: text("after_text"),
    citationsJson: text("citations_json", { mode: "json" })
      .$type<Array<{ sourceId: string; note?: string }>>()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("patch_hunks_proposal_idx").on(table.proposalId)],
);

export const answerArtifacts = sqliteTable(
  "answer_artifacts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    shortAnswer: text("short_answer").notNull(),
    detailedAnswer: text("detailed_answer").notNull(),
    citationsJson: text("citations_json", { mode: "json" })
      .$type<
        Array<{
          referenceId: string;
          layer: "wiki_page" | "source_summary" | "raw_chunk";
          pageId?: string | null;
          pageTitle?: string | null;
          pagePath?: string | null;
          sourceId?: string | null;
          sourceTitle?: string | null;
          chunkId?: string | null;
          locator?: string | null;
          note: string;
        }>
      >()
      .notNull(),
    basedOnPagesJson: text("based_on_pages_json", { mode: "json" })
      .$type<string[]>()
      .notNull(),
    caveatsJson: text("caveats_json", { mode: "json" }).$type<string[]>().notNull(),
    followUpQuestionsJson: text("follow_up_questions_json", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    metadataJson: text("metadata_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    archivedPageId: text("archived_page_id").references(() => wikiPages.id, {
      onDelete: "set null",
    }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("answer_artifacts_workspace_idx").on(table.workspaceId)],
);

export const auditRuns = sqliteTable(
  "audit_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    status: text("status").notNull(),
    reportPath: text("report_path"),
    findingsJson: text("findings_json", { mode: "json" })
      .$type<
        Array<{
          id: string;
          mode: string;
          severity: "low" | "medium" | "high";
          title: string;
          note: string;
          relatedPageIds?: string[];
          relatedPagePaths?: string[];
          relatedSourceIds?: string[];
          metadata?: Record<string, unknown>;
        }>
      >()
      .notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [index("audit_runs_workspace_idx").on(table.workspaceId)],
);

export const jobRuns = sqliteTable(
  "job_runs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceDocumentId: text("source_document_id").references(() => sourceDocuments.id, {
      onDelete: "set null",
    }),
    jobType: text("job_type").notNull(),
    status: text("status").notNull(),
    retryCount: integer("retry_count").notNull().default(0),
    durationMs: integer("duration_ms"),
    metadataJson: text("metadata_json", { mode: "json" }).$type<Record<string, unknown>>(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => [
    index("job_runs_workspace_idx").on(table.workspaceId),
    index("job_runs_job_type_idx").on(table.jobType),
  ],
);

export const appSettings = sqliteTable(
  "app_settings",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    valueJson: text("value_json", { mode: "json" })
      .$type<Record<string, unknown>>()
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("app_settings_workspace_idx").on(table.workspaceId),
    uniqueIndex("app_settings_workspace_key_idx").on(table.workspaceId, table.key),
  ],
);

export const schema = {
  workspaces,
  sourceDocuments,
  sourceChunks,
  wikiPages,
  pageLinks,
  entityMentions,
  conceptMentions,
  claims,
  patchProposals,
  patchHunks,
  answerArtifacts,
  auditRuns,
  jobRuns,
  appSettings,
};
