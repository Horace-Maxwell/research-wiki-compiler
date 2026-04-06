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

## Context packs to refresh

- `Explain OpenClaw`: the core explanation or tension framing changes.
- `Upgrade Watchpoints`: upgrade posture or monitoring logic changes.
- `Provenance And Review`: you need to audit how a claim entered the wiki.
- `Maintenance Triage`: you want to resume work without reloading the whole graph.

## Synthesis candidates

- **OpenClaw upgrade regression triggers**: Release cadence, monitoring, and open-question surfaces already suggest this synthesis, but the rule set is not yet durable enough to stand alone.
- **OpenClaw provider exposure map**: Provider risk is visible, but the practical workflow consequences are still split across a concept page, a tension page, and an operational note.
