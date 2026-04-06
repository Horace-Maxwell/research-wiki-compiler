# Contributing

Thanks for your interest in improving Research Wiki Compiler.

This repository is public, but the product is still evolving quickly. Small fixes, tests, and doc improvements are welcome. Broader workflow or product-shape changes should start with a clear issue, discussion, or maintainer alignment first.

## Project Principles

When contributing, optimize for:

- correctness
- maintainability
- visible data and provenance
- reviewable knowledge mutation
- local-first and file-first architecture

Avoid steering the product toward:

- generic chat-with-files behavior
- hidden memory or opaque automation
- extra infrastructure without a clear local-first payoff

## Development Setup

```bash
npm install
npm run demo:reset
npm run dev
```

Useful verification commands:

```bash
npm run lint
npm test
npm run build
```

## Workflow Expectations

Before proposing changes:

1. Read the relevant docs in [`docs/`](docs/).
2. Understand whether the change affects compile, review, ask, archive, or audit behavior.
3. Check whether prompt files or structured contracts need to change.

When making changes:

- keep core logic in services, not route handlers or React components
- keep workspace writes path-safe and workspace-constrained
- preserve visibility of prompts, artifacts, and review history
- prefer small, explicit changes over clever hidden behavior

## Tests and Docs

Please update:

- automated tests when behavior changes
- prompts when prompt contracts change
- docs when architecture, workflows, or operator expectations change

If a UI change materially affects user flows, include screenshots once the repository has a public review workflow. Until then, note the expected visual impact in your summary.

## Pull Request Readiness

Before a PR is opened:

- run `npm run lint`
- run `npm test`
- run `npm run build`
- update docs if product behavior changed
- call out whether prompts, schemas, or artifact contracts changed

See [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) for the PR checklist and review-path prompts.
