# Monitoring

## What to monitor

- [[OpenClaw maintenance watchpoints]]: The main monitoring synthesis for upgrades and maintenance. Revisit: Refresh when release, provider, or integration signals move.
- [[Note: What should I monitor before upgrading OpenClaw]]: An archived grounded answer that remains useful as an operational checklist. Revisit: Refresh when a better grounded answer becomes available.

## Refresh triggers

- Explain OpenClaw: refresh when the core explanation or tension framing changes.
- Upgrade Watchpoints: refresh when upgrade posture or monitoring logic changes.
- Provenance And Review: refresh when you need to audit how a claim entered the wiki.
- Maintenance Triage: refresh when you want to resume work without reloading the whole graph.

## Monitoring queue

### OpenClaw provider restriction monitor

- **Status**: spawned acquisition
- **Mode**: event triggered
- **Trigger behavior**: spawn acquisition
- **Latest signal**: A stronger provider-side signal now affects both the instability story and the upgrade-monitoring guidance, so provider consequence work should be active now.
- **Why it matters**: Provider-side shifts can invalidate adoption and upgrade assumptions at the same time, so the response should be explicit and bounded.
- **Next check**: Re-check on any new provider-side restriction or policy change that alters operator posture.
- **Load first**: [[Upgrade Watchpoints]], [[Maintenance Triage]]
- **Inspect pages**: [[Provider dependency risk]], [[OpenClaw current tensions]], [[OpenClaw maintenance watchpoints]], [[Note: What should I monitor before upgrading OpenClaw]]
- **Spawn task**: OpenClaw provider consequence pass
- **Session handoff**: Tighten the provider exposure map
- **Recent changes**: Provider-side signal reopens instability framing
- **Review surfaces**: [[Provider dependency risk]], [[OpenClaw current tensions]]
- **Recommended action**: Run the provider consequence pass and reopen instability framing before editing provider-risk pages or upgrade guidance in isolation.

### OpenClaw release packaging regression monitor

- **Status**: review needed
- **Mode**: event triggered
- **Trigger behavior**: mark review
- **Latest signal**: Release packaging and tightly spaced releases now look strong enough to affect the durable regression-depth rule set.
- **Why it matters**: The regression-trigger synthesis is only worth publishing if release evidence hardens into durable operator rules rather than a pile of hints.
- **Next check**: Re-check after each release note or changelog pass that changes regression posture.
- **Load first**: [[Upgrade Watchpoints]], [[Maintenance Triage]]
- **Inspect pages**: [[OpenClaw release cadence]], [[OpenClaw maintenance watchpoints]], [[Note: What should I monitor before upgrading OpenClaw]]
- **Spawn task**: OpenClaw upgrade trigger comparison pass
- **Session handoff**: Promote upgrade regression triggers into synthesis
- **Recent changes**: Release packaging sharpens regression rules
- **Review surfaces**: [[OpenClaw release cadence]], [[Note: What should I monitor before upgrading OpenClaw]]
- **Recommended action**: Review release cadence, watchpoints, and the archived upgrade note together before publishing the regression-trigger synthesis.

### OpenClaw plugin drift stability monitor

- **Status**: stable
- **Mode**: periodic review
- **Trigger behavior**: keep watching
- **Latest signal**: The compatibility evidence is real, but still too thin to justify reopening broader durable guidance across the topic.
- **Why it matters**: A change-aware system should also explain when a concern is still best handled as monitoring rather than as a full reopen event.
- **Next check**: Re-check after the next release or changelog pass that changes plugin or SDK assumptions.
- **Load first**: [[Upgrade Watchpoints]], [[Provenance And Review]]
- **Inspect pages**: [[Plugin compatibility]], [[OpenClaw open questions]], [[Review History]], [[Summary Atlas]]
- **Spawn task**: OpenClaw plugin drift capture
- **Session handoff**: Collect plugin and SDK drift evidence
- **Recent changes**: Plugin drift remains monitoring work
- **Review surfaces**: [[Plugin compatibility]]
- **Recommended action**: Keep plugin drift in the monitoring surface and question queue until a later release names concrete compatibility breakpoints.

## Escalate into acquisition

### OpenClaw provider restriction monitor
- **Trigger behavior**: spawn acquisition
- **Latest signal**: A stronger provider-side signal now affects both the instability story and the upgrade-monitoring guidance, so provider consequence work should be active now.
- **Spawn task**: OpenClaw provider consequence pass
- **Recommended action**: Run the provider consequence pass and reopen instability framing before editing provider-risk pages or upgrade guidance in isolation.

## Review-only signals

### OpenClaw release packaging regression monitor

- **Status**: review needed
- **Latest signal**: Release packaging and tightly spaced releases now look strong enough to affect the durable regression-depth rule set.
- **Recommended action**: Review release cadence, watchpoints, and the archived upgrade note together before publishing the regression-trigger synthesis.

### OpenClaw plugin drift stability monitor

- **Status**: stable
- **Latest signal**: The compatibility evidence is real, but still too thin to justify reopening broader durable guidance across the topic.
- **Recommended action**: Keep plugin drift in the monitoring surface and question queue until a later release names concrete compatibility breakpoints.

## Escalation path

- If a watch surface changes the operational story, reopen [[Current Tensions]].
- If it closes or opens a question, update [[Open Questions]].
- If it changes revisit order or suggests a new synthesis, update [[Maintenance Rhythm]].
