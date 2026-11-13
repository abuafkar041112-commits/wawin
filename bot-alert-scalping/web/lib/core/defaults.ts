import type { BotConfig } from "./types";

/** Starting config, taken from the examples in the brief. Edit in the dashboard. */
export const DEFAULT_CONFIG: BotConfig = {
  interval: "15m",
  cooldownMinutes: 60,
  pauseOnWeekend: false,
  evalCandles: 16,
  enableLevelAlerts: true,
  enableZoneAlerts: true,
  enableRR: true,
  coins: [
    {
      symbol: "BTCUSDT",
      enabled: true,
      rules: [
        {
          id: "btc-breakdown-68050",
          kind: "level",
          enabled: true,
          label: "Breakdown 68.050",
          price: 68050,
          mode: "close_below",
          plan: { entryLow: 68100, entryHigh: 68150, sl: 68450, tp1: 67800, tp2: 67570 },
        },
        {
          id: "btc-sweep-69150",
          kind: "level",
          enabled: true,
          label: "Sweep 69.150 lalu rejection (cek short)",
          price: 69150,
          mode: "sweep_above_reject",
          plan: {},
        },
      ],
    },
    {
      symbol: "ETHUSDT",
      enabled: true,
      rules: [
        {
          id: "eth-breakdown-1895",
          kind: "level",
          enabled: true,
          label: "Breakdown 1.895",
          price: 1895,
          mode: "close_below",
          plan: {},
        },
        {
          id: "eth-demand-1922",
          kind: "level",
          enabled: true,
          label: "Close > 1.922 setelah wick ke 1.900-1.910 (cek long)",
          price: 1922,
          mode: "close_above",
          wickZone: { low: 1900, high: 1910 },
          wickLookback: 3,
          plan: {},
        },
        {
          id: "eth-zone-1900",
          kind: "zone",
          enabled: false,
          label: "Zona demand 1.900-1.910",
          low: 1900,
          high: 1910,
          minWickRatio: 0.5,
          side: "both",
          plan: {},
        },
      ],
    },
    { symbol: "SOLUSDT", enabled: false, rules: [] },
    { symbol: "XRPUSDT", enabled: false, rules: [] },
    { symbol: "BNBUSDT", enabled: false, rules: [] },
  ],
};
