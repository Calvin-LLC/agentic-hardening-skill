#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { priorStatuses, readJson, validateAgainst, show } = require("./lib/check.cjs");

const usage = "usage: node delta-ledger.cjs <prior-ledger.json> [--root <repo-dir>]";
const args = process.argv.slice(2);
const file = args.shift();
if (!file || file.startsWith("--")) {
  process.stderr.write(`${usage}\n`);
  process.exit(2);
}
let root = process.cwd();
while (args.length) {
  const flag = args.shift();
  if (flag === "--root") root = path.resolve(args.shift() || ".");
  else {
    process.stderr.write(`unknown argument ${show(flag)}\n${usage}\n`);
    process.exit(2);
  }
}

const schema = readJson(path.join(__dirname, "..", "schemas", "ledger.schema.json"));
const prior = readJson(file);
const problems = validateAgainst(schema, prior);
if (problems.length) {
  for (const p of problems.slice(0, 100)) process.stdout.write(`${p}\n`);
  process.stdout.write(`fail delta ${show(file)}: prior ledger does not validate\n`);
  process.exit(1);
}

const { out: units, counts } = priorStatuses(prior, root);

process.stdout.write(`${JSON.stringify({ base_commit: prior.base_commit, counts, units }, null, 2)}\n`);
