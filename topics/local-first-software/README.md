# Local-First Software Topic Bootstrap

This directory is a deterministic starter knowledge workspace for Local-First Software. It turns the OpenClaw-derived method into a reusable topic bootstrap contract: bounded corpus, canonical wiki surfaces, maintenance surfaces, an Obsidian projection, starter context packs, and validation targets.

## What lives here

- `topic.json`: the topic bootstrap contract for this topic.
- `source-corpus/`: the bounded starter corpus.
- `workspace/`: the canonical wiki and future artifact roots. This remains the source of truth.
- `obsidian-vault/`: an additive working projection for Obsidian usage.
- `manifest.json`: the generated manifest for the starter bootstrap.
- `starter-baseline.json`: the deterministic baseline used by validation.

## Layer model

- Canonical: `workspace/wiki` — Durable canonical pages and maintenance syntheses live here. This remains the source-of-truth layer for the topic.
- Working: `workspace/wiki + workspace/reviews + workspace/audits` — Working notes, maintenance sequencing, review artifacts, and audit follow-ups stay visible here so the topic can be resumed without guesswork.
- Projection: `obsidian-vault` — The Obsidian projection is an additive working layer for maps of content, compact bundles, and day-to-day reading. It is not the truth layer.

## Commands

```bash
npm run topic:build -- --slug local-first-software
npm run topic:validate -- --slug local-first-software
```

## What to inspect first

- `workspace/wiki/index.md`
- `wiki/topics/local-first-software.md`
- `workspace/wiki/syntheses/local-first-software-maintenance-rhythm.md`
- `obsidian-vault/00 Atlas/Start Here.md`
- `obsidian-vault/00 Atlas/Topic Map.md`
- `obsidian-vault/00 Atlas/Maintenance Rhythm.md`

## How to evolve this topic

1. Keep the corpus bounded and explicit in `source-corpus`.
2. Add or refine starter pages in `topic.json` instead of editing managed files directly.
3. Use the maintenance surfaces to decide what should become durable synthesis next.
4. Once the topic matures, run the broader compile / review / ask / audit loops against the same canonical workspace model.
