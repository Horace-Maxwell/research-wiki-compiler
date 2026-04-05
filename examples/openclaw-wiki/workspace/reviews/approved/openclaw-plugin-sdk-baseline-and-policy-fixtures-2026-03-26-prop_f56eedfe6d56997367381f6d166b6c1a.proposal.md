# Add integration-surface evidence to OpenClaw

- Proposal ID: `prop_f56eedfe6d56997367381f6d166b6c1a`
- Source ID: `src_6e48b953a265ca3f7f72796952b364b0`
- Status: approved
- Proposal type: update_page
- Risk level: medium
- Generated at: 2026-04-05T19:36:54.185Z
- Provider: openai
- Model: gpt-openclaw-example
- Prompt version: 0.4.0-m4
- Prompt hash: `3f515226b5d6435e4dd66528221719f48b5ddb14c03108e197b6142740b57eef`

## Patch Goal
Expand the OpenClaw page with evidence about SDK baselines, policy fixtures, and practical workflow impact.

## Rationale
The entity page should not stay at release-level framing only; the corpus also describes how OpenClaw changes land on integration workflows.

## Target Pages
- **OpenClaw** (entity, primary) score 22.37
  Reasons: Exact page hint match for "OpenClaw" (+7); FTS match for "OpenClaw" (+4); FTS match for "Plugin compatibility" (+4); Fuzzy source title similarity for "OpenClaw plugin SDK baseline and policy fixtures (2026-03-26)" (+3.12); Entity overlap for "OpenClaw" (+2); Concept overlap for "Plugin compatibility" (+1.75); Recently updated wiki page (+0.5)

## Proposed New Page
- None.

## Affected Sections
- Integration surface
- Workflow cautions

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
- Reviewed at: 2026-04-05T19:36:54.224Z
- Review note: Approved to land the SDK baseline and policy-fixture evidence on the core OpenClaw page.
- Edited before apply: no

## Apply Result
- Applied at: 2026-04-05T19:36:54.224Z
- Apply success: yes
- Applied page id: page_07ed1b7748728ef6ac102f22e4ed604d
- Affected paths: wiki/entities/openclaw.md
- Git: Not attempted
- Apply error: None

## Proposed Hunks
### Integration surface
- Operation: create_section

```md
- Plugin SDK baseline refreshes can change what downstream integrations expect from OpenClaw.
- The corpus treats SDK, plugin, and workflow changes as operational signals, not just code churn.
- See [[Plugin compatibility]] for the compatibility layer this creates.
```

### Workflow cautions
- Operation: create_section

```md
- Type-policy fixture work suggests that some OpenClaw integrations may also need review around compliance, supplier terms, and disclosure boundaries.
```
