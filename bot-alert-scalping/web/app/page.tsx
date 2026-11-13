import Link from "next/link";
import { Suspense } from "react";
import { ActionButtons } from "@/components/action-buttons";
import { AlertTable } from "@/components/alert-table";
import { Shell } from "@/components/shell";
import { Badge, Card, Stat } from "@/components/ui";
import { stats } from "@/lib/core/evaluate";
import { fmtPrice, fmtWib } from "@/lib/core/format";
import { getNotifier } from "@/lib/notify";
import { requireSession } from "@/lib/session";
import { getStore, type ScanSummary } from "@/lib/store";

export default function Page() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-muted">Memuat dashboard…</p>}>
        <Dashboard />
      </Suspense>
    </Shell>
  );
}

function notifierName() {
  try {
    return getNotifier().name;
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}

/** No scan in the last 35 minutes means the scheduler is not running. */
function isStale(lastScan: ScanSummary | null) {
  return !lastScan || Date.now() - lastScan.at > 35 * 60_000;
}

async function Dashboard() {
  await requireSession();
  const store = await getStore();
  const [cfg, alerts, lastScan] = await Promise.all([store.getConfig(), store.listAlerts(), store.getMeta<ScanSummary>("lastScan")]);
  const s = stats(alerts);
  const notifier = notifierName();
  const coins = cfg.coins.filter((c) => c.enabled);
  const stale = isStale(lastScan);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">
            Pantau {coins.map((c) => c.symbol).join(", ") || "—"} · timeframe {cfg.interval} · cek tiap close candle
          </p>
        </div>
        <ActionButtons />
      </header>

      {notifier === "console" && (
        <p className="rounded-lg border border-accent/40 bg-accent/10 p-3 text-sm text-accent">
          WhatsApp belum disambungkan: alert hanya tercatat di log server. Isi FONNTE_TOKEN dan WA_TARGET (lihat panduan setup).
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="Scan terakhir"
          value={lastScan ? fmtWib(lastScan.at).replace(/^\d+ \w+ \d+ /, "") : "belum"}
          hint={lastScan ? `${lastScan.source} · ${lastScan.ok ? "ok" : "ada error"}${stale ? " · terlambat" : ""}` : "jalankan worker / cron"}
          tone={!lastScan || stale || !lastScan.ok ? "short" : "long"}
        />
        <Stat label="Notifier" value={notifier.startsWith("error") ? "error" : notifier} hint={notifier.startsWith("error") ? notifier : cfg.pauseOnWeekend ? "jeda saat weekend" : "aktif 7 hari"} />
        <Stat label="Win rate TP1 vs SL" value={s.winRate === null ? "—" : `${Math.round(s.winRate * 100)}%`} hint={`${s.tp1} TP1 · ${s.sl} SL`} tone="accent" />
        <Stat label="Total alert" value={s.total} hint={`${s.open} berjalan · ${s.both} ambigu · ${s.expired} kadaluarsa`} />
      </div>

      {lastScan && lastScan.errors.length > 0 && (
        <Card title="Error scan terakhir">
          <ul className="space-y-1 font-mono text-xs text-short">
            {lastScan.errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Aturan aktif" action={<Link href="/settings" className="text-sm text-accent hover:underline">Ubah</Link>}>
        {coins.length === 0 ? (
          <p className="text-sm text-muted">Belum ada koin aktif.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {coins.map((c) => (
              <div key={c.symbol} className="rounded-lg border border-border bg-panel-2 p-3">
                <div className="mb-2 font-mono font-semibold">{c.symbol}</div>
                <ul className="space-y-1.5 text-sm">
                  {c.rules.filter((r) => r.enabled).map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center gap-2">
                      <Badge tone="accent">{r.kind === "level" ? fmtPrice(r.price) : `${fmtPrice(r.low)}-${fmtPrice(r.high)}`}</Badge>
                      <span className="text-muted">{r.label}</span>
                    </li>
                  ))}
                  {!c.rules.some((r) => r.enabled) && <li className="text-muted">Tidak ada aturan aktif.</li>}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Alert terbaru" action={<Link href="/alerts" className="text-sm text-accent hover:underline">Semua</Link>}>
        <AlertTable alerts={alerts.slice(0, 10)} empty="Belum ada alert. Alert muncul di sini saat kondisi setup terpenuhi." />
      </Card>
    </div>
  );
}
