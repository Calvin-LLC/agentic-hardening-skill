#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { readJson, validateAgainst, safeRelativePath, show, finish } = require("./lib/check.cjs");

const usage = "usage: node validate-findings.cjs <packet.json> [--root <repo-dir>]";
const args = process.argv.slice(2);
const file = args.shift();
let root = process.cwd();
if (!file || file.startsWith("--") || (args.length && (args[0] !== "--root" || args.length !== 2))) {
  process.stderr.write(`${usage}\n`);
  process.exit(2);
}
if (args.length) root = path.resolve(args[1]);

const squash = (text) => String(text).replace(/\r/g, "").replace(/\s+/g, " ").trim();

function excerptFound(excerpt, citedPaths) {
  const segments = String(excerpt)
    .split(/\.\.\.|\u2026|\*{3}REDACTED\*{3}|<redacted>|<value>/i)
    .map(squash)
    .filter((seg) => seg.length >= 8);
  if (segments.length === 0) return false;
  const windows = [];
  for (const cited of citedPaths) {
    const m = /^(.*?)(?::(\d+)(?:-(\d+))?)?$/.exec(cited);
    const rel = m[1];
    if (safeRelativePath(rel) === null) continue;
    let text;
    try {
      text = fs.readFileSync(path.join(root, rel), "utf8").replace(/\r/g, "");
    } catch {
      continue;
    }
    if (m[2]) {
      const lines = text.split("\n");
      const start = Math.max(0, Number(m[2]) - 1 - 3);
      const end = Math.min(lines.length, Number(m[3] || m[2]) + 3);
      windows.push(squash(lines.slice(start, end).join("\n")));
    } else {
      windows.push(squash(text));
    }
  }
  return segments.every((seg) => windows.some((w) => w.includes(seg)));
}

let packet;
let schema;
try {
  schema = readJson(path.join(__dirname, "..", "schemas", "findings.schema.json"));
  packet = readJson(file);
} catch (error) {
  process.stdout.write(`fail findings ${show(file)}: ${error.message}\n`);
  process.exit(1);
}

const errors = validateAgainst(schema, packet);

if (errors.length === 0) {
  const seenIds = new Set();
  const seenPrints = new Set();
  const seenControls = new Set();

  for (const row of packet.coverage) {
    if (seenControls.has(row.control)) errors.push(`coverage: control ${row.control} appears twice`);
    seenControls.add(row.control);
  }

  packet.findings.forEach((f, i) => {
    const at = `findings[${i}] ${f.id}`;
    const bad = (message) => errors.push(`${at}: ${message}`);
    if (seenIds.has(f.id)) bad("duplicate id");
    seenIds.add(f.id);
    if (seenPrints.has(f.fingerprint)) bad(`duplicate fingerprint ${f.fingerprint}`);
    seenPrints.add(f.fingerprint);
    if (f.agent !== packet.agent) bad(`agent ${f.agent} is not the packet agent ${packet.agent}`);
    if (!seenControls.has(f.control)) bad(`control ${f.control} has no coverage row`);
    for (const p of f.affected.paths) {
      if (safeRelativePath(p) === null) bad(`affected path ${show(p)} is not a safe repository-relative path`);
    }

    f.evidence.forEach((ev, j) => {
      if (ev.type.startsWith("code-") && !excerptFound(ev.excerpt, f.affected.paths)) {
        bad(`evidence[${j}] type ${ev.type}: excerpt is not a verbatim quote of the cited lines (a segment may be elided with ...)`);
      }
      if (ev.type === "absence-grep" && !/\b0\b/.test(ev.excerpt)) bad(`evidence[${j}] absence-grep must state the command and a hit count of 0`);
    });
    if (f.evidence.some((ev) => ev.type === "analysis" && ev.claim_type !== "inferred")) bad("analysis evidence must have claim_type inferred");
    if (f.evidence.length > 0 && f.evidence.every((ev) => ev.type === "analysis")) bad("a finding cannot rest on analysis evidence alone");

    const has = (key) => Object.hasOwn(f, key);
    const cat = f.category;
    if (f.agent === "security") {
      if (!cat.owasp_2025 && !cat.llm_2026 && !cat.asi_2026) bad("security finding needs at least one of owasp_2025, llm_2026, asi_2026");
    }
    if (f.agent === "a11y" && !(cat.wcag && cat.wcag.length)) bad("a11y finding needs category.wcag");

    if (f.status === "open") {
      if (!has("severity")) bad("status open needs severity");
      for (const key of ["confidence", "reachability", "evidence_quality", "impact", "remediation", "verification"]) {
        if (!has(key)) bad(`status open needs ${key}`);
      }
      if (f.evidence.length === 0) bad("status open needs at least one evidence entry");
      const strong = f.evidence_quality === "strong" && f.reachability === "confirmed";
      if ((f.severity === "high" || f.severity === "critical") && !strong) {
        bad(`${f.severity} needs evidence_quality strong and reachability confirmed`);
      }
      if (f.severity === "medium" && (f.evidence_quality === "weak" || f.reachability === "speculative")) {
        bad("medium cannot rest on weak evidence or speculative reachability");
      }
      for (const key of ["blockers", "validation_plan", "upstream_control"]) {
        if (has(key)) bad(`status open must not carry ${key}`);
      }
    } else {
      if (has("severity")) bad(`status ${f.status} must not carry severity`);
    }

    if (f.status === "needs-validation") {
      if (!has("blockers")) bad("needs-validation needs blockers");
      if (!has("validation_plan")) bad("needs-validation needs validation_plan");
    }
    if (f.status === "hardening-note") {
      const reg = has("regulatory") && f.regulatory.length > 0;
      if (!has("upstream_control") && !reg) bad("hardening-note needs upstream_control or a non-empty regulatory list");
    }
    if (f.status !== "hardening-note" && has("upstream_control")) bad("only hardening-note may carry upstream_control");
    if (f.status !== "needs-validation" && (has("blockers") || has("validation_plan"))) {
      bad("only needs-validation may carry blockers or validation_plan");
    }
  });
}

finish("findings", file, errors);
