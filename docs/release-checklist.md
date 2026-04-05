# Release Checklist

Use this checklist before creating the first public tag or publishing release notes.

Current recommendation:

- keep the public repository accurate, credible, and release-ready

Current public repository posture:

- public GitHub repository
- Apache-2.0 as the active public license

## Product and Docs

- README reflects the shipped product honestly.
- Screenshots or demo assets are present and current.
- Product spec, architecture, progress, and decisions docs are current.
- Current limitations are documented.
- Demo flow still works from a clean local checkout.
- [MANUAL_QA.md](../MANUAL_QA.md) matches the current seeded walkthrough and optional provider-backed smoke.

## Safety and Policy

- Repository visibility is intentionally private or public and reflected honestly in launch wording.
- Repository URL is chosen and reflected where needed.
- Apache-2.0 is reflected consistently across `LICENSE`, `package.json`, `README.md`, and `CITATION.cff`.
- Security and support wording in `SECURITY.md` and `SUPPORT.md` still match the intended launch posture.
- Screenshots are ready, or the team explicitly accepts shipping with screenshot placeholders.

## Verification

- `npm run demo:reset`
- `npm run lint`
- `npm test`
- `npm run test:e2e`
- `npm run build`
- run the browser smoke steps in [MANUAL_QA.md](../MANUAL_QA.md)

## Suggested First Release Tag

- Suggested first release tag: `v0.1.0`

Reason:

- The repository already ships a coherent MVP and `package.json` is at `0.1.0`.

## Suggested Release Notes Outline

1. What the product is
2. Core loops now shipped
3. Local-first and file-first architecture
4. Demo setup instructions
5. Known limitations
6. Security and license notes
7. Upgrade or migration notes, if any
