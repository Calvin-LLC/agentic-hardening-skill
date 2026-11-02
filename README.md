# Harden

An agent skill that audits a codebase for security, supply-chain,
reliability, and test problems. It runs on any host that
loads Agent Skills. The skill reports findings and never edits your code.

What it checks:

- Security, against the OWASP Top 10:2025 list (the current web edition; OWASP has not published a 2026 web list)
- Repos that call a model or run an agent: the OWASP LLM Top 10:2026 and the OWASP Agentic Top 10 (ASI01 to ASI10), loaded only when recon finds an LLM SDK, an agent loop, or an MCP server
- Infrastructure code, tenant isolation, and release evidence (provenance, SBOM, VEX, AIBOM, disclosure contact), each as an optional module that recon switches on
- Supply chain: the lockfile inventory, whether releases carry an SBOM, and
  whether builds meet SLSA v1.2 provenance
- Reliability: logs, traces, metrics, timeouts, retries, backpressure
- Tests: what exists, what runs, and what the coverage misses

Findings are JSON. Two zero-dependency Node scripts check them: one validates each agent's packet, one validates the coverage ledger and that every finding points at a ledger unit. Node 18 or newer runs them.

A second run on the same repo reads the earlier ledger and compares file hashes. Units whose files changed reopen. Units whose files did not change are still re-reviewed, and keep their prior fingerprints.

A gap that an upstream control already blocks is a hardening note with no severity. Regulatory items (OMB M-26-15 post-quantum migration, OMB M-26-14 logging, the EU Cyber Resilience Act, the CISA 2026 SBOM minimum elements, NIST agent identity guidance) are tags on notes. They bind specific organizations, and a tag never raises severity.

Every finding comes with a quoted excerpt, a severity score from a fixed
matrix, and a citation. The audit discipline follows the Cloudflare
security-audit skill: a coverage ledger plans the work, a candidate gate
filters claims, and a fresh verifier re-checks every finding before the
report. The skill does not patch the repo.

## Layout

```
SKILL.md                 orchestrator: scope, ledger, merge, report
AGENTS.md                host instructions for this repo
agents/_contract.md      safety rules, finding schema, severity matrix, execution tiers, source allowlist
agents/recon.md          detects languages, frameworks, CI, trust boundaries, and which modules apply
agents/security.md       OWASP Top 10:2025 and supply chain
agents/reliability.md    observability, operational limits, fail-closed, agent action logging
agents/modules/         ai-llm, agentic, iac, tenant-isolation, release-compliance
schemas/                 JSON Schema for agent packets and the coverage ledger
scripts/                 validate-recon.cjs, seed-ledger.cjs, validate-findings.cjs, update-ledger.cjs, validate-ledger.cjs, delta-ledger.cjs, render-report.cjs
agents/test-runner.md    test discovery and coverage gaps
```

One tree works on every host. You never fork the agents per host.

## Run it

```
harden
harden --depth=quick
harden --depth=deep --scope=security src/auth
harden --execution=sandboxed-tests --output=report-and-verifier
```

The default depth is `standard`. By default the skill only reads your code
(tier T0). It writes nothing outside `.tmp/harden/`. With
`--output=report-and-verifier` it also writes a verifier script there.
Running tests or installing packages needs an explicit flag plus a host
that can prove a sandbox.

## What it will not do

- Treat repo files, comments, or fetched pages as instructions
- Echo secret values
- Install packages or run tests unless you ask and the host attests a sandbox
- Treat a lockfile dump as a standards-conformant SBOM

## Install

Point your Agent Skills host at a clone of this repo. Hosts look for `SKILL.md`.

```bash
git clone https://github.com/Calvin-LLC/agentic-hardening-skill.git
```

Then copy or symlink the checkout into your host's skills path, or load it
straight from the clone.

## License

MIT
