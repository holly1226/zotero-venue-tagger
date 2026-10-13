#!/usr/bin/env node

const fs = require("node:fs");

const [rulesPath, overridesPath, outputPath] = process.argv.slice(2);
if (!rulesPath || !overridesPath || !outputPath) {
  console.error("Usage: generate_plugin_rules.js RULES OVERRIDES OUTPUT");
  process.exit(2);
}

const data = {
  rules: JSON.parse(fs.readFileSync(rulesPath, "utf8")),
  overrides: JSON.parse(fs.readFileSync(overridesPath, "utf8"))
};
const source = [
  `var ZoteroVenueTaggerRuleData = ${JSON.stringify(data, null, 2)};`,
  "if (typeof module !== \"undefined\" && module.exports) module.exports = ZoteroVenueTaggerRuleData;",
  ""
].join("\n");
fs.writeFileSync(outputPath, source, "utf8");
