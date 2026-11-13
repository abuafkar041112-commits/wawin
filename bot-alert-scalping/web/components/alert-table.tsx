import { fmtPrice, fmtWib } from "@/lib/core/format";
import type { AlertRecord } from "@/lib/core/types";
import { Badge, outcomeLabel, outcomeTone } from "./ui";

export function AlertTable({ alerts, empty }: { alerts: AlertRecord[]; empty: string }) {
  if (!alerts.length) return <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-muted">
          <tr className="border-b border-border">
            <th className="px-4 py-2 font-medium sm:px-2">Waktu (close)</th>
            <th className="px-2 py-2 font-medium">Koin</th>
            <th className="px-2 py-2 font-medium">Sinyal</th>
            <th className="px-2 py-2 font-medium">Level / zona</th>
            <th className="px-2 py-2 text-right font-medium">Close</th>
            <th className="px-2 py-2 font-medium">Kirim</th>
            <th className="px-2 py-2 font-medium">Hasil</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => (
            <tr key={a.id} className="border-b border-border/60 align-top">
              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-muted sm:px-2">{fmtWib(a.candleCloseTime + 1)}</td>
              <td className="px-2 py-2.5 font-mono">{a.symbol}</td>
              <td className="px-2 py-2.5">
                <Badge tone={a.bias === "long" ? "long" : "short"}>{a.title}</Badge>
                <div className="mt-1 text-xs text-muted">{a.label}</div>
              </td>
              <td className="px-2 py-2.5 font-mono text-xs">{a.trigger}</td>
              <td className="px-2 py-2.5 text-right font-mono">{fmtPrice(a.close)}</td>
              <td className="px-2 py-2.5">
                {a.delivered ? (
                  <Badge tone="long">{a.notifier}</Badge>
                ) : (
                  <span title={a.deliveryError ?? ""}>
                    <Badge tone="short">gagal</Badge>
                  </span>
                )}
              </td>
              <td className="px-2 py-2.5">
                <Badge tone={outcomeTone(a.outcome)}>{outcomeLabel[a.outcome] ?? a.outcome}</Badge>
                {a.candlesChecked ? <div className="mt-1 text-xs text-muted">{a.candlesChecked} candle</div> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
