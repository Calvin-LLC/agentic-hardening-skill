#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { blobSha, readJson, validateAgainst, safeRelativePath, show, finish } = require("./lib/check.cjs");

const usage = "usage: node validate-ledger.cjs <ledger.json> [--root <repo-dir>] [--check-hashes] [--packets <packet.json>...]";
const args = process.argv.slice(2);
const file = args.shift();
if (!file || file.startsWith("--")) {
  process.stderr.write(`${usage}\n`);
  process.exit(2);
}

let root = process.cwd();
let checkHashes = false;
const packetFiles = [];
while (args.length) {
  const flag = args.shift();
  if (flag === "--root") root = path.resolve(args.shift() || ".");
  else if (flag === "--check-hashes") checkHashes = true;
  else if (flag === "--packets") {
    while (args.length && !args[0].startsWith("--")) packetFiles.push(args.shift());
    if (packetFiles.length === 0) {
      process.stderr.write(`--packets needs at least one file\n${usage}\n`);
      process.exit(2);
    }
  } else {
    process.stderr.write(`unknown argument ${show(flag)}\n${usage}\n`);
    process.exit(2);
  }
}

let ledger;
let schema;
try {
  schema = readJson(path.join(__dirname, "..", "schemas", "ledger.schema.json"));
  ledger = readJson(file);
} catch (error) {
  process.stdout.write(`fail ledger ${show(file)}: ${error.message}\n`);
  process.exit(1);
}

const errors = validateAgainst(schema, ledger);

if (errors.length === 0) {
  const units = new Map();
  const rootReal = fs.realpathSync(root);

  for (const u of ledger.units) {
    const bad = (message) => errors.push(`unit ${u.control}: ${message}`);
    if (units.has(u.control)) bad("appears twice");
    units.set(u.control, u);

    if (u.status === "covered" && u.reviewed_paths.length === 0) bad("covered needs reviewed_paths");
    if (u.status === "candidate" && u.fingerprints.length === 0) bad("candidate needs at least one fingerprint");
    if ((u.status === "blocked" || u.status === "deferred") && u.unresolved.length === 0) bad(`${u.status} needs unresolved`);

    const reviewed = new Set(u.reviewed_paths);
    if (reviewed.size !== u.reviewed_paths.length) bad("reviewed_paths has duplicates");
    const hashed = Object.keys(u.evidence_hash);
    for (const p of u.reviewed_paths) if (!Object.hasOwn(u.evidence_hash, p)) bad(`reviewed path ${show(p)} has no evidence_hash`);
    for (const p of hashed) if (!reviewed.has(p)) bad(`evidence_hash key ${show(p)} is not in reviewed_paths`);

    for (const p of [...u.reviewed_paths, ...u.deleted_paths]) {
      if (safeRelativePath(p) !== p) bad(`path ${show(p)} must be repository-relative with no line suffix, no .. and no absolute form`);
    }
    for (const p of u.deleted_paths) {
      if (reviewed.has(p)) bad(`path ${show(p)} is both reviewed and deleted`);
      else if (fs.existsSync(path.join(root, p))) bad(`deleted path ${show(p)} still exists`);
    }
    for (const p of u.reviewed_paths) {
      if (safeRelativePath(p) !== p) continue;
      const full = path.join(root, p);
      let stat;
      try {
        stat = fs.lstatSync(full);
      } catch {
        bad(`reviewed path ${show(p)} does not exist; list it in deleted_paths`);
        continue;
      }
      if (!stat.isFile()) {
        bad(`reviewed path ${show(p)} is not a regular file (directory, symlink, or special file)`);
        continue;
      }
      if (!fs.realpathSync(full).startsWith(rootReal + path.sep)) bad(`reviewed path ${show(p)} resolves outside the repository`);
      else if (checkHashes && u.evidence_hash[p] !== blobSha(fs.readFileSync(full))) bad(`evidence_hash for ${show(p)} does not match the file on disk`);
    }
  }

  const printUnits = new Map();
  for (const u of ledger.units) {
    for (const fp of u.fingerprints) {
      if (!printUnits.has(fp)) printUnits.set(fp, new Set());
      printUnits.get(fp).add(u.control);
    }
  }
  const coveredBy = new Map();
  const printsSeen = new Set();
  const packetAgents = new Set();

  for (const packetFile of packetFiles) {
    let packet;
    try {
      packet = readJson(packetFile);
    } catch (error) {
      errors.push(`packet ${show(packetFile)}: ${error.message}`);
      continue;
    }
    if (!packet || !Array.isArray(packet.coverage) || !Array.isArray(packet.findings)) {
      errors.push(`packet ${show(packetFile)}: not an agent packet`);
      continue;
    }
    packetAgents.add(packet.agent);
    for (const row of packet.coverage) {
      coveredBy.set(row.control, packet.agent);
      const unit = units.get(row.control);
      if (!unit) errors.push(`packet ${packet.agent}: coverage control ${row.control} is not a ledger unit`);
      else if (unit.owner !== packet.agent) errors.push(`packet ${packet.agent}: control ${row.control} is owned by ${unit.owner}`);
    }
    for (const f of packet.findings) {
      const unit = units.get(f.control);
      if (!unit) errors.push(`finding ${f.id}: control ${f.control} is not a ledger unit`);
      else if (unit.owner !== f.agent) errors.push(`finding ${f.id}: control ${f.control} is owned by ${unit.owner}, not ${f.agent}`);
      printsSeen.add(f.fingerprint);
      if (!printUnits.has(f.fingerprint)) errors.push(`finding ${f.id}: fingerprint ${f.fingerprint} is on no ledger unit`);
      else if (!printUnits.get(f.fingerprint).has(f.control)) errors.push(`finding ${f.id}: fingerprint ${f.fingerprint} is not on its own control unit ${f.control}`);
    }
  }

  if (packetFiles.length > 0) {
    for (const u of ledger.units) {
      if (["covered", "candidate", "blocked", "not_applicable"].includes(u.status)) {
        if (!packetAgents.has(u.owner)) errors.push(`unit ${u.control}: status ${u.status} but no packet from owner ${u.owner} was supplied`);
        else if (coveredBy.get(u.control) !== u.owner) errors.push(`unit ${u.control}: status ${u.status} but owner ${u.owner}'s packet has no coverage row for it`);
      }
      for (const fp of u.fingerprints) {
        if (packetAgents.has(u.owner) && !printsSeen.has(fp)) errors.push(`unit ${u.control}: fingerprint ${fp} appears in no finding`);
      }
    }
  }
}

finish("ledger", file, errors);
