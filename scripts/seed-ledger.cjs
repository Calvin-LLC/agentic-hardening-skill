#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { priorStatuses, readJson, validateAgainst, show } = require("./lib/check.cjs");

const usage = "usage: node seed-ledger.cjs <profile.json> --out <ledger.json> [--agents security,reliability,tests] [--depth quick|standard|deep] [--root <repo-dir>] [--prior <prior-ledger.json>]";
const args = process.argv.slice(2);
const profileFile = args.shift();
if (!profileFile || profileFile.startsWith("--")) {
  process.stderr.write(`${usage}\n`);
  process.exit(2);
}
let out = null;
let root = process.cwd();
let depth = "standard";
let priorFile = null;
let agents = ["security", "reliability", "tests"];
while (args.length) {
  const flag = args.shift();
  const value = args.shift();
  if (flag === "--out") out = value;
  else if (flag === "--root") root = path.resolve(value || ".");
  else if (flag === "--depth") depth = value;
  else if (flag === "--prior") priorFile = value;
  else if (flag === "--agents") agents = String(value).split(",");
  else {
    process.stderr.write(`unknown argument ${show(flag)}\n${usage}\n`);
    process.exit(2);
  }
}
if (!out) {
  process.stderr.write(`--out is required\n${usage}\n`);
  process.exit(2);
}

const range = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}${String(i + 1).padStart(2, "0")}`);
const CONTROLS = [
  { owner: "security", ids: range("A", 10) },
  { owner: "security", module: "ai-llm", ids: range("LLM", 10) },
  { owner: "security", module: "agentic", ids: range("ASI", 10).filter((id) => id !== "ASI08") },
  { owner: "reliability", module: "agentic", ids: ["ASI08", "agent-action-logging"] },
  { owner: "security", module: "iac", ids: ["IAC-IAM", "IAC-NETWORK", "IAC-CONTAINER", "IAC-SECRETS"] },
  { owner: "security", module: "tenant-isolation", ids: ["TEN-QUERY", "TEN-CACHE", "TEN-EXPORT", "TEN-DELETE"] },
  { owner: "security", module: "release-compliance", ids: ["REL-PROVENANCE", "REL-SBOM", "REL-VEX", "REL-AIBOM", "REL-CVD"] },
  { owner: "reliability", ids: ["structured-logging", "correlation", "redaction", "bounds", "idempotency", "races", "fail-closed"] },
  { owner: "tests", ids: ["tests"] },
];

const profile = readJson(profileFile);
const modules = new Set((profile.modules || []).map((m) => m.name));
const units = [];
for (const group of CONTROLS) {
  if (group.module && !modules.has(group.module)) continue;
  if (group.needs && !profile[group.needs]) continue;
  if (group.module === "release-compliance" && !profile.ai) {
    group.ids = group.ids.filter((id) => id !== "REL-AIBOM");
  }
  for (const control of group.ids) {
    units.push({
      control,
      owner: group.owner,
      status: agents.includes(group.owner) ? "planned" : "out_of_scope",
      prior_status: "none",
      reviewed_paths: [],
      deleted_paths: [],
      evidence_hash: {},
      fingerprints: [],
      unresolved: [],
    });
  }
}

function git(...cmd) {
  const r = require("node:child_process").spawnSync("git", cmd, { cwd: root, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}
const head = git("rev-parse", "HEAD");
const dirty = (git("status", "--porcelain", "--", ".", ":!.tmp") || "").length > 0;
let priorInfo = null;
if (priorFile) {
  priorInfo = priorStatuses(readJson(priorFile), root);
  for (const u of units) {
    const hit = priorInfo.out[u.control];
    if (hit) {
      u.prior_status = hit.prior_status;
      u.fingerprints = hit.fingerprints.slice();
    } else u.prior_status = "none";
  }
}
const ledger = {
  run: { depth, scope: agents, prior_ledger: Boolean(priorFile) },
  base_commit: head || "none",
  dirty,
  profile: { modules: [...modules] },
  units,
};
const problems = validateAgainst(readJson(path.join(__dirname, "..", "schemas", "ledger.schema.json")), ledger);
if (problems.length) {
  for (const p of problems.slice(0, 100)) process.stdout.write(`${p}\n`);
  process.exit(1);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `${JSON.stringify(ledger, null, 1)}\n`);
const counts = {};
for (const u of units) counts[`${u.owner}:${u.status}`] = (counts[`${u.owner}:${u.status}`] || 0) + 1;
process.stdout.write(`${priorInfo ? `prior ${JSON.stringify(priorInfo.counts)}\n` : ""}ok seed ${out} units=${units.length} base=${ledger.base_commit.slice(0, 7)} dirty=${dirty} ${JSON.stringify(counts)}\n`);
