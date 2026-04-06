---
title: Local-First Software current tensions
slug: local-first-software-current-tensions
type: synthesis
created_at: '2026-04-05T12:00:00.000Z'
updated_at: '2026-04-05T12:00:00.000Z'
status: active
aliases: []
tags:
  - local-first-software
  - tensions
  - bootstrap
  - bootstrap-managed
source_refs:
  - 'corpus:2026-04-01-local-first-core.md'
  - 'corpus:2026-04-02-sync-engines.md'
  - 'corpus:2026-04-03-maintenance-risks.md'
page_refs:
  - Local-First Software
  - Local-First Software maintenance watchpoints
  - Local-First Software open questions
  - Local-First Software maintenance rhythm
confidence: 0.55
review_status: bootstrap
knowledge_role: The live-uncertainty surface.
surface_kind: working
revisit_cadence: Refresh whenever new evidence changes practical risk or ambiguity.
refresh_triggers:
  - A source file changes the current framing of the topic.
  - >-
    A recurring disagreement belongs in a durable tension instead of scattered
    notes.
bootstrap_topic_slug: local-first-software
managed_by: topic-bootstrap-v1
---
# Local-First Software current tensions

## Summary

The starter corpus points to a classic local-first tension: the product feels strongest when data is always local and collaborative, but sync policy, migration cost, and repair burden become the real long-term operating surface.

## Current tensions

- Offline-first confidence versus sync-system complexity.
- Elegant collaboration promises versus conflict-resolution reality.
- Fast product iteration versus schema migration and repair cost.

## Why they matter

- A local-first system can look simple from the top-level product story while hiding most of its real cost inside replication and recovery logic.
- If conflict policy stays vague, users pay the price later through repair workflows and trust erosion.
- If migration pressure is treated as an implementation detail, maintenance work becomes harder to resume and harder to plan.

## What might become synthesis next

- **Local-first sync risk map**: The corpus already hints that sync policy is the real durability boundary, but the practical risk story is still split across the entry page, a concept page, and the maintenance surfaces.
- **Local-first migration playbook**: Migration pressure is already visible as a durable concern, but the corpus is not yet rich enough to turn it into a fully stable operational synthesis.

## Related pages

- [[Local-First Software]]
- [[Local-First Software maintenance watchpoints]]
- [[Local-First Software open questions]]
- [[Local-First Software maintenance rhythm]]
