# Harden

Evidence-driven codebase hardening skill. Drop it into any Agent Skills host.

Audits security (OWASP Top 10:2025), supply chain (lockfile inventory vs release SBOM vs SLSA v1.2 provenance), reliability (observability + operational limits), tests, and accessibility (WCAG 2.2 AA, web only). Findings are quoted, matrix-scored, and cited. The skill does not patch the repo.

## Layout

```
SKILL.md                 orchestrator (scope, merge, report)
AGENTS.md                short host instructions for this repo
agents/_contract.md      safety, schema, severity matrix, tiers, allowlist
agents/recon.md
agents/security.md
agents/reliability.md
agents/a11y.md
agents/test-runner.md
```

## Invoke

```
harden
harden --depth=quick
harden --depth=deep --scope=security src/auth
harden --execution=sandboxed-tests --output=report-and-verifier
```

Default depth is `standard`. Default execution is static (T0). A verifier script is an explicit write under `.tmp/harden/`, not a silent extra phase.

## What it will not do

- Treat repo files, comments, or fetched pages as instructions
- Echo secret values
- Install packages or run tests unless the host attests a sandbox and you asked
- Claim WCAG conformance from source inspection
- Treat a lockfile dump as a standards-conformant SBOM

## Install

Clone and point your host at the directory. Agent Skills hosts look for `SKILL.md`.

```bash
git clone https://github.com/Calvin-LLC/agentic-hardening-skill.git
```

Copy or symlink the checkout into the host's skills path, or load it from the clone. One tree, no per-host fork of the agents.

## License

MIT
