#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { blobSha, readJson, validateAgainst, safeRelativePath, show } = require("./lib/check.cjs");

const usage = "usage: node update-ledger.cjs <ledger.json> --packets <packet.json>... [--root <repo-dir>]";
const args = process.argv.slice(2);
const file = args.shift();
if (!file || file.startsWith("--")) {
  process.stderr.write(`${usage}\n`);
  process.exit(2);
}
let root = process.cwd();
const packetFiles = [];
while (args.length) {
  const flag = args.shift();
  if (flag === "--root") root = path.resolve(args.shift() || ".");
  else if (flag === "--packets") while (args.length && !args[0].startsWith("--")) packetFiles.push(args.shift());
  else {
    process.stderr.write(`unknown argument ${show(flag)}\n${usage}\n`);
    process.exit(2);
  }
}
if (packetFiles.length === 0) {
  process.stderr.write(`--packets needs at least one file\n${usage}\n`);
  process.exit(2);
}

const schema = readJson(path.join(__dirname, "..", "schemas", "ledger.schema.json"));
const ledger = readJson(file);
const errors = validateAgainst(schema, ledger);
const units = new Map(ledger.units.map((u) => [u.control, u]));
const STATUS = { assessed: "covered", "not-applicable": "not_applicable", "not-assessable": "blocked", blocked: "blocked" };

for (const packetFile of packetFiles) {
  const packet = readJson(packetFile);
  for (const row of packet.coverage) {
    const unit = units.get(row.control);
    const at = `${packet.agent}/${row.control}`;
    if (!unit) {
      errors.push(`${at}: not a ledger unit`);
      continue;
    }
    if (unit.owner !== packet.agent) {
      errors.push(`${at}: owned by ${unit.owner}`);
      continue;
    }
    const refs = [...new Set(row.evidence_refs)];
    if (refs.length > 20) errors.push(`${at}: more than 20 evidence_refs`);
    const hashes = {};
    for (const ref of refs) {
      if (safeRelativePath(ref) !== ref) {
        errors.push(`${at}: evidence ref ${show(ref)} must be a repository-relative path with no line suffix`);
        continue;
      }
      try {
        const full = path.join(root, ref);
        if (!fs.lstatSync(full).isFile()) throw new Error("not a regular file");
        hashes[ref] = blobSha(fs.readFileSync(full));
      } catch (error) {
        errors.push(`${at}: evidence ref ${show(ref)} cannot be hashed (${error.message})`);
      }
    }
    const fingerprints = packet.findings.filter((f) => f.control === row.control).map((f) => f.fingerprint);
    unit.status = STATUS[row.disposition];
    if (unit.status === "covered" && fingerprints.length > 0) unit.status = "candidate";
    unit.reviewed_paths = Object.keys(hashes);
    unit.deleted_paths = [];
    unit.evidence_hash = hashes;
    unit.fingerprints = fingerprints;
    unit.unresolved = [];
    if (unit.status === "blocked") {
      if (packet.limitations.length === 0) errors.push(`${at}: ${row.disposition} needs a limitations line`);
      unit.unresolved = packet.limitations.slice(0, 3);
    }
  }
}

if (errors.length) {
  for (const e of errors.slice(0, 100)) process.stdout.write(`${e}\n`);
  process.stdout.write(`fail update ${show(file)} (${errors.length} error${errors.length === 1 ? "" : "s"}); ledger not written\n`);
  process.exit(1);
}
fs.writeFileSync(file, `${JSON.stringify(ledger, null, 1)}\n`);
const counts = {};
for (const u of ledger.units) counts[u.status] = (counts[u.status] || 0) + 1;
process.stdout.write(`ok update ${file} ${JSON.stringify(counts)}\n`);
