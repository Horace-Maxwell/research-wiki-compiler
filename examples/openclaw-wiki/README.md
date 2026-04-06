# OpenClaw Example Wiki

This directory is the official end-to-end example workflow for the Research Wiki Compiler. It preserves both the final high-quality wiki output and the reproducible execution path that generated it.

## What lives here

- `source-corpus/`: the bounded OpenClaw corpus, derived from the user's files first.
- `workspace/`: the committed canonical reference output.
- `obsidian-vault/`: an Obsidian-first projection of the same example, optimized for local reading and context assembly.
- `manifest.json`: the canonical reference manifest for the committed example.
- `pipeline.json`: the source-controlled pipeline spec for corpus order, modes, and validation targets.
- `reference-baseline.json`: the canonical hash baseline used by `npm run example:openclaw:validate`.
- `evaluation/`: topic-maturity and topic-quality reports written by `npm run example:openclaw:evaluate`.
- the rendered app also exposes the question-centered workflow through `/questions` and `/questions?topic=openclaw`.

## Two execution modes

### Reference mode

Reference mode is the official reproducible path.

- It runs the real import, summarize, plan, review/apply, ask, archive, and audit services.
- It uses a deterministic clock plus a mocked OpenAI structured transport.
- It does not require live provider credentials.
- It rebuilds the official example into `tmp/openclaw-workspace-build`.
- It also projects an Obsidian-ready vault into `tmp/openclaw-obsidian-vault-build`.
- It is expected to match the canonical committed baseline exactly.

### Live mode

Live mode preserves the real provider-backed path.

- It runs the same workflow against a live OpenAI configuration.
- It requires `OPENAI_API_KEY`.
- It writes into `tmp/openclaw-workspace-live`.
- It also projects an Obsidian-ready vault into `tmp/openclaw-obsidian-vault-live`.
- It is useful for real pipeline exercise, but it is not expected to match the canonical baseline byte-for-byte.

## Official commands

```bash
npm install
npm run example:openclaw:reset
npm run example:openclaw:build
npm run example:openclaw:validate
npm run example:openclaw:evaluate
```

Additional commands:

```bash
npm run example:openclaw:live
npm run example:openclaw:sync
```

What each command does:

- `example:openclaw:reset`: removes the temporary reference, live, and rendered-example runtime directories.
- `example:openclaw:build`: runs the official reference pipeline into `tmp/openclaw-workspace-build` and generates the matching Obsidian vault projection in `tmp/openclaw-obsidian-vault-build`.
- `example:openclaw:validate`: rebuilds the reference example, compares it to the canonical baseline, verifies the Obsidian vault projection, and checks that the rendered example workspace can be restored.
- `example:openclaw:evaluate`: evaluates the example as a topic-quality workspace and writes `evaluation/topic-evaluation.{json,md}`.
- `example:openclaw:live`: runs the same workflow with a live OpenAI provider.
- `example:openclaw:sync`: maintainer-only command that regenerates the canonical committed snapshot, manifest, Obsidian vault projection, and hash baseline from reference mode.

## Reproducibility strategy

The repository does not pretend that live LLM calls are perfectly deterministic.

Instead, it formalizes two separate truths:

- Reference mode is the reproducible baseline. It freezes the provider behavior through a mocked structured transport and freezes time through a deterministic runtime wrapper.
- Live mode is the real provider-backed workflow. It preserves the authentic product path, but its outputs may drift over time.

This split keeps the example honest while still preserving the real product loop.

## What validation checks

`npm run example:openclaw:validate` verifies all of the following:

- the committed `source-corpus/` and canonical `workspace/` still match `reference-baseline.json`
- the committed `obsidian-vault/` still matches the canonical reference baseline
- a fresh reference rebuild matches the canonical manifest and workspace output exactly
- a fresh Obsidian vault projection matches the committed Obsidian vault exactly
- required wiki pages exist
- required headings exist on the key final pages
- required Obsidian entry notes exist
- required summaries, review artifacts, archived note, and audit output exist
- the rendered example workspace can be recreated for `/examples/openclaw`

## Obsidian projection

The Obsidian layer is additive. It does not replace the source-of-truth wiki.

- `workspace/wiki/` remains the canonical compiled wiki.
- `obsidian-vault/` is a projection of the same example into an Obsidian-friendly folder layout.
- Start with [`obsidian-vault/README.md`](obsidian-vault/README.md) and [`obsidian-vault/00 Atlas/Start Here.md`](obsidian-vault/00%20Atlas/Start%20Here.md).
- The vault now adds stronger maps of content, discrete context-pack notes, open-question and current-tension notes, normalized-source atlases, and article-first projections tuned for day-to-day reading and compact context assembly.
- It now also adds a maintenance-rhythm surface and a maintenance-triage context pack so daily upkeep does not depend on rereading the entire graph.

Key vault notes:

- [`obsidian-vault/00 Atlas/Topic Map.md`](obsidian-vault/00%20Atlas/Topic%20Map.md)
- [`obsidian-vault/00 Atlas/Open Questions.md`](obsidian-vault/00%20Atlas/Open%20Questions.md)
- [`obsidian-vault/00 Atlas/Current Tensions.md`](obsidian-vault/00%20Atlas/Current%20Tensions.md)
- [`obsidian-vault/00 Atlas/Monitoring.md`](obsidian-vault/00%20Atlas/Monitoring.md)
- [`obsidian-vault/00 Atlas/Maintenance Rhythm.md`](obsidian-vault/00%20Atlas/Maintenance%20Rhythm.md)
- [`obsidian-vault/05 Context Packs/Explain OpenClaw.md`](obsidian-vault/05%20Context%20Packs/Explain%20OpenClaw.md)
- [`obsidian-vault/05 Context Packs/Upgrade Watchpoints.md`](obsidian-vault/05%20Context%20Packs/Upgrade%20Watchpoints.md)
- [`obsidian-vault/05 Context Packs/Provenance And Review.md`](obsidian-vault/05%20Context%20Packs/Provenance%20And%20Review.md)
- [`obsidian-vault/05 Context Packs/Maintenance Triage.md`](obsidian-vault/05%20Context%20Packs/Maintenance%20Triage.md)

## What to inspect first

Start here:

- portfolio route: `/topics`
- question queue: `/questions`
- topic question queue: `/questions?topic=openclaw`
- topic home: `/topics/openclaw`
- rendered route: `/examples/openclaw`
- [`workspace/wiki/index.md`](workspace/wiki/index.md)
- [`workspace/wiki/entities/openclaw.md`](workspace/wiki/entities/openclaw.md)
- [`workspace/wiki/syntheses/openclaw-current-tensions.md`](workspace/wiki/syntheses/openclaw-current-tensions.md)
- [`workspace/wiki/syntheses/openclaw-maintenance-watchpoints.md`](workspace/wiki/syntheses/openclaw-maintenance-watchpoints.md)
- [`workspace/wiki/syntheses/openclaw-maintenance-rhythm.md`](workspace/wiki/syntheses/openclaw-maintenance-rhythm.md)
- [`workspace/wiki/syntheses/openclaw-reading-paths.md`](workspace/wiki/syntheses/openclaw-reading-paths.md)
- [`workspace/wiki/notes/openclaw-open-questions.md`](workspace/wiki/notes/openclaw-open-questions.md)
- [`workspace/wiki/notes/note-what-should-i-monitor-before-upgrading-openclaw.md`](workspace/wiki/notes/note-what-should-i-monitor-before-upgrading-openclaw.md)
- [`obsidian-vault/README.md`](obsidian-vault/README.md)
- [`obsidian-vault/00 Atlas/Start Here.md`](obsidian-vault/00%20Atlas/Start%20Here.md)
- [`obsidian-vault/00 Atlas/Maintenance Rhythm.md`](obsidian-vault/00%20Atlas/Maintenance%20Rhythm.md)
- [`obsidian-vault/00 Atlas/LLM Context Pack.md`](obsidian-vault/00%20Atlas/LLM%20Context%20Pack.md)
- [`obsidian-vault/05 Context Packs/Maintenance Triage.md`](obsidian-vault/05%20Context%20Packs/Maintenance%20Triage.md)

Then inspect the visible intermediate layer:

- [`source-corpus/`](source-corpus/)
- [`workspace/raw/processed/summaries/`](workspace/raw/processed/summaries/)
- [`workspace/reviews/`](workspace/reviews/)
- [`workspace/audits/`](workspace/audits/)
- [`manifest.json`](manifest.json)
- [`pipeline.json`](pipeline.json)
- [`reference-baseline.json`](reference-baseline.json)

Method and reuse docs:

- [`../../docs/knowledge-work-method.md`](../../docs/knowledge-work-method.md)
- [`../../docs/topic-maturity.md`](../../docs/topic-maturity.md)
- [`../../templates/knowledge-work/README.md`](../../templates/knowledge-work/README.md)

## Maintainer note

Only run `npm run example:openclaw:sync` when you intentionally want to refresh the official canonical baseline after reviewing the result. The command updates:

- `examples/openclaw-wiki/workspace/`
- `examples/openclaw-wiki/manifest.json`
- `examples/openclaw-wiki/reference-baseline.json`

That command should be treated as a baseline refresh, not as an ordinary local build.
