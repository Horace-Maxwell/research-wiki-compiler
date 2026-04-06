# Topic Bootstrap System

This repository now supports a real starter workflow for new topics.

The goal is not to clone the OpenClaw example by hand.
The goal is to give a new topic a bounded corpus, a canonical wiki starter, maintenance surfaces, an Obsidian projection, context packs, and a validation baseline through a repeatable contract.

## Commands

Initialize a new topic:

```bash
npm run topic:init -- --slug my-topic --title "My Topic"
```

Initialize a topic and copy a starter corpus in one step:

```bash
npm run topic:init -- \
  --slug my-topic \
  --title "My Topic" \
  --copy-corpus-from ./path/to/corpus
```

Build the deterministic starter workspace:

```bash
npm run topic:build -- --slug my-topic
```

Validate the committed starter workspace:

```bash
npm run topic:validate -- --slug my-topic
```

## What `topic:init` creates

`topic:init` creates:

- `topics/<slug>/topic.json`
- `topics/<slug>/source-corpus/`
- placeholder canonical / working / Obsidian roots

The generated `topic.json` is the contract for the starter topic.
It defines:

- topic identity
- bounded corpus expectations
- canonical starter pages
- working surfaces
- maintenance surfaces
- context packs
- validation targets
- layer boundaries

## What `topic:build` creates

`topic:build` materializes the starter topic into source-controlled outputs:

- `workspace/wiki/`
  canonical starter pages and maintenance surfaces
- `obsidian-vault/`
  atlas notes, context packs, projected article notes, artifact bridge notes
- `manifest.json`
  the generated inventory of managed starter surfaces
- `starter-baseline.json`
  the deterministic baseline used by validation
- `README.md`
  the per-topic usage guide

## Layer model

Every topic should keep the three-layer model explicit:

1. Canonical wiki
   `workspace/wiki/`
   durable topic pages and maintenance syntheses
2. Working and maintenance layer
   `workspace/wiki/` working notes plus `workspace/reviews/` and `workspace/audits/`
   unresolved questions, tensions, monitoring, review history, future audit follow-up
3. Obsidian projection
   `obsidian-vault/`
   maps of content, compact context packs, fast daily navigation

The Obsidian projection is additive.
It is never the source of truth.

## Minimum starter quality bar

A starter topic is not considered complete unless it includes:

- a canonical index
- `Start Here`
- `Topic Map`
- `Reading Paths`
- `Open Questions`
- `Current Tensions`
- `Maintenance watchpoints`
- `Maintenance rhythm`
- `Artifact Map`
- at least one context pack
- starter validation expectations

The contract and validation path encode this explicitly.

## How validation works

`topic:validate` checks:

- the actual `source-corpus/` matches `topic.json`
- the committed managed starter files match `starter-baseline.json`
- a fresh deterministic rebuild matches the committed starter baseline
- required wiki pages exist
- required headings exist on key starter pages
- required Obsidian atlas notes exist
- required context packs exist

Validation only tracks the managed starter surfaces.
That means a topic can grow beyond the bootstrap without the starter validator pretending those extra files are invalid.

## How to evolve a starter topic

Use the starter system as the first disciplined layer, not the final state.

The intended progression is:

1. start with a bounded corpus and starter pages
2. refine `topic.json` until the starter surfaces are useful
3. use the maintenance surfaces to decide which pages deserve stronger durable treatment
4. run the broader compile / review / ask / audit workflow against the same canonical model
5. keep the bootstrap surfaces small and high-signal so the topic stays resumable

## Reference dry run

The repository includes one lightweight dry-run topic built through this system:

- `topics/local-first-software/`

This is not a second flagship example.
It exists to prove the bootstrap framework is reusable and not hard-coded to OpenClaw.
