export type Bias = "long" | "short";

/** One closed candle, numbers already parsed. Times are epoch ms (UTC). */
export type Candle = {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
};

/** Optional trade plan attached to a rule. All prices are optional. */
export type Plan = {
  entryLow?: number | null;
  entryHigh?: number | null;
  sl?: number | null;
  tp1?: number | null;
  tp2?: number | null;
};

/**
 * close_below        prev close >= price and close < price  -> BREAKDOWN (short)
 * close_above        prev close <= price and close > price  -> BREAKOUT (long)
 *                    with wickZone: a low touched [low, high] within the last
 *                    `wickLookback` candles -> REJECTION DEMAND (long)
 * sweep_above_reject high > price and close < price          -> SWEEP + REJECTION (short)
 * sweep_below_reject low < price and close > price           -> SWEEP + REJECTION (long)
 */
export type LevelMode = "close_below" | "close_above" | "sweep_above_reject" | "sweep_below_reject";

export type Range = { low: number; high: number };

export type LevelRule = {
  id: string;
  kind: "level";
  enabled: boolean;
  label: string;
  price: number;
  mode: LevelMode;
  wickZone?: Range | null;
  wickLookback?: number;
  plan: Plan;
};

/**
 * A candle touches [low, high] and closes outside it with a wick >= minWickRatio
 * of the candle range. Close above + long lower wick = demand (long);
 * close below + long upper wick = supply (short).
 */
export type ZoneRule = {
  id: string;
  kind: "zone";
  enabled: boolean;
  label: string;
  low: number;
  high: number;
  minWickRatio: number;
  side: "both" | "demand" | "supply";
  plan: Plan;
};

export type Rule = LevelRule | ZoneRule;

export type CoinConfig = {
  symbol: string;
  enabled: boolean;
  rules: Rule[];
};

export type BotConfig = {
  coins: CoinConfig[];
  interval: "15m";
  /** Same alert (symbol + rule) is sent at most once per this many minutes. */
  cooldownMinutes: number;
  /** When true, no alerts are sent on Saturday and Sunday (WIB). Evaluation still runs. */
  pauseOnWeekend: boolean;
  /** How many candles after an alert to wait for TP1 or SL before marking it expired. */
  evalCandles: number;
  enableLevelAlerts: boolean;
  enableZoneAlerts: boolean;
  /** Append the R:R summary when the rule has entry/SL/TP. */
  enableRR: boolean;
  updatedAt?: number;
};

export type Signal = {
  symbol: string;
  interval: string;
  rule: Rule;
  title: string;
  bias: Bias;
  candle: Candle;
  /** Short human text describing the trigger, e.g. "Close: 68.010 (< 68.050)". */
  detail: string;
};

export type Outcome = "open" | "tp1" | "sl" | "both" | "expired" | "no_plan";

export type AlertRecord = {
  id: string;
  symbol: string;
  interval: string;
  ruleId: string;
  ruleKind: Rule["kind"];
  label: string;
  title: string;
  bias: Bias;
  /** The level or zone, as text, for the log. */
  trigger: string;
  close: number;
  candleOpenTime: number;
  candleCloseTime: number;
  createdAt: number;
  message: string;
  delivered: boolean;
  deliveryError?: string | null;
  notifier: string;
  plan: Plan;
  outcome: Outcome;
  outcomeAt?: number | null;
  candlesChecked?: number;
};
