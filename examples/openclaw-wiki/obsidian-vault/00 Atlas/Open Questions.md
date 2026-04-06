# Open Questions

## Highest-leverage open questions

- Which release-note or changelog signals should trigger a full regression run instead of a light upgrade check?
- Which plugin or SDK assumptions are most likely to drift between releases?
- Which provider-side changes would change adoption or upgrade decisions the fastest?

## What would reduce uncertainty

- More explicit release notes that connect shipped fixes to workflow-facing breakpoints.
- Additional source excerpts that show how plugin API or SDK boundaries evolve over multiple releases.
- Stronger evidence about how provider restrictions show up in actual workflow outcomes, not just community chatter.

## What might become a synthesis next

- **OpenClaw upgrade regression triggers**: Release cadence, monitoring, and open-question surfaces already suggest this synthesis, but the rule set is not yet durable enough to stand alone.
- **OpenClaw provider exposure map**: Provider risk is visible, but the practical workflow consequences are still split across a concept page, a tension page, and an operational note.
