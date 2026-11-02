# harden

Portable hardening skill. Orchestrator in `SKILL.md`. Shared contract in `agents/_contract.md`. Specialists in `agents/*.md`.

## Rules

- Audit is read-only except `.tmp/harden/`.
- Every finding uses the contract schema and severity matrix.
- Fixes require a follow-up that names finding IDs.
- Load a file under `agents/modules/` only when recon's `modules` lists it.
- Packets are JSON. `node scripts/validate-findings.cjs <packet>` and `node scripts/validate-ledger.cjs <ledger> [--packets <packet>...]` must exit 0 before a run reports.
- No `2026` web OWASP category exists. Use `A01` to `A10` from the 2025 list, `LLM01` to `LLM10`, and `ASI01` to `ASI10` as the contract names them.
