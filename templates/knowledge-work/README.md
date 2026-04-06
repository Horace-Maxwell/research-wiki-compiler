# Knowledge Work Template Pack

This folder describes the reusable working pattern extracted from the official OpenClaw example.

The goal is not to mass-produce more pages.
The goal is to give a future topic the smallest durable set of surfaces that make the system maintainable, navigable, and usable for daily work.

## Core idea

The canonical compiled wiki remains the source of truth.

The Obsidian projection remains an additive working layer.

The reusable method is:

1. compile a bounded corpus into durable canonical wiki pages
2. expose a small working layer for tensions, questions, maintenance, and monitoring
3. expose a small Obsidian atlas/context-pack layer for everyday use and model loading
4. keep unresolved items visible until they either become syntheses or disappear for good

## Required canonical surfaces

- `index.md`
  The atlas / start-here surface for the topic.
- `reading-paths.md`
  The small-bundle routing page for orientation, maintenance, provenance, and resume flows.
- `current-tensions.md`
  The page that keeps active trade-offs visible instead of hiding them inside neutral articles.
- `open-questions.md`
  The note that keeps unresolved work visible and answerable.
- `maintenance-watchpoints.md`
  The operator-facing monitoring synthesis.
- `maintenance-rhythm.md`
  The maintenance control surface:
  revisit queue, context-pack refreshes, synthesis candidates, audit-to-action transitions.

## Required Obsidian atlas surfaces

- `Start Here`
- `Topic Map`
- `Key Pages`
- `Reading Paths`
- `Maintenance Rhythm`
- `Open Questions`
- `Current Tensions`
- `Monitoring`
- `LLM Context Pack`
- `Artifact Map`

## Required Obsidian context-pack surfaces

- one explanation pack
- one monitoring / upgrade pack
- one provenance / review pack
- one maintenance-triage pack

Each pack should be small enough to load into an LLM or into your own head without dragging the whole graph along.

## Canonical naming conventions

- Canonical wiki pages use durable titles:
  `Topic`, `Topic reading paths`, `Topic current tensions`, `Topic open questions`, `Topic maintenance watchpoints`, `Topic maintenance rhythm`.
- Obsidian atlas notes use short operational names:
  `Start Here`, `Reading Paths`, `Maintenance Rhythm`, `LLM Context Pack`.
- Context packs use task-first names:
  `Explain X`, `Upgrade Watchpoints`, `Provenance And Review`, `Maintenance Triage`.

## Layer roles

- canonical wiki:
  durable knowledge, readable articles, stable syntheses
- working wiki notes:
  tensions, open questions, maintenance rhythm, monitoring
- raw / normalized / summary / review / audit layers:
  provenance and mutation history
- Obsidian atlas:
  navigation, small context bundles, daily use

## Future-topic bootstrap path

1. Define the canonical surfaces first.
2. Define the working surfaces second.
3. Define the artifact-layer bridges third.
4. Only then define the Obsidian atlas and context packs.
5. Keep each note small enough to answer “why would I open this next?”

## Source files that encode the method

- `src/lib/contracts/topic-bootstrap.ts`
  The reusable starter-topic contract and manifest/baseline schemas.
- `src/server/services/topic-bootstrap-service.ts`
  The deterministic topic bootstrap builder and validator.
- `scripts/init-topic-bootstrap.ts`
  The public command for creating a new starter topic.
- `scripts/build-topic-bootstrap.ts`
  The public command for materializing the starter workspace.
- `scripts/validate-topic-bootstrap.ts`
  The public command for validating the starter baseline.
- `docs/topic-bootstrap.md`
  The topic-bootstrap playbook and quality bar.
- `topics/README.md`
  The folder layout and developer entry path for reusable topics.
- `src/server/services/knowledge-method-template-service.ts`
  The reusable template generator for canonical maintenance pages and Obsidian atlas/context-pack notes.
- `src/server/services/openclaw-knowledge-method.ts`
  The concrete OpenClaw data object that fills those templates.
- `docs/knowledge-work-method.md`
  The playbook for using this system without letting it turn into clutter.
