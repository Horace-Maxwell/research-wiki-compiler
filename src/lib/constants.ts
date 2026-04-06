export const APP_NAME = "Research Wiki Compiler";
export const ACTIVE_WORKSPACE_STORAGE_KEY = "research-wiki.active-workspace-root";
export const LLM_PROVIDERS = ["openai", "anthropic"] as const;

export const WORKSPACE_BLUEPRINT = [
  { relativePath: "raw", kind: "directory" },
  { relativePath: "raw/inbox", kind: "directory" },
  { relativePath: "raw/processed", kind: "directory" },
  { relativePath: "raw/rejected", kind: "directory" },
  { relativePath: "raw/images", kind: "directory" },
  { relativePath: "wiki", kind: "directory" },
  { relativePath: "wiki/topics", kind: "directory" },
  { relativePath: "wiki/entities", kind: "directory" },
  { relativePath: "wiki/concepts", kind: "directory" },
  { relativePath: "wiki/timelines", kind: "directory" },
  { relativePath: "wiki/syntheses", kind: "directory" },
  { relativePath: "wiki/notes", kind: "directory" },
  { relativePath: "reviews", kind: "directory" },
  { relativePath: "reviews/pending", kind: "directory" },
  { relativePath: "reviews/approved", kind: "directory" },
  { relativePath: "reviews/rejected", kind: "directory" },
  { relativePath: "audits", kind: "directory" },
  { relativePath: "exports", kind: "directory" },
  { relativePath: "prompts", kind: "directory" },
  { relativePath: ".research-wiki", kind: "directory" },
  { relativePath: ".research-wiki/cache", kind: "directory" },
  { relativePath: ".research-wiki/runs", kind: "directory" },
  { relativePath: ".research-wiki/snapshots", kind: "directory" },
  { relativePath: "wiki/index.md", kind: "file" },
  { relativePath: ".research-wiki/settings.json", kind: "file" },
  { relativePath: ".research-wiki/app.db", kind: "file" },
] as const;

export const PROMPT_TEMPLATE_FILES = [
  "source_summarizer.md",
  "patch_planner.md",
  "page_updater.md",
  "answerer.md",
  "contradiction_auditor.md",
  "coverage_auditor.md",
] as const;

export const PRODUCT_SURFACE = [
  { href: "/topics", label: "Topics" },
  { href: "/questions", label: "Questions" },
  { href: "/sessions", label: "Sessions" },
  { href: "/syntheses", label: "Syntheses" },
  { href: "/changes", label: "Changes" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sources", label: "Sources" },
  { href: "/wiki", label: "Wiki" },
  { href: "/reviews", label: "Review Queue" },
  { href: "/ask", label: "Ask" },
  { href: "/audits", label: "Audits" },
  { href: "/settings", label: "Settings" },
] as const;

export const WIKI_PAGE_TYPES = [
  "index",
  "topic",
  "entity",
  "concept",
  "timeline",
  "synthesis",
  "note",
] as const;

export const WIKI_PAGE_TYPE_DIRECTORY_MAP = {
  index: "",
  topic: "topics",
  entity: "entities",
  concept: "concepts",
  timeline: "timelines",
  synthesis: "syntheses",
  note: "notes",
} as const;

export const WIKI_PAGE_TYPE_LABELS = {
  index: "Index",
  topic: "Topics",
  entity: "Entities",
  concept: "Concepts",
  timeline: "Timelines",
  synthesis: "Syntheses",
  note: "Notes",
} as const;

export const WIKI_DISCOVERY_ROOTS = [
  "wiki/index.md",
  "wiki/topics",
  "wiki/entities",
  "wiki/concepts",
  "wiki/timelines",
  "wiki/syntheses",
  "wiki/notes",
] as const;

export const SOURCE_TYPES = ["markdown", "text", "unknown"] as const;
export const SOURCE_STATUSES = ["processed", "rejected"] as const;
export const SOURCE_SUMMARY_STATUSES = [
  "not_started",
  "running",
  "completed",
  "failed",
] as const;
export const SOURCE_INGESTION_METHODS = [
  "pasted_text",
  "browser_file",
  "local_file_path",
  "reprocess",
] as const;

export const SOURCE_ALLOWED_TEXT_EXTENSIONS = [
  ".md",
  ".markdown",
  ".mdown",
  ".txt",
] as const;

export const SOURCE_DEFAULT_CHUNK_SIZE = 1200;
export const SOURCE_DEFAULT_SOFT_BREAK_LOOKBACK = 240;
export const SOURCE_PROCESSING_VERSION = "m2-normalizer-v1";
export const SOURCE_SUMMARY_ARTIFACT_VERSION = "m3-source-summary-v1";
export const SOURCE_SUMMARY_JOB_TYPE = "source_summary";
export const SOURCE_SUMMARY_DIRECT_CHAR_LIMIT = 18000;
export const PATCH_PROPOSAL_ARTIFACT_VERSION = "m4-patch-proposal-v1";
export const CANDIDATE_PAGE_RECALL_JOB_TYPE = "candidate_page_recall";
export const PATCH_PLANNER_JOB_TYPE = "patch_planning";
export const PATCH_APPLY_JOB_TYPE = "patch_apply";
export const ANSWER_JOB_TYPE = "answer_generation";
export const AUDIT_MODES = [
  "contradiction",
  "coverage",
  "orphan",
  "stale",
  "unsupported_claims",
] as const;
export const AUDIT_MODE_LABELS = {
  contradiction: "Contradiction",
  coverage: "Coverage",
  orphan: "Orphan",
  stale: "Stale",
  unsupported_claims: "Unsupported claims",
} as const;
export const AUDIT_RUN_STATUSES = ["running", "completed", "failed"] as const;
export const PATCH_PROPOSAL_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "superseded",
] as const;
export const PATCH_PROPOSAL_RISK_LEVELS = ["low", "medium", "high"] as const;
export const PATCH_PROPOSAL_TYPES = [
  "update_page",
  "create_page",
  "add_citations",
  "add_backlinks",
  "conflict_note",
] as const;
export const PATCH_HUNK_OPERATIONS = [
  "append",
  "insert",
  "replace",
  "create_section",
  "note_conflict",
] as const;
