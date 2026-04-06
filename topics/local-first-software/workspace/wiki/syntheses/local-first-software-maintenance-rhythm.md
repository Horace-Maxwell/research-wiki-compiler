---
title: Local-First Software maintenance rhythm
slug: local-first-software-maintenance-rhythm
type: synthesis
created_at: '2026-04-05T12:00:00.000Z'
updated_at: '2026-04-05T12:00:00.000Z'
status: active
aliases: []
tags:
  - local-first-software
  - maintenance-rhythm
  - bootstrap
  - bootstrap-managed
source_refs:
  - 'corpus:2026-04-01-local-first-core.md'
  - 'corpus:2026-04-02-sync-engines.md'
  - 'corpus:2026-04-03-maintenance-risks.md'
page_refs:
  - Local-First Software current tensions
  - Local-First Software open questions
  - Local-First Software maintenance watchpoints
  - Local-First Software reading paths
  - Local-First Software maintenance rhythm
  - Local-First Software
  - 'Note: What should I revisit next for Local-First Software'
  - Corpus Atlas
  - Review History
  - Audit Atlas
  - Sync engines
  - Schema migration pressure
  - Local-First Software Index
confidence: 0.55
review_status: bootstrap
knowledge_role: The daily maintenance control surface.
surface_kind: working
revisit_cadence: Review at the start of each maintenance pass.
refresh_triggers:
  - An audit finding changes revisit order.
  - A context pack or open question becomes stale enough to reshape next work.
bootstrap_topic_slug: local-first-software
managed_by: topic-bootstrap-v1
---
# Local-First Software maintenance rhythm

## Summary

This page is the maintenance control surface for the Local-First Software bootstrap. It turns the starter wiki into a durable daily workflow: what to revisit next, which compact context packs deserve refresh, what should graduate into synthesis, and where future audit findings should land.

## Review cadence

- Start a maintenance pass with [[Local-First Software current tensions]] and [[Local-First Software open questions]].
- Re-open [[Local-First Software maintenance watchpoints]] before any upgrade, policy, or integration decision.
- Refresh [[Local-First Software reading paths]] whenever the smallest useful note bundle changes.

## Revisit next

- [[Local-First Software current tensions]]: This is the fastest way to see whether the operating story moved. Trigger: After any new source intake or recurring disagreement.
- [[Local-First Software open questions]]: This keeps unresolved work visible instead of dissolving into general backlog noise. Trigger: After each reading pass or audit.
- [[Local-First Software maintenance rhythm]]: This controls revisit order, context-pack refreshes, and next synthesis candidates. Trigger: Before deciding what to reopen next.

## Context packs to refresh

- `Explain Local-First Software`: refresh when the canonical entry page or tension framing changes. Reload [[Local-First Software]], [[Local-First Software current tensions]], [[Local-First Software maintenance watchpoints]].
- `Maintenance Triage`: refresh when revisit order, open questions, or monitoring posture changes. Reload [[Local-First Software maintenance rhythm]], [[Local-First Software current tensions]], [[Local-First Software open questions]], [[Note: What should I revisit next for Local-First Software]].
- `Provenance And Review`: refresh when you need to inspect where future source summaries, reviews, or audits should land. Reload [[Local-First Software]], [[Corpus Atlas]], [[Review History]], [[Audit Atlas]].

## Synthesis candidates

- **Local-first sync risk map**: The corpus already hints that sync policy is the real durability boundary, but the practical risk story is still split across the entry page, a concept page, and the maintenance surfaces. Start from [[Local-First Software]], [[Sync engines]], [[Local-First Software current tensions]], [[Local-First Software maintenance watchpoints]].
- **Local-first migration playbook**: Migration pressure is already visible as a durable concern, but the corpus is not yet rich enough to turn it into a fully stable operational synthesis. Start from [[Schema migration pressure]], [[Local-First Software maintenance rhythm]], [[Local-First Software open questions]], [[Note: What should I revisit next for Local-First Software]].

## Audit to action

- A coverage audit flags a thin or weakly linked area. Move into [[Local-First Software maintenance rhythm]] and decide whether the gap belongs in the revisit queue, the open-question note, or a new synthesis candidate.
- A review concern keeps recurring across different additions. Move into [[Local-First Software current tensions]] and promote the disagreement into a durable tension instead of letting it disappear into proposal history.
- A watchpoint repeatedly changes what you read next. Move into [[Local-First Software maintenance watchpoints]] and rewrite the monitoring synthesis first, then update the operational note only if the checklist actually changed.

## Canonical vs working surfaces

### Canonical durable surfaces

- [[Local-First Software]]: The durable entry point for first-pass understanding.
- [[Sync engines]]: The canonical sync-architecture page.
- [[Schema migration pressure]]: The canonical maintenance-pressure page.
- [[Local-First Software maintenance watchpoints]]: The operational monitoring synthesis.

### Working and maintenance surfaces

- [[Local-First Software current tensions]]: The live-uncertainty surface.
- [[Local-First Software open questions]]: The unresolved-work queue.
- [[Local-First Software maintenance rhythm]]: The daily maintenance control surface.
- [[Local-First Software reading paths]]: The bundle-selection guide.
- [[Local-First Software maintenance watchpoints]]: The operational monitoring synthesis.
- [[Note: What should I revisit next for Local-First Software]]: The small operational handoff note.

## Related pages

- [[Local-First Software Index]]
- [[Local-First Software current tensions]]
- [[Local-First Software open questions]]
- [[Local-First Software maintenance watchpoints]]
- [[Local-First Software reading paths]]
