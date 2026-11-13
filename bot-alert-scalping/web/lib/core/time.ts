export const INTERVAL_MS: Record<string, number> = { "15m": 15 * 60_000 };

/** Next :00/:15/:30/:45 boundary plus `delayMs` (default 5 s). */
export function nextRunAt(now: number, intervalMs = INTERVAL_MS["15m"], delayMs = 5_000): number {
  const candidate = Math.floor(now / intervalMs) * intervalMs + delayMs;
  return candidate > now ? candidate : candidate + intervalMs;
}

export function isWeekendWib(ms: number): boolean {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Jakarta", weekday: "short" }).format(new Date(ms));
  return day === "Sat" || day === "Sun";
}
