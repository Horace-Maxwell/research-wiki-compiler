# Topics

This folder holds reusable starter topics built with the topic bootstrap system.

Each topic lives at:

```text
topics/<slug>/
  topic.json
  source-corpus/
  workspace/
  obsidian-vault/
  manifest.json
  starter-baseline.json
  README.md
```

## Commands

Create a new topic:

```bash
npm run topic:init -- --slug my-topic --title "My Topic"
```

Create a new topic and copy a starter corpus:

```bash
npm run topic:init -- \
  --slug my-topic \
  --title "My Topic" \
  --copy-corpus-from ./path/to/corpus
```

Build the starter workspace:

```bash
npm run topic:build -- --slug my-topic
```

Validate the starter workspace:

```bash
npm run topic:validate -- --slug my-topic
```

## What belongs where

- `topic.json`
  The source-controlled starter contract for the topic.
- `source-corpus/`
  The bounded input corpus for the starter topic.
- `workspace/wiki/`
  The canonical source-of-truth layer.
- `workspace/reviews/` and `workspace/audits/`
  The future mutation and maintenance layers.
- `obsidian-vault/`
  The additive working projection for maps of content and compact note bundles.

## Included starter topic

- `local-first-software/`
  A lightweight dry-run topic that proves the bootstrap framework is reusable beyond OpenClaw.

For the full method and quality bar, see [`../docs/topic-bootstrap.md`](../docs/topic-bootstrap.md).
