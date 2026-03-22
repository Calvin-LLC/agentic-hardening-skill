# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin that provides the `/harden` slash command — a language-agnostic codebase auditing tool. It does not fix code; it produces a severity-ranked report with a remediation plan. There is no build system, test suite, or compiled code — the entire plugin is markdown-based definitions.

## Architecture

- **`SKILL.md`** — The skill definition and single source of truth. Contains the full 7-phase orchestration logic, report format, and remediation plan template.
- **`commands/harden.md`** — Thin wrapper that wires `/harden` to SKILL.md. Contains only frontmatter and a reference.
- **`.claude-plugin/plugin.json`** — Plugin manifest (name, version, author).

### Agent Definitions (`agents/`)

Five markdown files, each defining a specialized subagent with its own audit checklist, search patterns, output format, and confidence-level criteria:

| Agent | Model | Purpose |
|-------|-------|---------|
| `recon-agent.md` | sonnet | Phase 1: Project profiling (language, framework, build/test tools, structure) |
| `debug-audit-agent.md` | sonnet | Phase 2: Error handling, logging, observability gaps |
| `test-runner-agent.md` | sonnet | Phase 3: Test discovery, build verification, coverage gaps (reports commands but does NOT execute them) |
| `security-audit-agent.md` | sonnet | Phase 4: OWASP-based vulnerability scanning (context-aware — does not flag legitimate systems/game-dev patterns) |
| `robustness-audit-agent.md` | sonnet | Phase 5: Resource leaks, race conditions, null handling, boundary conditions |

### Execution Flow

1. **Phase 1** — Recon agent runs first (blocking), produces a project profile. Results are validated before proceeding — audit aborts if recon fails or no source code is detected.
2. **Phases 2-5** — All applicable audit agents launch **in parallel** with the recon results (wrapped in data-framing delimiters to mitigate prompt injection from scanned project files)
3. **Phase 6** — Findings are de-duplicated, conflicts resolved (higher severity wins), and merged into a single consolidated report. Handles partial results if agents fail.
4. **Phase 7** — A prioritized remediation checklist is generated

Scoped runs (`debug-only`, `security-only`, `test-only`, `robust-only`, or a directory path) skip inapplicable agents but always run recon first.

## Key Design Decisions

- `commands/harden.md` is a thin wrapper — all orchestration logic lives in `SKILL.md` only.
- Agent definitions include language-specific search patterns for 8+ languages. When adding a new language, update the pattern tables in each relevant agent file.
- The security agent explicitly whitelists systems programming patterns (DLL injection, hooking, memory manipulation) to avoid false positives on game/systems codebases.
- Every agent must produce output for all audit categories — "No issues found" is required rather than silent omission. This is enforced by "Deliverable Validation" sections in each agent definition.
- Agents research best practices online (WebSearch/WebFetch) for each issue **category** found, not each individual finding. If web search fails, agents fall back to training knowledge with a disclaimer.
- Directory scope arguments are validated: `..`, absolute paths, and shell metacharacters are rejected.
- The recon agent detects but does NOT read `.env*` file contents to prevent secret leakage.
- The test-runner agent reports discovered build/test/lint commands but does NOT execute them — users run them manually.
