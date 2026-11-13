import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../lib/core/defaults";
import { evaluateAlert, stats } from "../lib/core/evaluate";
import { computeRR, fmtPrice, formatMessage } from "../lib/core/format";
import { checkLevel, checkZone, evaluateCoin } from "../lib/core/rules";
import { runScan } from "../lib/core/scan";
import { isWeekendWib, nextRunAt } from "../lib/core/time";
import type { BotConfig, Candle, LevelRule, ZoneRule } from "../lib/core/types";
import { ConsoleNotifier } from "../lib/notify";
import { FileStore } from "../lib/store/file";

const M15 = 15 * 60_000;
const T0 = Date.UTC(2026, 10, 13, 15, 0); // Fri 13 Nov 2026 22:00 WIB
const c = (i: number, o: number, h: number, l: number, cl: number): Candle => ({
  openTime: T0 + i * M15,
  open: o,
  high: h,
  low: l,
  close: cl,
  volume: 1,
  closeTime: T0 + (i + 1) * M15 - 1,
});

const breakdown = DEFAULT_CONFIG.coins[0].rules[0] as LevelRule;

describe("format", () => {
  it("formats prices the Indonesian way", () => {
    expect(fmtPrice(68010)).toBe("68.010");
    expect(fmtPrice(1895)).toBe("1.895");
    expect(fmtPrice(0.51234)).toBe("0,51234");
  });

  it("computes R:R from the brief example (TP1 = 1R)", () => {
    const rr = computeRR(breakdown.plan, "short")!;
    expect(rr.entry).toBe(68125);
    expect(rr.r1).toBeCloseTo(1, 5);
    expect(rr.consistent).toBe(true);
    expect(computeRR({ entryLow: 100, sl: 90, tp1: 95 }, "long")!.consistent).toBe(false);
    expect(computeRR({ tp1: 1 }, "long")).toBeNull();
  });

  it("builds the message in the brief's format", () => {
    const candles = [c(0, 68100, 68200, 68060, 68080), c(1, 68080, 68100, 67990, 68010)];
    const [sig] = evaluateCoin(DEFAULT_CONFIG.coins[0], candles, DEFAULT_CONFIG);
    const msg = formatMessage(sig, { enableRR: true });
    expect(msg).toContain("🔴 BTCUSDT 15m — BREAKDOWN");
    expect(msg).toContain("Close: 68.010 (< 68.050)");
    expect(msg).toContain("WIB");
    expect(msg).toContain("Rencana: retest 68.100-68.150");
    expect(msg).toContain("SL 68.450 | TP1 67.800 (1R) | TP2 67.570 (1,7R)");
    expect(msg).toContain("⚠️ Konfirmasi manual sebelum entry.");
  });
});

describe("level rules", () => {
  it("close_below fires only on the crossing candle", () => {
    expect(checkLevel(breakdown, [c(0, 1, 1, 1, 68100), c(1, 1, 1, 1, 68000)])?.title).toBe("BREAKDOWN");
    expect(checkLevel(breakdown, [c(0, 1, 1, 1, 68000), c(1, 1, 1, 1, 67900)])).toBeNull();
  });

  it("close_above with wick zone needs a wick into the zone", () => {
    const rule = DEFAULT_CONFIG.coins[1].rules[1] as LevelRule;
    const withWick = [c(0, 1915, 1918, 1905, 1912), c(1, 1912, 1925, 1910, 1923)];
    const noWick = [c(0, 1915, 1918, 1913, 1916), c(1, 1916, 1925, 1915, 1923)];
    expect(checkLevel(rule, withWick)?.title).toBe("REJECTION DEMAND");
    expect(checkLevel(rule, noWick)).toBeNull();
  });

  it("sweep_above_reject fires when price pokes above and closes back below", () => {
    const rule = DEFAULT_CONFIG.coins[0].rules[1] as LevelRule;
    expect(checkLevel(rule, [c(0, 1, 1, 1, 69000), c(1, 69050, 69200, 69000, 69080)])?.bias).toBe("short");
    expect(checkLevel(rule, [c(0, 1, 1, 1, 69000), c(1, 69050, 69200, 69000, 69160)])).toBeNull();
  });
});

describe("zone rule", () => {
  const zone: ZoneRule = { id: "z", kind: "zone", enabled: true, label: "z", low: 100, high: 110, minWickRatio: 0.5, side: "both", plan: {} };
  it("demand: touches zone, closes above it, lower wick >= 50%", () => {
    expect(checkZone(zone, c(0, 112, 114, 102, 113))?.title).toBe("REJECTION DEMAND");
  });
  it("supply: touches zone, closes below it, upper wick >= 50%", () => {
    expect(checkZone(zone, c(0, 98, 108, 96, 97))?.title).toBe("REJECTION SUPPLY");
  });
  it("ignores a small wick or a close inside the zone", () => {
    expect(checkZone(zone, c(0, 105, 116, 104, 115))).toBeNull();
    expect(checkZone(zone, c(0, 108, 112, 101, 109))).toBeNull();
  });
});

describe("evaluation", () => {
  const alert = { bias: "short" as const, plan: { sl: 68450, tp1: 67800 }, candleOpenTime: T0 };
  it("reports TP1 first", () => {
    expect(evaluateAlert(alert, [c(0, 0, 0, 0, 0), c(1, 68000, 68100, 67950, 68000), c(2, 68000, 68050, 67790, 67850)], 16).outcome).toBe("tp1");
  });
  it("reports SL first", () => {
    expect(evaluateAlert(alert, [c(1, 68000, 68460, 67950, 68400)], 16).outcome).toBe("sl");
  });
  it("both in one candle, expiry, and still open", () => {
    expect(evaluateAlert(alert, [c(1, 68000, 68500, 67700, 68000)], 16).outcome).toBe("both");
    expect(evaluateAlert(alert, [c(1, 68000, 68100, 67950, 68000)], 1).outcome).toBe("expired");
    expect(evaluateAlert(alert, [c(1, 68000, 68100, 67950, 68000)], 16).outcome).toBe("open");
  });
  it("win rate counts TP1 vs SL only", () => {
    const s = stats([{ outcome: "tp1" }, { outcome: "tp1" }, { outcome: "sl" }, { outcome: "both" }, { outcome: "open" }]);
    expect(s.winRate).toBeCloseTo(2 / 3);
  });
});

describe("time", () => {
  it("next run is the next quarter hour + 5 s", () => {
    expect(nextRunAt(T0 + 60_000)).toBe(T0 + M15 + 5_000);
    expect(nextRunAt(T0 + 1_000)).toBe(T0 + 5_000);
  });
  it("weekend in WIB", () => {
    expect(isWeekendWib(T0)).toBe(false);
    expect(isWeekendWib(Date.UTC(2026, 10, 13, 17, 30))).toBe(true); // Sat 00:30 WIB
  });
});

describe("scan", () => {
  it("sends once per candle, respects cooldown, then evaluates", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "bot-"));
    const store = new FileStore(dir);
    const cfg: BotConfig = structuredClone(DEFAULT_CONFIG);
    cfg.coins = [cfg.coins[0]];
    await store.saveConfig(cfg);
    const notifier = new ConsoleNotifier();
    let candles = [c(0, 68100, 68200, 68060, 68080), c(1, 68080, 68100, 67990, 68010), c(2, 0, 0, 0, 0)];
    const fetchKlines = async () => candles;
    const now = () => T0 + 2 * M15 + 5_000; // candle 2 still forming

    const s1 = await runScan({ store, notifier, fetchKlines, now });
    expect(s1.sent).toBe(1);
    expect(notifier.sent[0]).toContain("BREAKDOWN");
    const s2 = await runScan({ store, notifier, fetchKlines, now });
    expect(s2.sent).toBe(0); // same candle

    // Later: price drops to TP1.
    candles = [...candles.slice(0, 2), c(2, 68010, 68050, 67790, 67850), c(3, 0, 0, 0, 0)];
    await runScan({ store, notifier, fetchKlines, now: () => T0 + 3 * M15 + 5_000 });
    const [a] = await store.listAlerts();
    expect(a.outcome).toBe("tp1");
    expect(a.delivered).toBe(true);
  });
});

describe("config validation", () => {
  it("accepts the default config and explains bad input in plain words", async () => {
    const { parseConfig } = await import("../lib/schema");
    expect(parseConfig(DEFAULT_CONFIG).ok).toBe(true);
    const bad = structuredClone(DEFAULT_CONFIG) as unknown as { coins: { rules: Record<string, unknown>[] }[] };
    bad.coins[0].rules.push({ id: "z1", kind: "zone", enabled: true, label: "Zona baru", low: null, high: null, minWickRatio: 0.5, side: "both", plan: {} });
    const r = parseConfig(bad);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("BTCUSDT · Zona baru · Batas bawah: wajib diisi angka");
  });
});
