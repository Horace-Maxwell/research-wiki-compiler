# Topic Maturity And Quality Evaluation

This repository now includes a topic-evaluation layer.

The goal is not to add more bootstrap machinery.
The goal is to judge how far a topic has progressed from a clean starter into a durable, high-signal knowledge workspace.

## Commands

Evaluate a bootstrapped topic:

```bash
npm run topic:evaluate -- --slug my-topic
```

Evaluate the official OpenClaw example:

```bash
npm run example:openclaw:evaluate
```

Skip writing committed reports if you only want terminal output:

```bash
npm run topic:evaluate -- --slug my-topic --no-write-report
```

## Report outputs

Each evaluation writes:

- `evaluation/topic-evaluation.json`
- `evaluation/topic-evaluation.md`

The report includes:

- maturity stage
- overall score
- dimension scores
- surface-by-surface evaluation
- strongest signals
- weak or missing surfaces
- recommended next improvements

## Maturity ladder

The evaluator uses five stages:

1. `starter`
   The required starter surfaces exist and validate, but the topic still behaves like a starter because real summarize/review/archive/audit evidence is thin or absent.
2. `developing`
   The topic has moved beyond the starter shell. Real workflow layers are beginning to populate, navigation is useful, and at least one synthesis exists.
3. `maintained`
   The topic has an operational maintenance loop. Context packs are reusable, audits exist, and the topic can be resumed without guesswork.
4. `mature`
   The topic has strong canonical depth, strong workflow grounding, strong projection utility, and consistently high quality across layers.
5. `flagship`
   The topic is not just mature. It is also a showcase-quality example with explicit reproducible/reference paths, a clear product entry route, and no obviously weak surfaces.

## Quality dimensions

The evaluator scores seven dimensions:

- `surface completeness`
  Are the required surfaces present?
- `navigation`
  Do Start Here, Topic Map, Key Pages, and Reading Paths actually change what gets opened next?
- `canonical depth`
  Does the canonical wiki have durable article/synthesis depth, not just starter placeholders?
- `maintenance readiness`
  Do tensions, questions, watchpoints, and maintenance rhythm support ongoing work?
- `context-pack quality`
  Are context packs compact, task-shaped, and high-signal?
- `workflow and provenance`
  Do visible workflow layers exist beyond the starter shell: summaries, review history, archived answers, audits?
- `projection utility`
  Is the Obsidian projection useful for real daily work instead of being a thin mirror?

The rubric is heuristic.
It is meant to guide judgment honestly, not to pretend the topic can be perfectly scored by structure alone.

## What the evaluator is trying to prevent

The main failure mode is a topic that looks polished on the surface but is still mostly starter scaffolding.

That is why the evaluator refuses to promote a topic too far based only on:

- nice starter pages
- clean atlas notes
- good context-pack structure
- article polish alone

To move past `starter`, a topic needs real workflow evidence.
That means summaries, reviews, audits, archived answers, or comparable downstream layers need to exist and matter.

## Upgrade path guidance

The reports are intentionally action-oriented.

Typical transitions look like this:

- `starter -> developing`
  Run real summarize/review/audit loops and ground pages in more than corpus-only references.
- `developing -> maintained`
  Make maintenance rhythm, watchpoints, and context packs operational enough for repeated use.
- `maintained -> mature`
  Deepen syntheses, improve provenance integration, and trim surfaces that are still mostly anticipatory.
- `mature -> flagship`
  Add showcase discipline: reproducible modes, clear rendered entry paths, and no obviously weak surfaces.

## Current intended interpretation

The framework should distinguish the current topics like this:

- `openclaw`
  flagship or very near flagship, because it has real workflow artifacts, a rendered product entry route, reference/live modes, and strong daily-use surfaces
- `local-first-software`
  starter, even though it is a strong starter, because it is still mainly a dry-run bootstrap without real summarize/review/archive/audit depth

If the evaluator stops making that distinction, treat it as a regression in judgment quality.
