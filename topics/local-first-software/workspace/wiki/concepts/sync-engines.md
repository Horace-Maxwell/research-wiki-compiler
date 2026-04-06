---
title: Sync engines
slug: sync-engines
type: concept
created_at: '2026-04-05T12:00:00.000Z'
updated_at: '2026-04-05T12:00:00.000Z'
status: active
aliases: []
tags:
  - local-first-software
  - bootstrap
  - concept
  - sync
  - bootstrap-managed
source_refs:
  - 'corpus:2026-04-02-sync-engines.md'
  - 'corpus:2026-04-03-maintenance-risks.md'
page_refs:
  - Local-First Software
  - Schema migration pressure
  - Local-First Software maintenance watchpoints
confidence: 0.55
review_status: bootstrap
knowledge_role: The canonical sync-architecture page.
surface_kind: canonical
refresh_triggers: []
bootstrap_topic_slug: local-first-software
managed_by: topic-bootstrap-v1
---
# Sync engines

## Summary

In this starter corpus, sync engines look like the operational heart of a local-first system: they decide how state replicates, how conflicts resolve, and how expensive schema changes become over time.

## Design pressures

A sync engine is not just transport. It shapes the cost of collaboration, repair, and schema evolution.
If the sync layer is weakly specified, local-first ergonomics can look convincing in demos while staying fragile in practice.

## What to inspect next

Track whether conflict policy is explicit enough to stay out of ad hoc repair playbooks.
Track whether replication choices are starting to dictate migration and device-repair workflows.

## Related pages

- [[Local-First Software]]
- [[Schema migration pressure]]
- [[Local-First Software maintenance watchpoints]]

## Bootstrap next steps

- Use this page to keep replication-model decisions separate from higher-level product framing.
- Promote recurring sync-engine trade-offs into watchpoints only when they start changing maintenance behavior.
