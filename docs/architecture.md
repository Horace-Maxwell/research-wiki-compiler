# Research Wiki Compiler Architecture

## Architecture Summary

Research Wiki Compiler is a local full-stack monolith:

- frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- server runtime: Node.js route handlers and server-side services
- persistence: SQLite via Drizzle ORM
- file storage: user workspace on the local filesystem

The local workspace is the durable system of record for research content. SQLite is a runtime index and metadata store, not the primary knowledge store.

## Document Note

This architecture doc describes the current shipped MVP and keeps the milestone-by-milestone flow sections so an external technical reader can see how the product grew without losing its local-first constraints.

Repository launch-prep materials live in [release-checklist.md](release-checklist.md) and [github-launch-checklist.md](github-launch-checklist.md).

## Repository Operations Layer

The repository also carries a lightweight release-prep layer for future GitHub publication:

- community files such as `CONTRIBUTING.md`, `SECURITY.md`, `SUPPORT.md`, and `CODE_OF_CONDUCT.md`
- issue and PR templates under `.github/`
- a conservative GitHub Actions CI workflow for install, lint, test, and build
- screenshot placeholders under `docs/assets/screenshots/`

These files do not change runtime product architecture, but they matter for maintainability and external readability.

## Layering

The application uses feature-first UI organization and a service-oriented server layer.

```text
src/
  app/
    api/
    (routes and layouts)
  components/
  features/
    workspace/
    sources/
    wiki/
    settings/
  lib/
  server/
    db/
    lib/
    repositories/
    services/
```

Rules:

- Route handlers validate input and delegate to services.
- Services contain business logic and filesystem or DB orchestration.
- Repositories are reserved for DB-heavy access patterns as complexity grows.
- React components do not perform core filesystem or database work directly.

## Runtime Modules

- `workspaceService`: initialize workspace structure and inspect status
- `settingsService`: load and persist workspace settings
- `databaseService`: create SQLite connection and ensure schema availability
- `gitService`: optionally initialize a git repository inside the workspace
- `promptService`: load visible prompt files from the repo `prompts/` directory
- `sourceImportService`: validate imports, stage files in inbox, and orchestrate normalization
- `sourceNormalizationService`: normalize source text deterministically and derive metadata
- `sourceChunkService`: deterministically chunk normalized source text
- `sourceService`: list, fetch, and reprocess sources
- `llmProviderService`: select and invoke the configured summarization provider
- `sourceSummaryService`: load prompts, summarize processed sources, persist artifacts, and update summary metadata
- `candidateRecallService`: deterministically score and rank likely affected wiki pages from summary artifacts
- `patchPlannerService`: load planner prompts, generate structured patch proposals, and persist proposal artifacts
- `reviewService`: read proposal queue state and artifacts for the Review Queue UI
- `retrievalService`: execute explicit wiki-first, summary-second, chunk-last retrieval for Ask
- `answerService`: load answer prompts, generate cited answers, and persist answer artifacts
- `answerArchiveService`: convert an existing answer artifact into a template-backed synthesis or note page and refresh wiki indexes
- `auditService`: run deterministic audit modes, persist markdown reports, and expose audit history plus findings
- `dashboardService`: summarize workspace state, product counts, and recent activity for the final MVP dashboard
- `logsService`: expose lightweight recent local activity from persisted runs, reviews, answers, and audits without adding separate log infrastructure
- `wikiFileService`: discover, read, write, and create wiki markdown files safely
- `wikiPageService`: parse, validate, index, fetch, create, and update wiki pages
- `wikiLinkService`: parse and resolve wikilinks and compute backlinks
- `markdownRenderService`: render markdown with first-class wikilink support
- `logger`: structured logging via pino
- `pathSafety`: normalize, validate, and constrain writes to the chosen workspace root

## Database Direction

Milestone 0 created the initial Drizzle schema for the core domain model so later milestones can extend behavior without rethinking identities or relationships.

Milestone 1 extends the `wiki_pages` metadata layer to better reflect file-backed page data, but the file system remains the source of truth for page content.

Milestone 2 extends `source_documents` and `source_chunks` to represent raw-source intake and normalized text without introducing any summarization or extraction artifacts.

Milestone 3 extends `source_documents` and `job_runs` with minimal summary-oriented metadata so visible summary artifacts and run history can be tracked without introducing candidate-selection or patch-planning tables yet.

Milestone 4 adds deterministic recall support and patch-proposal artifact metadata so reviewable proposal generation can be stored without applying any changes to wiki files.

Milestone 6 extends `answer_artifacts` and `job_runs` with minimal answer-oriented metadata so Ask results can be persisted and inspected without introducing answer archive tables or new infrastructure.

Milestone 7 reuses `answer_artifacts.archived_page_id` to connect persisted answer artifacts back to durable wiki pages, avoiding a separate archive table while keeping archive provenance explicit.

Milestone 8 reuses `audit_runs` for persisted audit history and stores richer structured findings inside the existing JSON field plus a markdown report path, avoiding extra infrastructure or a separate findings table in v1.

Milestone 9 reuses existing tables and file artifacts for dashboard summaries, recent activity, and demo seeding rather than adding new storage solely for polish.

SQLite FTS5 becomes useful in Milestone 4 for candidate recall across wiki content, but remains a runtime index rather than a content store.

## Workspace Initialization Flow

1. User provides a target workspace path.
2. API validates and normalizes the path.
3. API creates required directories and seed files if they do not exist.
4. API writes `.research-wiki/settings.json`.
5. API creates `.research-wiki/app.db`.
6. API runs Drizzle migrations or schema bootstrap.
7. API initializes git when requested and when the workspace is not already a repo.
8. API returns a structured status object for the UI.

## Milestone 1 Wiki Flow

1. Discover markdown files only from the allowed wiki locations.
2. Read raw file contents through workspace-safe utilities.
3. Parse and validate frontmatter and infer page type from path when needed.
4. Upsert page metadata into SQLite.
5. Parse outgoing wikilinks from markdown body.
6. Resolve links deterministically against indexed pages.
7. Persist resolved and unresolved outgoing links in `page_links`.
8. Calculate backlinks from the stored link graph at read time.
9. Render markdown with clickable resolved wikilinks for the UI.

## Milestone 2 Source Flow

1. Accept source input as pasted text, browser-selected markdown or text content, or a local file path.
2. Stage the original source file in `raw/inbox`.
3. Read the staged source through workspace-safe utilities.
4. Normalize encoding, line endings, and text body deterministically.
5. Infer source type, title, token estimate, checksum, and initial metadata.
6. Write normalized output under `raw/processed` on success and move the staged original there as well.
7. Move the staged original into `raw/rejected` on failure.
8. Persist `SourceDocument` and `SourceChunk` records in SQLite.
9. Surface the result in the Sources UI without invoking any LLM or compile logic.

## Milestone 3 Summary Flow

1. User selects a processed source and triggers summarize or resummarize.
2. Service validates that the source has normalized processed text available.
3. Service loads `prompts/source_summarizer.md` from the workspace or repo-backed prompt path and records a prompt hash.
4. Service loads workspace settings to resolve provider, model, and API credentials.
5. Service prepares a structured summarization input from normalized source text and, when needed, deterministic chunk context.
6. Provider adapter sends a strict structured-output request to OpenAI or Anthropic.
7. Service validates the model result against a local zod schema.
8. Service writes markdown and JSON summary artifacts into the workspace.
9. Service updates `source_documents`, refreshes extraction metadata, and records a `job_runs` entry with status, duration, retry count, provider, model, and prompt metadata.
10. Sources detail UI reads those artifacts and statuses directly from the file-first summary layer.

## Milestone 4 Proposal Flow

1. User selects a summarized source and triggers patch planning.
2. Service validates that the source has a completed summary artifact.
3. Candidate recall scores wiki pages using deterministic signals such as title and alias matches, concept and entity overlap, FTS results, and existing wiki link neighborhood.
4. Candidate recall refreshes a small SQLite FTS5 runtime table for wiki content on demand rather than introducing a separate search service.
5. Service loads `prompts/patch_planner.md` and records a prompt hash.
6. Planner service sends the summarized source plus recalled page context into a strict structured-output prompt.
7. Service validates the planner result locally with zod and converts each emitted proposal into one review item.
8. Service writes proposal markdown and JSON artifacts into `reviews/pending/`.
9. Service persists `patch_proposals`, related proposal detail metadata, `patch_hunks`, and `job_runs` records without mutating wiki pages.
10. Review APIs and UI read the file-backed artifacts and DB metadata to render the pending queue.

## Milestone 5 Apply Flow

1. User selects a pending proposal and explicitly chooses approve, reject, or edit-and-approve.
2. Review service loads the persisted proposal rows, hunk rows, and file-backed artifact from `reviews/pending/`.
3. Reject updates proposal metadata and moves the artifact into `reviews/rejected/` without touching wiki files.
4. Approve or edit-and-approve pass the final persisted proposal payload into the patch apply service.
5. Patch apply service reads the current wiki page or creates a new page from templates for create-page proposals.
6. Mutation helpers apply insert, replace, append, or create-section changes against the smallest safe section scope possible.
7. Apply service updates frontmatter metadata such as `updated_at`, `source_refs`, and `page_refs` where appropriate.
8. Service writes the changed wiki file path-safely, refreshes wiki index, page links, and the runtime FTS cache, then moves artifacts into `reviews/approved/`.
9. Service records apply job metadata, affected files, errors, and optional git commit results for later inspection.
10. Review APIs and UI surface final status, apply results, and historical artifact locations without introducing any ask or audit behavior.

## Milestone 6 Ask Flow

1. User submits a question from the Ask UI.
2. Ask API validates the request and delegates to the answer service.
3. Retrieval service executes retrieval in explicit order: wiki pages first, source summaries second, raw chunks last.
4. Wiki retrieval uses existing page metadata, links, and runtime FTS to identify the most relevant compiled pages.
5. Summary retrieval uses processed source records and visible summary artifacts to supplement the wiki evidence.
6. Chunk retrieval is only invoked when earlier layers do not provide sufficient grounding.
7. Answer service loads `prompts/answerer.md`, records prompt hash or version, and sends structured grounded context to the configured provider.
8. Provider output is validated locally with zod before persistence.
9. Service writes a structured answer artifact row in SQLite and records answer-run metadata in `job_runs`.
10. Ask UI renders the structured answer with citations, based-on pages, caveats, and insufficiency guidance without exposing a generic chat loop.

## Milestone 7 Archive Flow

1. User reviews an existing grounded answer artifact in the Ask UI and explicitly chooses archive as `synthesis` or `note`.
2. Archive API validates the request and delegates to the answer archive service.
3. Archive service loads the answer artifact, rejects already archived or insufficient answers, and derives archive metadata such as title, slug, `source_refs`, and `page_refs`.
4. Archive service creates a new wiki page through the existing template-backed wiki creation path.
5. Archive service replaces the template body with structured archived content containing the original question, answer sections, citations, caveats, follow-up questions, and archive provenance.
6. Archive service updates the answer artifact row with the new archived page id.
7. Archive service refreshes wiki metadata, links, backlinks, and runtime FTS state so the archived page is immediately available to the wiki browser and future Ask retrieval.
8. Ask UI reloads the updated answer artifact and links directly to the archived wiki page.

## Milestone 8 Audit Flow

1. User opens the Audits surface and explicitly triggers one audit mode.
2. Audit API validates the request and delegates to the audit service.
3. Audit service refreshes wiki index state, loads current wiki pages, links, source summaries, structured extractions, and claims as needed for the selected mode.
4. Deterministic detection rules produce conservative findings with severity, notes, and related page or source references.
5. Audit service writes a markdown report into `audits/` and persists a matching `audit_runs` row with structured findings and report path.
6. Audit list and detail APIs read those persisted records and report files for the UI.
7. Audits UI renders run history plus detailed findings without mutating wiki content or spawning background workers.

## Milestone 9 Hardening Flow

1. Dashboard APIs aggregate workspace status, core content counts, and recent local activity from existing files and SQLite tables.
2. Client UI surfaces use shared user-facing error formatting so local setup and provider issues are easier to correct.
3. Demo seed tooling rebuilds a deterministic local workspace from visible files under `demo-data/`, driving the same product services that power the live app.
4. Automated tests exercise the main loops while smoke checks validate a demoable local product path.
5. Docs and README are updated to match the shipped architecture, setup steps, demo flow, and known limitations.

## Navigation Strategy

The product shell includes the full future product surface:

- Onboarding
- Dashboard
- Sources
- Wiki
- Review Queue
- Ask
- Audits
- Settings

Milestone 1 replaces the Wiki placeholder with a real three-pane browser/editor and keeps the other future sections deferred.

Milestone 2 replaces the Sources placeholder with a real import and detail surface while keeping compile, review, ask, and audit sections deferred.

Milestone 3 keeps the Sources surface as the compilation staging area by adding visible summary artifacts there, while still deferring candidate recall, patch planning, review, ask, and audit workflows.

Milestone 4 activates the Review Queue as the first reviewable compile output while still deferring patch apply, ask, and audit flows.

Milestone 5 upgrades the Review Queue into the explicit human gate for wiki mutation while still deferring ask, archive, and audit flows.

Milestone 6 replaces the Ask placeholder with a wiki-first answer surface while still deferring answer archive and audit workflows.

Milestone 7 extends the Ask surface with explicit archive controls while still deferring audits and any external publishing or collaboration features.

Milestone 8 replaces the Audits placeholder with a real inspection surface while still deferring remediation automation, publishing, and collaboration features.

Milestone 9 replaces remaining placeholder framing, especially on the dashboard and documentation layer, so the product reads as one coherent MVP rather than a milestone scaffold.
