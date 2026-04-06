# Security Policy

## Release Status

This repository is public. Security review and reporting are still handled on a best-effort basis for the current MVP.

## Supported Versions

Best-effort security attention is focused on the latest default-branch state of the project:

| Version | Supported |
| --- | --- |
| latest `main` or default branch snapshot | Yes |
| older milestone snapshots, forks, or local modifications | No |

## Reporting a Vulnerability

Do not use public GitHub issues for suspected vulnerabilities.

Report security concerns to [maxwelldhx+security@gmail.com](mailto:maxwelldhx+security@gmail.com).

Current acknowledgment target: within 72 hours.

When reporting, include:

- affected area or route
- reproduction steps
- whether local workspace data is required to reproduce
- severity and impact
- logs or screenshots if helpful

## Scope Notes

Research Wiki Compiler is a local-first, single-user MVP. High-signal report areas include:

- local file access and workspace path safety
- secret storage and accidental credential persistence
- markdown rendering and sanitization
- provider key handling
- prompt or artifact leakage
- review/apply safety across file-backed mutations

## GitHub Hygiene Tasks

Keep these enabled for the public repository:

- GitHub secret scanning
- push protection
- Dependabot alerts
- branch protections

See [docs/github-launch-checklist.md](docs/github-launch-checklist.md) for the broader public-repo hygiene checklist.
