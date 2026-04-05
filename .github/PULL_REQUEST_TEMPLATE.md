## Summary

Describe the change clearly and briefly.

## Milestone or Workflow Impact

- Which product loop or area does this affect: compile, review, ask, archive, audit, or platform?
- Does this change alter product scope or just implementation quality?

## Verification

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] relevant local smoke checks completed

## Screenshots or Demo Notes

- [ ] no UI changes
- [ ] screenshots added
- [ ] screenshots intentionally deferred, but visual impact is described below

If applicable, add screenshots or explain the expected UI change.

## Docs

- [ ] README updated if needed
- [ ] docs updated if architecture, behavior, or operator expectations changed
- [ ] no doc updates needed

## Prompts and Contracts

- [ ] no prompt or schema changes
- [ ] prompts changed
- [ ] zod or artifact contracts changed

If prompts or contracts changed, describe the compatibility impact.

## Checklist

- [ ] tests cover the new behavior or the gap is explained
- [ ] local-first and file-first constraints were preserved
- [ ] no hidden mutation path was introduced
- [ ] no sensitive local data or secrets were added
