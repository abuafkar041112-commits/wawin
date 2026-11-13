import type { Notifier } from "../notify";
import type { ScanSummary, Store } from "../store/types";
import { closedOnly, type FetchKlines } from "./binance";
import { evaluateAlert } from "./evaluate";
import { formatMessage } from "./format";
import { evaluateCoin, triggerText } from "./rules";
import { isWeekendWib } from "./time";
import type { AlertRecord } from "./types";

export type ScanDeps = { store: Store; notifier: Notifier; fetchKlines: FetchKlines; now?: () => number; source?: string };

/**
 * One pass: for every enabled coin, read the last closed candles, fire new
 * alerts (deduped per candle and throttled by cooldown), then check open
 * alerts for TP1/SL. Safe to call twice for the same candle.
 */
export async function runScan(deps: ScanDeps): Promise<ScanSummary> {
  const now = deps.now?.() ?? Date.now();
  const { store, notifier } = deps;
  const cfg = await store.getConfig();
  const paused = cfg.pauseOnWeekend && isWeekendWib(now);
  const summary: ScanSummary = { at: now, ok: true, source: deps.source ?? "manual", sent: 0, skippedCooldown: 0, evaluated: 0, paused, errors: [] };

  for (const coin of cfg.coins.filter((c) => c.enabled)) {
    try {
      const candles = closedOnly(await deps.fetchKlines(coin.symbol, cfg.interval, { limit: 200 }), now);
      const last = candles.at(-1);
      if (!last) continue;

      const procKey = `processed:${coin.symbol}:${cfg.interval}`;
      const lastProcessed = (await store.getMeta<number>(procKey)) ?? 0;

      if (!paused && last.openTime > lastProcessed) {
        for (const sig of evaluateCoin(coin, candles, cfg)) {
          const coolKey = `cooldown:${coin.symbol}:${sig.rule.id}`;
          const lastSent = (await store.getMeta<number>(coolKey)) ?? 0;
          if (now - lastSent < cfg.cooldownMinutes * 60_000) {
            summary.skippedCooldown++;
            continue;
          }
          const message = formatMessage(sig, { enableRR: cfg.enableRR });
          const plan = sig.rule.plan ?? {};
          const rec: AlertRecord = {
            id: `${coin.symbol}_${sig.rule.id}_${last.openTime}`,
            symbol: coin.symbol,
            interval: cfg.interval,
            ruleId: sig.rule.id,
            ruleKind: sig.rule.kind,
            label: sig.rule.label,
            title: sig.title,
            bias: sig.bias,
            trigger: triggerText(sig.rule),
            close: last.close,
            candleOpenTime: last.openTime,
            candleCloseTime: last.closeTime,
            createdAt: now,
            message,
            delivered: false,
            notifier: notifier.name,
            plan,
            outcome: typeof plan.sl === "number" && typeof plan.tp1 === "number" ? "open" : "no_plan",
            candlesChecked: 0,
          };
          // Claim first so a parallel scan (worker + cron) cannot send twice.
          if (!(await store.claimAlert(rec))) continue;
          await store.setMeta(coolKey, now);
          const res = await notifier.send(message);
          await store.updateAlert(rec.id, { delivered: res.ok, deliveryError: res.error ?? null });
          if (res.ok) summary.sent++;
          else summary.errors.push(`${coin.symbol}: ${res.error}`);
        }
      }
      await store.setMeta(procKey, Math.max(lastProcessed, last.openTime));

      // Outcome check for this coin's open alerts.
      for (const a of await store.listAlerts({ symbol: coin.symbol, outcome: "open" })) {
        const first = candles[0];
        const r =
          first && a.candleOpenTime < first.openTime
            ? { outcome: "expired" as const, outcomeAt: now, candlesChecked: a.candlesChecked ?? 0 }
            : evaluateAlert(a, candles, cfg.evalCandles);
        if (r.outcome !== a.outcome || r.candlesChecked !== a.candlesChecked) {
          await store.updateAlert(a.id, r);
          summary.evaluated++;
        }
      }
    } catch (e) {
      summary.ok = false;
      summary.errors.push(`${coin.symbol}: ${(e as Error).message}`);
    }
  }

  await store.setMeta("lastScan", summary);
  return summary;
}
