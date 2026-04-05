# GitHub Launch Checklist

This checklist is for the first push to a future GitHub repository.

## Summary

Current recommendation:

- keep the repository private until final validation, screenshots, and launch wording are complete

Future public default recommendation:

- make the existing `Horace-Maxwell/research-wiki-compiler` repository public when the launch is ready
- use Apache-2.0 as the default public license when the repository is intentionally opened

Suggested repository description:

> Local-first research wiki compiler that turns source material into a durable, reviewable Markdown knowledge base.

Suggested GitHub topics:

- `local-first`
- `research`
- `wiki`
- `markdown`
- `knowledge-base`
- `sqlite`
- `nextjs`
- `llm`
- `typescript`

## Must Check Before First Push

- Final visibility choice is confirmed.
- Final repository URL is confirmed.
- Launch wording in `README.md`, `SUPPORT.md`, and `SECURITY.md` still matches the intended release posture.
- README is complete and accurate.
- [MANUAL_QA.md](../MANUAL_QA.md) still matches the current seeded demo walkthrough.
- Screenshots or demo assets are ready, or the placeholder plan is intentionally retained.
- Community files are reviewed for tone and scope.

## Secrets Review

Audit result from this local pass:

- No real API keys were found in tracked project files.
- Test fixtures such as `sk-test` are fake values used in tests only.
- The demo seed uses `demo-seed-key`, which is not a real credential and is cleared from the seeded workspace settings afterward.
- `.env.example` is retained intentionally and contains no secrets.

Action before first push:

- rerun a secret scan over the final staged tree
- confirm no populated `.env` files are staged
- confirm no seeded workspace with live credentials is staged

## Sensitive or Machine-Specific Data Review

Audit result from this local pass:

- Local absolute path references previously found in README/docs were fixed in this prep pass.
- `demo-workspace/` is ignored and should remain untracked.
- Large files currently observed are inside ignored local build or dependency directories such as `.next/` and `node_modules/`.
- No real machine-specific user paths remain in tracked docs or repository metadata after this prep pass.

Action before first push:

- confirm the final staged diff contains no `/Users/...` paths
- confirm `.next/`, `node_modules/`, and local DB artifacts are not staged

## README and Demo Assets

- README includes value proposition, architecture summary, quickstart, configuration, demo flow, roadmap, limitations, contribution, security, and license notes.
- Screenshot placeholders are documented in [docs/assets/screenshots/README.md](assets/screenshots/README.md).
- Capture and add screenshots if the repo is intended to be more public-facing than internal.
- Repository URL is now `https://github.com/Horace-Maxwell/research-wiki-compiler`.
- `CITATION.cff` and `package.json` now include the canonical repository URL metadata.

## License Position

- Current license: Apache-2.0 in [LICENSE](../LICENSE), `package.json`, and [CITATION.cff](../CITATION.cff).
- Current hosting posture: keep the repository private until the founder is ready for a public launch.
- Before any future public push, make sure `README.md`, `CITATION.cff`, package metadata, and GitHub repository settings all reflect the final public URL and visibility.

## GitHub Features to Enable After Publishing

- Dependabot alerts
- secret scanning
- push protection
- code scanning
- issue templates
- security policy
- branch protections

## Recommended Branch Protection

For the default branch:

- require pull requests
- require CI status checks
- require up-to-date branches before merge
- restrict force pushes
- restrict direct pushes to maintainers only

## CI Expectations

The repository includes a conservative CI workflow that runs:

- install via `npm ci`
- `npm run lint`
- `npm test`
- `npm run build`

Additional local release-candidate checks expected before the first push:

- `npm run demo:reset`
- `npm run test:e2e`
- a quick browser pass using [MANUAL_QA.md](../MANUAL_QA.md)

## Founder Decisions Still Required

- screenshots or a decision to ship with placeholders
- any last launch-copy adjustments before making the repository public
