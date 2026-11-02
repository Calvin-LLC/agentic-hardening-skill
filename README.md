# harden

An agent skill that audits a codebase for security, supply-chain, reliability,
and test problems. Every finding carries a quoted excerpt, a severity, and a
citation, and a script checks each excerpt against the cited file. It reports
only and never edits your code.

## Setup

Clone this repo into your coding agent's skills folder, in a folder named
`harden`, then start a new session.

| Agent | Clone into | Invoke |
|-------|------------|--------|
| Claude Code | `~/.claude/skills/harden` | `/harden` |
| Codex | `~/.agents/skills/harden` | `$harden` |
| OpenClaw | `~/.openclaw/skills/harden` | `/harden` |
| Hermes | `~/.hermes/skills/harden` | `/harden` |
| Pi | `~/.pi/agent/skills/harden` | `/skill:harden` |
| omp | `~/.omp/agent/skills/harden` | `/skill:harden` |

```bash
git clone https://github.com/Calvin-LLC/agentic-hardening-skill ~/.claude/skills/harden
```

Needs Node 18 or newer.

MIT
