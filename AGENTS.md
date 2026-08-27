# harden

Portable hardening skill. Orchestrator in `SKILL.md`. Shared contract in `agents/_contract.md`. Specialists in `agents/*.md`.

## Rules

- Audit is read-only except `.tmp/harden/`.
- Every finding uses the contract schema and severity matrix.
- Do not load `agents/a11y.md` unless recon set `web: true`.
- Fixes require a follow-up that names finding IDs.
