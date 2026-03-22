# /harden

A Claude Code plugin that audits your codebase for debugging gaps, test coverage, security vulnerabilities, and robustness issues. Works with any language.

It doesn't fix anything -- it produces a severity-ranked report with a remediation plan.

## How it works

`/harden` launches 5 specialized agents that scan your codebase in parallel:

1. **Recon** -- Detects language, framework, build tools, test runners, and maps project structure
2. **Debug Audit** -- Finds error handling gaps, unstructured logging, missing observability
3. **Test Runner** -- Discovers tests, verifies build configuration, identifies coverage gaps
4. **Security Audit** -- Scans for OWASP Top 10 vulnerabilities, hardcoded secrets, injection vectors
5. **Robustness Audit** -- Checks for resource leaks, race conditions, null handling, boundary conditions

Each agent researches current best practices online for every issue it finds, citing authoritative sources.

**Limitations:** Recon assumes standard directory naming conventions. The security agent does not flag legitimate systems programming patterns (DLL injection, hooking, direct memory access). All agents search for English-language patterns.

## Usage

```
/harden                    # Full audit
/harden debug-only         # Debugging & observability only
/harden security-only      # Security only
/harden test-only          # Tests & build verification only
/harden robust-only        # Robustness only
/harden src/auth           # Full audit scoped to a directory
```

## Report format

The output is a single consolidated report containing:

- **Project Profile** -- Detected language, framework, build/test status
- **Summary Table** -- Finding counts by category and severity
- **Detailed Findings** -- Each issue with `file:line`, description, researched best practice (with source URL), and suggested fix
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

```bash
git clone https://github.com/YOUR_USERNAME/claude-harden-plugin.git && cd claude-harden-plugin && claude plugin add .
```

## Security

Only run `/harden` on projects you trust. The audit reads arbitrary project files and passes their content to agent prompts. Malicious projects could attempt to manipulate agent behavior through crafted file contents.

## License

MIT
