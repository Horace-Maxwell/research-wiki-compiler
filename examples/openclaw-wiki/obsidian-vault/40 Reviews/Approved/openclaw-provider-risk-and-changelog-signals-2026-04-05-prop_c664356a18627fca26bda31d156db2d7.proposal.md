# Record external tensions on OpenClaw

- Proposal ID: `prop_c664356a18627fca26bda31d156db2d7`
- Source ID: `src_359c7879b0c1f818df8434be7b27682d`
- Status: approved
- Proposal type: conflict_note
- Risk level: medium
- Generated at: 2026-04-05T19:36:54.735Z
- Provider: openai
- Model: gpt-openclaw-example
- Prompt version: 0.4.0-m4
- Prompt hash: `3f515226b5d6435e4dd66528221719f48b5ddb14c03108e197b6142740b57eef`

## Patch Goal
Record the external provider-policy tension that could constrain OpenClaw workflows even when the product itself keeps improving.

## Rationale
The OpenClaw entity page should show not just internal product movement, but the external constraints maintainers are reacting to.

## Target Pages
- **OpenClaw** (entity, primary) score 23.04
  Reasons: FTS match for "Provider dependency risk" (+4); FTS match for "OpenClaw" (+3.4); FTS match for "Control UI" (+3.4); Fuzzy source title similarity for "OpenClaw provider risk and changelog signals (2026-04-05)" (+3.12); Fuzzy page hint similarity for "OpenClaw maintenance watchpoints" (+3.12); Entity overlap for "OpenClaw" (+2); Concept overlap for "Provider dependency risk" (+1.75); Concept overlap for "Control UI" (+1.75); Recently updated wiki page (+0.5)
- **OpenClaw release cadence** (topic, related) score 16.25
  Reasons: FTS match for "OpenClaw maintenance watchpoints" (+4); FTS match for "OpenClaw" (+4); FTS match for "Control UI" (+4); Entity overlap for "OpenClaw" (+2); Concept overlap for "Control UI" (+1.75); Recently updated wiki page (+0.5)
- **Plugin compatibility** (concept, related) score 10.95
  Reasons: FTS match for "OpenClaw" (+2.2); Entity overlap for "OpenClaw" (+2); Backlinks into a higher-scoring candidate page (+1.25); Backlinks into a higher-scoring candidate page (+1.25); Linked from a higher-scoring candidate page (+1.25); Linked from a higher-scoring candidate page (+1.25); Linked from a higher-scoring candidate page (+1.25); Recently updated wiki page (+0.5)

## Proposed New Page
- None.

## Affected Sections
- Tensions

## Supporting Claims
- **mixed / medium**: External provider-policy shifts can create adoption and upgrade risk for OpenClaw workflows.
  Rationale: The Anthropic item is community-reported rather than a primary upstream source, but it is still treated as a meaningful risk signal.

## Conflict Notes
- The Anthropic-related signal is a community risk marker, not a fully authoritative upstream contract statement.

## Candidate Recall Snapshot
- **OpenClaw** (entity) score 23.04
- **OpenClaw release cadence** (topic) score 16.25
- **Plugin compatibility** (concept) score 10.95
- **OpenClaw Example Workspace** (index) score 5.3

## Review Outcome
- Reviewed at: 2026-04-05T19:36:54.819Z
- Review note: Approved to keep the Anthropic-related signal visible as a tension, not as a silent assumption.
- Edited before apply: no

## Apply Result
- Applied at: 2026-04-05T19:36:54.819Z
- Apply success: yes
- Applied page id: page_07ed1b7748728ef6ac102f22e4ed604d
- Affected paths: wiki/entities/openclaw.md
- Git: Not attempted
- Apply error: None

## Proposed Hunks
### Tensions
- Operation: note_conflict

```md
External provider-policy shifts can create adoption and upgrade risk for OpenClaw workflows, so maintainers should treat provider dependence as an ongoing tension rather than a solved detail. See [[Provider dependency risk]].
```
