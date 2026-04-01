# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A codebase hardening plugin that provides the `/harden` slash command -- a language-agnostic auditing tool compatible with both Claude Code and OpenCode. It does not fix code; it produces a severity-ranked report with a remediation plan. There is no build system, test suite, or compiled code -- the entire plugin is markdown-based definitions.

## Architecture

Two parallel directory structures exist for Claude Code and OpenCode compatibility:

### Claude Code (`/` root)

- **`SKILL.md`** -- The skill definition and single source of truth for Claude Code. Contains the full 7-phase orchestration logic, report format, and remediation plan template.
- **`commands/harden.md`** -- Thin wrapper that wires `/harden` to SKILL.md. Contains only frontmatter and a reference.
- **`.claude-plugin/plugin.json`** -- Plugin manifest (name, version, author).
- **`agents/`** -- Agent definitions with Claude Code frontmatter (`name`, `tools`, `model: sonnet`, `color`).

### OpenCode (`opencode/`)

- **`opencode/commands/harden.md`** -- Standalone orchestration command (no SKILL.md reference). Contains the full audit logic with `@subagent` syntax.
- **`opencode/agents/`** -- Agent definitions with OpenCode frontmatter (`mode: subagent`, `model: anthropic/claude-sonnet-4-20250514`, `temperature`, `steps`, `color: "#hex"`, `permission`).

### Agent Definitions

Six markdown files, each defining a specialized subagent with its own audit checklist, search patterns, output format, and confidence-level criteria:

| Agent | Purpose |
|-------|---------|
| `recon-agent` | Phase 1: Project profiling (language, framework, build/test tools, structure) |
| `debug-audit-agent` | Phase 2: Error handling, logging, observability gaps (2025 standards: structured logging, OpenTelemetry, fail-closed, SLI/SLO) |
| `test-runner-agent` | Phase 3: Test discovery, build verification, coverage gaps (reports commands but does NOT execute them) |
| `security-audit-agent` | Phase 4: Full OWASP Top 10:2025 audit (A01-A10 including Supply Chain and Exceptional Conditions), CWE mapping |
| `robustness-audit-agent` | Phase 5: Resource leaks, race conditions, null handling, boundary conditions |
| `accessibility-audit-agent` | Phase 6: WCAG 2.2 Level A + AA (all 55 criteria, 4 POUR principles). Web projects only. |

### Execution Flow

1. **Phase 1** -- Recon agent runs first (blocking), produces a project profile. Results are validated before proceeding -- audit aborts if recon fails or no source code is detected.
2. **Phases 2-6** -- All applicable audit agents launch **in parallel** with the recon results (wrapped in data-framing delimiters to mitigate prompt injection from scanned project files). The accessibility agent only launches if recon detected a web project.
3. **Phase 6 (report)** -- Findings are de-duplicated, conflicts resolved (higher severity wins), and merged into a single consolidated report with OWASP 2025 Coverage and WCAG 2.2 Coverage sections. Handles partial results if agents fail.
4. **Phase 7** -- A prioritized remediation checklist is generated.

Scoped runs (`debug-only`, `security-only`, `test-only`, `robust-only`, `a11y-only`, or a directory path) skip inapplicable agents but always run recon first.

## Key Design Decisions

- `commands/harden.md` (Claude Code) is a thin wrapper -- all orchestration logic lives in `SKILL.md` only. The OpenCode version (`opencode/commands/harden.md`) is standalone.
- Agent definitions include language-specific search patterns for 8+ languages. When adding a new language, update the pattern tables in each relevant agent file (both Claude Code and OpenCode versions).
- The security agent audits against **OWASP Top 10:2025** (not 2021). All 10 categories must be covered including A03 Supply Chain and A10 Exceptional Conditions.
- The security agent explicitly whitelists systems programming patterns (DLL injection, hooking, memory manipulation) to avoid false positives on game/systems codebases.
- The accessibility agent only launches for web projects. Detection is based on recon finding HTML, JSX, TSX, Vue, Svelte, or web framework dependencies.
- Every agent must produce output for all audit categories -- "No issues found" is required rather than silent omission. This is enforced by "Deliverable Validation" sections in each agent definition.
- Agents research best practices online (WebSearch/WebFetch) for each issue **category** found, not each individual finding. If web search fails, agents fall back to training knowledge with a disclaimer.
- Directory scope arguments are validated: `..`, absolute paths, and shell metacharacters are rejected.
- The recon agent detects but does NOT read `.env*` file contents to prevent secret leakage.
- The test-runner agent reports discovered build/test/lint commands but does NOT execute them -- users run them manually.
