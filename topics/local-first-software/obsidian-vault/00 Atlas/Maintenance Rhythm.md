# Maintenance Rhythm

## Start a pass here

- Read [[Current Tensions]].
- Read [[Open Questions]].
- Read [[Local-First Software maintenance watchpoints]].
- Only reopen the full article graph if these three notes say the story moved.

## Revisit next

- [[Local-First Software current tensions]]: This is the fastest way to see whether the operating story moved.
- [[Local-First Software open questions]]: This keeps unresolved work visible instead of dissolving into general backlog noise.
- [[Local-First Software maintenance rhythm]]: This controls revisit order, context-pack refreshes, and next synthesis candidates.

## Session queue

### Promote the migration playbook

- **Question**: Which migration concerns deserve their own synthesis instead of staying inside a concept page?
- **Status**: active
- **Load first**: [[Maintenance Triage]]
- **Goal**: Turn the migration-pressure thread into the first real synthesis instead of leaving it split across concept and maintenance notes.
- **Deepen with**: [[Explain Local-First Software]]
- **Likely durable target**: [[Local-first migration playbook]]
- **Update next**: [[Local-First Software maintenance rhythm]], [[Local-First Software open questions]]
- **Resume cue**: Start from Maintenance Triage before reopening the whole graph.
- **Next step**: Use this session to decide whether the migration playbook can be promoted now, then update the maintenance rhythm and open-questions note together.

### Collect repeat repair and conflict signals

- **Question**: Which conflict or repair signals should become explicit watchpoints?
- **Status**: queued
- **Load first**: [[Maintenance Triage]]
- **Goal**: Decide whether repair burden has enough repeated evidence to justify explicit watchpoints.
- **Deepen with**: [[Provenance And Review]]
- **Update next**: [[Local-First Software maintenance rhythm]]
- **Resume cue**: Do not turn this into a durable watchpoint until the same repair signal recurs in a clearly operational way.
- **Next step**: Wait for another source or audit pass, then compare whether the same repair signal still changes maintenance order.

## Synthesis decisions

### Local-first migration playbook

- **Status**: ready
- **Confidence**: 77%
- **Source questions**: Which migration concerns deserve their own synthesis instead of staying inside a concept page?
- **Durable conclusion**: The topic is ready for a migration-playbook synthesis that explains when schema change, repair burden, and watchpoints become operationally significant.
- **Source sessions**: Promote the migration playbook
- **Keep provisional**: The published version should stay focused on migration triggers and maintenance consequences, not a broad restatement of the whole topic.
- **Decision (recommendation)**: Publish the migration playbook next. This is the clearest path from a well-structured starter topic into a more durable and decision-relevant workspace. Complete the active migration session, then update maintenance rhythm, open questions, and the watchpoint surface together.
- **Decision (watch)**: Use the playbook to tighten watchpoints. A published migration playbook should clarify which signals belong in watchpoints versus generic revisit notes. After publication, rewrite the watchpoint synthesis using the same migration-trigger vocabulary.
- **Question effects**: Which migration concerns deserve their own synthesis instead of staying inside a concept page? (resolved): Publishing this synthesis would resolve the clearest ready-for-synthesis question in the starter topic. Which conflict or repair signals should become explicit watchpoints? (advanced): A migration playbook would give the watchpoint question a clearer operational boundary.
- **Canonical effect**: Publishing this synthesis would make the topic's migration story more durable and would narrow what still belongs in the open-question queue.
- **Update surfaces**: [[Schema migration pressure]], [[Local-First Software maintenance rhythm]], [[Local-First Software open questions]], [[Local-First Software maintenance watchpoints]], [[Local-First Software current tensions]], [[Note: What should I revisit next for Local-First Software]]
- **Next step**: Complete the active synthesis session, publish the migration playbook, then update maintenance rhythm, watchpoints, and the operational note together.

### Local-first sync risk map

- **Status**: candidate
- **Confidence**: 63%
- **Source questions**: Which sync-engine assumptions are durable enough to keep in canonical pages instead of working notes?
- **Durable conclusion**: The topic is close to supporting a stronger sync-risk synthesis, but it still wants one tighter pass before it becomes durable guidance.
- **Source sessions**: Ground the durable sync assumptions
- **Keep provisional**: This synthesis should not publish until the sync-cost boundary reads as durable guidance rather than starter scaffolding.
- **Decision (comparison)**: Separate durable sync risk from working repair detail. The synthesis should show which sync-system claims are ready for the durable layer versus which ones still belong in working and maintenance surfaces. Use the canonical entry, Sync engines page, and tensions synthesis together when drafting the risk map.
- **Question effects**: Which sync-engine assumptions are durable enough to keep in canonical pages instead of working notes? (advanced): Publishing this synthesis would narrow the sync-boundary question and make future canonical updates more explicit.
- **Canonical effect**: If published, this synthesis would tighten the canonical sync story and make later maintenance work much easier to resume.
- **Update surfaces**: [[Local-First Software]], [[Sync engines]], [[Local-First Software maintenance rhythm]], [[Local-First Software open questions]], [[Local-First Software current tensions]]
- **Next step**: Run one more focused sync-risk pass before promoting this candidate into a published synthesis.

## Context packs to refresh

- `Explain Local-First Software`: the canonical entry page or tension framing changes.
- `Maintenance Triage`: revisit order, open questions, or monitoring posture changes.
- `Provenance And Review`: you need to inspect where future source summaries, reviews, or audits should land.

## Synthesis candidates

- **Local-first sync risk map**: The corpus already hints that sync policy is the real durability boundary, but the practical risk story is still split across the entry page, a concept page, and the maintenance surfaces.
- **Local-first migration playbook**: Migration pressure is already visible as a durable concern, but the corpus is not yet rich enough to turn it into a fully stable operational synthesis.
