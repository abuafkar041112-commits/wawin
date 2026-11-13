import fs from "node:fs"; import readline from "node:readline";
const [file, name] = process.argv.slice(2);
if (!file || !/^[A-Z0-9_]+$/.test(name || "")) { console.log("usage: node tools/set_env.mjs <env-file> <VARIABLE_NAME>  (A-Z, 0-9, _ only)"); process.exit(2); }
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
rl._writeToOutput = () => {};
process.stdout.write(`Paste the value for ${name} (nothing will show) and press Enter: `);
rl.question("", (v) => {
  rl.close(); process.stdout.write("\n");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const re = new RegExp(`^${name}=.*$`, "m");
  fs.writeFileSync(file, re.test(text) ? text.replace(re, () => `${name}=${v.trim()}`) : text + `\n${name}=${v.trim()}\n`);
  console.log(`${name} saved (${v.trim() ? `set, ${v.trim().length} characters` : "EMPTY - nothing was pasted, try again"}).`);
});
