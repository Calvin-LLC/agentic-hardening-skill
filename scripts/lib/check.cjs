"use strict";

const fs = require("node:fs");
const crypto = require("node:crypto");
const { TextDecoder } = require("node:util");

const LIMITS = Object.freeze({ inputBytes: 5 * 1024 * 1024, depth: 64, errors: 100, text: 4096 });
const UNSAFE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu;

function show(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  const clipped = String(text).length > 120 ? `${String(text).slice(0, 120)}...` : String(text);
  return clipped.replace(UNSAFE, (c) => `\\u${c.codePointAt(0).toString(16).padStart(4, "0")}`);
}

function nestingDepth(text) {
  let depth = 0;
  let max = 0;
  let inString = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (c === "\\") i++;
      else if (c === '"') inString = false;
    } else if (c === '"') inString = true;
    else if (c === "{" || c === "[") max = Math.max(max, ++depth);
    else if (c === "}" || c === "]") depth--;
  }
  return max;
}

function readJson(file) {
  const stat = fs.statSync(file);
  if (!stat.isFile()) throw new Error(`${show(file)} is not a regular file`);
  if (stat.size > LIMITS.inputBytes) throw new Error(`${show(file)} is ${stat.size} bytes; limit is ${LIMITS.inputBytes}`);
  const text = new TextDecoder("utf-8", { fatal: true }).decode(fs.readFileSync(file));
  if (nestingDepth(text) > LIMITS.depth) throw new Error(`${show(file)} nests deeper than ${LIMITS.depth} levels`);
  return JSON.parse(text);
}

function typeOf(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function matchesType(value, type) {
  const actual = typeOf(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "number") return actual === "number" && Number.isFinite(value);
  return actual === type;
}

function resolveRef(root, ref) {
  if (!ref.startsWith("#/")) throw new Error(`unsupported $ref ${ref}`);
  return ref.slice(2).split("/").reduce((node, key) => node[key], root);
}

function checkSchema(root, schema, value, at, errors) {
  if (errors.length >= LIMITS.errors) return;
  if (schema.$ref) return checkSchema(root, resolveRef(root, schema.$ref), value, at, errors);
  const push = (message) => {
    if (errors.length < LIMITS.errors) errors.push(`${at}: ${message}`);
  };
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesType(value, t))) return push(`expected ${types.join("|")}, got ${typeOf(value)}`);
  }
  if (schema.enum && !schema.enum.includes(value)) push(`${show(value)} is not one of ${schema.enum.map(show).join(", ")}`);
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) push(`shorter than ${schema.minLength}`);
    if (schema.maxLength !== undefined && value.length > schema.maxLength) push(`longer than ${schema.maxLength}`);
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) push(`${show(value)} does not match ${schema.pattern}`);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) push(`fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) push(`more than ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map((v) => JSON.stringify(v))).size !== value.length) push("items are not unique");
    if (schema.items) value.forEach((item, i) => checkSchema(root, schema.items, item, `${at}[${i}]`, errors));
  }
  if (typeOf(value) === "object") {
    for (const key of schema.required || []) {
      if (!Object.hasOwn(value, key)) push(`missing required key ${key}`);
    }
    const props = schema.properties || {};
    for (const [key, child] of Object.entries(value)) {
      if (Object.hasOwn(props, key)) checkSchema(root, props[key], child, `${at}.${key}`, errors);
      else if (schema.additionalProperties === false) push(`unexpected key ${show(key)}`);
      else if (typeof schema.additionalProperties === "object") checkSchema(root, schema.additionalProperties, child, `${at}.${key}`, errors);
    }
  }
}

function validateAgainst(schema, value) {
  const errors = [];
  checkSchema(schema, schema, value, "$", errors);
  return errors;
}

function safeRelativePath(entry) {
  const file = String(entry).replace(/:\d+(-\d+)?$/, "");
  if (!file || file.startsWith("/") || /^[A-Za-z]:/.test(file) || file.split("/").includes("..") || /[\p{Cc}\\]/u.test(file)) return null;
  return file;
}

function finish(label, file, errors) {
  if (errors.length === 0) {
    process.stdout.write(`ok ${label} ${file}\n`);
    process.exit(0);
  }
  for (const line of errors.slice(0, LIMITS.errors)) process.stdout.write(`${line}\n`);
  process.stdout.write(`fail ${label} ${file} (${errors.length} error${errors.length === 1 ? "" : "s"})\n`);
  process.exit(1);
}

function blobSha(content) {
  const hash = crypto.createHash("sha1");
  hash.update(`blob ${content.length}\0`);
  hash.update(content);
  return hash.digest("hex");
}

function priorStatuses(prior, root) {
  const path = require("node:path");
  const sameSource = (unit) =>
    unit.deleted_paths.length === 0 &&
    unit.reviewed_paths.every((p) => {
      try {
        const full = path.join(root, p);
        return fs.lstatSync(full).isFile() && blobSha(fs.readFileSync(full)) === unit.evidence_hash[p];
      } catch {
        return false;
      }
    });
  const out = {};
  const counts = { same_source: 0, changed_source: 0, carried: 0 };
  for (const u of prior.units) {
    let status = "none";
    if (u.status === "covered" || u.status === "candidate" || u.status === "not_applicable") {
      const same = sameSource(u);
      const kind = { covered: "covered", candidate: "open", not_applicable: "not_applicable" }[u.status];
      status = `prior_${kind}_${same ? "same" : "changed"}_source`;
      counts[same ? "same_source" : "changed_source"]++;
    } else if (u.status === "blocked" || u.status === "deferred") {
      status = `prior_${u.status}`;
      counts.carried++;
    }
    out[u.control] = { prior_status: status, fingerprints: u.fingerprints, reviewed_paths: u.reviewed_paths };
  }
  return { out, counts };
}

module.exports = { priorStatuses, blobSha, LIMITS, readJson, validateAgainst, safeRelativePath, show, finish };
