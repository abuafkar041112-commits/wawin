import { fmtPrice } from "./format";
import type { BotConfig, Candle, CoinConfig, LevelRule, Signal, ZoneRule } from "./types";

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function checkLevel(rule: LevelRule, candles: Candle[]): Omit<Signal, "symbol" | "interval" | "rule" | "candle"> | null {
  const cur = candles.at(-1);
  const prev = candles.at(-2);
  if (!cur || !prev) return null;
  const L = rule.price;

  switch (rule.mode) {
    case "close_below":
      if (prev.close >= L && cur.close < L)
        return { title: "BREAKDOWN", bias: "short", detail: `Close: ${fmtPrice(cur.close)} (< ${fmtPrice(L)})` };
      return null;

    case "close_above": {
      if (!(prev.close <= L && cur.close > L)) return null;
      if (rule.wickZone) {
        const z = rule.wickZone;
        const look = Math.max(1, rule.wickLookback ?? 3);
        const recent = candles.slice(-look);
        const touched = recent.some((c) => c.low <= z.high && c.low >= z.low);
        if (!touched) return null;
        return {
          title: "REJECTION DEMAND",
          bias: "long",
          detail: `Close: ${fmtPrice(cur.close)} (> ${fmtPrice(L)}) setelah wick ke ${fmtPrice(z.low)}-${fmtPrice(z.high)}`,
        };
      }
      return { title: "BREAKOUT", bias: "long", detail: `Close: ${fmtPrice(cur.close)} (> ${fmtPrice(L)})` };
    }

    case "sweep_above_reject":
      if (cur.high > L && cur.close < L)
        return {
          title: "SWEEP & REJECTION",
          bias: "short",
          detail: `High: ${fmtPrice(cur.high)} (> ${fmtPrice(L)}), close ${fmtPrice(cur.close)} kembali di bawah`,
        };
      return null;

    case "sweep_below_reject":
      if (cur.low < L && cur.close > L)
        return {
          title: "SWEEP & REJECTION",
          bias: "long",
          detail: `Low: ${fmtPrice(cur.low)} (< ${fmtPrice(L)}), close ${fmtPrice(cur.close)} kembali di atas`,
        };
      return null;
  }
}

export function checkZone(rule: ZoneRule, c: Candle): Omit<Signal, "symbol" | "interval" | "rule" | "candle"> | null {
  const low = Math.min(rule.low, rule.high);
  const high = Math.max(rule.low, rule.high);
  const range = c.high - c.low;
  if (range <= 0) return null;
  const touched = c.high >= low && c.low <= high;
  if (!touched) return null;

  const lowerWick = (Math.min(c.open, c.close) - c.low) / range;
  const upperWick = (c.high - Math.max(c.open, c.close)) / range;
  const zone = `${fmtPrice(low)}-${fmtPrice(high)}`;

  if (c.close > high && lowerWick >= rule.minWickRatio && rule.side !== "supply")
    return {
      title: "REJECTION DEMAND",
      bias: "long",
      detail: `Close: ${fmtPrice(c.close)} di atas zona ${zone} · wick bawah ${pct(lowerWick)}`,
    };
  if (c.close < low && upperWick >= rule.minWickRatio && rule.side !== "demand")
    return {
      title: "REJECTION SUPPLY",
      bias: "short",
      detail: `Close: ${fmtPrice(c.close)} di bawah zona ${zone} · wick atas ${pct(upperWick)}`,
    };
  return null;
}

/** Run every enabled rule of one coin against the last closed candle. */
export function evaluateCoin(coin: CoinConfig, candles: Candle[], cfg: BotConfig): Signal[] {
  const cur = candles.at(-1);
  if (!cur || !coin.enabled) return [];
  const out: Signal[] = [];
  for (const rule of coin.rules) {
    if (!rule.enabled) continue;
    let hit = null;
    if (rule.kind === "level" && cfg.enableLevelAlerts) hit = checkLevel(rule, candles);
    if (rule.kind === "zone" && cfg.enableZoneAlerts) hit = checkZone(rule, cur);
    if (hit) out.push({ ...hit, symbol: coin.symbol, interval: cfg.interval, rule, candle: cur });
  }
  return out;
}

export function triggerText(rule: LevelRule | ZoneRule): string {
  return rule.kind === "level"
    ? `${rule.mode} ${fmtPrice(rule.price)}${rule.wickZone ? ` (wick ${fmtPrice(rule.wickZone.low)}-${fmtPrice(rule.wickZone.high)})` : ""}`
    : `zona ${fmtPrice(Math.min(rule.low, rule.high))}-${fmtPrice(Math.max(rule.low, rule.high))}`;
}
