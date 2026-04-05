# Research Wiki Compiler

Research Wiki Compiler is a local-first product for turning raw research material into a durable, reviewable Markdown wiki instead of a disposable chat transcript.

Repository status: this repository is still private and is being prepared locally for a future push. Everything in this repo remains local and file-based for now.

Maintainer: Horace (`@maxwelldhx`).

GitHub repository: [Horace-Maxwell/research-wiki-compiler](https://github.com/Horace-Maxwell/research-wiki-compiler) (currently private).

## Screenshots

Screenshots are not committed yet.

Planned captures are tracked in [docs/assets/screenshots/README.md](docs/assets/screenshots/README.md):

- dashboard overview
- wiki browser and editor
- sources detail with normalization and summary artifacts
- review queue with proposal diff and status
- Ask page with citations and archive controls
- audits browser with findings detail

## Key Features

- Local-first workspace initialization with a visible on-disk project structure
- File-backed wiki pages with frontmatter validation, wikilinks, backlinks, and plain Markdown editing
- Deterministic source import, normalization, checksuming, and chunking
- Visible source summaries stored as Markdown plus structured JSON artifacts
- Reviewable patch proposals stored on disk and in SQLite
- Explicit approve, reject, and edit-and-approve review actions
- Section-level wiki mutation with traceable apply history
- Wiki-first question answering with citations, caveats, and persisted answer artifacts
- Explicit answer archive back into `wiki/syntheses/` or `wiki/notes/`
- Deterministic audits for contradictions, coverage gaps, orphan pages, stale pages, and unsupported claims
- Reproducible demo workspace seeding from visible local source files

## Why This Project Is Different

Most “chat with your files” tools optimize for conversational convenience and hidden retrieval state.

Research Wiki Compiler optimizes for:

- visible knowledge artifacts
- reviewable mutation
- durable Markdown pages
- provenance and citation visibility
- a cumulative wiki that gets better over time

The product is designed around compiled knowledge, not around a generic assistant session.

## Architecture Summary

Research Wiki Compiler is a local full-stack monolith:

- UI: Next.js App Router, React, TypeScript, Tailwind CSS
- Runtime: Node.js route handlers plus service-layer business logic
- Persistence: SQLite with Drizzle ORM and FTS5
- Durable knowledge store: local workspace files under `wiki/`, `raw/`, `reviews/`, `audits/`, and `prompts/`

More detail:

- [docs/product-spec.md](docs/product-spec.md)
- [docs/architecture.md](docs/architecture.md)
- [docs/progress.md](docs/progress.md)
- [docs/decisions.md](docs/decisions.md)

## Local-First and File-First Philosophy

The workspace is the real product.

- Markdown, JSON, and related local files are the durable system of record.
- SQLite is a runtime index and cache, not the primary knowledge store.
- Prompts are visible files under `prompts/`.
- Review history is visible under `reviews/`.
- Audit reports are visible under `audits/`.

This keeps knowledge inspectable by both humans and agents.

## Quickstart

### Prerequisites

- Node.js 20 or newer
- npm

### Install

```bash
npm install
```

### Seed the demo workspace

```bash
npm run demo:reset
```

### Start the app

```bash
npm run dev
```

Then open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

## Configuration

Core local configuration lives in the workspace at:

```text
WORKSPACE_ROOT/.research-wiki/settings.json
```

The repository also includes:

- prompt templates under [`prompts/`](prompts/)
- wiki page templates under [`templates/wiki/`](templates/wiki/)
- demo seed inputs under [`demo-data/`](demo-data/)

Environment variables are intentionally minimal in v1. See [`.env.example`](.env.example).

## Workspace Initialization

The default workflow is:

1. Launch the app.
2. Open `/dashboard` or `/onboarding`.
3. Choose a workspace path.
4. Initialize the local workspace.

This creates the expected file structure, prompt copies, settings file, SQLite database, and optional git repository inside the workspace.

Expected workspace shape:

```text
WORKSPACE_ROOT/
  raw/
  wiki/
  reviews/
  audits/
  exports/
  prompts/
  .research-wiki/
```

## Provider Configuration

Provider settings are workspace-scoped and configured through the app Settings screen.

Supported providers in v1:

- OpenAI
- Anthropic

Notes:

- the seeded demo workspace intentionally clears provider credentials after seeding
- live summarize, patch-planning, and Ask reruns require real provider credentials
- prompts stay visible and editable as files

## Running Tests and Verification

```bash
npm run lint
npm test
npm run test:e2e
npm run build
```

For a full local demo reset plus verification:

```bash
npm run demo:reset
npm run lint
npm test
npm run test:e2e
npm run build
```

For exact browser smoke steps, see [MANUAL_QA.md](MANUAL_QA.md).

## Demo Flow

After `npm run demo:reset`, the default demo workspace contains:

- seeded wiki pages
- imported and normalized sources
- source summaries
- approved, pending, and rejected review artifacts
- one answer artifact already archived into the wiki
- one grounded answer artifact still ready to archive
- audit reports with real findings

Suggested walkthrough:

1. Open `/dashboard` to inspect counts and recent activity.
2. Open `/wiki` to browse the compiled Markdown wiki.
3. Open `/sources` to inspect normalized text, chunks, and summary artifacts.
4. Open `/reviews` to inspect approved, rejected, and pending proposals.
5. Open the ready-to-archive answer from Dashboard recent activity, then archive it from `/ask`.
6. Open `/audits` to review coverage and orphan findings.

## Repository Structure

```text
.
├── demo-data/
├── docs/
├── prompts/
├── scripts/
├── src/
├── templates/
└── drizzle/
```

High-signal starting points:

- [src/server/db/schema.ts](src/server/db/schema.ts)
- [src/server/services/workspace-service.ts](src/server/services/workspace-service.ts)
- [src/server/services/wiki-page-service.ts](src/server/services/wiki-page-service.ts)
- [src/server/services/source-service.ts](src/server/services/source-service.ts)
- [src/server/services/source-summary-service.ts](src/server/services/source-summary-service.ts)
- [src/server/services/patch-planner-service.ts](src/server/services/patch-planner-service.ts)
- [src/server/services/review-action-service.ts](src/server/services/review-action-service.ts)
- [src/server/services/answer-service.ts](src/server/services/answer-service.ts)
- [src/server/services/answer-archive-service.ts](src/server/services/answer-archive-service.ts)
- [src/server/services/audit-service.ts](src/server/services/audit-service.ts)

## Roadmap

Near-term improvements worth considering after launch prep:

- stronger visual diff tooling for review actions
- richer source-type handling beyond text-first inputs
- tighter retrieval diagnostics in Ask
- more explicit wiki health and provenance dashboards
- optional export and publishing workflows

The historical milestone log remains in [docs/progress.md](docs/progress.md).

## Current Limitations

- Live provider-backed flows require user-supplied API credentials.
- Retrieval is intentionally FTS- and metadata-driven; there is no vector database.
- Patch apply prioritizes safe, local mutations and may fail instead of rewriting too much content.
- Audit findings are deterministic and conservative rather than autonomous.
- The product is currently optimized for a single local user, not multi-user collaboration or sync.
- Screenshots are still intentionally deferred until the first public-facing launch pass.

## Contributing

Contribution guidelines are in [CONTRIBUTING.md](CONTRIBUTING.md).

Short version:

- keep the product local-first and file-first
- keep prompts and mutation contracts explicit
- prefer service-layer logic over route/component logic
- update docs and tests with meaningful behavior changes

## Security

Security guidance is in [SECURITY.md](SECURITY.md).

Please do not post suspected vulnerabilities in public issue trackers. Use the reporting path documented in [SECURITY.md](SECURITY.md).

## Support

Support guidance is in [SUPPORT.md](SUPPORT.md).

## License

This repository is licensed under [Apache-2.0](LICENSE).

Repository visibility is currently private, but the code is already under Apache-2.0 and may be made public later.
