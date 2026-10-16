#!/usr/bin/env node

const fs = require("node:fs");

function fail(message) {
  throw new Error(`Rule validation failed: ${message}`);
}

function compilePattern(source) {
  let pattern = source;
  let flags = "";
  if (pattern.startsWith("(?i)")) {
    pattern = pattern.slice(4);
    flags = "i";
  }
  return new RegExp(pattern, flags);
}

function validateRules(rules) {
  if (!Number.isInteger(rules.schema_version) || rules.schema_version < 1) fail("schema_version must be a positive integer");
  if (!rules.rule_set || typeof rules.rule_set !== "string") fail("rule_set must be a non-empty string");
  if (!Array.isArray(rules.venues) || !rules.venues.length) fail("venues must be a non-empty array");

  const ids = new Set();
  for (const [index, rule] of rules.venues.entries()) {
    const label = rule.id || `venues[${index}]`;
    if (!rule.id || typeof rule.id !== "string") fail(`${label}: id is required`);
    if (ids.has(rule.id)) fail(`${label}: duplicate id`);
    ids.add(rule.id);
    if (!rule.acronym || typeof rule.acronym !== "string") fail(`${label}: acronym is required`);
    if (!Number.isFinite(rule.priority)) fail(`${label}: priority must be numeric`);
    if (!Array.isArray(rule.item_types) || !rule.item_types.length) fail(`${label}: item_types must be non-empty`);
    if (![null, "A", "B", "C"].includes(rule.zju)) fail(`${label}: invalid ZJU grade`);
    if (![null, "A", "B", "C"].includes(rule.ccf)) fail(`${label}: invalid CCF grade`);

    const patterns = [...(rule.patterns || []), ...(rule.all_patterns || [])];
    if (!patterns.length) fail(`${label}: at least one match pattern is required`);
    for (const pattern of patterns) {
      if (typeof pattern !== "string" || !pattern) fail(`${label}: patterns must be non-empty strings`);
      try {
        compilePattern(pattern);
      }
      catch (error) {
        fail(`${label}: invalid pattern ${JSON.stringify(pattern)} (${error.message})`);
      }
    }
  }
}

function validateOverrides(overrides) {
  if (!Number.isInteger(overrides.schema_version) || overrides.schema_version < 1) fail("override schema_version must be a positive integer");
  if (!overrides.overrides || Array.isArray(overrides.overrides) || typeof overrides.overrides !== "object") {
    fail("overrides must be an object");
  }
  for (const [doi, track] of Object.entries(overrides.overrides)) {
    if (!doi.startsWith("10.")) fail(`invalid DOI override key ${JSON.stringify(doi)}`);
    if (typeof track !== "string" || !track.trim()) fail(`${doi}: track tag must be a non-empty string`);
  }
}

const [rulesPath, overridesPath, outputPath] = process.argv.slice(2);
if (!rulesPath || !overridesPath || !outputPath) {
  console.error("Usage: generate_plugin_rules.js RULES OVERRIDES OUTPUT");
  process.exit(2);
}

const data = {
  rules: JSON.parse(fs.readFileSync(rulesPath, "utf8")),
  overrides: JSON.parse(fs.readFileSync(overridesPath, "utf8"))
};
validateRules(data.rules);
validateOverrides(data.overrides);
const source = [
  `var ZoteroVenueTaggerRuleData = ${JSON.stringify(data, null, 2)};`,
  "if (typeof module !== \"undefined\" && module.exports) module.exports = ZoteroVenueTaggerRuleData;",
  ""
].join("\n");
fs.writeFileSync(outputPath, source, "utf8");
