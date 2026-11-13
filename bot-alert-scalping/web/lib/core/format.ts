import type { Bias, Plan, Signal } from "./types";

/** Indonesian number format: 68010 -> "68.010", 0.51234 -> "0,51234". */
export function fmtPrice(n: number): string {
  const abs = Math.abs(n);
  const max = abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
  return new Intl.NumberFormat("id-ID", { minimumFractionDigits: 0, maximumFractionDigits: max }).format(n);
}

export function fmtR(r: number): string {
  const rounded = Math.round(r * 10) / 10;
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(rounded)}R`;
}

/** "13 Nov 2026 22:45 WIB" in Asia/Jakarta. */
export function fmtWib(ms: number): string {
  const s = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
  return `${s.replace(/\./g, ":").replace(",", "")} WIB`;
}

const has = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v);

export function entryPrice(plan: Plan): number | null {
  const { entryLow: a, entryHigh: b } = plan;
  if (has(a) && has(b)) return (a + b) / 2;
  if (has(a)) return a;
  if (has(b)) return b;
  return null;
}

export type RR = {
  entry: number;
  risk: number;
  r1: number | null;
  r2: number | null;
  /** False when SL/TP are on the wrong side of the entry for the bias. */
  consistent: boolean;
};

/** Risk:reward from the plan. Null when entry or SL is missing. */
export function computeRR(plan: Plan, bias: Bias): RR | null {
  const entry = entryPrice(plan);
  if (entry === null || !has(plan.sl)) return null;
  const risk = Math.abs(entry - plan.sl);
  if (risk === 0) return null;
  const dir = bias === "long" ? 1 : -1;
  const slOk = (entry - plan.sl) * dir > 0;
  const tpOk = (tp: number | null | undefined) => !has(tp) || (tp - entry) * dir > 0;
  const r = (tp: number | null | undefined) => (has(tp) ? Math.abs(tp - entry) / risk : null);
  return { entry, risk, r1: r(plan.tp1), r2: r(plan.tp2), consistent: slOk && tpOk(plan.tp1) && tpOk(plan.tp2) };
}

export function formatMessage(sig: Signal, opts: { enableRR: boolean }): string {
  const emoji = sig.bias === "long" ? "🟢" : "🔴";
  const lines = [`${emoji} ${sig.symbol} ${sig.interval} — ${sig.title}`, sig.detail, `Waktu: ${fmtWib(sig.candle.closeTime + 1)}`];
  const p = sig.rule.plan;

  if (has(p.entryLow) || has(p.entryHigh)) {
    const range =
      has(p.entryLow) && has(p.entryHigh)
        ? `${fmtPrice(Math.min(p.entryLow, p.entryHigh))}-${fmtPrice(Math.max(p.entryLow, p.entryHigh))}`
        : fmtPrice((p.entryLow ?? p.entryHigh) as number);
    lines.push(`Rencana: retest ${range}`);
  }

  const rr = opts.enableRR ? computeRR(p, sig.bias) : null;
  const parts: string[] = [];
  if (has(p.sl)) parts.push(`SL ${fmtPrice(p.sl)}`);
  if (has(p.tp1)) parts.push(`TP1 ${fmtPrice(p.tp1)}${rr?.r1 != null ? ` (${fmtR(rr.r1)})` : ""}`);
  if (has(p.tp2)) parts.push(`TP2 ${fmtPrice(p.tp2)}${rr?.r2 != null ? ` (${fmtR(rr.r2)})` : ""}`);
  if (parts.length) lines.push(parts.join(" | "));
  if (rr && !rr.consistent) lines.push("⚠️ Cek SL/TP: arahnya tidak sesuai bias.");

  lines.push("⚠️ Konfirmasi manual sebelum entry.");
  return lines.join("\n");
}
