# Maintenance Rhythm

## Start a pass here

- Read [[Current Tensions]].
- Read [[Open Questions]].
- Read [[OpenClaw maintenance watchpoints]].
- Only reopen the full article graph if these three notes say the story moved.

## Revisit next

- [[OpenClaw current tensions]]: This is the fastest way to see whether the operating story actually changed.
- [[OpenClaw maintenance watchpoints]]: This is the operational checklist that most directly affects upgrade behavior.
- [[OpenClaw open questions]]: This is where unresolved work should stay visible instead of dissolving into backlog noise.
- [[OpenClaw reading paths]]: This is where the smallest useful note bundle stays current.

## Session queue

### Promote upgrade regression triggers into synthesis

- **Question**: Which release-note or changelog signals should trigger a full regression run instead of a light upgrade check?
- **Status**: active
- **Load first**: [[Upgrade Watchpoints]]
- **Goal**: Decide which release-note and changelog signals justify a full regression run instead of a light upgrade check.
- **Deepen with**: [[Maintenance Triage]]
- **Likely durable target**: [[OpenClaw upgrade regression triggers]]
- **Update next**: [[OpenClaw maintenance rhythm]], [[OpenClaw open questions]]
- **Resume cue**: Start from Upgrade Watchpoints, not the whole article graph.
- **Next step**: Finish the trigger matrix, then update the question queue and maintenance rhythm together so the promotion is visible everywhere.

### Collect plugin and SDK drift evidence

- **Question**: Which plugin or SDK assumptions are most likely to drift between releases?
- **Status**: queued
- **Load first**: [[Upgrade Watchpoints]]
- **Goal**: Decide whether the plugin-compatibility boundary has enough release-to-release evidence to harden into a stronger answer.
- **Deepen with**: [[Provenance And Review]]
- **Update next**: [[OpenClaw open questions]]
- **Resume cue**: Use Provenance And Review before writing any new durable answer here.
- **Next step**: Wait for another release or changelog pass, then compare the new evidence against the existing compatibility and review-history notes.

### Tighten the provider exposure map

- **Question**: Which provider-side changes would change adoption or upgrade decisions the fastest?
- **Status**: queued
- **Load first**: [[Upgrade Watchpoints]]
- **Goal**: Decide whether provider-side changes now have enough operational evidence to become a standalone synthesis.
- **Deepen with**: [[Maintenance Triage]]
- **Likely durable target**: [[OpenClaw provider exposure map]]
- **Update next**: [[OpenClaw maintenance rhythm]], [[OpenClaw open questions]]
- **Resume cue**: Keep this queued until the evidence reads like operator guidance, not just community signal.
- **Next step**: Run one focused provider-risk pass, then either promote the exposure map or downgrade the question until better evidence arrives.

## Synthesis decisions

### OpenClaw upgrade regression triggers

- **Status**: ready
- **Confidence**: 79%
- **Source questions**: Which release-note or changelog signals should trigger a full regression run instead of a light upgrade check?
- **Durable conclusion**: OpenClaw is ready for a synthesis that turns repeated release and changelog cues into a durable regression-depth rule set.
- **Source sessions**: Promote upgrade regression triggers into synthesis
- **Keep provisional**: The synthesis should stay narrow: upgrade triggers and regression depth, not a generic retelling of all maintenance concerns.
- **Decision (recommendation)**: Publish the regression-trigger synthesis next. This is the clearest next conversion of session work into durable operator guidance. Complete the active synthesis session, then update release cadence, watchpoints, and maintenance rhythm together.
- **Decision (watch)**: Keep changelog packaging in the decision loop. The synthesis should make changelog and release packaging part of the durable trigger logic, not an incidental detail. Include changelog packaging signals explicitly when publishing the synthesis.
- **Question effects**: Which release-note or changelog signals should trigger a full regression run instead of a light upgrade check? (resolved): Publishing this synthesis would close the highest-leverage remaining upgrade question in the flagship example.
- **Canonical effect**: Publishing this synthesis would move upgrade-regression logic out of scattered notes and into the canonical release/maintenance bridge.
- **Update surfaces**: [[OpenClaw release cadence]], [[OpenClaw maintenance rhythm]], [[OpenClaw open questions]], [[OpenClaw maintenance watchpoints]], [[Note: What should I monitor before upgrading OpenClaw]]
- **Next step**: Finish the active synthesis session and publish the trigger map with coordinated updates to release cadence, watchpoints, and the open-question queue.

### OpenClaw provider exposure map

- **Status**: in progress
- **Confidence**: 64%
- **Source questions**: Which provider-side changes would change adoption or upgrade decisions the fastest?
- **Durable conclusion**: The system is close to supporting a provider-exposure synthesis, but the current evidence still reads more like a strong working map than a final durable judgment.
- **Source sessions**: Tighten the provider exposure map
- **Keep provisional**: The synthesis should not publish until it can show direct operator consequences rather than general provider concern.
- **Decision (caution)**: Do not publish on ambient concern alone. Provider exposure should only harden when the synthesis can connect provider events to concrete operator decisions. Keep the synthesis in progress until the operator consequences are explicit enough to survive as durable guidance.
- **Decision (watch)**: Track provider restrictions as reopen triggers. Provider-side restrictions are still the fastest way for this synthesis to become much more concrete. Use provider restrictions or access-policy changes as the main trigger for the next focused pass.
- **Question effects**: Which provider-side changes would change adoption or upgrade decisions the fastest? (advanced): The question has moved from broad concern to a near-synthesis workflow target, but it is not yet durably resolved.
- **Canonical effect**: If published, this synthesis would sharpen the provider-risk concept page and make its operator consequences much clearer.
- **Update surfaces**: [[Provider dependency risk]], [[OpenClaw maintenance rhythm]], [[OpenClaw open questions]], [[OpenClaw maintenance watchpoints]], [[OpenClaw current tensions]]
- **Next step**: Run one tighter provider-focused pass and either publish this synthesis or explicitly downgrade it back to a candidate.

## Context packs to refresh

- `Explain OpenClaw`: the core explanation or tension framing changes.
- `Upgrade Watchpoints`: upgrade posture or monitoring logic changes.
- `Provenance And Review`: you need to audit how a claim entered the wiki.
- `Maintenance Triage`: you want to resume work without reloading the whole graph.

## Synthesis candidates

- **OpenClaw upgrade regression triggers**: Release cadence, monitoring, and open-question surfaces already suggest this synthesis, but the rule set is not yet durable enough to stand alone.
- **OpenClaw provider exposure map**: Provider risk is visible, but the practical workflow consequences are still split across a concept page, a tension page, and an operational note.
