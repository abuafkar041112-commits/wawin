import type { AlertRecord, Candle, Outcome } from "./types";

export type EvalResult = { outcome: Outcome; outcomeAt: number | null; candlesChecked: number };

/**
 * Looks at the candles after the alert candle (at most `maxCandles`) and reports
 * which of TP1 or SL was touched first. Both in the same candle = "both"
 * (order inside a 15m candle is unknown). Measured from the alert candle's close,
 * not from a filled entry: this is a signal-quality check, not a trade result.
 */
export function evaluateAlert(alert: Pick<AlertRecord, "bias" | "plan" | "candleOpenTime">, candles: Candle[], maxCandles: number): EvalResult {
  const { sl, tp1 } = alert.plan;
  if (typeof sl !== "number" || typeof tp1 !== "number") return { outcome: "no_plan", outcomeAt: null, candlesChecked: 0 };

  const after = candles.filter((c) => c.openTime > alert.candleOpenTime).slice(0, maxCandles);
  const long = alert.bias === "long";
  for (const [i, c] of after.entries()) {
    const tpHit = long ? c.high >= tp1 : c.low <= tp1;
    const slHit = long ? c.low <= sl : c.high >= sl;
    if (tpHit && slHit) return { outcome: "both", outcomeAt: c.closeTime + 1, candlesChecked: i + 1 };
    if (tpHit) return { outcome: "tp1", outcomeAt: c.closeTime + 1, candlesChecked: i + 1 };
    if (slHit) return { outcome: "sl", outcomeAt: c.closeTime + 1, candlesChecked: i + 1 };
  }
  if (after.length >= maxCandles) return { outcome: "expired", outcomeAt: after.at(-1)!.closeTime + 1, candlesChecked: after.length };
  return { outcome: "open", outcomeAt: null, candlesChecked: after.length };
}

export type Stats = { total: number; tp1: number; sl: number; both: number; expired: number; open: number; noPlan: number; winRate: number | null };

/** Win rate = TP1 / (TP1 + SL). "both" and "expired" are shown but not counted. */
export function stats(alerts: Pick<AlertRecord, "outcome">[]): Stats {
  const s: Stats = { total: alerts.length, tp1: 0, sl: 0, both: 0, expired: 0, open: 0, noPlan: 0, winRate: null };
  for (const a of alerts) {
    if (a.outcome === "tp1") s.tp1++;
    else if (a.outcome === "sl") s.sl++;
    else if (a.outcome === "both") s.both++;
    else if (a.outcome === "expired") s.expired++;
    else if (a.outcome === "open") s.open++;
    else s.noPlan++;
  }
  s.winRate = s.tp1 + s.sl > 0 ? s.tp1 / (s.tp1 + s.sl) : null;
  return s;
}
