# AGENTS.md

Start here if you are an AI maintainer taking over this repository.

## Read First

1. `verified-path.json`
2. `MAINTAIN_THIS_REPO.md`
3. `MAINTAIN_SHOWCASE.md`
4. `ROUTING_REGRESSION_GUARD.md`
5. `SUPPORT.md`

These files define the verified path, the official showcase, the route-safety contract, and the support boundary.

## Official Product Shape

- Front door: `/topics`
- Main path: `/topics -> /topics/[slug] -> /questions -> /sessions -> /syntheses`
- Official showcase: OpenClaw
- Durable truth layer: `workspace/wiki/`
- Official verified mode: local reference mode with committed demo/showcase data

## Non-Negotiables

- Do not overclaim support outside `verified-path.json` and `SUPPORT.md`.
- Do not reintroduce `pagePath`, `.html`, markdown-file, or download-like navigation into app routes.
- Do not treat rendered `tmp/` outputs as durable truth.
- Keep OpenClaw healthy as the official showcase path.

## Validation

- Minimum signoff: `npm run verify:local`
- If routing, locale, settings, showcase rendering, or main-path CTAs changed: also run
  - `npm run verify:routes`
  - `npm run test:e2e:navigation`

## If You Need One Sentence

Preserve the main route path, trust the committed wiki as truth, stay within the verified support boundary, and finish on the verified local path.
