// Makes sure the dashboard login variables are usable, without ever printing them.
// - SESSION_SECRET missing or < 32 chars -> generated automatically (nothing to paste)
// - DASHBOARD_PASSWORD missing, < 8 chars, or with characters .env parsing changes -> asks (hidden), twice
// usage: node tools/setup_login.mjs <env-file> [--check | --reset]
//   --check  only report; exit code 1 when something is wrong
//   --reset  always ask for a new DASHBOARD_PASSWORD
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { randomBytes } from "node:crypto";

const [file, flag] = process.argv.slice(2);
if (!file) {
  console.log("usage: node tools/setup_login.mjs <env-file> [--check | --reset]");
  process.exit(2);
}
const abs = path.resolve(file);
let text = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";

const get = (name) => {
  const m = text.match(new RegExp(`^${name}=(.*)$`, "m"));
  return m ? m[1].trim().replace(/^"(.*)"$/, "$1") : "";
};
const put = (name, value) => {
  const re = new RegExp(`^${name}=.*$`, "m");
  const line = `${name}=${value}`;
  text = re.test(text) ? text.replace(re, () => line) : `${text.replace(/\s*$/, "")}\n${line}\n`;
  fs.writeFileSync(abs, text);
};

const pw = get("DASHBOARD_PASSWORD");
const secret = get("SESSION_SECRET");
// Characters that .env parsing can change: $ (variables), # (comments), quotes, backslash, spaces.
const BAD = /[$#"'`\\\s]/;
const pwProblem =
  flag === "--reset"
    ? "diminta reset"
    : !pw
      ? "kosong"
      : pw.length < 8
        ? `terlalu pendek (${pw.length} karakter, minimal 8)`
        : BAD.test(pw)
          ? "mengandung karakter yang bisa berubah saat dibaca server ($ # kutip \\ spasi)"
          : null;
const secretProblem = !secret ? "kosong" : secret.length < 32 ? `terlalu pendek (${secret.length} karakter, minimal 32)` : null;

console.log(`File env: ${abs} ${fs.existsSync(abs) ? "" : "(belum ada, akan dibuat)"}`);
console.log(`DASHBOARD_PASSWORD: ${pwProblem ?? `ok (${pw.length} karakter)`}`);
console.log(`SESSION_SECRET:     ${secretProblem ?? `ok (${secret.length} karakter)`}`);

if (!pwProblem && !secretProblem) process.exit(0);
if (flag === "--check") process.exit(1);

if (secretProblem) {
  put("SESSION_SECRET", randomBytes(32).toString("base64url"));
  console.log("SESSION_SECRET dibuat otomatis (43 karakter).");
}

if (!pwProblem) process.exit(0);

// One interface for every question, so typed-ahead or piped lines are not lost.
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: Boolean(process.stdin.isTTY) });
rl._writeToOutput = () => {}; // hide what is typed
const lines = rl[Symbol.asyncIterator]();
async function askHidden(question) {
  process.stdout.write(question);
  const { value, done } = await lines.next();
  process.stdout.write("\n");
  if (done) {
    console.log("Input berakhir.");
    process.exit(1);
  }
  return String(value).trim();
}

for (let attempt = 1; attempt <= 3; attempt++) {
  const a = await askHidden("Ketik password dashboard baru (min 8 karakter; huruf, angka, boleh ! @ % - _ .; tidak akan tampil) lalu Enter: ");
  if (a.length < 8 || BAD.test(a)) {
    console.log(BAD.test(a) ? "Jangan pakai $ # tanda kutip \\ atau spasi. Coba lagi." : `Hanya ${a.length} karakter. Minimal 8. Coba lagi.`);
    continue;
  }
  const b = await askHidden("Ketik sekali lagi untuk konfirmasi: ");
  if (a !== b) {
    console.log("Tidak sama. Coba lagi.");
    continue;
  }
  put("DASHBOARD_PASSWORD", a);
  console.log(`DASHBOARD_PASSWORD tersimpan (${a.length} karakter).`);
  process.exit(0);
}
console.log("Password belum tersimpan.");
process.exit(1);
