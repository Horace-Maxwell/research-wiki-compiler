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
