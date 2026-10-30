#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { readJson, validateAgainst, safeRelativePath, show, finish } = require("./lib/check.cjs");

const usage = "usage: node validate-findings.cjs <packet.json>";
const file = process.argv[2];
if (!file || process.argv.length !== 3) {
  process.stderr.write(`${usage}\n`);
  process.exit(2);
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
