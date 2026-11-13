/**
 * 24/7 scheduler for an always-on machine (VPS, home PC, Railway-like host):
 * runs a scan at every 15m close (:00/:15/:30/:45) + 5 s.
 *   npm run worker
 * Not needed on Vercel, where /api/cron/scan is called by a scheduler instead.
 */
import { fetchKlines } from "../lib/core/binance";
import { fmtWib } from "../lib/core/format";
import { runScan } from "../lib/core/scan";
import { nextRunAt } from "../lib/core/time";
import { getNotifier } from "../lib/notify";
import { getStore } from "../lib/store";

let stopping = false;
let timer: NodeJS.Timeout | undefined;

async function tick() {
  try {
    const s = await runScan({ store: await getStore(), notifier: getNotifier(), fetchKlines, source: "worker" });
    console.log(
      `[${fmtWib(s.at)}] scan ${s.ok ? "ok" : "ERROR"} · sent ${s.sent} · cooldown ${s.skippedCooldown} · evaluated ${s.evaluated}${s.paused ? " · weekend pause" : ""}`,
    );
    for (const e of s.errors) console.error(`  ! ${e}`);
  } catch (e) {
    console.error(`[${new Date().toISOString()}] scan crashed:`, e);
  }
}

function schedule() {
  if (stopping) return;
  const at = nextRunAt(Date.now());
  console.log(`next scan ${fmtWib(at)} (+5s)`);
  timer = setTimeout(async () => {
    await tick();
    schedule();
  }, at - Date.now());
}

for (const sig of ["SIGINT", "SIGTERM"] as const)
  process.on(sig, () => {
    stopping = true;
    clearTimeout(timer);
    console.log("worker stopped");
    process.exit(0);
  });

console.log(`worker started · notifier: ${getNotifier().name} · store: ${process.env.STORE || "file"}`);
await tick(); // catch up right away; duplicates are skipped per candle
schedule();
