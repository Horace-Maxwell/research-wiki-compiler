# Decision Log

This log records major product and repository decisions in the order they were made. Milestone sections capture implementation decisions; later entries also record repository launch-prep choices where founder approval is still pending.

## Milestone 0 Decisions

### D-001: App architecture is a local monolith

Decision:
Use Next.js App Router as a single local full-stack application rather than split frontend and backend services.

Why:
This keeps the MVP operationally simple, local-first, and easier to maintain while still supporting route handlers and server-side services cleanly.

### D-002: Workspace files are primary, SQLite is secondary

Decision:
Treat the workspace filesystem as the durable knowledge store and SQLite as runtime metadata and indexing infrastructure.

Why:
The product promise is inspectable, reviewable, agent-readable knowledge, which is better served by visible files than by opaque database state.

### D-003: Persist workspace settings inside the workspace

Decision:
Store workspace settings at `.research-wiki/settings.json`.

Why:
This keeps durable project configuration colocated with the workspace and avoids hidden per-machine state for core product behavior.

### D-004: Initialize git by default when creating a workspace

Decision:
Workspace initialization will default `initializeGit` to true, while still allowing it to be disabled.

Why:
Reviewable knowledge mutation is easier to trust when the workspace has version control from the beginning.

### D-005: Define the full domain schema early

Decision:
Create Drizzle schema definitions for the core domain model in Milestone 0, even though only workspace and settings paths are exercised immediately.

Why:
This reduces schema churn, forces early clarity on entity relationships, and gives later milestones a stable backbone.

### D-006: Fixed product navigation appears in Milestone 0

Decision:
Ship the full product navigation shell now, even though most destinations are placeholders.

Why:
It keeps the product shape visible, supports milestone-by-milestone buildout, and prevents the UI from collapsing into a generic single-page prototype.

### D-007: Active workspace selection is client-side in Milestone 0

Decision:
Keep the currently selected workspace root in browser local storage for Milestone 0 and pass it explicitly to the workspace APIs.

Why:
This avoids introducing hidden server-global state before the product has a dedicated multi-workspace selection model, while still keeping durable knowledge inside the workspace itself.

### D-008: Repo prompt templates are copied into initialized workspaces

Decision:
Store visible prompt templates in the repo and copy them into the workspace `prompts/` directory during initialization when they do not already exist.

Why:
This satisfies prompt visibility immediately, keeps the product repository explicit about prompt contracts, and gives each workspace a file-local copy that users can inspect and eventually customize.

## Milestone 1 Decisions

### D-009: Wiki content remains file-backed, not database-backed

Decision:
Read and write markdown page content directly from the workspace filesystem and use SQLite only for metadata and link indexing.

Why:
This preserves the product's file-first promise and avoids turning the wiki into a hidden database application.

### D-010: Wiki indexing is deterministic and request-driven

Decision:
Synchronize wiki metadata and links during wiki read and write flows instead of adding watchers, queues, or background workers.

Why:
The page count is small enough for deterministic request-time reindexing, and this keeps Milestone 1 simple and reliable.

### D-011: Page type is primarily path-derived

Decision:
Infer page type from the canonical wiki folder location and require saved frontmatter to be compatible with that path.

Why:
This makes page organization deterministic, keeps the tree stable, and avoids hidden ambiguity between file location and page metadata.

### D-012: Selected wiki page state is URL-driven

Decision:
Use URL query parameters to represent the selected wiki page in the browser UI.

Why:
This makes page navigation shareable, keeps state explicit, and avoids hiding navigation state in transient client memory.

### D-013: Raw markdown saves do not support page moves yet

Decision:
Reject slug and type changes made through raw markdown editing, and require users to create pages in the right typed location up front.

Why:
This keeps file paths deterministic in Milestone 1 and avoids introducing half-finished rename or move behavior before source and patch workflows exist.

### D-014: Deterministic identifiers use stable hashes

Decision:
Generate workspace, page, and page-link identifiers from stable hashes instead of truncated prefixes.

Why:
This preserves deterministic indexing while avoiding collisions across different local workspaces and page paths.

## Milestone 2 Decisions

### D-015: All imports stage in inbox before normalization

Decision:
Every source import writes or copies an original artifact into `raw/inbox` before any normalization work begins.

Why:
This keeps the intake pipeline visible and preserves a deterministic handoff point between arrival and processing.

### D-016: Normalization is deterministic and rule-based

Decision:
Use only local deterministic rules for normalization, title inference, checksum generation, token estimation, and chunking.

Why:
Milestone 2 is meant to create a trustworthy substrate for later compilation, not to introduce opaque behavior early.

### D-017: Source records persist rejected imports too

Decision:
Persist `SourceDocument` records for rejected imports with status and failure metadata, rather than dropping failures on the floor.

Why:
Users need visible provenance for what was attempted, what failed, and where the rejected artifact landed in the workspace.

### D-018: Browser file imports are sent as explicit text payloads

Decision:
For Milestone 2, browser-selected markdown and text files are read on the client and posted as explicit text content plus filename, rather than introducing multipart upload infrastructure.

Why:
This keeps the import API simple, typed, and sufficient for the supported text-first formats.

### D-019: Source previews show normalized raw text, not rendered markdown

Decision:
The Sources UI displays the normalized source body as raw inspectable text instead of rendering it as formatted markdown.

Why:
Milestone 2 is about verifying deterministic intake and normalization, so the UI should expose exactly what later compilation stages will consume.

### D-020: Reprocessing is explicit and preserves prior artifacts

Decision:
Reprocessing is a manual action that copies the latest stored source artifact back through inbox and writes a fresh processed result instead of mutating files silently in place.

Why:
This keeps the intake pipeline reviewable, avoids hidden mutation of prior artifacts, and preserves a visible history of deterministic normalization runs.

## Milestone 3 Decisions

### D-021: Summary artifacts are file-backed first

Decision:
Persist each source summary as both markdown and JSON files inside the workspace, then store their paths and summary status in SQLite.

Why:
This keeps summaries inspectable, portable, and easy for later milestones to consume without hiding the compilation layer in the database.

### D-022: Summarization is provider-pluggable but purpose-built

Decision:
Implement a narrow provider abstraction that only supports the structured source summarization contract needed for Milestone 3.

Why:
This satisfies OpenAI and Anthropic support without turning the app into a generic chat runtime before the real compile workflow is ready.

### D-023: Structured summary outputs are validated locally before persistence

Decision:
Every provider result must pass a local zod schema before summary artifacts or DB metadata are written.

Why:
Milestone 3 is building a reliable substrate for Milestone 4, so explicit validation is more important than accepting loosely formed model text.

### D-024: Provider credentials stay in workspace settings for M3

Decision:
Store summarization provider selection, API keys, and default models inside `.research-wiki/settings.json`, with a minimal Settings UI editing that file-backed state.

Why:
This keeps the summarization configuration local-first and explicit, and avoids hidden machine-global environment requirements for the primary product path.

### D-025: Failed resummarization does not delete prior successful artifacts

Decision:
When a new summary attempt fails, preserve any existing summary markdown and JSON artifacts while marking the latest summary status as failed and recording the job failure.

Why:
This maintains inspectability and avoids destructive loss of a previously successful compiled artifact while still surfacing that the latest attempt needs attention.

## Milestone 4 Decisions

### D-026: Candidate recall must stay deterministic and inspectable

Decision:
Candidate page recall will be implemented as a transparent weighted scoring pipeline over explicit wiki and summary signals rather than an opaque model step.

Why:
This milestone is about making source summaries actionable in a reviewable way, so users need to understand why each page was targeted.

### D-027: Proposal artifacts are file-backed review items

Decision:
Every generated patch proposal is persisted as both markdown and JSON under `reviews/pending/`, with SQLite used to index and query the queue.

Why:
This preserves the product’s file-first architecture and makes reviewable knowledge mutation visible before any patch apply logic exists.

### D-028: Milestone 4 review state does not touch wiki content

Decision:
Any proposal status recorded in Milestone 4 may only affect proposal metadata and review artifacts, never wiki markdown files.

Why:
Milestone 4 ends at proposal generation, so separating review queue state from patch apply protects the milestone boundary and keeps mutation explicit.

### D-029: Each planned proposal becomes one review item

Decision:
Convert planner output into one persisted proposal artifact per review item rather than storing a single multi-change blob for the whole source.

Why:
This keeps the review queue focused, makes each proposed mutation independently inspectable, and aligns cleanly with later per-proposal approval or rejection flows.

### D-030: Replanning replaces prior proposals for the same source

Decision:
When a source is replanned in Milestone 4, remove its prior pending proposal artifacts and DB rows before writing the new proposal set.

Why:
This keeps the pending queue deterministic, avoids duplicate stale proposals for the same summarized source, and matches the milestone’s goal of surfacing the latest reviewable planning state.

## Milestone 5 Decisions

### D-031: Patch apply stays deterministic and local

Decision:
Milestone 5 patch application will be implemented as a deterministic local service that consumes persisted proposal and hunk data without invoking any LLM.

Why:
This is the core knowledge-mutation milestone, and safe, explainable application behavior matters more than additional automation.

### D-032: Artifact history moves between visible review folders

Decision:
Proposal markdown and JSON artifacts move from `reviews/pending/` into `reviews/approved/` or `reviews/rejected/` instead of being deleted or hidden in the database.

Why:
The product is file-first and review-first, so historical review decisions must remain inspectable on disk after the action is taken.

### D-033: Unsafe applies fail rather than broadening rewrite scope

Decision:
If a proposal cannot be applied within a bounded section-level scope or cannot safely match its local target context, the apply service should fail explicitly instead of escalating to a large rewrite.

Why:
Protecting the compiled wiki from silent corruption is more important than maximizing apply success rate in Milestone 5.

## Milestone 6 Decisions

### D-034: Ask retrieval order is explicit and fixed

Decision:
Milestone 6 retrieval will always execute in explicit phases: wiki pages first, then source summaries, then raw chunks only if earlier phases are insufficient.

Why:
The product promise is compiled-knowledge QA, so raw chunks must supplement the wiki rather than replace it as the default evidence layer.

### D-035: Answer artifacts persist in SQLite before archive exists

Decision:
Persist structured answer artifacts directly in `answer_artifacts` during Milestone 6, even though answer archival into wiki pages is deferred to a later milestone.

Why:
This makes answer generation inspectable and testable now while preserving a clean bridge into the later archive workflow.

### D-036: Milestone 6 remains answer-oriented, not chat-oriented

Decision:
Implement the Ask surface as a question-to-artifact workflow with one structured answer result, rather than a multi-turn generic chat interface.

Why:
The product is a compiled research wiki, and M6 should reinforce that users are querying durable compiled knowledge, not interacting with an unconstrained chat session.

## Milestone 7 Decisions

### D-037: Answer archive is explicit and grounded-only

Decision:
Only an explicit user archive action may turn an answer artifact into a wiki page, and Milestone 7 will reject archive attempts for insufficient-knowledge answers.

Why:
The product should only turn grounded, inspectable answers into durable wiki knowledge, and silent or weakly supported archive would erode trust in the compiled wiki.

### D-038: Archived answers reuse wiki templates and deterministic titles

Decision:
Archived answer pages will be created through the existing template-backed wiki page flow, using deterministic derived titles and slugs for synthesis and note pages rather than introducing a separate archive file format.

Why:
This keeps archive output inside the normal wiki structure, preserves frontmatter validity, and avoids creating a parallel content system that later services would need to special-case.

### D-039: Archived answer provenance lives in both frontmatter and body

Decision:
Milestone 7 archive pages will store answer provenance through frontmatter fields such as `source_refs`, `page_refs`, archive timestamps, and answer artifact id, while also rendering citations and archive context visibly in the markdown body.

Why:
The wiki should remain both machine-readable and human-inspectable, so archive provenance must be visible in files rather than hidden solely in SQLite rows.

## Milestone 8 Decisions

### D-040: Audits are deterministic and conservative

Decision:
Milestone 8 audits will use deterministic local heuristics over the current workspace state rather than LLM-generated findings or speculative inference.

Why:
Audits should be inspectable and trustworthy, and conservative local rules fit the milestone goal of surfacing structural weaknesses without overclaiming certainty.

### D-041: Audit history is file-backed and DB-indexed

Decision:
Each audit run will persist a markdown report under `audits/` and a matching `audit_runs` record in SQLite, with structured findings stored in the existing JSON field.

Why:
This preserves the file-first architecture while still enabling fast history and detail queries in the UI.

### D-042: Audits report only; they do not remediate

Decision:
Milestone 8 stops at reporting findings and does not automatically create wiki mutations, background repair jobs, or workflow automation.

Why:
The milestone guardrail is inspection only, and keeping remediation out of scope protects clarity, reviewability, and product boundaries.

## Milestone 9 Decisions

### D-043: MVP polish should reuse visible local state instead of adding infrastructure

Decision:
Milestone 9 dashboard summaries, recent activity, and lightweight logs visibility will be built from existing workspace files, SQLite tables, and persisted run artifacts rather than from a new telemetry system.

Why:
The product is local-first and MVP-sized, so hardening should improve inspectability without introducing extra moving parts that the user did not ask for.

### D-044: Demo data must be reproducible, not hand-waved

Decision:
Ship a deterministic demo seed or reset path that rebuilds the local demo workspace from code rather than relying on undocumented manual setup.

Why:
A credible MVP should be easy to demonstrate from a clean checkout, and reproducible demo data reduces confusion when the local workspace drifts.

### D-045: Final product copy should describe the shipped system, not the old milestone boundaries

Decision:
Milestone-specific placeholder framing should be removed or minimized wherever the real feature now exists, especially in the dashboard, README, and persistent navigation copy.

Why:
Once the end-to-end loops exist, keeping early milestone copy in the UI makes the product feel unfinished even when the functionality is already present.

### D-046: Demo seeding should exercise the real services, then clear live provider settings

Decision:
Build the demo reset path on top of the actual workspace, source, review, ask, archive, and audit services, but clear provider credentials after seeding so the shipped demo remains local and safe by default.

Why:
This keeps the demo credible because it uses the real application paths, while also avoiding the misleading experience of shipping fake live credentials that would fail on the next user-triggered LLM action.

## Repository Launch Prep Decisions

### D-047: License the project under Apache-2.0 while keeping the initial GitHub repo private

Decision:
Switch the repository to Apache-2.0 now, while keeping the initial GitHub repository visibility private until the founder is ready for a public launch.

Why:
This makes the licensing posture explicit and reusable immediately, while still allowing a conservative private rollout before any broader public launch.

### D-048: GitHub-readiness files should be conservative and repo-relative

Decision:
Add standard repository health files, issue templates, PR templates, and CI using relative links and conservative defaults rather than growth-stage marketing or heavy workflow automation.

Why:
The goal is to make the repository trustworthy and easy to publish later without overstating maturity or adding maintenance burden before launch.

## Product Experience Redesign Decisions

### D-049: The dashboard is a workspace front door, not a module scoreboard

Decision:
Redesign the dashboard around workspace state, next actions, recent knowledge movement, and direct wiki entry rather than a flat grid of metric cards.

Why:
The product is a compiled research wiki, so the dashboard should feel like the front door to a living knowledge environment instead of a control-panel summary of modules.

### D-050: The wiki reading surface should own the visual center of gravity

Decision:
Shift the wiki experience toward a calmer, denser reading environment with clearer page hierarchy, stronger provenance presentation, and a more deliberate separation between reading and editing states.

Why:
The product promise depends on the wiki being the durable truth layer; if the wiki feels secondary or tool-like, the whole application feels like a demo instead of a serious knowledge product.

### D-051: Product chrome should recede so knowledge surfaces can lead

Decision:
Refactor the shell and shared page framing to reduce admin-panel chrome, tighten navigation hierarchy, and make workspace context plus wiki-oriented actions more prominent than generic surface switching.

Why:
High-quality knowledge tools feel trustworthy when the interface frames the content and workflow clearly instead of competing with them through noisy containers and generic dashboard styling.

### D-052: Second-pass refinement should reduce boxed-dashboard energy and deepen the editorial wiki feel

Decision:
Follow the first redesign with a narrower second pass focused on typography, spacing rhythm, panel treatment, and microcopy so the dashboard reads less like a set of polished cards and the wiki feels more like a composed reading environment.

Why:
The first pass fixed the information architecture, but product quality still depends on visual tone. A serious knowledge tool needs calmer surfaces, clearer focal hierarchy, and more authored interaction copy than a component-library dashboard naturally produces.

### D-053: First-view product surfaces should server-render real workspace content when possible

Decision:
Preload dashboard and wiki workspace state on the server for their first render instead of letting those routes open on large client-only loading placeholders by default.

Why:
When a knowledge product opens on empty skeletons instead of real workspace state, it immediately feels like an internal scaffold. Showing the actual workspace on first paint makes the app feel more trustworthy, more demo-worthy, and more like a real tool.

### D-054: Secondary dashboard panels should read as guidance, not boxed widgets

Decision:
Refine dashboard side panels and supporting sections toward quieter editorial lists, flatter posture blocks, and clearer action rhythm instead of stacking equally loud bordered cards.

Why:
Once the information architecture is correct, the remaining product-quality gap often comes from visual tone. A knowledge workspace feels more deliberate when the dashboard reads like a guided front door instead of a component gallery.

### D-055: Wiki side rails should frame the page body instead of competing with it

Decision:
Reduce the visual weight of the wiki knowledge-map and context rails, tighten the page header rhythm, and make the main reading surface visually stronger than the surrounding chrome.

Why:
The wiki only feels like the durable center of gravity when the page body clearly dominates. Side context matters, but it should behave like support structure rather than a peer surface fighting for attention.

### D-056: Wiki article pages should borrow encyclopedia reading qualities without copying encyclopedia branding

Decision:
Refine the wiki reading surface toward an encyclopedia-like article experience by emphasizing a stronger title plus lead, calmer long-form reading rhythm, compact contents navigation, infobox-like article facts, and article-style references.

Why:
The product promise is durable knowledge, not just rendered markdown. Borrowing the structural reading qualities of serious encyclopedia articles makes the wiki feel more authoritative and navigable while still keeping the local-first, file-first product identity distinct from any external brand.
