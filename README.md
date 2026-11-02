# harden

An agent skill that audits a codebase for security, supply-chain, reliability,
and test problems. It reports findings with a quoted excerpt, a severity, and a
citation. It never edits your code.

It checks the OWASP Top 10:2025, the OWASP LLM Top 10:2026 and Agentic Top 10
when the repo uses a model or an agent, and optional modules for infrastructure
code, tenant isolation, and release evidence. A script checks every quoted
excerpt against the cited file, so a paraphrase fails.

## Install

Clone this repo into your coding agent's skills folder, in a folder named
`harden`. Then start a new session.

| Agent | Clone into | Run |
|-------|------------|-----|
| Claude Code | `~/.claude/skills/harden` | `/harden` |
| Codex | `~/.agents/skills/harden` | `$harden` |
| OpenClaw | `~/.openclaw/skills/harden` | `/harden` |
| Hermes | `~/.hermes/skills/harden` | `/harden` |
| Pi | `~/.pi/agent/skills/harden` | `/skill:harden` |
| omp | `~/.omp/agent/skills/harden` | `/skill:harden` |

```bash
git clone https://github.com/Calvin-LLC/agentic-hardening-skill ~/.claude/skills/harden
```

## Use

```
/harden
/harden --depth=quick
/harden --depth=deep --scope=security src/auth
```

The default depth is `standard`. The skill only reads your code, and it writes
only under `.tmp/harden/`. Running tests or installing packages needs an
explicit flag and a host that can prove a sandbox.

You need Node 18 or newer for the validator scripts. Without Node, the skill
says so and marks the report `validators not run`.

## Limits

Absence of findings is not evidence of absence. Regulatory items (OMB M-26-14
and M-26-15, the EU Cyber Resilience Act, CISA SBOM 2026) are tags that never
raise a severity. The audit method follows Cloudflare's
[security-audit skill](https://github.com/cloudflare/security-audit-skill).

## License

MIT
