/**
 * Replays real Binance 15m candles through the same alert rules and evaluation
 * the live bot uses, without touching the store.
 *
 *   npm run historical -- [--limit 1000] [--symbols BTCUSDT,ETHUSDT] [--auto] [--send]
 *
 * --auto  adds one demo rule per coin (close_below at the median close of the window,
 *         with entry/SL/TP from the average candle range) so there is always
 *         something to see, whatever the current price.
 * --send  sends the LAST historical alert through the configured notifier
 *         (WhatsApp when FONNTE_TOKEN + WA_TARGET are set).
 */
import { closedOnly, fetchKlines } from "../lib/core/binance";
import { DEFAULT_CONFIG } from "../lib/core/defaults";
import { evaluateAlert, stats } from "../lib/core/evaluate";
import { fmtPrice, fmtWib, formatMessage } from "../lib/core/format";
import { evaluateCoin } from "../lib/core/rules";
import type { BotConfig, Candle, CoinConfig, Outcome, Signal } from "../lib/core/types";
import { getNotifier } from "../lib/notify";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const limit = Math.min(1000, Number(opt("limit") ?? 1000));
const cfg: BotConfig = structuredClone(DEFAULT_CONFIG);
const wanted = opt("symbols")?.split(",").map((s) => s.trim().toUpperCase());

function demoRule(symbol: string, candles: Candle[]): CoinConfig["rules"][number] {
  const closes = candles.map((c) => c.close).sort((a, b) => a - b);
  const level = closes[Math.floor(closes.length / 2)];
  const avgRange = candles.reduce((s, c) => s + (c.high - c.low), 0) / candles.length;
  const round = (n: number) => Number(n.toPrecision(6));
  return {
    id: `${symbol.toLowerCase()}-demo`,
    kind: "level",
    enabled: true,
    label: `DEMO breakdown median ${fmtPrice(round(level))}`,
    price: round(level),
    mode: "close_below",
    plan: { entryLow: round(level), entryHigh: round(level + avgRange * 0.3), sl: round(level + avgRange * 1.5), tp1: round(level - avgRange * 1.3), tp2: round(level - avgRange * 2.5) },
  };
}

type Hit = { sig: Signal; message: string; outcome: Outcome; candlesChecked: number };
const all: Hit[] = [];
const now = Date.now();

for (const coin of cfg.coins) {
  if (wanted ? !wanted.includes(coin.symbol) : !coin.enabled) continue;
  const candles = closedOnly(await fetchKlines(coin.symbol, cfg.interval, { limit }), now);
  if (candles.length < 3) continue;
  const testCoin: CoinConfig = { ...coin, enabled: true, rules: flag("auto") ? [...coin.rules, demoRule(coin.symbol, candles)] : coin.rules };

  console.log(`\n=== ${coin.symbol}: ${candles.length} candle ${fmtWib(candles[0].openTime)} → ${fmtWib(candles.at(-1)!.closeTime + 1)}`);
  console.log(`    range ${fmtPrice(Math.min(...candles.map((c) => c.low)))} – ${fmtPrice(Math.max(...candles.map((c) => c.high)))}`);

  const lastSent = new Map<string, number>();
  for (let i = 2; i <= candles.length; i++) {
    const window = candles.slice(0, i);
    for (const sig of evaluateCoin(testCoin, window, cfg)) {
      const t = sig.candle.closeTime;
      if (t - (lastSent.get(sig.rule.id) ?? -Infinity) < cfg.cooldownMinutes * 60_000) continue; // same anti-spam as live
      lastSent.set(sig.rule.id, t);
      const ev = evaluateAlert({ bias: sig.bias, plan: sig.rule.plan, candleOpenTime: sig.candle.openTime }, candles, cfg.evalCandles);
      all.push({ sig, message: formatMessage(sig, { enableRR: cfg.enableRR }), outcome: ev.outcome, candlesChecked: ev.candlesChecked });
    }
  }
  const mine = all.filter((h) => h.sig.symbol === coin.symbol);
  console.log(`    ${mine.length} alert`);
  for (const h of mine) console.log(`    ${fmtWib(h.sig.candle.closeTime + 1)}  ${h.sig.title.padEnd(18)} ${h.sig.rule.label}  →  ${h.outcome}${h.candlesChecked ? ` (${h.candlesChecked} candle)` : ""}`);
}

const s = stats(all.map((h) => ({ outcome: h.outcome })));
console.log(`\nTOTAL ${s.total} alert · TP1 ${s.tp1} · SL ${s.sl} · ambigu ${s.both} · kadaluarsa ${s.expired} · berjalan ${s.open} · tanpa plan ${s.noPlan} · win rate ${s.winRate === null ? "—" : `${Math.round(s.winRate * 100)}%`}`);

const last = all.at(-1);
if (last) {
  console.log(`\n--- Contoh pesan (alert historis terakhir) ---\n${last.message}\n---------------------------------------------`);
  if (flag("send")) {
    const n = getNotifier();
    const res = await n.send(`🧪 [UJI DATA HISTORIS]\n${last.message}`);
    console.log(res.ok ? `sent via ${n.name}` : `send FAILED via ${n.name}: ${res.error}`);
  }
} else {
  console.log("\nTidak ada alert di jendela data ini. Coba --auto untuk aturan demo.");
}
