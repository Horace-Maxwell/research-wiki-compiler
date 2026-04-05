# Progress Log

This document is the historical build log for the product. It is intentionally milestone-oriented, while [README.md](../README.md) explains the current MVP as an external-facing repository entry point.

## Milestone 0

Status: Completed

### Goal

Create a runnable local-first app foundation with workspace initialization, SQLite plus Drizzle setup, settings persistence, and the base product shell.

### Completed Tasks

1. Create product and architecture docs.
2. Scaffold the Next.js application and baseline UI tooling.
3. Add SQLite plus Drizzle configuration and schema.
4. Implement workspace init and status APIs.
5. Implement settings persistence inside the workspace.
6. Build the base layout and onboarding page.
7. Generate the initial Drizzle migration.
8. Smoke test the app and document current limitations.

### Built In This Milestone

- Next.js App Router app with a desktop-first shell and stable product navigation
- workspace onboarding and dashboard views backed by live API calls
- path-safe workspace initialization with idempotent directory and seed file creation
- prompt template scaffolding in both the repo and initialized workspaces
- SQLite plus Drizzle schema for the full core domain model
- workspace settings persistence at `.research-wiki/settings.json`
- optional git initialization during workspace bootstrap
- one initial unit test around workspace path safety

### Verification

- `npm run lint`
- `npm test`
- `npm run build`
- local smoke test of `GET /api/workspace/status`
- local smoke test of `POST /api/workspace/init`

### Known Limitations

- The active workspace path is tracked in browser local storage for Milestone 0 instead of a dedicated app-level persistence layer.
- Placeholder routes exist for the future product surfaces, but they do not implement their milestone logic yet.
- FTS5 tables and retrieval indexes are intentionally deferred until the wiki/browser milestone.

### Explicitly Deferred

- source ingestion and normalization
- wiki page parsing and editing
- patch proposal generation
- question answering
- answer archival
- audits beyond structural placeholders

### Next Milestone Plan

Milestone 1 will implement the wiki browser and markdown/file infrastructure:

1. Markdown page discovery and frontmatter parsing
2. wiki page listing and detail APIs
3. markdown rendering and wikilink navigation
4. file-backed page creation flow
5. first integration tests for workspace file and wiki DB synchronization

## Milestone 1

Status: Completed

### Goal

Implement the real wiki browser and markdown/file infrastructure without drifting into sources, compilation, review, ask, archive, or audits.

### Completed Tasks

1. Add wiki-safe file utilities and frontmatter parsing/validation.
2. Add page type inference and template-backed page creation.
3. Discover and index wiki pages and page links in SQLite.
4. Add wikilink parsing, resolution, unresolved link reporting, and backlinks.
5. Replace the Wiki placeholder with a real browse/edit UI.
6. Add zod-validated wiki APIs for list, detail, create, update, and refresh-links.
7. Add tests for frontmatter, wikilinks, discovery, file safety, and create/save integration.

### Built In This Milestone

- file-backed wiki discovery from `wiki/index.md` and the typed wiki folders
- frontmatter parsing, validation, serialization, and path-derived page type inference
- workspace-safe wiki markdown read and write utilities
- deterministic wiki metadata and link indexing in SQLite
- wikilink parsing, resolution, unresolved link detection, and backlink calculation
- real `/wiki` browser/editor UI with page tree, rendered markdown, metadata, links, and plain markdown editing
- template-backed page creation flow
- wiki APIs for list, detail, create, update, and refresh-links
- unit and integration tests for the Milestone 1 wiki behaviors

### Verification

- `npm run lint`
- `npm test`
- `npm run build`
- local smoke test of `GET /api/wiki/pages`
- local smoke test of `POST /api/wiki/pages`
- local smoke test of `PUT /api/wiki/pages/:id`
- local smoke test of `GET /api/wiki/pages/:id`

### Known Limitations

- Saving raw markdown normalizes frontmatter formatting and updates `updated_at`; it does not preserve custom YAML formatting exactly.
- Changing a page slug or type by editing raw markdown is intentionally rejected in Milestone 1.
- The wiki UI currently refreshes by request rather than using optimistic caching or background watchers.
- Production builds now complete cleanly with static repo-asset path resolution and Turbopack tracing hints for dynamic workspace file access.

### Explicitly Deferred

- source import and normalization
- source summarization
- patch proposal generation
- patch application
- ask pipeline
- answer archival
- audits

### Next Milestone Plan

Milestone 2 will begin the source side of the product:

1. source import entry points
2. normalization and structured source records
3. visible raw-to-processed file movement
4. source detail views and source metadata
5. first compile scaffolding without patch generation yet

## Milestone 2

Status: Completed

### Goal

Implement source import entry points and deterministic raw-source normalization without drifting into summarization, extraction, patching, ask, archive, or audits.

### Completed Tasks

1. Extend source schema and contracts for richer document and chunk metadata.
2. Add path-safe source staging and file movement utilities for inbox, processed, and rejected.
3. Implement source import orchestration for pasted text, browser-provided file content, and local file paths.
4. Implement deterministic normalization and chunking.
5. Add source list, detail, and reprocess services plus zod-validated APIs.
6. Replace the Sources placeholder with a real browser and import UI.
7. Add tests for validation, normalization, checksum, token estimation, chunking, transitions, persistence, and integration flow.

### Built In This Milestone

- source import contracts and APIs for pasted text, browser-selected text or markdown files, and local file path ingestion
- visible raw-source filesystem flow across `raw/inbox`, `raw/processed`, and `raw/rejected`
- richer `SourceDocument` persistence for checksums, token estimates, normalized paths, failure metadata, and deterministic processing versioning
- deterministic normalization for newline cleanup, frontmatter stripping, title inference, checksum generation, and token estimation
- deterministic `SourceChunk` persistence with offsets, checksums, and stable chunk ordering
- real `/sources` browser UI with import controls, filters, normalized preview, chunk metadata, and explicit reprocess action
- additional unit and integration coverage for source file safety and end-to-end import plus detail retrieval

### Verification

- `npm run db:generate`
- `npm run lint`
- `npm test`
- `npm run build`
- live smoke test of `POST /api/workspace/init`
- live smoke test of `POST /api/sources/import`
- live smoke test of `GET /api/sources`
- live smoke test of `GET /api/sources/:id`
- live smoke test of `POST /api/sources/:id/reprocess`

### Known Limitations

- Supported imports in Milestone 2 are intentionally text-first: pasted text, markdown files, txt files, and local file paths to those formats.
- Browser file imports are read client-side and sent as text content; multipart upload infrastructure is still deferred.
- Reprocessing creates a fresh processed artifact and normalized file while preserving prior processed files on disk for inspectability.
- The Sources UI is request-driven and does not watch the workspace for filesystem changes yet.

### Explicitly Deferred

- source summaries
- entity extraction
- concept extraction
- claim extraction
- candidate page selection
- patch proposal generation
- patch application
- ask pipeline
- answer archival
- audits

### Next Milestone Plan

Milestone 3 will start the actual compile path on top of the raw-source substrate:

1. source summarization with visible prompts
2. structured summary artifacts tied back to source records
3. compilation-oriented metadata for later patch planning
4. initial bridge from normalized sources into the future wiki update loop

## Milestone 3

Status: Completed

### Goal

Implement source summary compilation for normalized processed sources with visible markdown and JSON artifacts, structured extraction outputs, and summary run observability, without drifting into page selection, patching, ask, archive, or audits.

### Completed Tasks

1. Extend settings, contracts, and schema for summary metadata and provider configuration.
2. Implement prompt loading and prompt hash tracking for `prompts/source_summarizer.md`.
3. Add summarization provider adapters for OpenAI and Anthropic.
4. Build a processed-source summarization service with strict result validation and artifact persistence.
5. Record summarization runs in `job_runs` with status, duration, retries, provider, model, and error metadata.
6. Add summarize and resummarize APIs and enrich source detail retrieval.
7. Enhance the Sources UI to display summary status, artifact content, extracted structure, and failure states.
8. Add tests for prompt loading, provider config validation, parsing, artifact persistence, transitions, and integration flow.

### Built In This Milestone

- workspace-backed summarization provider configuration with OpenAI and Anthropic settings
- visible prompt loading and prompt hash tracking for `prompts/source_summarizer.md`
- summarization-only provider abstraction for structured source summary output
- source summary pipeline for processed normalized sources, including chunk-aware staged summarization for longer inputs
- visible markdown and JSON summary artifacts written into `raw/processed/summaries/`
- minimal summary metadata on `source_documents` plus source-linked `job_runs` observability
- structured extraction persistence through summary JSON artifacts and DB-backed entities, concepts, and claims
- Sources UI support for summarize and resummarize, summary failure visibility, summary markdown, and extracted entities, concepts, claims, questions, and page hints
- Settings UI and API support for workspace-local provider keys and models

### Verification

- `npm run db:generate`
- `npm run lint`
- `npm test`
- `npm run build`
- live smoke test of `GET /api/settings`
- live smoke test of `PUT /api/settings`
- live smoke test of `POST /api/sources/import`
- live smoke test of `POST /api/sources/:id/summarize` failure path with missing API key
- live smoke test of `GET /api/sources/:id` showing failed summary status after summarize attempt

### Known Limitations

- Live successful summarization still requires a real provider API key and model in workspace settings; automated verification uses mocked provider responses instead.
- OpenAI and Anthropic integrations are intentionally narrow and purpose-built for source summarization rather than generic chat or agent loops.
- Summary artifacts currently represent the latest compiled summary for a source; prior summary versions are not snapshot-managed yet.
- The Sources and Settings UIs remain request-driven and do not sync workspace file changes in real time.

### Explicitly Deferred

- candidate page selection
- patch proposal generation
- patch application
- wiki page mutation from summaries
- ask pipeline
- answer archival
- audits

### Next Milestone Plan

Milestone 4 will consume the summary layer to begin actual wiki update planning:

1. candidate page recall
2. lightweight page-selection heuristics grounded in wiki structure and source summaries
3. early patch planning inputs without silent wiki mutation
4. stronger bridge from compiled source artifacts into reviewable knowledge updates

## Milestone 4

Status: Completed

### Goal

Implement candidate page recall and reviewable patch proposal generation from summarized sources without applying any patch to wiki pages.

### Completed Tasks

1. Add deterministic wiki candidate recall for summarized sources.
2. Implement `prompts/patch_planner.md` as a strict visible planner contract.
3. Generate structured patch proposals with risk, rationale, affected sections, citations, and conflict notes.
4. Persist proposal markdown and JSON artifacts under `reviews/pending/`.
5. Add proposal metadata and generation job logging in SQLite.
6. Add source-to-proposal planning API and review queue read APIs.
7. Replace the Reviews placeholder with a real review queue UI.
8. Add tests for recall, proposal generation, artifact persistence, and review retrieval.

### Built In This Milestone

- deterministic candidate page recall over wiki title and alias matches, concept and entity overlap, on-demand SQLite FTS5 search, and wiki link neighborhood signals
- visible planner prompt contract in `prompts/patch_planner.md`
- structured patch proposal generation for summarized sources using the existing provider abstraction
- one file-backed review artifact per proposal item under `reviews/pending/` as markdown plus JSON
- persisted proposal metadata in `patch_proposals`, draft hunk persistence in `patch_hunks`, and job-run tracking for recall plus planning
- `POST /api/sources/:id/plan-patches`, `GET /api/reviews`, and `GET /api/reviews/:id`
- a real Review Queue UI with pending proposal list, artifact detail, candidate recall context, supporting claims, and conflict notes
- a source-side planning action that can generate proposals without mutating any wiki page

### Verification

- `npm run db:generate`
- `npm run lint`
- `npm test`
- `npm run build`

### Known Limitations

- Successful patch planning still requires a configured provider API key and model; automated verification uses mocked provider responses.
- Candidate recall is intentionally transparent and deterministic, but still heuristic rather than semantically deep.
- Replanning currently replaces prior proposals for the same source instead of preserving a longer proposal history.
- Review queue actions remain read-only in Milestone 4; no approve, reject, or edit flows exist yet.

### Explicitly Deferred

- patch apply
- wiki markdown mutation
- approve or reject flows that touch wiki content
- ask pipeline
- answer archival
- audits

### Next Milestone Plan

Milestone 5 will begin controlled wiki mutation on top of the review queue:

1. proposal approval and rejection flows
2. section-level patch apply into wiki markdown files
3. wiki index refresh after approved changes
4. optional git commit hooks for accepted knowledge mutations

## Milestone 5

Status: Completed

### Goal

Implement explicit review actions and a safe, traceable patch apply path that turns pending proposals into precise wiki mutations without drifting into ask, archive, or audit behavior.

### Completed Tasks

1. Add approve, reject, and edit-and-approve review APIs and contracts.
2. Extend proposal persistence with review and apply metadata.
3. Implement a deterministic patch apply service and section-level mutation helpers.
4. Support create-page proposal application from wiki templates.
5. Move proposal artifacts between pending, approved, and rejected review history folders.
6. Refresh wiki metadata, page links, and runtime FTS state after apply.
7. Add optional git commit-on-apply support through workspace settings.
8. Upgrade the Review Queue UI from read-only to actionable with diffs and apply results.
9. Add tests for review actions, patch application, safe mutation boundaries, artifact lifecycle, and integration flow.

### Built In This Milestone

- actionable Review Queue UI with approve, reject, and edit-and-approve flows
- deterministic patch apply service with section-level insert, replace, append, create-section, and conflict-note behavior
- proposal artifact movement across `reviews/pending/`, `reviews/approved/`, and `reviews/rejected/`
- create-page apply path from wiki templates with index refresh and refreshed page metadata
- optional git commit-on-apply support that never blocks a successful wiki mutation
- apply result and review metadata surfaced through DB records, API detail responses, and review artifacts
- unit and integration coverage for review actions, patch mutation safety, artifact lifecycle, and end-to-end approval flow

### Verification

- `npm run db:generate`
- `npm run lint`
- `npm test`
- `npm run build`

### Known Limitations

- Git commit results are surfaced through persisted review metadata and API detail responses, while the approved artifact markdown keeps a summarized git status line rather than a full post-commit rewrite.
- Patch apply remains intentionally conservative and fails rather than widening scope when local anchors or safe section matches are unavailable.
- Review and apply flows are request-driven and do not stream incremental job status updates yet.

### Explicitly Deferred

- ask pipeline
- answer archival
- audits

### Next Milestone Plan

Milestone 6 will activate question answering on top of the compiled wiki:

1. wiki-first retrieval
2. source-summary fallback
3. raw-chunk fallback only when needed
4. cited answer generation and answer artifact persistence
5. a real Ask UI without answer archive yet

## Milestone 6

Status: Completed

### Goal

Implement the Ask pipeline, retrieving from compiled wiki pages first, then source summaries, then raw chunks only as fallback, and produce cited answer artifacts without answer archiving yet.

### Completed Tasks

1. Make retrieval order explicit in code and docs: wiki first, summaries second, chunks last.
2. Implement retrieval services for wiki pages, source summaries, and raw chunks.
3. Implement prompt-backed answer generation with structured cited output.
4. Persist answer artifacts and answer run metadata.
5. Replace the Ask placeholder with a real question-and-answer interface.
6. Add tests for retrieval ordering, fallback behavior, insufficient knowledge, persistence, and end-to-end ask flow.

### Built In This Milestone

- explicit wiki-first retrieval over wiki pages, source summaries, and raw chunks with deterministic fallback rules
- visible answer prompt contract in `prompts/answerer.md`
- answer generation service with structured short answer, detailed synthesis, citations, caveats, based-on pages, and follow-up questions
- deterministic insufficient-knowledge handling when the workspace lacks grounded evidence
- persisted `answer_artifacts` rows and answer-run metadata in `job_runs`
- real Ask UI with answer rendering, citations, based-on pages, caveats, and retrieval-layer visibility
- lightweight answer detail retrieval support for persisted artifacts
- unit and integration coverage for retrieval order, fallback behavior, answer persistence, and Ask UI rendering

### Verification

- `npm run db:generate`
- `npm run lint`
- `npm test`
- `npm run build`

### Known Limitations

- Answer artifacts are persisted in SQLite in Milestone 6, but archive into the file-backed wiki is still deferred until the next milestone.
- Raw chunk fallback remains intentionally simple and deterministic rather than semantic or embedding-based.
- The Ask surface is answer-artifact oriented and does not retain a multi-turn chat transcript.

### Explicitly Deferred

- answer archive
- audits
- generic chat behavior

### Next Milestone Plan

Milestone 7 will close the answer-to-wiki flywheel:

1. explicit archive action from answer artifact to wiki page
2. synthesis and note page creation from templates
3. answer artifact linkage back to archived wiki pages
4. immediate reindexing so archived pages re-enter wiki browsing and Ask retrieval

## Milestone 7

Status: Completed

### Goal

Implement answer archive so valuable answer artifacts can be explicitly turned into durable synthesis pages or note pages that immediately re-enter the compiled wiki.

### Completed Tasks

1. Add strict archive request and response contracts plus `POST /api/answers/:id/archive`.
2. Implement an answer archive service that creates template-backed synthesis or note pages from persisted answer artifacts.
3. Update answer artifact hydration so Ask can display archived-page status and navigation.
4. Refresh wiki metadata, links, backlinks, and FTS state immediately after archive.
5. Extend the Ask UI with synthesis or note archive controls and clear success or failure states.
6. Add tests for archive flows, frontmatter validity, reindexing, wiki visibility, and future retrieval from archived pages.

### Built In This Milestone

- explicit archive action from Ask into template-backed synthesis and note pages
- answer archive service with grounded-only archive rules and visible provenance
- answer artifact linkage back to archived wiki pages through persisted page ids
- immediate post-archive wiki metadata, link, backlink, and FTS refresh
- Ask UI archive controls, archive state visibility, and archived-page navigation
- integration and UI coverage for answer archive and re-entry into future retrieval

### Verification

- `npm run lint`
- `npm test`
- `npm run build`

### Known Limitations

- Archived answer titles are derived deterministically and are not user-editable yet at archive time.
- A single answer artifact archives once; duplicate multi-page archive flows are intentionally deferred.
- Audit inspection remains deferred until the next milestone.

### Explicitly Deferred

- audits
- publishing and external sync
- collaboration flows

### Next Milestone Plan

Milestone 8 will add the inspection layer over the compiled wiki:

1. contradiction, coverage, orphan, stale, and unsupported-claims audits
2. markdown report persistence under `audits/`
3. audit run history and detail browsing in the UI
4. conservative structural findings without autonomous remediation

## Milestone 8

Status: Completed

### Goal

Implement audits that inspect the compiled wiki and source-backed knowledge base for contradictions, coverage gaps, stale pages, orphan pages, and unsupported claims.

### Completed Tasks

1. Add strict audit request and response contracts plus audit list and detail contracts.
2. Implement deterministic audit detection for contradiction, coverage, orphan, stale, and unsupported-claims modes.
3. Persist markdown reports under `audits/` and matching audit records in SQLite.
4. Add `POST /api/audits/run`, `GET /api/audits`, and audit detail retrieval support.
5. Replace the Audits placeholder with a real audit browser showing history and findings.
6. Add tests for each audit mode, report persistence, DB persistence, and an end-to-end audit viewing path.

### Built In This Milestone

- deterministic audit execution for contradiction, coverage, orphan, stale, and unsupported-claims modes
- markdown report persistence under `audits/` plus SQLite-backed audit history and structured findings
- audit list, detail, and explicit run APIs
- real Audits UI with run controls, history, severity visibility, related page or source references, and raw report inspection
- service and UI coverage for audit generation and browsing

### Verification

- `npm run lint`
- `npm test`
- `npm run build`

### Known Limitations

- Audit findings are conservative heuristics and intentionally do not claim certainty beyond the underlying local signals.
- Audit findings remain inspection-only; remediation and audit-to-patch conversion are still deferred.
- Build output is clean after scoping repo asset paths statically and marking dynamic workspace path resolution as intentional.

### Explicitly Deferred

- autonomous remediation
- background scheduling
- publishing and external sync
- collaboration flows

### Next Milestone Plan

Milestone 9 will harden the shipped product into a credible MVP:

1. improve error, loading, and empty states
2. replace remaining placeholder framing with real dashboard and visibility improvements
3. add a reproducible demo dataset and demo-reset tooling
4. strengthen test coverage and smoke checks across the main loops
5. finish README and final product documentation

## Milestone 9

Status: Complete

### Goal

Harden the product into a real demoable MVP with better errors, better logs visibility, stronger tests, a useful demo dataset, and polished documentation.

### Delivered

1. Improve user-facing loading, empty, and failure states across existing surfaces.
2. Replace the placeholder-oriented dashboard with a real workspace overview and recent local activity view.
3. Add lightweight logs or recent-activity APIs and UI visibility using existing persisted state.
4. Add a reproducible demo seed or reset flow and improve the checked-in demo workspace content.
5. Strengthen automated coverage and add final smoke-path verification.
6. Rewrite README and refresh core docs to reflect the shipped MVP and known limitations.

### Built

1. Added a real dashboard overview backed by existing SQLite and file artifacts, including recent local activity and health counters for wiki pages, sources, reviews, answers, and audits.
2. Added lightweight logs visibility through `/api/dashboard` and `/api/logs` without introducing a new telemetry subsystem.
3. Tightened user-facing copy and feedback handling across the shipped UI so the product reads like one coherent MVP rather than a milestone scaffold.
4. Added `demo-data/` plus `npm run demo:reset`, which rebuilds the ignored local `demo-workspace/` through the real product services.
5. Extended automated coverage with workspace-init, dashboard/log integration, and dashboard UI tests on top of the earlier loop coverage.
6. Rewrote the README and refreshed M9 docs so setup, demo flow, provider configuration, verification, and known limitations match the shipped system.

### Remaining Known Gaps

- Live summarize, patch-planning, and Ask reruns still require user-supplied provider credentials.
- The MVP remains single-user and local-only.
- Audit remediation and broader automation remain intentionally out of scope.

## Repository Launch Prep

Status: Complete for local preparation

### Goal

Prepare the repository for a future GitHub push with consistent launch docs, community files, and repository metadata.

### Delivered

1. Rewrote the README to read like a strong GitHub project page and switched repo-facing links to relative paths.
2. Added community and policy files including contributing, conduct, security, support, citation, licensing, and code ownership metadata.
3. Added GitHub issue templates, a PR template, and a conservative CI workflow.
4. Added release and launch checklists covering license, security, secrets review, screenshots, and repository settings to enable after publishing.
5. Audited the repo for local absolute paths, accidental secrets, oversized tracked files, and machine-specific metadata; fixed safe issues directly.

### Founder Decisions Still Required

- screenshots or a decision to keep screenshot placeholders at first push
- exact public-launch timing and visibility change from private to public
