import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTable } from "@/components/alert-table";
import { Shell } from "@/components/shell";
import { Card, Stat } from "@/components/ui";
import { stats } from "@/lib/core/evaluate";
import { requireSession } from "@/lib/session";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Log alert" };

export default function Page() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-muted">Memuat log…</p>}>
        <AlertsLog />
      </Suspense>
    </Shell>
  );
}

async function AlertsLog() {
  await requireSession();
  const store = await getStore();
  const [alerts, cfg] = await Promise.all([store.listAlerts({ limit: 300 }), store.getConfig()]);
  const symbols = [...new Set(alerts.map((a) => a.symbol))];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold sm:text-3xl">Log alert & evaluasi</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted">
          Setiap alert dicek otomatis sampai {cfg.evalCandles} candle setelahnya: mana yang tersentuh duluan, TP1 atau SL. Diukur dari close candle
          alert (bukan dari harga entry yang benar-benar terisi). Jika TP1 dan SL tersentuh di candle yang sama, hasilnya ambigu dan tidak dihitung.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[{ symbol: "Semua", list: alerts }, ...symbols.map((sym) => ({ symbol: sym, list: alerts.filter((a) => a.symbol === sym) }))].map(({ symbol, list }) => {
          const s = stats(list);
          return (
            <Stat
              key={symbol}
              label={symbol}
              value={s.winRate === null ? "—" : `${Math.round(s.winRate * 100)}%`}
              hint={`${s.tp1} TP1 · ${s.sl} SL · ${s.total} alert`}
              tone="accent"
            />
          );
        })}
      </div>

      <Card title={`${alerts.length} alert terakhir`}>
        <AlertTable alerts={alerts} empty="Belum ada alert tercatat." />
      </Card>
    </div>
  );
}
