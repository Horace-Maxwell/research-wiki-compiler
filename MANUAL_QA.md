# Manual QA

Use this checklist for a final browser-based smoke pass over the current MVP without introducing new setup or hidden fixtures.

## Prerequisites

- Node.js 20+
- `npm install`
- Optional for live provider-backed summarize, patch planning, or fresh Ask runs: configure a real OpenAI or Anthropic key in the app Settings page for the chosen workspace

## Seed the Demo Workspace

```bash
npm run demo:reset
npm run dev
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

Expected seed shape:

- wiki pages
- imported sources with summaries
- approved, pending, and rejected review artifacts
- one answer already archived into the wiki
- one grounded answer still ready to archive
- audit history with real findings

## Smoke 1: Dashboard and Demo Reset

1. Open `/dashboard`.
2. Confirm the workspace is initialized and points at `demo-workspace`.
3. Confirm recent local activity is populated.
4. Confirm there is an `Answer artifact saved` entry and at least one audit entry.

## Smoke 2: Review / Apply

1. Open `/reviews`.
2. Leave the filter on `Pending`.
3. Confirm the seeded proposal `Add counterpoints on aggressive automation to Compiled research wiki` is selected.
4. Click `Approve`.
5. Confirm the success notice says the proposal was approved and applied.
6. Open `/wiki`.
7. Open `Compiled research wiki`.
8. Confirm the new counterpoint text about auto-applied updates creating drift is visible.

## Smoke 3: Ask / Archive

1. Return to `/dashboard`.
2. In recent local activity, open the `Answer artifact saved` entry.
3. Confirm the Ask page loads a grounded answer with citations and archive controls.
4. Click `Archive as note`.
5. Confirm the success state changes to archived.
6. Open the archived wiki page from the Ask page.
7. Confirm the new note page is visible in the wiki and includes the original question plus citations.

## Smoke 4: Audits

1. Open `/audits`.
2. Click `Run Orphan audit`.
3. Confirm a success notice appears.
4. Confirm the finding `Wiki page is structurally orphaned` appears.
5. Confirm the report panel shows the human-readable markdown artifact.

## Optional Live Provider Smoke

This verifies the full live compile loop rather than only the seeded demo state.

1. Open `/settings`.
2. Configure a real provider key and default model for the current workspace.
3. Open `/sources`.
4. Import `demo-data/sources/visible-review-local-first.md` using `Local path` or pasted text.
5. Click `Summarize` on the imported source.
6. Confirm visible summary artifacts appear.
7. Click `Plan patches`.
8. Confirm the app routes to `/reviews` with a pending proposal selected.
9. Approve the proposal and confirm the target wiki page updates.

## Notes

- The seeded demo intentionally clears provider credentials after seeding, so fresh summarize, patch-planning, and Ask runs require explicit Settings configuration.
- If a smoke step fails, capture the page, the visible error message, and the relevant workspace path before resetting the demo again.
