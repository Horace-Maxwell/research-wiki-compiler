# Create Provider dependency risk concept page

- Proposal ID: `prop_8849036f4ae81b8730b5b119c5a07688`
- Source ID: `src_359c7879b0c1f818df8434be7b27682d`
- Status: approved
- Proposal type: create_page
- Risk level: medium
- Generated at: 2026-04-05T19:36:54.735Z
- Provider: openai
- Model: gpt-openclaw-example
- Prompt version: 0.4.0-m4
- Prompt hash: `3f515226b5d6435e4dd66528221719f48b5ddb14c03108e197b6142740b57eef`

## Patch Goal
Create a concept page for the external provider and access-path risks that shape OpenClaw maintenance decisions.

## Rationale
This concept is recurring and affects how the corpus interprets releases, changelogs, and external policy shifts.

## Target Pages
- **OpenClaw** (entity, related) score 23.04
  Reasons: FTS match for "Provider dependency risk" (+4); FTS match for "OpenClaw" (+3.4); FTS match for "Control UI" (+3.4); Fuzzy source title similarity for "OpenClaw provider risk and changelog signals (2026-04-05)" (+3.12); Fuzzy page hint similarity for "OpenClaw maintenance watchpoints" (+3.12); Entity overlap for "OpenClaw" (+2); Concept overlap for "Provider dependency risk" (+1.75); Concept overlap for "Control UI" (+1.75); Recently updated wiki page (+0.5)

## Proposed New Page
- **Provider dependency risk** (concept)
- Suggested path: `wiki/concepts/provider-dependency-risk.md`
- Rationale: The new evidence is specifically about external provider constraints and provider-specific integration paths.

## Affected Sections
- Summary
- Signals
- Related pages

## Supporting Claims
- **supports / high**: OpenClaw still depends on active provider and plugin adjustments, especially around model access and configuration.
  Rationale: The provider-specific shim removal and repeated release framing both point to a still-moving provider and integration layer.
- **mixed / medium**: External provider-policy shifts can create adoption and upgrade risk for OpenClaw workflows.
  Rationale: The Anthropic item is community-reported rather than a primary upstream source, but it is still treated as a meaningful risk signal.

## Conflict Notes
- Some provider-risk evidence is community-reported rather than a primary vendor statement, so it should be tracked as a tension signal rather than a settled fact.

## Candidate Recall Snapshot
- **OpenClaw** (entity) score 23.04
- **OpenClaw release cadence** (topic) score 16.25
- **Plugin compatibility** (concept) score 10.95
- **OpenClaw Example Workspace** (index) score 5.3

## Review Outcome
- Reviewed at: 2026-04-05T19:36:54.769Z
- Review note: Approved to give external provider constraints a durable conceptual page instead of burying them in release notes.
- Edited before apply: no

## Apply Result
- Applied at: 2026-04-05T19:36:54.769Z
- Apply success: yes
- Applied page id: page_4945463867c0dfe81cffaf2bdca8a0d3
- Affected paths: wiki/concepts/provider-dependency-risk.md
- Git: Not attempted
- Apply error: None

## Proposed Hunks
### Summary
- Operation: replace

```md
Provider dependency risk describes the way OpenClaw capabilities and upgrade choices can be reshaped by model-provider changes, restrictions, and provider-specific integration paths.
```

### Signals
- Operation: create_section

```md
- Provider-specific shim removal suggests the provider layer is still being actively simplified and rearranged.
- Community discussion about Anthropic restrictions is not a final authority, but it is still a warning that external policy moves can hit OpenClaw workflows.
```

### Related pages
- Operation: create_section

```md
- [[OpenClaw]]
- [[Plugin compatibility]]
- [[OpenClaw maintenance watchpoints]]
```
