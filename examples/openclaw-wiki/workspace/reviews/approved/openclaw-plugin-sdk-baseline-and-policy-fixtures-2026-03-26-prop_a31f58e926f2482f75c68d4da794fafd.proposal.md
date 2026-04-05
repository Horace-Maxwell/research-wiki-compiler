# Create Plugin compatibility concept page

- Proposal ID: `prop_a31f58e926f2482f75c68d4da794fafd`
- Source ID: `src_6e48b953a265ca3f7f72796952b364b0`
- Status: approved
- Proposal type: create_page
- Risk level: medium
- Generated at: 2026-04-05T19:36:54.185Z
- Provider: openai
- Model: gpt-openclaw-example
- Prompt version: 0.4.0-m4
- Prompt hash: `3f515226b5d6435e4dd66528221719f48b5ddb14c03108e197b6142740b57eef`

## Patch Goal
Create a durable concept page for the compatibility surface between OpenClaw, plugins, and custom integrations.

## Rationale
This concept recurs in the source and is distinct from OpenClaw itself.

## Target Pages
- **OpenClaw** (entity, related) score 22.37
  Reasons: Exact page hint match for "OpenClaw" (+7); FTS match for "OpenClaw" (+4); FTS match for "Plugin compatibility" (+4); Fuzzy source title similarity for "OpenClaw plugin SDK baseline and policy fixtures (2026-03-26)" (+3.12); Entity overlap for "OpenClaw" (+2); Concept overlap for "Plugin compatibility" (+1.75); Recently updated wiki page (+0.5)

## Proposed New Page
- **Plugin compatibility** (concept)
- Suggested path: `wiki/concepts/plugin-compatibility.md`
- Rationale: The strongest new evidence is about plugin SDK baselines and what they mean for downstream integrations.

## Affected Sections
- Summary
- Why it matters
- Related pages

## Supporting Claims
- **supports / high**: Plugin SDK baseline refreshes can change OpenClaw integration capabilities and adoption timing.
  Rationale: The digest explicitly says the SDK baseline commit changes workflow, integration style, and available capability.
- **supports / medium**: Policy fixture work suggests OpenClaw integrators need to monitor compliance and disclosure boundaries.
  Rationale: The policy-fixture note frames the impact in terms of formal workflow adoption, supplier terms, and external disclosure.

## Conflict Notes
- No conflicts identified.

## Candidate Recall Snapshot
- **OpenClaw** (entity) score 22.37
- **OpenClaw release cadence** (topic) score 14.17
- **OpenClaw Example Workspace** (index) score 8.42

## Review Outcome
- Reviewed at: 2026-04-05T19:36:54.196Z
- Review note: Approved because the compatibility surface is a recurring concept in the corpus.
- Edited before apply: no

## Apply Result
- Applied at: 2026-04-05T19:36:54.196Z
- Apply success: yes
- Applied page id: page_4b2b7b61823f7e01f330cffd502f8fb9
- Affected paths: wiki/concepts/plugin-compatibility.md
- Git: Not attempted
- Apply error: None

## Proposed Hunks
### Summary
- Operation: replace

```md
Plugin compatibility is the moving boundary where OpenClaw releases, SDK baselines, and custom integrations either continue to work cleanly or force operators to adjust.
```

### Why it matters
- Operation: create_section

```md
- SDK baseline refreshes can change adoption timing and available capability.
- Policy-fixture work implies that compatibility is not just technical; it can touch compliance and disclosure boundaries too.
```

### Related pages
- Operation: create_section

```md
- [[OpenClaw]]
- [[OpenClaw release cadence]]
```
