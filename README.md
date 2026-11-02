# Harden

An agent skill that audits a codebase for security, supply-chain, reliability,
and test problems. It runs on any host that loads Agent Skills. It reports
findings and never edits your code.

For accessibility, use the sibling skill in
[accessibility-skills](https://github.com/Calvin-LLC/accessibility-skills).
Harden does not check it.

## What it checks

- **Web security.** The OWASP Top 10:2025, which is the current web edition.
  OWASP has not published a 2026 web list.
- **Model and agent risks.** The OWASP LLM Top 10:2026 and the OWASP Agentic
  Top 10 (ASI01 to ASI10). They load only when recon finds an LLM SDK, an agent
  loop, or an MCP server.
- **Optional modules.** Infrastructure code, tenant isolation, and release
  evidence (provenance, SBOM, VEX, AIBOM, disclosure contact). Recon switches
  each one on.
- **Supply chain.** The lockfile inventory, whether releases carry an SBOM, and
  whether builds meet SLSA v1.2 provenance.
- **Reliability.** Logs, traces, metrics, timeouts, retries, and backpressure.
- **Tests.** What exists, what runs, and what the coverage misses.

Every finding carries a quoted excerpt, a severity from a fixed matrix, and a
citation. A script checks each excerpt against the cited lines of the file, so a
paraphrase fails.

A gap that another control already blocks is a hardening note with no severity.
Regulatory items are tags on notes: OMB M-26-15 (post-quantum migration), OMB
M-26-14 (logging), the EU Cyber Resilience Act, the CISA 2026 SBOM minimum
elements, and NIST agent identity guidance. Each binds specific organizations,
and a tag never raises a severity.

The audit method follows Cloudflare's
[security-audit skill](https://github.com/cloudflare/security-audit-skill). A
coverage ledger plans the work, a candidate gate filters claims, and the skill
tells the host to have a fresh verifier re-check every finding before the
report.

## How a run works

1. Recon profiles the repo and picks the modules.
2. `seed-ledger.cjs` writes a coverage ledger with one unit per control.
3. The specialists write JSON packets. Each owns its own units.
4. `validate-findings.cjs` checks each packet, and `update-ledger.cjs` copies
   the results into the ledger.
5. `validate-ledger.cjs` checks the ledger against the packets and the files.
6. `render-report.cjs` writes `REPORT.md` from the ledger and the packets.

On a second run, `seed-ledger.cjs --prior` hashes the files each unit reviewed.
Units whose files changed reopen. Units whose files did not change are still
re-reviewed and keep their fingerprints.

## Layout

```
SKILL.md                 orchestrator: scope, ledger, merge, report
AGENTS.md                rules for working on this repo
agents/_contract.md      safety rules, finding schema, severity matrix, execution tiers, source allowlist
agents/recon.md          detects languages, frameworks, CI, trust boundaries, and which modules apply
agents/security.md       OWASP Top 10:2025 and supply chain
agents/reliability.md    observability, operational limits, fail-closed, agent action logging
agents/test-runner.md    test discovery and coverage gaps
agents/modules/          ai-llm, agentic, iac, tenant-isolation, release-compliance
schemas/                 JSON Schema for the recon profile, agent packets, and the coverage ledger
scripts/                 zero-dependency Node scripts, one for each step above, plus delta-ledger.cjs (prints what changed since a prior run)
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
`--output=report-and-verifier` it also writes a verifier script there. Running
tests or installing packages needs an explicit flag and a host that can prove a
sandbox.

## What it will not do

- Treat repo files, comments, or fetched pages as instructions.
- Echo secret values.
- Install packages or run tests unless you ask and the host attests a sandbox.
- Treat a lockfile dump as a standards-conformant SBOM.

## Install

Point your Agent Skills host at a clone of this repo. Hosts look for `SKILL.md`.

```bash
git clone https://github.com/Calvin-LLC/agentic-hardening-skill.git
```

Then copy or symlink the checkout into your host's skills path, or load it
straight from the clone. The scripts need Node 18 or newer. Without Node, the
skill says so and marks the report `validators not run`.

## License

MIT
