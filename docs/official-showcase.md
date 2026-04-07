# Official Showcase

OpenClaw is the official showcase for Research Wiki Compiler.

It is the strongest topic in the repository because it already demonstrates the full product chain with real committed artifacts instead of hand-written demo pages:

- source corpus -> normalized source -> summary -> review proposal -> canonical wiki
- question -> session -> synthesis -> evidence gap / evidence change -> acquisition / monitoring
- rendered app experience -> canonical Markdown source of truth -> Obsidian projection
- reference-mode reproducibility -> live-mode honesty -> validation-ready committed baseline

If you only have time to inspect one thing in this repository, inspect OpenClaw first.

## Why OpenClaw is the flagship showcase

- It is the only topic that already clears the flagship maturity bar while still keeping its remaining evidence risk explicit.
- It shows the default daily-use path clearly: topic home -> questions -> sessions -> syntheses.
- It also shows the supporting lanes without pretending they are the front door: gaps, changes, acquisition, and monitoring.
- It has a high-quality canonical wiki, visible working surfaces, an Obsidian projection, and reproducible validation in the same example.

## What this showcase proves

- The product is not just "chat with files". It compiles research into a durable wiki that keeps provenance and review visible.
- The working workflow is not trapped in notes. Questions, sessions, syntheses, changes, gaps, acquisition, and monitoring all show up as usable product surfaces.
- The rendered app, repository files, and Obsidian vault all point at the same knowledge base instead of drifting into separate truths.

## Fastest walkthrough

### GitHub path

Read in this order:

1. [`README.md`](../README.md)
2. [`examples/openclaw-wiki/README.md`](../examples/openclaw-wiki/README.md)
3. [`examples/openclaw-wiki/workspace/wiki/index.md`](../examples/openclaw-wiki/workspace/wiki/index.md)
4. [`examples/openclaw-wiki/workspace/wiki/entities/openclaw.md`](../examples/openclaw-wiki/workspace/wiki/entities/openclaw.md)
5. [`examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-maintenance-rhythm.md`](../examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-maintenance-rhythm.md)
6. [`examples/openclaw-wiki/workspace/wiki/notes/openclaw-open-questions.md`](../examples/openclaw-wiki/workspace/wiki/notes/openclaw-open-questions.md)
7. [`examples/openclaw-wiki/obsidian-vault/README.md`](../examples/openclaw-wiki/obsidian-vault/README.md)
8. [`examples/openclaw-wiki/obsidian-vault/00 Atlas/Start Here.md`](../examples/openclaw-wiki/obsidian-vault/00%20Atlas/Start%20Here.md)

### App path

Open these routes in order:

1. `/topics`
2. `/topics/openclaw`
3. `/questions?topic=openclaw`
4. `/sessions?topic=openclaw`
5. `/syntheses?topic=openclaw`

Only after the main path is clear, inspect:

- `/gaps?topic=openclaw`
- `/changes?topic=openclaw`
- `/acquisition?topic=openclaw`
- `/monitoring?topic=openclaw`
- `/examples/openclaw`

### Canonical wiki path

Inspect these canonical pages first:

- [`examples/openclaw-wiki/workspace/wiki/index.md`](../examples/openclaw-wiki/workspace/wiki/index.md)
- [`examples/openclaw-wiki/workspace/wiki/entities/openclaw.md`](../examples/openclaw-wiki/workspace/wiki/entities/openclaw.md)
- [`examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-current-tensions.md`](../examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-current-tensions.md)
- [`examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-maintenance-watchpoints.md`](../examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-maintenance-watchpoints.md)
- [`examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-maintenance-rhythm.md`](../examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-maintenance-rhythm.md)
- [`examples/openclaw-wiki/workspace/wiki/notes/openclaw-open-questions.md`](../examples/openclaw-wiki/workspace/wiki/notes/openclaw-open-questions.md)

### Working workflow path

These are the most useful surfaces if you want to understand how the system turns research into work:

- topic home: `/topics/openclaw`
- question queue: `/questions?topic=openclaw`
- session queue: `/sessions?topic=openclaw`
- synthesis lane: `/syntheses?topic=openclaw`
- maintenance control surface:
  [`examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-maintenance-rhythm.md`](../examples/openclaw-wiki/workspace/wiki/syntheses/openclaw-maintenance-rhythm.md)
- unresolved-work queue:
  [`examples/openclaw-wiki/workspace/wiki/notes/openclaw-open-questions.md`](../examples/openclaw-wiki/workspace/wiki/notes/openclaw-open-questions.md)

### Obsidian path

If you want to see the projection layer as a real reading environment, start here:

1. [`examples/openclaw-wiki/obsidian-vault/README.md`](../examples/openclaw-wiki/obsidian-vault/README.md)
2. [`examples/openclaw-wiki/obsidian-vault/00 Atlas/Start Here.md`](../examples/openclaw-wiki/obsidian-vault/00%20Atlas/Start%20Here.md)
3. [`examples/openclaw-wiki/obsidian-vault/00 Atlas/Topic Map.md`](../examples/openclaw-wiki/obsidian-vault/00%20Atlas/Topic%20Map.md)
4. [`examples/openclaw-wiki/obsidian-vault/00 Atlas/Maintenance Rhythm.md`](../examples/openclaw-wiki/obsidian-vault/00%20Atlas/Maintenance%20Rhythm.md)
5. [`examples/openclaw-wiki/obsidian-vault/05 Context Packs/Upgrade Watchpoints.md`](../examples/openclaw-wiki/obsidian-vault/05%20Context%20Packs/Upgrade%20Watchpoints.md)

## How to demo it live

Use this order if you want a clean 5-10 minute walkthrough:

1. Open `/topics` and explain that the product is now a multi-topic workspace, not a single demo.
2. Open `/topics/openclaw` and show that topic home is the main cockpit.
3. Open `/questions?topic=openclaw` to show that research questions are explicit work units.
4. Open `/sessions?topic=openclaw` to show resumable bounded research.
5. Open `/syntheses?topic=openclaw` to show when work becomes durable knowledge.
6. Open `/gaps?topic=openclaw` or `/changes?topic=openclaw` only if you want to show supporting lanes.
7. Open `/examples/openclaw` to show the rendered showcase route over the same Markdown truth layer.
8. Finish in `examples/openclaw-wiki/workspace/wiki/` and `examples/openclaw-wiki/obsidian-vault/` to prove the product stays file-first.

## Reproduce and validate

Reference mode is the official reproducible path:

```bash
npm install
npm run example:openclaw:reset
npm run example:openclaw:build
npm run example:openclaw:validate
npm run example:openclaw:evaluate
```

Live mode preserves the provider-backed path:

```bash
npm run example:openclaw:live
```

Reference mode is expected to match the committed baseline exactly. Live mode is expected to stay real, not byte-for-byte stable.
