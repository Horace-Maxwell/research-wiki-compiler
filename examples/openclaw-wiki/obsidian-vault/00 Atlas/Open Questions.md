# Open Questions

## Highest-leverage open questions

### 1. Which release-note or changelog signals should trigger a full regression run instead of a light upgrade check?

- **Status**: ready for synthesis
- **Priority**: high
- **Load first**: [[Upgrade Watchpoints]]
- **Why now**: It is the highest-leverage next synthesis because it would turn repeated upgrade-reading work into a reusable operator-facing page.
- **Deepen with**: [[Maintenance Triage]]
- **Promote into**: OpenClaw upgrade regression triggers
- **Related pages**: [[OpenClaw release cadence]], [[OpenClaw maintenance watchpoints]], [[OpenClaw open questions]], [[Note: What should I monitor before upgrading OpenClaw]]
- **Linked tensions**: Release speed versus local workflow stability.
- **Watchpoints**: [[OpenClaw maintenance watchpoints]]
- **Advance when**: Release notes keep mapping shipped fixes to workflow-facing regression depth.

### 2. Which plugin or SDK assumptions are most likely to drift between releases?

- **Status**: waiting for sources
- **Priority**: high
- **Load first**: [[Upgrade Watchpoints]]
- **Why now**: This is the thinnest high-value question left in the topic and the most likely source of avoidable integration surprise.
- **Deepen with**: [[Provenance And Review]]
- **Related pages**: [[Plugin compatibility]], [[OpenClaw open questions]], [[Review History]], [[Summary Atlas]]
- **Linked tensions**: Plugin-surface progress versus integration breakage risk.
- **Watchpoints**: [[OpenClaw maintenance watchpoints]]
- **Missing evidence**: The corpus needs more release-to-release evidence about concrete plugin or SDK drift.

### 3. Which provider-side changes would change adoption or upgrade decisions the fastest?

- **Status**: ready for synthesis
- **Priority**: medium
- **Load first**: [[Upgrade Watchpoints]]
- **Why now**: This question is close enough to synthesis that one more focused pass could turn scattered provider-risk observations into a durable operating map.
- **Deepen with**: [[Maintenance Triage]]
- **Promote into**: OpenClaw provider exposure map
- **Related pages**: [[Provider dependency risk]], [[OpenClaw current tensions]], [[OpenClaw maintenance watchpoints]], [[Note: What should I monitor before upgrading OpenClaw]]
- **Linked tensions**: Provider leverage versus durable access assumptions.
- **Watchpoints**: [[OpenClaw maintenance watchpoints]]
- **Missing evidence**: The corpus still needs one cleaner pass that ties provider events directly to operator decisions.

## What would reduce uncertainty

- More explicit release notes that connect shipped fixes to workflow-facing breakpoints.
- Additional source excerpts that show how plugin API or SDK boundaries evolve over multiple releases.
- Stronger evidence about how provider restrictions show up in actual workflow outcomes, not just community chatter.

## What might become a synthesis next

- **OpenClaw upgrade regression triggers**: Release cadence, monitoring, and open-question surfaces already suggest this synthesis, but the rule set is not yet durable enough to stand alone.
- **OpenClaw provider exposure map**: Provider risk is visible, but the practical workflow consequences are still split across a concept page, a tension page, and an operational note.

## Recent session outcomes

### Archive the upgrade monitoring answer

- **Question**: What should I monitor before upgrading OpenClaw?
- **Outcome**: archived answer
- **Worked with**: [[Upgrade Watchpoints]]
- **What changed**: The answer now has a durable archived form and should only re-enter the active queue when upgrade posture changes.
- **Durable result**: [[Note: What should I monitor before upgrading OpenClaw]]
- **Still unresolved**: The archived note should reopen if provider or compatibility drift changes the checklist materially.
- **Resume next**: Keep the archived note short and grounded, then feed any recurring changes back into maintenance watchpoints first.

### Map the unstable surfaces

- **Question**: Which parts of OpenClaw look most unstable or fast-moving?
- **Outcome**: updated working note
- **Worked with**: [[Maintenance Triage]]
- **What changed**: The instability answer now lives durably in the tensions and monitoring syntheses, so the question should reopen only if those operating surfaces change.
- **Durable result**: [[OpenClaw current tensions]], [[OpenClaw maintenance watchpoints]]
- **Still unresolved**: The provider exposure thread still wants a cleaner standalone synthesis when more direct evidence arrives.
- **Resume next**: Use the watchpoints page as the compact operator view, then decide whether provider exposure should become its own synthesis next.

### Ground the OpenClaw entity page

- **Question**: What is OpenClaw in this corpus?
- **Outcome**: updated canonical
- **Worked with**: [[Explain OpenClaw]]
- **What changed**: The canonical entity page now carries the strongest durable answer, so the identity question should drive reopen logic rather than stay in the active queue.
- **Durable result**: [[OpenClaw]]
- **Still unresolved**: The identity story should reopen if provider risk or upgrade posture changes the main framing materially.
- **Resume next**: Keep the entity page stable, then use monitoring and tensions to decide when the identity framing actually needs to change.

## Published syntheses

### OpenClaw maintenance watchpoints

- **Published surface**: [[OpenClaw maintenance watchpoints]]
- **Source questions**: What should I monitor before upgrading OpenClaw?; Which parts of OpenClaw look most unstable or fast-moving?
- **Durable conclusion**: Upgrade posture in OpenClaw should be driven by a compact monitoring synthesis rather than by rereading every surrounding page from scratch.
- **Source sessions**: Archive the upgrade monitoring answer; Map the unstable surfaces
- **What changed**: OpenClaw's canonical risk and release pages now feed a shared watchpoint surface, which makes the maintenance story more operational and less diffuse.
- **Question effects**: What should I monitor before upgrading OpenClaw? (resolved): The upgrade-monitoring question now has both a durable archived answer and a monitoring synthesis behind it. Which release-note or changelog signals should trigger a full regression run instead of a light upgrade check? (advanced): The watchpoint synthesis narrowed the remaining work into a specific regression-trigger synthesis instead of a broad monitoring question.
- **Updated surfaces**: [[OpenClaw release cadence]], [[Plugin compatibility]], [[Provider dependency risk]], [[OpenClaw maintenance rhythm]], [[OpenClaw open questions]], [[OpenClaw maintenance watchpoints]], [[OpenClaw current tensions]], [[Note: What should I monitor before upgrading OpenClaw]]
- **Revisit if**: Release notes begin signaling a different regression depth.; Provider-side restrictions or compatibility drift make the current watch logic incomplete.

### OpenClaw current tensions

- **Published surface**: [[OpenClaw current tensions]]
- **Source questions**: Which parts of OpenClaw look most unstable or fast-moving?
- **Durable conclusion**: OpenClaw is most useful where it is still moving, so the durable reading of the topic has to keep instability explicit instead of treating it as incidental noise.
- **Source sessions**: Map the unstable surfaces
- **What changed**: The flagship example now treats release cadence, compatibility drift, and provider exposure as the three durable lenses around OpenClaw's instability story.
- **Question effects**: Which parts of OpenClaw look most unstable or fast-moving? (resolved): The instability question now has a durable synthesis and should only reopen when the operating story changes materially. Which provider-side changes would change adoption or upgrade decisions the fastest? (advanced): The tension synthesis narrowed the remaining provider-risk work into a more specific synthesis candidate.
- **Updated surfaces**: [[OpenClaw]], [[OpenClaw release cadence]], [[OpenClaw maintenance rhythm]], [[OpenClaw open questions]], [[OpenClaw maintenance watchpoints]], [[OpenClaw current tensions]]
- **Revisit if**: A release note or provider signal changes what looks operationally unstable.

## Evidence gaps to close next

### OpenClaw upgrade trigger comparison evidence

- **Status**: in session
- **Gap type**: comparison evidence
- **Missing evidence**: One cleaner comparison that distinguishes cosmetic release churn from release packaging signals that should change regression depth.
- **Next evidence**: A focused comparison pass over the release page, watchpoints synthesis, and archived upgrade note that names which cues really justify a full regression run.
- **Load first**: [[Upgrade Watchpoints]], [[Maintenance Triage]]
- **Inspect pages**: [[OpenClaw release cadence]], [[OpenClaw maintenance watchpoints]], [[OpenClaw open questions]], [[Note: What should I monitor before upgrading OpenClaw]]
- **Inspect sources**: 2026-04-02 release cadence and test churn digest
- **Acquisition session**: Promote upgrade regression triggers into synthesis
- **Advances questions**: Which release-note or changelog signals should trigger a full regression run instead of a light upgrade check?
- **Advances syntheses**: OpenClaw upgrade regression triggers
- **Success looks like**: The trigger matrix reads like durable operator guidance instead of a loose note bundle.; Release cadence, watchpoints, and the archived upgrade note can all reuse the same trigger vocabulary.

### OpenClaw plugin drift longitudinal evidence

- **Status**: planned
- **Gap type**: source coverage
- **Missing evidence**: Another release-to-release pass that names concrete plugin or SDK drift instead of only a single compatibility baseline.
- **Next evidence**: Wait for another release or changelog pass, then compare the new evidence directly against the existing plugin compatibility and review-history surfaces.
- **Load first**: [[Upgrade Watchpoints]], [[Provenance And Review]]
- **Inspect pages**: [[Plugin compatibility]], [[OpenClaw open questions]], [[Review History]], [[Summary Atlas]]
- **Inspect sources**: 2026-03-26 plugin SDK and policy digest; 2026-03-31 release and plugin surface digest
- **Acquisition session**: Collect plugin and SDK drift evidence
- **Advances questions**: Which plugin or SDK assumptions are most likely to drift between releases?
- **Success looks like**: A later release names concrete compatibility breakpoints or SDK drift.; Plugin compatibility can cite more than one release-to-release signal before hardening the drift story.

### OpenClaw provider consequence evidence

- **Status**: planned
- **Gap type**: recommendation confidence
- **Missing evidence**: A tighter operational bridge from provider-side signal to adoption or upgrade decision.
- **Next evidence**: A focused provider-risk pass that ties provider policy shifts to concrete operator consequences instead of leaving them as ambient signal.
- **Load first**: [[Upgrade Watchpoints]], [[Maintenance Triage]]
- **Inspect pages**: [[Provider dependency risk]], [[OpenClaw current tensions]], [[OpenClaw maintenance watchpoints]]
- **Inspect sources**: 2026-04-05 provider risk and changelog digest
- **Acquisition session**: Tighten the provider exposure map
- **Advances questions**: Which provider-side changes would change adoption or upgrade decisions the fastest?
- **Advances syntheses**: OpenClaw provider exposure map
- **Success looks like**: Provider-side events clearly change at least one operator decision.; The provider exposure synthesis can publish without leaning on generic uncertainty framing.

## Reopened by evidence change

### Provider-side signal reopens instability framing

- **Why now**: The instability framing question should reopen, the tensions synthesis needs review, and provider-risk pages plus watchpoints should be rechecked together.
- **Which parts of OpenClaw look most unstable or fast-moving?**, load [[Maintenance Triage]], then deepen with [[Explain OpenClaw]].
- **What should I monitor before upgrading OpenClaw?**, load [[Upgrade Watchpoints]], then deepen with [[Maintenance Triage]].
- **Synthesis to re-check**: OpenClaw current tensions
- **Review surfaces**: [[Provider dependency risk]], [[OpenClaw current tensions]]
- **Still likely stable**: [[OpenClaw]], [[Plugin compatibility]]
- **Recommended action**: Reopen the instability and upgrade-monitoring questions, review current tensions and provider risk together, then decide whether the provider exposure synthesis should publish or whether watchpoints should be rewritten first.



## Reopen when the topic changes

### What is OpenClaw in this corpus?

- **Currently grounded in**: [[OpenClaw]]
- **Watch first**: [[Explain OpenClaw]]
- **Reopen if**: A new source changes the main description of the project.; The maintenance surfaces force a different top-level framing of what OpenClaw is.

### Which parts of OpenClaw look most unstable or fast-moving?

- **Currently grounded in**: [[OpenClaw current tensions]]
- **Watch first**: [[Maintenance Triage]]
- **Reopen if**: A release note or provider signal changes what looks operationally unstable.; The watchpoint page starts recommending a different maintenance posture.

### What should I monitor before upgrading OpenClaw?

- **Currently grounded in**: [[Note: What should I monitor before upgrading OpenClaw]]
- **Watch first**: [[Upgrade Watchpoints]]
- **Reopen if**: Release notes begin signaling different regression depth.; Provider-side policy or access changes alter upgrade posture.; Plugin compatibility drift makes the archived checklist incomplete.
