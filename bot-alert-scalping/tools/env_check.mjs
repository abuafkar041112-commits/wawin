import fs from "node:fs";
const file = process.argv[2];
if (!file || !fs.existsSync(file)) { console.log("usage: node tools/env_check.mjs <env-file>"); process.exit(2); }
for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) console.log(`${m[1]}: ${m[2].trim() ? "set" : "empty"}`);
}
