import type { Candle } from "./types";

/**
 * Public market data only, no API key. api.binance.com answers HTTP 451 from
 * some locations (seen from a US server on 2026-11-13), data-api.binance.vision
 * did not, so it is tried first. Override with BINANCE_BASE_URLS (comma list).
 */
const DEFAULT_BASES = ["https://data-api.binance.vision", "https://api.binance.com"];

function bases(): string[] {
  const env = process.env.BINANCE_BASE_URLS;
  return env ? env.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_BASES;
}

type RawKline = [number, string, string, string, string, string, number, ...unknown[]];

export function parseKlines(raw: RawKline[]): Candle[] {
  return raw.map((k) => ({
    openTime: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
    closeTime: Number(k[6]),
  }));
}

/** Drops the candle that is still forming (closeTime in the future). */
export function closedOnly(candles: Candle[], now: number): Candle[] {
  return candles.filter((c) => c.closeTime < now);
}

export type FetchKlines = (symbol: string, interval: string, opts?: { limit?: number; startTime?: number; endTime?: number }) => Promise<Candle[]>;

export const fetchKlines: FetchKlines = async (symbol, interval, opts = {}) => {
  const qs = new URLSearchParams({ symbol, interval, limit: String(opts.limit ?? 200) });
  if (opts.startTime) qs.set("startTime", String(opts.startTime));
  if (opts.endTime) qs.set("endTime", String(opts.endTime));
  const errors: string[] = [];
  for (const base of bases()) {
    try {
      const res = await fetch(`${base}/api/v3/klines?${qs}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        errors.push(`${base}: HTTP ${res.status}`);
        continue;
      }
      return parseKlines((await res.json()) as RawKline[]);
    } catch (e) {
      errors.push(`${base}: ${(e as Error).message}`);
    }
  }
  throw new Error(`Binance klines ${symbol} failed: ${errors.join("; ")}`);
};
