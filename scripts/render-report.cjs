#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readJson, show } = require("./lib/check.cjs");

const usage = "usage: node render-report.cjs --dir <.tmp/harden dir> --project <name> [--out <REPORT.md>] [--validators-ran]";
const args = process.argv.slice(2);
let dir = null;
let project = null;
let out = null;
let validatorsRan = false;
while (args.length) {
  const flag = args.shift();
  if (flag === "--dir") dir = args.shift();
  else if (flag === "--project") project = args.shift();
  else if (flag === "--out") out = args.shift();
  else if (flag === "--validators-ran") validatorsRan = true;
  else {
    process.stderr.write(`unknown argument ${show(flag)}\n${usage}\n`);
    process.exit(2);
  }
}
if (!dir || !project) {
  process.stderr.write(`${usage}\n`);
  process.exit(2);
}

const ledger = readJson(path.join(dir, "coverage-ledger.json"));
const profile = readJson(path.join(dir, "recon", "profile.json"));
const packets = [];
for (const agent of ["security", "reliability", "tests"]) {
  const file = path.join(dir, agent, "findings.json");
  if (fs.existsSync(file)) packets.push(readJson(file));
}
const findings = packets.flatMap((p) => p.findings);
const SEVS = ["critical", "high", "medium", "low", "info"];
const line = (text) => String(text).replace(/\s+/g, " ").trim();
const cell = (text) => line(text).replace(/\|/g, "\\|");

const rows = [];
rows.push(`# Hardening Report: ${project} @ ${ledger.base_commit.slice(0, 7)}, depth ${ledger.run.depth}, ${packets.map((p) => p.agent).join("+")}`, "");

const skillText = fs.readFileSync(path.join(__dirname, "..", "SKILL.md"), "utf8");
const skillVersion = (/^\s*version:\s*"?([^"\n]+)"?/m.exec(skillText) || [])[1] || "unknown";
rows.push("## Safety contract");
rows.push(`Skill: harden ${skillVersion}.`);
rows.push(`Commit ${ledger.base_commit}. Tier T0 (static). Absence of findings is not evidence of absence. Tree dirty: ${ledger.dirty}.`);
const injected = findings.filter((f) => f.control === "prompt-injection");
rows.push(injected.length ? `Injected instructions reported: ${injected.map((f) => f.id).join(", ")}.` : "No agent reported injected instructions.", "");

rows.push("## Project profile");
const flags = ["ai", "agent_loop", "mcp", "iac", "multi_tenant", "publishes"].map((k) => `${k} ${profile[k]}`).join(", ");
rows.push(`Languages: ${profile.languages.join(", ")}. Frameworks: ${profile.frameworks.join(", ") || "none"}.`);
rows.push(`Flags: ${flags}. Modules: ${profile.modules.map((m) => m.name).join(", ") || "none"}.`, "");
rows.push("```", profile.trust_boundary_diagram.trim(), "```", "");

rows.push("## Supply-chain inventory");
rows.push(`Lockfiles: ${profile.lockfiles.map((l) => `${l.path}${l.committed ? "" : " (not committed)"}`).join(", ") || "none"}.`);
rows.push(`CI: ${profile.ci.join(", ") || "none"}. SBOM files: ${profile.sbom_files.join(", ") || "none found"}. SECURITY.md: ${profile.security_md || "none"}.`, "");

rows.push("## Summary");
rows.push(`| Agent | ${SEVS.join(" | ")} | needs-validation | hardening notes |`);
rows.push(`|---|${SEVS.map(() => "---").join("|")}|---|---|`);
for (const p of packets) {
  const count = (pred) => p.findings.filter(pred).length;
  const sev = SEVS.map((s) => count((f) => f.status === "open" && f.severity === s));
  rows.push(`| ${p.agent} | ${sev.join(" | ")} | ${count((f) => f.status === "needs-validation")} | ${count((f) => f.status === "hardening-note")} |`);
}
rows.push("");

const tags = new Map();
for (const f of findings) for (const t of f.regulatory || []) tags.set(t, [...(tags.get(t) || []), f.id]);
rows.push("## Regulatory context");
if (tags.size === 0) rows.push("No regulatory tags in this run.");
else {
  rows.push("| Tag | Findings | Open findings carrying it |", "|---|---|---|");
  for (const [t, ids] of tags) {
    const open = findings.filter((f) => f.status === "open" && (f.regulatory || []).includes(t)).length;
    rows.push(`| ${t} | ${ids.join(", ")} | ${open} |`);
  }
  rows.push("", "Each tag names a mandate that binds specific organizations. No tag changed a severity.");
}
rows.push("");

const counts = {};
for (const u of ledger.units) counts[u.status] = (counts[u.status] || 0) + 1;
const changed = ledger.units.filter((u) => /_changed_source$/.test(u.prior_status)).length;
rows.push("## Coverage");
rows.push(`Ledger: ${ledger.units.length} units. ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(", ")}.`);
rows.push(ledger.run.prior_ledger ? `A prior ledger was used. ${changed} units had changed source.` : "No prior ledger: this is a first run, and one run does not exhaust the target.");
const outOfScope = ledger.units.filter((u) => u.status === "out_of_scope").map((u) => u.control);
if (outOfScope.length) rows.push(`Not launched, so not covered: ${outOfScope.join(", ")}.`);
rows.push(validatorsRan ? "Validators ran with exit 0: validate-recon, validate-findings per packet, update-ledger, validate-ledger with --check-hashes and --packets. They prove format and ledger consistency only." : "validators not run");
const na = ledger.units.filter((u) => u.status === "not_applicable").map((u) => u.control);
if (na.length) rows.push(`Not applicable: ${na.join(", ")}.`);
rows.push("");

const open = findings.filter((f) => f.status === "open").sort((a, b) => SEVS.indexOf(a.severity) - SEVS.indexOf(b.severity));
rows.push("## Findings");
if (open.length === 0) rows.push("No open findings.");
for (const f of open) {
  rows.push(`### ${f.id} [${f.severity}] ${f.control}: ${line(f.title)}`);
  rows.push(`Confidence ${f.confidence}, reachability ${f.reachability}, evidence ${f.evidence_quality}. Paths: ${f.affected.paths.join(", ")}.`);
  rows.push(`Impact: ${line(f.impact)}`);
  if (f.exploit_preconditions) rows.push(`Preconditions: ${line(f.exploit_preconditions)}`);
  rows.push(`Fix now: ${line(f.remediation.immediate || "")} Durable: ${line(f.remediation.durable || "")}`);
  rows.push(`Verify: ${line(f.verification)}`);
  if (f.false_positive_notes) rows.push(`Checked: ${line(f.false_positive_notes)}`);
  rows.push("");
}

const nv = findings.filter((f) => f.status === "needs-validation");
rows.push("## Needs validation");
if (nv.length === 0) rows.push("None.");
for (const f of nv) {
  rows.push(`### ${f.id} ${f.control}: ${line(f.title)}`);
  rows.push(`Paths: ${f.affected.paths.join(", ")}.`);
  rows.push(`Unresolved: ${f.blockers.map(line).join(" | ")}`);
  rows.push(`Check: ${line(f.validation_plan)}`, "");
}

const notes = findings.filter((f) => f.status === "hardening-note");
rows.push("## Hardening notes");
rows.push("No severity. Each note names the layer that already blocks the attack, or the mandate behind it.", "");
for (const f of notes) {
  rows.push(`- ${f.id} ${f.control}: ${line(f.title)}. ${f.upstream_control ? `Upstream: ${line(f.upstream_control)}` : `Tag: ${(f.regulatory || []).join(", ")}`}`);
}
rows.push("");

rows.push("## Execution trace");
rows.push("Static T0 only. The agents ran no project code, tests, or package managers and fetched nothing. Deployment facts come from files the orchestrator supplied.", "");

rows.push("## Remediation plan");
rows.push("No patches applied.");
for (const group of [["Immediate", (f) => f.remediation && f.remediation.immediate], ["Durable", (f) => f.remediation && f.remediation.durable]]) {
  rows.push(`${group[0]}:`);
  for (const f of open) if (group[1](f)) rows.push(`- [ ] ${f.id}: ${line(group[1](f))}`);
}

const text = `${rows.join("\n")}\n`;
if (out) fs.writeFileSync(out, text);
else process.stdout.write(text);
if (out) process.stdout.write(`ok report ${out} lines=${rows.length} open=${open.length} needs-validation=${nv.length} notes=${notes.length}\n`);
