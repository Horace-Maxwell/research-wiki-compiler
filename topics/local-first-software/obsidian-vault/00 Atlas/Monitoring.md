# Monitoring

## What to monitor

- [[Local-First Software maintenance watchpoints]]: A synthesis that turns the canonical pages into an operator-facing monitoring surface. Revisit: Refresh when maintenance posture, operating assumptions, or monitoring logic changes.
- [[Note: What should I revisit next for Local-First Software]]: A working operational note that keeps the next-pass checklist visible.

## Refresh triggers

- Explain Local-First Software: refresh when the canonical entry page or tension framing changes.
- Maintenance Triage: refresh when revisit order, open questions, or monitoring posture changes.
- Provenance And Review: refresh when you need to inspect where future source summaries, reviews, or audits should land.

## Monitoring queue

### Local-First Software maintenance trigger monitor

- **Status**: spawned acquisition
- **Mode**: event triggered
- **Trigger behavior**: spawn acquisition
- **Latest signal**: The latest maintenance evidence already makes the migration promotion path clearer, so the bounded comparison pass should be active now.
- **Why it matters**: The system should turn meaningful maintenance movement into bounded acquisition work instead of generic review churn.
- **Next check**: Re-check after the active migration session or whenever a new bounded evidence pass changes revisit order again.
- **Load first**: [[Maintenance Triage]], [[Explain Local-First Software]]
- **Inspect pages**: [[Schema migration pressure]], [[Local-First Software maintenance rhythm]], [[Local-First Software open questions]]
- **Spawn task**: Local-First Software migration promotion pass
- **Session handoff**: Promote the migration playbook
- **Recent changes**: Local-First Software maintenance evidence tightened
- **Review surfaces**: [[Local-First Software maintenance watchpoints]]
- **Recommended action**: Keep the migration promotion pass bounded, then update maintenance rhythm and open questions from the same decision rather than widening the whole topic.

### Local-First Software watchpoint recurrence monitor

- **Status**: watching
- **Mode**: periodic review
- **Trigger behavior**: spawn acquisition
- **Latest signal**: The watch surface is useful, but it still lacks repeated evidence showing that the same repair or conflict signal changes operator behavior more than once.
- **Why it matters**: Monitoring only becomes useful when it has a clear boundary for when the system should collect more evidence instead of merely keeping an eye on things.
- **Next check**: Re-check after the next source addition, audit pass, or review concern that names the same repair signal again.
- **Load first**: [[Maintenance Triage]], [[Provenance And Review]]
- **Inspect pages**: [[Local-First Software maintenance watchpoints]], [[Local-First Software current tensions]], [[Local-First Software open questions]], [[Note: What should I revisit next for Local-First Software]]
- **Spawn task**: Local-First Software watchpoint recurrence capture
- **Session handoff**: Collect repeat repair and conflict signals
- **Recent changes**: Local-First Software maintenance evidence tightened
- **Review surfaces**: [[Local-First Software maintenance watchpoints]]
- **Recommended action**: If the same signal recurs again, run the watchpoint recurrence acquisition task instead of broadening the monitoring surface by feel.

### Local-First Software canonical boundary stability monitor

- **Status**: stable
- **Mode**: passive
- **Trigger behavior**: keep watching
- **Latest signal**: Recent evidence changed maintenance and monitoring posture more than it changed the top-level durable explanation.
- **Why it matters**: A change-aware system should also preserve stable article boundaries, not only surface new work.
- **Next check**: Re-check only after a new source changes the core framing rather than the surrounding maintenance logic.
- **Load first**: [[Explain Local-First Software]]
- **Inspect pages**: [[Local-First Software]], [[Sync engines]], [[Local-First Software current tensions]]
- **Session handoff**: Ground the durable sync assumptions
- **Recent changes**: Local-First Software canonical boundary remains stable
- **Review surfaces**: [[Local-First Software]]
- **Recommended action**: Keep the canonical entry stable and spend the next pass on maintenance and monitoring surfaces unless the top-level story itself moves.

## Escalate into acquisition

### Local-First Software maintenance trigger monitor
- **Trigger behavior**: spawn acquisition
- **Latest signal**: The latest maintenance evidence already makes the migration promotion path clearer, so the bounded comparison pass should be active now.
- **Spawn task**: Local-First Software migration promotion pass
- **Recommended action**: Keep the migration promotion pass bounded, then update maintenance rhythm and open questions from the same decision rather than widening the whole topic.
### Local-First Software watchpoint recurrence monitor
- **Trigger behavior**: spawn acquisition
- **Latest signal**: The watch surface is useful, but it still lacks repeated evidence showing that the same repair or conflict signal changes operator behavior more than once.
- **Spawn task**: Local-First Software watchpoint recurrence capture
- **Recommended action**: If the same signal recurs again, run the watchpoint recurrence acquisition task instead of broadening the monitoring surface by feel.

## Review-only signals

### Local-First Software canonical boundary stability monitor

- **Status**: stable
- **Latest signal**: Recent evidence changed maintenance and monitoring posture more than it changed the top-level durable explanation.
- **Recommended action**: Keep the canonical entry stable and spend the next pass on maintenance and monitoring surfaces unless the top-level story itself moves.

## Escalation path

- If a watch surface changes the operational story, reopen [[Current Tensions]].
- If it closes or opens a question, update [[Open Questions]].
- If it changes revisit order or suggests a new synthesis, update [[Maintenance Rhythm]].
