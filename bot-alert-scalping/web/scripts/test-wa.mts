/** Sends one test message through the configured notifier.  npm run test:wa */
import { getNotifier } from "../lib/notify";

const n = getNotifier();
const res = await n.send(`✅ Tes Bot Alert Scalping\nNotifier: ${n.name}\nWaktu: ${new Date().toISOString()}`);
console.log(res.ok ? `OK: test message sent via ${n.name}` : `FAILED via ${n.name}: ${res.error}`);
if (n.name === "console") console.log("(No FONNTE_TOKEN/WA_TARGET set, so it was only printed above.)");
process.exit(res.ok ? 0 : 1);
