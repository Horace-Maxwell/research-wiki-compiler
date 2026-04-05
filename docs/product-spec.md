# Research Wiki Compiler Product Spec

## Product Positioning

Research Wiki Compiler is a local-first knowledge compiler for a single research-oriented user. It ingests source material, compiles that material into a durable Markdown wiki, proposes reviewable knowledge updates, answers questions from the compiled wiki first, and archives valuable answers back into the wiki.

This product is not a generic chat-with-files application. The primary artifact is a workspace of inspectable files backed by a lightweight local runtime index.

## Document Note

This document serves two audiences:

- builders who want the current MVP behavior and product constraints in one place
- future external readers who need the historical milestone boundaries to understand how the product was intentionally shaped

For repository launch preparation, also see [release-checklist.md](release-checklist.md) and [github-launch-checklist.md](github-launch-checklist.md).

## Milestone 0 Scope

Milestone 0 established the runnable foundation:

- Next.js App Router application skeleton
- local workspace initialization flow
- SQLite plus Drizzle runtime foundation
- settings persistence in the workspace
- base navigation and desktop-first shell
- architecture and product documentation

## Milestone 1 Scope

Milestone 1 implements the real wiki browser and markdown/file infrastructure only:

- markdown file loading from `WORKSPACE_ROOT/wiki`
- frontmatter parsing, validation, and serialization
- page type inference from folder structure and frontmatter
- workspace-safe wiki file read and write utilities
- wiki page discovery and deterministic SQLite metadata sync
- wikilink parsing and resolution
- unresolved link and backlink visibility
- real wiki browser UI with reading and plain markdown editing
- page creation from templates

Milestone 1 explicitly does not implement source import, source summaries, patch generation, patch apply, answering, archival, or audits.

## Milestone 2 Scope

Milestone 2 implements raw-source intake and deterministic normalization only:

- import entry points for pasted text, markdown files, text files, and local file paths
- raw source movement through `raw/inbox`, `raw/processed`, and `raw/rejected`
- deterministic normalization into inspectable text or markdown-compatible files
- `SourceDocument` and `SourceChunk` persistence for later compilation stages
- source browser and detail UI for imported material

Milestone 2 explicitly does not implement source summarization, entity extraction, concept extraction, claim extraction, candidate page selection, patch generation, patch apply, answering, archival, or audits.

## Milestone 3 Scope

Milestone 3 implements source summary compilation for normalized processed sources only:

- provider-backed summarization with OpenAI or Anthropic configured from workspace settings
- visible prompt loading from `prompts/source_summarizer.md`
- prompt hash or version tracking for every summary run
- summary compilation that produces a concise summary plus structured entities, concepts, claims, open questions, and lightweight target page hints
- visible summary artifacts on the workspace filesystem as markdown plus JSON
- summary status, artifact metadata, and job logging in SQLite
- Sources UI actions and detail views for summarize and resummarize

Milestone 3 explicitly does not implement candidate page selection, patch generation, patch apply, wiki mutation from summaries, answering, archival, or audits.

## Milestone 4 Scope

Milestone 4 implements candidate page recall and reviewable patch proposal generation only:

- deterministic candidate page recall from summarized sources
- visible prompt loading from `prompts/patch_planner.md`
- strict structured patch proposal generation with target pages, rationale, affected sections, citations, conflict notes, and risk
- proposal artifact persistence on the workspace filesystem as markdown plus JSON
- one review artifact per proposal item under `reviews/pending/`, so the queue stays explicit and file-backed
- patch proposal metadata and generation job logging in SQLite
- Review Queue UI for inspecting pending proposals
- a source-side action that can turn a summarized source into pending review items without mutating wiki pages

Milestone 4 explicitly does not implement patch apply, wiki markdown mutation, ask, archival, or audits.

## Milestone 5 Scope

Milestone 5 implements reviewed patch application only:

- approve, reject, and edit-and-approve review actions on persisted proposals
- deterministic patch apply through a dedicated service rather than ad hoc route or UI writes
- section-level wiki mutation with explicit failure on unsafe applies
- create-page proposal application using wiki templates
- proposal artifact lifecycle movement into `reviews/approved/` and `reviews/rejected/`
- wiki metadata, link, and FTS refresh after successful apply
- optional git commit integration for successful applies
- actionable Review Queue UI with diff visibility and apply results

Milestone 5 explicitly does not implement ask, answer archival, or audits.

## Milestone 6 Scope

Milestone 6 implements the Ask pipeline and cited answer artifact persistence only:

- retrieval policy that explicitly checks wiki pages first, source summaries second, and raw chunks only as a fallback
- deterministic retrieval services for wiki page recall, source summary recall, and fallback chunk recall using existing SQLite metadata and FTS infrastructure
- prompt-backed answer generation using `prompts/answerer.md`
- structured answer output with short answer, detailed synthesis, citations, caveats, based-on pages, and suggested follow-up questions
- persisted answer artifacts in SQLite for later archive work
- Ask UI for asking a question, reading the answer, and inspecting citations and insufficiency states
- answer run logging in `job_runs`

Milestone 6 explicitly does not implement answer archive, audits, publishing, or generic chat behavior.

## Milestone 7 Scope

Milestone 7 implements explicit answer archive into the local wiki only:

- user-triggered archive of an answer artifact as either a synthesis page or a note page
- template-backed page creation under `wiki/syntheses/` or `wiki/notes/`
- archive page content that includes the original question, short answer, detailed answer, citations, caveats, and follow-up questions
- frontmatter updates that preserve `source_refs`, `page_refs`, timestamps, and archive provenance
- answer artifact updates that point back to the archived wiki page
- immediate wiki metadata, link, and FTS refresh after archive
- Ask UI archive controls and archive status visibility

Milestone 7 explicitly does not implement audits, publishing, collaboration flows, or external sync.

## Milestone 8 Scope

Milestone 8 implements deterministic audit inspection and reporting only:

- contradiction audit for conflicting claims, polarity, or time-sensitive tensions
- coverage audit for frequently surfaced entities or concepts that still lack durable wiki coverage
- orphan audit for pages with no meaningful inbound or outbound wiki connectivity
- stale audit for older pages that remain heavily referenced
- unsupported claims audit for pages or claim-heavy content that lack adequate source grounding
- markdown report persistence under `audits/`
- audit run persistence in SQLite
- Audits UI for history and finding detail

Milestone 8 explicitly does not implement autonomous remediation, background scheduling, publishing, or collaboration flows.

## Milestone 9 Scope

Milestone 9 hardens the existing product into a real demoable MVP:

- improve reliability, empty states, loading states, and user-facing failure messages across the existing product surfaces
- add lightweight logs or recent-activity visibility without introducing new infrastructure
- strengthen test coverage and stability across the main workspace, wiki, source, review, ask, archive, and audit loops
- add a reproducible demo dataset and easy local demo reset path
- complete README and core docs, including provider setup, demo workflow, and known limitations
- run a final consistency and verification pass without introducing new product surfaces

Milestone 9 explicitly does not add new workflows, collaboration, cloud sync, background schedulers, or non-essential infrastructure.

## Primary User

A solo researcher, writer, engineer, or product thinker who:

- imports a steady stream of source material over time
- wants a durable knowledge base made of files
- values inspectable provenance and explicit review
- revisits the same themes and questions repeatedly

## Core Product Principles

1. Local-first: user knowledge lives in a local workspace by default.
2. File-first: Markdown, JSON, CSV, and image files are the source of truth.
3. Review-first: mutations to compiled knowledge are reviewed, not silently applied.
4. Cumulative memory: the system updates and maintains existing pages over time.
5. Agent-readable structure: pages, links, and templates must be easy for agents to traverse.
6. Human-in-the-loop: user approval is required for durable wiki mutation.
7. Provenance visibility: conclusions should point back to sources and citations.
8. Minimal architecture: choose the simplest architecture that supports the workflow well.

## MVP Workflow Loops

### Loop A: Compile

Import source -> normalize -> summarize -> extract structure -> select candidate pages -> draft patch proposal -> queue for review

### Loop B: Review

Review proposal -> approve or reject or edit -> apply patch -> update wiki files -> refresh runtime index

### Loop C: Ask

Question -> retrieve wiki pages first -> supplement with source summaries -> fallback to raw chunks if required -> produce cited answer -> optionally archive answer

### Loop D: Audit

Run audit -> detect knowledge issues -> generate human-readable report -> optionally convert findings into patch proposals

## Workspace Contract

The product manages a workspace with this structure:

```text
WORKSPACE_ROOT/
  raw/
    inbox/
    processed/
    rejected/
    images/
  wiki/
    index.md
    topics/
    entities/
    concepts/
    timelines/
    syntheses/
    notes/
  reviews/
    pending/
    approved/
    rejected/
  audits/
  exports/
  prompts/
  .research-wiki/
    app.db
    cache/
    runs/
    snapshots/
    settings.json
```

Milestone 0 must be able to create this structure idempotently.

Milestone 1 must treat `wiki/` as the durable file-backed knowledge surface and keep the SQLite wiki index synchronized deterministically from those files.

Milestone 2 must treat `raw/` as the visible intake pipeline for later compilation work and keep normalization outputs inspectable and deterministic.

Milestone 3 must treat summaries as intermediate compiled artifacts that remain visible on disk, traceable to prompts and models, and consumable by later page-selection and patch-planning stages.

Milestone 4 must treat patch proposals as file-backed review artifacts that explain why pages were targeted and what changes are proposed, without mutating the wiki yet.

Milestone 6 must treat answer artifacts as persisted runtime products of wiki-first retrieval, grounded in visible compiled knowledge and later suitable for answer archival without introducing archive behavior yet.

Milestone 7 must treat archived answers as explicit human-approved additions to the file-backed wiki so they re-enter the compiled knowledge base immediately after creation.

Milestone 8 must treat audits as inspectable, conservative reporting passes over the current local knowledge base rather than as hidden automation.

Milestone 9 must treat the product as a coherent MVP rather than a sequence of milestone demos, so copy, docs, demo data, and verification must reflect the shipped system as a whole.

## Milestone 0 Decisions

- The application is a local full-stack monolith built with Next.js App Router and TypeScript.
- The first-run experience is workspace-driven, not chat-driven.
- SQLite is the only runtime database in v1.
- Drizzle ORM is used for schema definition and migrations.
- Settings are stored in the workspace at `.research-wiki/settings.json`.
- All filesystem writes must go through a path-safe workspace utility.
- Git initialization is offered during workspace initialization and defaults to enabled.

## Milestone 1 Deliverables

- file-backed wiki page discovery from `wiki/index.md` and the typed wiki folders
- validated frontmatter contract for wiki pages
- deterministic wiki metadata and link indexing in SQLite
- usable wiki browser UI with page tree, render view, metadata panel, and wikilink navigation
- page create and save APIs plus plain markdown editing UI
- tests for frontmatter, wikilinks, discovery, safe file IO, and create/save flow

## Milestone 1 Acceptance Criteria

- The user can browse pages from the local workspace wiki.
- The user can navigate by clicking resolved wikilinks.
- The user can see unresolved links and backlinks for a page.
- The user can create a page from a template and save it as a real markdown file.
- The user can edit an existing page and save changes back to disk.
- Saving reindexes wiki page metadata and link relationships in SQLite.
- The implementation remains local-first, file-first, and does not add source or answer pipelines.

## Milestone 2 Deliverables

- source import APIs and UI entry points for pasted text and supported local text or markdown files
- deterministic normalization and chunking pipeline
- visible raw file movement through inbox, processed, and rejected folders
- richer `SourceDocument` and `SourceChunk` records in SQLite
- sources list and detail views with metadata, preview, and reprocess action
- tests for validation, normalization, chunking, transitions, persistence, and source detail retrieval

## Milestone 2 Acceptance Criteria

- The user can import pasted text and supported local markdown or text inputs.
- Every import lands in `raw/inbox` first.
- Successful normalization moves the source into `raw/processed` and persists normalized output plus chunks.
- Failed imports move the staged file into `raw/rejected` and persist a rejected source record.
- The Sources UI clearly shows source status, type, import date, normalized preview, chunk count, token estimate, and file paths.
- The implementation stays deterministic, local-first, file-first, and free of summarization or patch logic.

## Milestone 3 Deliverables

- summarization provider abstraction with OpenAI and Anthropic support
- prompt-backed summary execution using `prompts/source_summarizer.md`
- summary artifact persistence as markdown and JSON files inside the workspace
- structured extraction outputs for entities, concepts, claims, open questions, and lightweight page hints
- SourceDocument summary metadata plus JobRun visibility for summarization runs
- Sources UI support for summarize and resummarize plus rendered summary detail
- tests for prompt loading, provider configuration, result parsing, artifact persistence, status transitions, retry handling, and source-detail summary retrieval

## Milestone 3 Acceptance Criteria

- Only processed normalized sources can be summarized.
- The user can inspect both markdown and JSON summary artifacts on disk and in the UI.
- The summarization run records provider, model, prompt hash or version, retries, duration, and status.
- Failed summarization runs leave visible error state without mutating wiki pages.
- The Sources UI clearly shows summary status, summary content, extracted structure, and summarize or resummarize actions.
- The implementation remains local-first, file-first, and does not add candidate page recall, patch planning, patch apply, ask, archive, or audits.

## Milestone 4 Deliverables

- deterministic candidate page recall from summary artifacts and wiki metadata
- `prompts/patch_planner.md` implemented as a visible structured-output contract
- structured patch proposal generation for existing pages and create-page suggestions
- proposal markdown and JSON artifact persistence under `reviews/pending/`
- PatchProposal persistence and lightweight review status management without wiki mutation
- Review Queue list and detail APIs plus a real review queue UI
- tests for recall, planner parsing, proposal persistence, review retrieval, and end-to-end proposal generation

## Milestone 4 Acceptance Criteria

- Only summarized sources can generate patch proposals.
- Candidate recall uses deterministic, inspectable signals and exposes why pages were targeted.
- Every proposal is persisted as both markdown and JSON in the workspace and represented in SQLite.
- The Review Queue clearly shows targets, rationale, affected sections, citations, conflicts, and create-page suggestions.
- No wiki markdown files are changed.
- The implementation remains local-first, file-first, and does not add patch apply, ask, archive, or audits.

## Milestone 5 Deliverables

- review action APIs for approve, reject, and edit-and-approve
- a deterministic patch apply service that consumes persisted proposals and hunks
- section-level mutation helpers for insert, replace, append, and create-section behavior
- create-page apply path from wiki templates with valid frontmatter and indexing
- proposal artifact movement from `reviews/pending/` to `reviews/approved/` or `reviews/rejected/`
- optional git commit-on-apply support through workspace settings
- upgraded Review Queue UI with diffs, editable hunk payloads, and apply results
- tests for review actions, patch apply behavior, artifact lifecycle, index refresh, and safe mutation boundaries

## Milestone 5 Acceptance Criteria

- Approving a proposal applies wiki mutation only through the patch apply service.
- Rejecting a proposal preserves the proposal artifact historically and does not mutate wiki files.
- Edit-and-approve can modify the persisted proposal payload before apply.
- Patch application strongly prefers section-level mutation and fails clearly when it cannot apply safely.
- Create-page proposals create valid wiki pages from templates and refresh the wiki browser state afterward.
- Successful applies update wiki frontmatter metadata, runtime DB metadata, links, and FTS state.
- Optional git commit failures are surfaced without rolling back a successful wiki apply.
- The implementation remains local-first, file-first, and does not add ask, archive, or audits.

## Milestone 6 Deliverables

- explicit retrieval services for wiki pages, source summaries, and fallback raw chunks
- `prompts/answerer.md` implemented as a real structured-output contract
- answer generation service that produces short answer, detailed synthesis, citations, caveats, based-on pages, and follow-up questions
- persisted `AnswerArtifact` records in SQLite with enough structured data for later archive work
- `POST /api/ask` and lightweight answer-detail retrieval support
- real Ask UI with question entry, answer rendering, citations, based-on pages, and insufficiency guidance
- tests for wiki-first retrieval, summary fallback, chunk fallback, insufficient knowledge, citation structure, persistence, and end-to-end ask behavior

## Milestone 6 Acceptance Criteria

- Asking a question retrieves compiled wiki pages before inspecting source summaries or raw chunks.
- Raw chunks are only used when the wiki and relevant summaries do not provide enough grounding.
- Every successful answer is persisted as a structured answer artifact with citations and based-on pages.
- Answers clearly surface caveats and insufficient-knowledge states, including what types of sources should be ingested next.
- The Ask UI presents compiled-knowledge answers rather than a generic chat transcript.
- The implementation remains local-first, file-first, and does not add answer archive or audits.

## Milestone 7 Deliverables

- explicit archive action for answer artifacts as either `synthesis` or `note`
- template-backed wiki page creation under `wiki/syntheses/` and `wiki/notes/`
- archive page content with question, short answer, detailed answer, citations, caveats, follow-up questions, and archive timestamps
- answer artifact updates that retain the archived page id and surface the archived page in API and UI responses
- `POST /api/answers/:id/archive` with strict zod validation
- Ask UI archive controls with visible success, failure, and already-archived states
- tests for synthesis archive, note archive, frontmatter validity, reindexing, wiki visibility, and future retrieval from archived pages

## Milestone 7 Acceptance Criteria

- A user can explicitly archive a grounded answer artifact as either a synthesis page or a note page from the Ask surface.
- Archive writes a valid markdown wiki page in the correct typed folder using the existing wiki template flow.
- Archived pages include citations, `source_refs`, `page_refs`, the original question, answer content, and archive timestamps.
- Successful archive updates the answer artifact record and makes the new page immediately visible in the wiki browser.
- Successful archive refreshes wiki metadata, links, backlinks, and runtime FTS state so future retrieval can use the archived page.
- The implementation remains local-first, file-first, and does not add audits, publishing, collaboration, or external sync behavior.

## Milestone 8 Deliverables

- deterministic audit execution for `contradiction`, `coverage`, `orphan`, `stale`, and `unsupported_claims`
- markdown audit reports written under `audits/`
- persisted audit run records and findings in SQLite
- `POST /api/audits/run`, `GET /api/audits`, and audit detail support for reading one completed report
- real Audits UI with run controls, history, severity badges, and detailed findings
- tests for each audit mode, report persistence, DB persistence, and end-to-end audit browsing

## Milestone 8 Acceptance Criteria

- A user can explicitly run each audit mode from the local product surface.
- Each audit run writes a human-readable markdown report into the workspace and persists a matching DB record.
- Findings include category, severity, explanatory notes, and related pages or sources whenever the data exists.
- Audit results are conservative and inspectable; they do not overclaim certainty or silently mutate wiki content.
- The Audits UI shows run history and detailed findings without adding background workers or remediation automation.
- The implementation remains local-first, file-first, and does not add autonomous remediation, scheduling, publishing, or collaboration behavior.

## Milestone 9 Deliverables

- stronger loading, empty, and failure states across onboarding, dashboard, sources, reviews, ask, archive, audits, and settings
- a real dashboard that summarizes workspace status, compiled-knowledge activity, and recent local runs instead of placeholder panels
- lightweight logs or recent-activity visibility through existing local data stores
- a reproducible demo dataset plus an easy local seed or reset path
- a demo reset flow that rebuilds the workspace from visible local seed files and leaves live provider credentials for the user to configure explicitly
- stronger automated coverage around the main compile, review, ask, archive, and audit loops
- updated README, product spec, architecture doc, progress log, and decision log reflecting the final MVP state
- final verification results and documented known gaps

## Milestone 9 Acceptance Criteria

- The repo is runnable, testable, and demoable from a local checkout without relying on hidden state.
- The default demo workspace can showcase the wiki, sources, reviews, ask, archive, and audit surfaces meaningfully.
- Failure messages guide the user toward the next corrective action instead of exposing only raw transport errors.
- The dashboard and docs reflect the real product surface rather than earlier milestone placeholders.
- Main product loops are covered by automated tests and final smoke checks.
- The implementation remains local-first, file-first, and MVP-sized without adding new product surfaces or extra infrastructure.
