# OpenClaw Example Wiki

This directory is a committed end-to-end example of the Research Wiki Compiler running on a bounded OpenClaw corpus derived from the user's own files first.

## Rendered example

Run the app, then open:

```text
/examples/openclaw
```

That route is the rendered showcase entry point for this example. The Markdown files in this directory remain the source of truth; the app renders those same files into the wiki experience.

## What this example is

- A reproducible example workspace for the topic `OpenClaw / open claw`.
- A real pipeline run using the repository's existing service layer for:
  - import / normalize
  - summarize
  - patch planning
  - review / apply
  - ask
  - archive
  - audit
- A committed snapshot of the resulting workspace artifacts, including wiki pages, source summaries, review proposals, and an audit report.

## Corpus used

The committed corpus is intentionally small and high-signal. It contains four curated excerpts derived from the user's Obsidian AI news digests:

- `source-corpus/2026-03-26-openclaw-plugin-sdk-and-policy.md`
- `source-corpus/2026-03-31-openclaw-release-and-plugin-surface.md`
- `source-corpus/2026-04-02-openclaw-release-cadence-and-test-churn.md`
- `source-corpus/2026-04-05-openclaw-provider-risk-and-changelog.md`

Each file includes frontmatter that records the original user-file path and the excerpt scope that was selected. The full original digests are not committed here; only the bounded OpenClaw-relevant excerpts are.

## How it was generated

Run:

```bash
npm install
npm run example:openclaw
```

The generator script lives at [`../../scripts/generate-openclaw-example.ts`](../../scripts/generate-openclaw-example.ts).

Important details:

- The script creates a fresh runtime workspace under `tmp/openclaw-workspace-build`.
- It uses the real workspace, source, summary, review, ask, archive, and audit services already implemented in the app.
- It uses a deterministic mocked OpenAI transport so the example can be rebuilt without live API keys while still exercising the real prompts, contracts, and service flow.
- After generation, it syncs the visible workspace artifacts into `workspace/` for commit-friendly inspection.
- It does not commit `.research-wiki/app.db` because that runtime database contains machine-specific state, including absolute local paths.

## What to inspect first

Start here:

- the rendered route: `/examples/openclaw`
- [`workspace/wiki/index.md`](workspace/wiki/index.md)
- [`workspace/wiki/entities/openclaw.md`](workspace/wiki/entities/openclaw.md)
- [`workspace/wiki/topics/openclaw-release-cadence.md`](workspace/wiki/topics/openclaw-release-cadence.md)
- [`workspace/wiki/concepts/plugin-compatibility.md`](workspace/wiki/concepts/plugin-compatibility.md)
- [`workspace/wiki/concepts/provider-dependency-risk.md`](workspace/wiki/concepts/provider-dependency-risk.md)
- [`workspace/wiki/syntheses/openclaw-maintenance-watchpoints.md`](workspace/wiki/syntheses/openclaw-maintenance-watchpoints.md)
- [`workspace/wiki/notes/note-what-should-i-monitor-before-upgrading-openclaw.md`](workspace/wiki/notes/note-what-should-i-monitor-before-upgrading-openclaw.md)

Then inspect the visible intermediate artifacts:

- raw source excerpts under [`source-corpus/`](source-corpus/)
- source summaries under [`workspace/raw/processed/summaries/`](workspace/raw/processed/summaries/)
- approved and rejected proposals under [`workspace/reviews/`](workspace/reviews/)
- the coverage audit report under [`workspace/audits/`](workspace/audits/)
- the run manifest at [`manifest.json`](manifest.json)

## Raw vs rendered

GitHub is intentionally showing the inspectable source layer of the example:

- `source-corpus/` contains the bounded raw input set.
- `workspace/wiki/` contains the final Markdown wiki pages.
- `workspace/raw/`, `workspace/reviews/`, and `workspace/audits/` contain the intermediate artifact trail.

The app route `/examples/openclaw` renders that same file-backed workspace as a guided wiki experience. The architecture stays file-first; the rendered route is the product view on top of the Markdown source of truth.

## What this example demonstrates

- Durable compiled knowledge instead of one-off chat output.
- Visible source-to-summary-to-proposal traceability.
- Review-first wiki mutation, including a preserved rejected proposal.
- Wiki-first retrieval with a real ask flow.
- Answer archive back into the wiki.
- Audit output that highlights remaining coverage gaps in the example corpus.

## Rebuild notes

If you rerun the generator, timestamps and generated artifact IDs may change. That is expected. The content structure and workflow should remain the same.
