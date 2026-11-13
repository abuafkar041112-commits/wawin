// Copies project_id, client_email, private_key from a Firebase service-account JSON
// into the env file WITHOUT printing them, then deletes the JSON.
// usage: node tools/firebase_key_to_env.mjs <service-account.json> <env-file>
import fs from "node:fs";
const [json, envFile] = process.argv.slice(2);
if (!json || !envFile || !fs.existsSync(json)) { console.log("usage: node tools/firebase_key_to_env.mjs <service-account.json> <env-file>"); process.exit(2); }
const sa = JSON.parse(fs.readFileSync(json, "utf8"));
let text = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
const put = (name, value) => {
  const line = `${name}=${JSON.stringify(value)}`;
  const re = new RegExp(`^${name}=.*$`, "m");
  text = re.test(text) ? text.replace(re, () => line) : `${text}\n${line}\n`;
};
put("FIREBASE_ADMIN_PROJECT_ID", sa.project_id);
put("FIREBASE_ADMIN_CLIENT_EMAIL", sa.client_email);
put("FIREBASE_ADMIN_PRIVATE_KEY", sa.private_key.replace(/\n/g, "\\n"));
fs.writeFileSync(envFile, text);
fs.rmSync(json);
console.log("FIREBASE_ADMIN_* saved (values not shown). Service-account JSON deleted.");
