#!/usr/bin/env node
"use strict";

const path = require("node:path");
const { readJson, validateAgainst, safeRelativePath, show, finish } = require("./lib/check.cjs");

const file = process.argv[2];
if (!file || process.argv.length !== 3) {
  process.stderr.write("usage: node validate-recon.cjs <profile.json>\n");
  process.exit(2);
}

let profile;
let schema;
try {
  schema = readJson(path.join(__dirname, "..", "schemas", "recon.schema.json"));
  profile = readJson(file);
} catch (error) {
  process.stdout.write(`fail recon ${show(file)}: ${error.message}\n`);
  process.exit(1);
}

const errors = validateAgainst(schema, profile);

if (errors.length === 0) {
  const expected = [];
  if (profile.ai) expected.push("ai-llm");
  if (profile.agent_loop || profile.mcp) expected.push("agentic");
  if (profile.iac) expected.push("iac");
  if (profile.multi_tenant) expected.push("tenant-isolation");
  if (profile.publishes) expected.push("release-compliance");
  const listed = profile.modules.map((m) => m.name);
  for (const name of expected) if (!listed.includes(name)) errors.push(`modules: flag set but module ${name} is not listed`);
  for (const name of listed) if (!expected.includes(name)) errors.push(`modules: ${name} is listed but its flag is false`);
  if (new Set(listed).size !== listed.length) errors.push("modules: a module is listed twice");
  if (profile.agent_loop && !profile.ai) errors.push("agent_loop true requires ai true");

  const pathsToCheck = [
    ...profile.manifests.map((e) => e.path),
    ...profile.lockfiles.map((e) => e.path),
    ...profile.ci,
    ...profile.entry_points,
    ...profile.key_files.map((e) => e.path),
    ...Object.values(profile.sinks).flat(),
  ];
  if (profile.security_md) pathsToCheck.push(profile.security_md);
  for (const p of pathsToCheck) {
    if (safeRelativePath(p) === null) errors.push(`path ${show(p)} is not a safe repository-relative path`);
  }
}

finish("recon", file, errors);
