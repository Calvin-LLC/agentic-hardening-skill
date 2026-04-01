# /harden

A codebase hardening plugin that audits your project for security vulnerabilities (OWASP Top 10:2025), debugging gaps, test coverage, robustness issues, and accessibility violations (WCAG 2.2). Works with any language. Compatible with both [Claude Code](https://docs.anthropic.com/en/docs/claude-code) and [OpenCode](https://opencode.ai).

It doesn't fix anything -- it produces a severity-ranked report with a remediation plan.

## How it works

`/harden` launches up to 6 specialized agents that scan your codebase in parallel:

1. **Recon** -- Detects language, framework, build tools, test runners, and maps project structure
2. **Debug Audit** -- Finds error handling gaps, unstructured logging, missing observability (against 2025 standards: structured logging, OpenTelemetry, fail-closed patterns)
3. **Test Runner** -- Discovers tests, verifies build configuration, identifies coverage gaps
4. **Security Audit** -- Full OWASP Top 10:2025 scan (A01-A10 including new Supply Chain and Exceptional Conditions categories), CWE mapping, injection taxonomy, SSRF, SSTI
5. **Robustness Audit** -- Checks for resource leaks, race conditions, null handling, boundary conditions
6. **Accessibility Audit** -- WCAG 2.2 Level A + AA (all 55 criteria across 4 POUR principles). Only runs on web projects.

Each agent researches current (2025/2026) best practices online for every issue it finds, citing authoritative sources.

**Limitations:** Recon assumes standard directory naming conventions. The security agent does not flag legitimate systems programming patterns (DLL injection, hooking, direct memory access). The accessibility audit only runs on projects with web/UI components. All agents search for English-language patterns.

## Usage

```
/harden                    # Full audit (all 6 agents)
/harden debug-only         # Debugging & observability only
/harden security-only      # Security only (OWASP 2025)
/harden test-only          # Tests & build verification only
/harden robust-only        # Robustness only
/harden a11y-only          # Accessibility only (WCAG 2.2, web projects)
/harden src/auth           # Full audit scoped to a directory
```

## Report format

The output is a single consolidated report containing:

- **Project Profile** -- Detected language, framework, build/test status
- **Summary Table** -- Finding counts by category and severity
- **OWASP 2025 Coverage** -- Status of each A01-A10 category
- **WCAG 2.2 Coverage** -- Status of each POUR principle (web projects only)
- **Detailed Findings** -- Each issue with `file:line`, description, OWASP/CWE/WCAG reference, researched best practice (with source URL), and suggested fix
- **Remediation Plan** -- Prioritized checklist of all fixes grouped by severity

### Severity levels

| Level | Meaning |
|-------|---------|
| CRITICAL | Will cause data loss, security breach, or crash in production |
| HIGH | Significant risk or major quality issue |
| MEDIUM | Should be fixed but not urgent |
| LOW | Minor improvement |
| INFO | Suggestion or observation |

## Installation

### Claude Code

```bash
git clone https://github.com/Calvin-LLC/claude-harden-plugin.git
cd claude-harden-plugin
claude plugin add .
```

Or manually copy to `~/.claude/skills/harden/`.

### OpenCode

Copy the OpenCode-formatted files to your OpenCode config directory:

```bash
git clone https://github.com/Calvin-LLC/claude-harden-plugin.git
cp claude-harden-plugin/opencode/commands/harden.md ~/.config/opencode/commands/
cp claude-harden-plugin/opencode/agents/*.md ~/.config/opencode/agents/
```

The OpenCode version uses `@subagent` references (e.g., `@recon`, `@security-audit`, `@accessibility-audit`) which map to the agent files in the `agents/` directory.

## Directory structure

```
├── SKILL.md                          # Claude Code orchestration (7-phase audit)
├── commands/
│   └── harden.md                     # Claude Code /harden command wrapper
├── agents/                           # Claude Code agent definitions
│   ├── recon-agent.md
│   ├── debug-audit-agent.md
│   ├── test-runner-agent.md
│   ├── security-audit-agent.md
│   ├── robustness-audit-agent.md
│   └── accessibility-audit-agent.md
├── opencode/                         # OpenCode-compatible versions
│   ├── commands/
│   │   └── harden.md                 # OpenCode /harden command (standalone)
│   └── agents/
│       ├── recon.md
│       ├── debug-audit.md
│       ├── test-runner.md
│       ├── security-audit.md
│       ├── robustness-audit.md
│       └── accessibility-audit.md
└── .claude-plugin/
    └── plugin.json                   # Claude Code plugin manifest
```

The Claude Code and OpenCode versions share the same audit logic and checklists. They differ only in frontmatter format and agent invocation syntax.

## Security

Only run `/harden` on projects you trust. The audit reads arbitrary project files and passes their content to agent prompts. Malicious projects could attempt to manipulate agent behavior through crafted file contents.

## License

MIT
