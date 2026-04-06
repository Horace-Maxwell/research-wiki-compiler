# Merge Review Guide

This note is the GitHub-oriented review guide for the current productized branch state.

## 1. What this branch contains

This branch turns the repository from a strong single example into a reusable, multi-topic, research wiki system with:

- a flagship official OpenClaw example
- a reusable topic bootstrap system
- topic maturity and topic evaluation
- a multi-topic portfolio
- question, session, and synthesis operating surfaces
- evidence-change, evidence-gap, acquisition, and monitoring support lanes
- a final consolidation pass that makes the default daily path much clearer

The product shape is now intentionally:

- primary daily path:
  `topics -> topic home -> questions -> sessions -> syntheses`
- secondary signals:
  `gaps`, `changes`
- lower-frequency operations:
  `acquisition`, `monitoring`

## 2. What to read first on GitHub

Read in this order:

1. [`README.md`](../README.md)
2. [`docs/knowledge-work-method.md`](./knowledge-work-method.md)
3. [`topics/README.md`](../topics/README.md)
4. [`examples/openclaw-wiki/README.md`](../examples/openclaw-wiki/README.md)

If you want the shortest code-oriented inspection path after that:

1. [`src/components/app-shell.tsx`](../src/components/app-shell.tsx)
2. [`src/features/topics/components/topic-portfolio-view.tsx`](../src/features/topics/components/topic-portfolio-view.tsx)
3. [`src/features/topics/components/topic-workspace-intro.tsx`](../src/features/topics/components/topic-workspace-intro.tsx)
4. [`src/features/questions/components/question-workflow-view.tsx`](../src/features/questions/components/question-workflow-view.tsx)
5. [`src/features/sessions/components/research-session-view.tsx`](../src/features/sessions/components/research-session-view.tsx)
6. [`src/features/syntheses/components/research-synthesis-view.tsx`](../src/features/syntheses/components/research-synthesis-view.tsx)

## 3. What to open first in the app

Open these routes in order:

1. `/topics`
2. `/topics/openclaw`
3. `/questions?topic=openclaw`
4. `/sessions?topic=openclaw`
5. `/syntheses?topic=openclaw`

Open these only after the main path makes them relevant:

- `/gaps?topic=openclaw`
- `/changes?topic=openclaw`
- `/acquisition?topic=openclaw`
- `/monitoring?topic=openclaw`

## 4. What not to over-focus on

Do not review the branch as if every route were equally central.

The core review question is:

- does the product now make the default daily path clear and calm?

Secondary review questions:

- do topic homes now feel like the main working cockpit?
- do questions, sessions, and syntheses read as the main progression path?
- do gaps, changes, acquisition, and monitoring feel available but lower-pressure?
- does the repo still preserve reproducibility and the canonical wiki source-of-truth model?

Less important for this merge-prep pass:

- whether every advanced lane is perfect in isolation
- whether the branch adds more features
- whether every document is exhaustive

## 5. What to pay attention to during personal trial use

During personal trial use, pay closest attention to:

- whether `/topics` and topic home feel like the right default front door
- whether you can resume from topic home without rereading everything
- whether the main path actually feels lighter than opening many routes in parallel
- whether specialist lanes stay contextual instead of pulling attention constantly
- whether OpenClaw still feels flagship while local-first-software still reads as a starter

## 6. Reproducibility status

The branch keeps:

- the official OpenClaw example
- reference/live workflow modes
- the current compiled wiki source-of-truth model
- the Obsidian projection as an additive layer
- example validation and build readiness

Recommended verification for reviewers:

- `npm run lint`
- `npm test`
- `npm run example:openclaw:validate`
- `npm run build`

## 7. PR description draft

Suggested PR title:

`Consolidate Research Wiki Compiler into a trial-ready multi-topic knowledge workspace`

Suggested PR body:

```md
## Summary

This branch consolidates the repository into a trial-ready v1 of the product.

It keeps the official OpenClaw example, reproducibility model, canonical wiki source-of-truth, and additive Obsidian projection, while expanding the system into a reusable multi-topic knowledge workspace with:

- topic bootstrap and starter templates
- topic maturity and evaluation
- topic portfolio and topic homes
- question, session, and synthesis workflows
- evidence-change, evidence-gap, acquisition, and monitoring support lanes
- a final decomplexification pass that makes the default daily path explicit

## Final Product Shape

Primary path:

- `/topics`
- `/topics/[slug]`
- `/questions`
- `/sessions`
- `/syntheses`

Secondary/supporting:

- `/gaps`
- `/changes`

Lower-frequency operations:

- `/acquisition`
- `/monitoring`

## Reproducibility

- OpenClaw official example remains intact
- reference/live mode support remains intact
- example validation still passes
- canonical wiki remains the source of truth
- Obsidian remains a projection, not the truth layer

## How To Review

Read first:

1. `README.md`
2. `docs/knowledge-work-method.md`
3. `topics/README.md`
4. `examples/openclaw-wiki/README.md`

Open first in the app:

1. `/topics`
2. `/topics/openclaw`
3. `/questions?topic=openclaw`
4. `/sessions?topic=openclaw`
5. `/syntheses?topic=openclaw`

Do not over-focus on advanced lanes as equal-weight front doors. The main review question is whether the product now has a clearer, calmer default path for daily use.

## Verification

- [x] `npm run lint`
- [x] `npm test`
- [x] `npm run example:openclaw:validate`
- [x] `npm run build`
```
