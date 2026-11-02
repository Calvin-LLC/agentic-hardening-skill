# harden

A skill that audits a codebase for security, supply-chain, reliability, and test
problems. Every finding carries a quoted excerpt, a severity, and a file and line,
and a script checks each excerpt against the file it cites. It reports only and
never edits your code.

Everything the skill needs is in this folder. It has no options and uses no
network: you run it and it audits the whole repo.

## Setup

Clone this repo into your coding agent's skills folder, in a folder named
`harden`, then start a new session.

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

Then run it from the repo you want audited:

```
/harden
```

The report lands in `.tmp/harden/REPORT.md`. Needs Node 18 or newer.

MIT
