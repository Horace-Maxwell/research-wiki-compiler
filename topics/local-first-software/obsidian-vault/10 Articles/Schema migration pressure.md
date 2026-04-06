---
title: Schema migration pressure
slug: schema-migration-pressure
type: concept
created_at: '2026-04-05T12:00:00.000Z'
updated_at: '2026-04-05T12:00:00.000Z'
status: active
aliases: []
tags:
  - local-first-software
  - bootstrap
  - concept
  - migration
  - bootstrap-managed
source_refs:
  - 'corpus:2026-04-02-sync-engines.md'
  - 'corpus:2026-04-03-maintenance-risks.md'
page_refs:
  - Local-First Software
  - Sync engines
  - Local-First Software maintenance rhythm
confidence: 0.55
review_status: bootstrap
knowledge_role: The canonical maintenance-pressure page.
surface_kind: canonical
refresh_triggers: []
bootstrap_topic_slug: local-first-software
managed_by: topic-bootstrap-v1
---
# Schema migration pressure

## Summary

The starter corpus frames migration pressure as one of the hardest long-term burdens in local-first software because every local copy can turn a data-model change into an operational event.

## Why migration pressure matters

A local-first system inherits every copy of the data model, so migrations can become a coordination problem instead of a one-time deployment task.
Repair paths, drift handling, and upgrade timing belong in the same conversation as schema evolution.

## Signals to monitor

Look for recurring evidence that schema shifts are forcing manual repair or device-specific recovery work.
Look for signs that migration tooling is becoming the hidden boundary between a believable system and a fragile one.

## Related pages

- [[Local-First Software]]
- [[Sync engines]]
- [[Local-First Software maintenance rhythm]]

## Bootstrap next steps

- Use this page to keep migration and repair pressure visible as part of the topic's durable story.
- If watchpoints repeatedly mention upgrade or repair cadence, turn that pattern into a stronger synthesis candidate.
