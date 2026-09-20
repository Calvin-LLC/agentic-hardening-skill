# Harden

An agent skill that audits a codebase for security, supply-chain,
reliability, test, and accessibility problems. It runs on any host that
loads Agent Skills. The skill reports findings and never edits your code.

What it checks:

- Security, against the OWASP Top 10:2025 list
- Supply chain: the lockfile inventory, whether releases carry an SBOM, and
  whether builds meet SLSA v1.2 provenance
- Reliability: logs, traces, metrics, timeouts, retries, backpressure
- Tests: what exists, what runs, and what the coverage misses
- Accessibility triage, against WCAG 2.2 AA, for web projects only

Every finding comes with a quoted excerpt, a severity score from a fixed
matrix, and a citation. The audit discipline follows the Cloudflare
security-audit skill: a coverage ledger plans the work, a candidate gate
filters claims, and a fresh verifier re-checks every finding before the
report. The skill does not patch the repo.

Accessibility stops at triage. Harden flags what is visible in source,
labels the rest as needing a browser, and hands verification to the wcag
skill. Deep rules and browser checks live there, not here.

## Layout

```
SKILL.md                 orchestrator: scope, ledger, merge, report
AGENTS.md                host instructions for this repo
agents/_contract.md      safety rules, finding schema, severity matrix, execution tiers, source allowlist
agents/recon.md          detects languages, frameworks, CI, and trust boundaries
agents/security.md       OWASP Top 10:2025 and supply chain
agents/reliability.md    observability and operational limits
agents/a11y.md           WCAG 2.2 AA triage plus handoff to the wcag skill
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
- Claim WCAG conformance from source inspection alone
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
