# Knowledge Work Method

This document explains how the repository is meant to be used as a durable knowledge-work system, not just as a one-off example.

## 1. Canonical wiki vs Obsidian projection

The canonical compiled wiki is the source of truth.

That is where durable pages live:

- topic/entity/concept pages
- syntheses
- archived answer notes
- maintenance-facing canonical pages

The Obsidian projection is a companion working layer.

That is where you optimize for:

- maps of content
- small note bundles
- quick resume paths
- compact context packs
- day-to-day reading and maintenance

Do not invert them.
Do not let the Obsidian layer become the hidden source of truth.

## 2. The minimum useful surface set

For a topic to stay maintainable over time, you need more than good articles.

You need six canonical working surfaces:

- `index`
  the atlas and first entry point
- `reading paths`
  the smallest useful bundles for different tasks
- `current tensions`
  active trade-offs and uncertainty
- `open questions`
  unresolved work that should remain visible
- `maintenance watchpoints`
  operator-facing monitoring logic
- `maintenance rhythm`
  the revisit queue and maintenance control surface

If one of these is missing, the system usually becomes harder to resume, harder to maintain, or harder to use with models.

## 3. What belongs where

Use the canonical wiki for:

- durable topic understanding
- durable syntheses
- grounded archived answers
- maintenance logic that should survive time

Use working notes for:

- unresolved questions
- tensions that are still live
- maintenance sequencing
- “what should I do next?”

Use the raw / normalized / summary / review / audit layers for:

- provenance
- debugging
- mutation history
- structural maintenance

Use the Obsidian atlas for:

- fast navigation
- compact bundles
- daily use
- resuming work after time away

## 4. Context-pack discipline

Context packs are not mini-docsites.

A good context pack is:

- small
- task-shaped
- grounded in canonical pages
- explicit about when to use it
- explicit about what to load

Every context pack should answer:

- why would I open this?
- what notes should stay active together?
- what should remain outside the pack unless needed?

If a pack keeps growing, split it by task instead of letting it become another atlas.

## 5. Reading paths are operational, not ornamental

Reading paths should help with real tasks:

- understand the topic quickly
- inspect operational risk
- trace provenance
- resume work without rereading everything
- choose the right model bundle

If a reading path does not change what a user opens next, it is not doing enough.

## 6. Tensions, questions, watchpoints, syntheses

These surfaces serve different jobs:

- tensions:
  what still feels unstable, contradictory, or strategically live
- open questions:
  what is still unresolved and should drive the next pass
- watchpoints:
  what should be monitored operationally
- syntheses:
  what has become stable and useful enough to deserve durable compiled treatment

Promotion rule:

- if the same tension keeps recurring, it should probably become a stronger synthesis candidate
- if a question is repeatedly answerable from the same bundle, it should graduate into a synthesis or canonical page update
- if a monitoring note keeps changing the same decision, it should likely be promoted into a clearer maintenance synthesis

## 7. The maintenance rhythm

The maintenance rhythm page exists so the system can be resumed without re-reading the whole graph.

It should answer:

- what should I revisit next?
- which context packs are stale?
- which questions may now be answerable?
- which tensions deserve synthesis?
- where should audit findings land?
- what is canonical vs still working-state?

If you do not know where new work should land, update the maintenance rhythm first.

## 8. Audit-to-action rule

Audit output is not the final destination.

An audit finding should usually land in one of three places:

- `open questions`
  if the finding exposes unresolved uncertainty
- `current tensions`
  if the finding exposes a live trade-off or disagreement
- `maintenance rhythm`
  if the finding changes revisit order, pack refresh order, or synthesis priority

Only create a new durable synthesis when the work has stabilized enough to deserve it.

## 9. Keep the system from becoming cluttered

Do not create a page just because you can name it.

A new surface is justified only if it clearly improves one of these:

- resume speed
- maintenance clarity
- context-pack quality
- synthesis quality
- provenance clarity

Good signs:

- the new surface reduces rereading
- the new surface reduces ambiguity about next action
- the new surface gives a better bundle for human or model use

Bad signs:

- the new surface repeats the article without changing action
- the new surface exists only to “organize” something nobody actually opens
- the new surface is a backlog disguised as a knowledge page

## 10. Applying the method to a new topic

The method is encoded in:

- `src/server/services/knowledge-method-template-service.ts`
- `src/server/services/openclaw-knowledge-method.ts`
- `templates/knowledge-work/README.md`

The practical path for a new topic is:

1. define the new topic’s `KnowledgeMethodTemplateData`
2. name the canonical surfaces
3. define the working surfaces and revisit cadence
4. define 3-4 task-shaped context packs
5. generate the canonical maintenance pages and Obsidian atlas notes
6. wire them into that topic’s official example/workflow/validation path

This keeps the system reproducible and prevents every new topic from inventing a different navigation model.
