---
name: agentic
owner: security
readers: [reliability]
description: OWASP Agentic Top 10 (2026) controls ASI01 to ASI10 plus NIST agent identity checks, for repos where a model chooses tools or steps. Loaded when recon agent_loop or mcp is true.
---

Inherited contract applies. Read `agents/_contract.md` before emitting findings. Names come from the "OWASP Top 10 for Agentic Applications (2026) names" table in the contract.

Owner: security, except `ASI08`, which reliability owns (it is a bounds and failure-containment question). Reliability reads this module for `ASI08` and for the `agent-action-logging` control.

Normative source for identity and authorization checks: the NIST design tenets for agent identity (nist.gov, 2026-10-27): distinct agent identity, delegation that only narrows, zero standing privilege, short-lived and revocable authorization, human-in-the-loop triggers, separation of policy from reasoning, deterministic access decisions, immutable evidence. These are guidance, not requirements. Findings that rest on them carry `regulatory: ["NIST-agent-identity"]` and start as `hardening-note` unless a reachable exploit path exists.

| Control | Look for | Evidence needed |
|---------|----------|-----------------|
| ASI01 Agent Goal Hijack | Instructions from retrieved pages, emails, tickets, files, or tool output placed in the agent's goal or plan with the same authority as the operator's. No separation between task and data. | Path from the untrusted source into the planning prompt. |
| ASI02 Tool Misuse and Exploitation | Per tool: the permission it runs with, an egress allowlist for network tools, argument validation, and a human approval gate before destructive or external-effect calls. One shared credential across all tools. | Tool registry plus the credential each tool uses. |
| ASI03 Identity and Privilege Abuse | Long-lived API keys, shared service accounts, or a human user's token used by the agent process; delegation to sub-agents or downstream services that does not narrow scope; agent acting on a caller's behalf without re-checking the caller's rights (confused deputy). Recommend short-lived, audience-bound credentials from a workload identity system (SPIFFE/SPIRE, OAuth 2.1 token exchange, scoped MCP tokens). | Where the credential is loaded, its lifetime if stated, and its scope. |
| ASI04 Agentic Supply Chain Vulnerabilities | MCP servers and tools fetched at runtime without a pinned version or digest; prompt or tool-schema files with no integrity check; no provenance for third-party servers; no AIBOM when models or prompts ship. | Install or launch line with its version pin, and the manifest. |
| ASI05 Unexpected Code Execution | Model output reaching `eval`, `exec`, a shell, a notebook kernel, or a code-interpreter tool outside a sandbox. Also an A05 finding. | Source to Sink path. |
| ASI06 Memory and Context Poisoning | Long-term memory, scratchpads, or vector stores written from untrusted content and read back as trusted context; no per-user memory isolation. | The memory write path and the read path. |
| ASI07 Insecure Inter-Agent Communication | Agent-to-agent messages over unauthenticated channels, messages trusted by content alone, no signing or identity check between agents. | The transport and what the receiver verifies. |
| ASI08 Cascading Failures (owner: reliability) | No step cap or time limit on agent loops; no circuit breaker between agents; a failed tool call retried without bound; one agent's error output fed to the next as instructions. | The loop and the absence of a cap. |
| ASI09 Human-Agent Trust Exploitation | Approval prompts that show only the agent's summary, not the action's real arguments; approval fatigue patterns (approve-all, session-wide grants). | The approval UI or call and what it displays. |
| ASI10 Rogue Agents | No kill switch, no way to revoke one agent's credentials without stopping the fleet, no behavior monitoring or anomaly alert on agent actions. | The revocation path and the monitoring hook, or their absence. |

Rules:

- A control with no agent code in scope is `not-applicable` with one line of evidence.
- Missing human approval on a destructive tool is `open` only when the tool is reachable from untrusted input. Otherwise it is `needs-validation` with the exact blocker.
- Do not write secret values. Report location, type, and a rotation action.
