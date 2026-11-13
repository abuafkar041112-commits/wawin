import { z } from "zod";
import type { BotConfig } from "./core/types";

const price = z.number({ error: "wajib diisi angka" }).finite().positive({ error: "harus lebih dari 0" });
const optPrice = price.nullish();
const plan = z.object({ entryLow: optPrice, entryHigh: optPrice, sl: optPrice, tp1: optPrice, tp2: optPrice });
const id = z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/, "id: huruf, angka, - atau _");
const label = z.string().trim().max(120);

const level = z.object({
  id,
  kind: z.literal("level"),
  enabled: z.boolean(),
  label,
  price,
  mode: z.enum(["close_below", "close_above", "sweep_above_reject", "sweep_below_reject"]),
  wickZone: z.object({ low: price, high: price }).nullish(),
  wickLookback: z.number().int().min(1).max(10).optional(),
  plan,
});

const zone = z
  .object({
    id,
    kind: z.literal("zone"),
    enabled: z.boolean(),
    label,
    low: price,
    high: price,
    minWickRatio: z.number().min(0.1).max(0.95),
    side: z.enum(["both", "demand", "supply"]),
    plan,
  })
  .refine((r) => r.low < r.high, "Zona: batas bawah harus lebih kecil dari batas atas");

export const configSchema = z
  .object({
    interval: z.literal("15m"),
    cooldownMinutes: z.number().int().min(15).max(24 * 60),
    pauseOnWeekend: z.boolean(),
    evalCandles: z.number().int().min(1).max(150),
    enableLevelAlerts: z.boolean(),
    enableZoneAlerts: z.boolean(),
    enableRR: z.boolean(),
    coins: z
      .array(
        z.object({
          symbol: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{5,20}$/, "Simbol seperti BTCUSDT"),
          enabled: z.boolean(),
          rules: z.array(z.discriminatedUnion("kind", [level, zone])).max(30),
        }),
      )
      .min(1)
      .max(10),
  })
  .superRefine((cfg, ctx) => {
    const syms = new Set<string>();
    for (const coin of cfg.coins) {
      if (syms.has(coin.symbol)) ctx.addIssue({ code: "custom", message: `Koin ganda: ${coin.symbol}` });
      syms.add(coin.symbol);
      const ids = new Set<string>();
      for (const r of coin.rules) {
        if (ids.has(r.id)) ctx.addIssue({ code: "custom", message: `${coin.symbol}: id aturan ganda "${r.id}"` });
        ids.add(r.id);
      }
    }
  });

const FIELD: Record<string, string> = {
  price: "Level harga",
  low: "Batas bawah",
  high: "Batas atas",
  entryLow: "Entry bawah",
  entryHigh: "Entry atas",
  sl: "SL",
  tp1: "TP1",
  tp2: "TP2",
  label: "Nama",
  symbol: "Simbol",
};

/** "BTCUSDT · Zona baru · Batas bawah: wajib diisi angka" instead of a raw path. */
function describe(input: unknown, path: PropertyKey[]): string {
  const parts: string[] = [];
  let node: unknown = input;
  for (const key of path) {
    node = (node as Record<PropertyKey, unknown> | undefined)?.[key];
    const n = node as { symbol?: string; label?: string; kind?: string } | undefined;
    if (n && typeof n === "object" && n.symbol) parts.push(n.symbol);
    else if (n && typeof n === "object" && n.kind) parts.push(n.label || (n.kind === "zone" ? "Zona" : "Level"));
  }
  const last = String(path.at(-1) ?? "");
  if (FIELD[last]) parts.push(FIELD[last]);
  return parts.join(" · ");
}

export function parseConfig(input: unknown): { ok: true; config: BotConfig } | { ok: false; error: string } {
  const r = configSchema.safeParse(input);
  if (r.success) return { ok: true, config: r.data as BotConfig };
  const msgs = r.error.issues.map((i) => {
    const where = describe(input, i.path);
    return where ? `${where}: ${i.message}` : i.message;
  });
  return { ok: false, error: [...new Set(msgs)].slice(0, 5).join("; ") };
}
