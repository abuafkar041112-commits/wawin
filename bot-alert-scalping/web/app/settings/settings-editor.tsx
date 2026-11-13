"use client";

import { useState, useTransition, type ReactNode } from "react";
import { saveConfigAction, type ActionState } from "../actions";
import { Badge, Button, Card, cn } from "@/components/ui";
import type { BotConfig, CoinConfig, LevelMode, LevelRule, Plan, Rule, ZoneRule } from "@/lib/core/types";

const MODES: { value: LevelMode; label: string }[] = [
  { value: "close_below", label: "Close tembus ke bawah (breakdown, short)" },
  { value: "close_above", label: "Close tembus ke atas (breakout / demand, long)" },
  { value: "sweep_above_reject", label: "Tusuk ke atas lalu close di bawah (rejection, short)" },
  { value: "sweep_below_reject", label: "Tusuk ke bawah lalu close di atas (rejection, long)" },
];

const inputCls = "w-full rounded-md border border-border bg-panel-2 px-2.5 py-1.5 text-sm text-foreground";

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block text-xs", className)}>
      <span className="mb-1 block text-muted">{label}</span>
      {children}
    </label>
  );
}

function Num({ value, onChange, placeholder, step = "any" }: { value: number | null | undefined; onChange: (v: number | null) => void; placeholder?: string; step?: string }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      className={inputCls}
      placeholder={placeholder}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative h-5 w-9 rounded-full border transition", checked ? "border-accent bg-accent" : "border-border bg-panel-2")}
      >
        <span className={cn("absolute top-0.5 size-3.5 rounded-full transition", checked ? "left-[18px] bg-black" : "left-0.5 bg-muted")} />
      </button>
      <span>{label}</span>
    </label>
  );
}

function PlanEditor({ plan, onChange }: { plan: Plan; onChange: (p: Plan) => void }) {
  const set = (k: keyof Plan) => (v: number | null) => onChange({ ...plan, [k]: v });
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      <Field label="Entry bawah">
        <Num value={plan.entryLow} onChange={set("entryLow")} placeholder="opsional" />
      </Field>
      <Field label="Entry atas">
        <Num value={plan.entryHigh} onChange={set("entryHigh")} placeholder="opsional" />
      </Field>
      <Field label="SL">
        <Num value={plan.sl} onChange={set("sl")} placeholder="opsional" />
      </Field>
      <Field label="TP1">
        <Num value={plan.tp1} onChange={set("tp1")} placeholder="opsional" />
      </Field>
      <Field label="TP2">
        <Num value={plan.tp2} onChange={set("tp2")} placeholder="opsional" />
      </Field>
    </div>
  );
}

function RuleEditor({ rule, onChange, onDelete }: { rule: Rule; onChange: (r: Rule) => void; onDelete: () => void }) {
  return (
    <div className={cn("space-y-3 rounded-lg border p-3", rule.enabled ? "border-border bg-panel-2" : "border-dashed border-border opacity-70")}>
      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">{rule.kind === "level" ? "LEVEL" : "ZONA"}</Badge>
        <Toggle checked={rule.enabled} onChange={(enabled) => onChange({ ...rule, enabled })} label="Aktif" />
        <input className={cn(inputCls, "min-w-0 flex-1 font-sans")} value={rule.label} placeholder="Nama aturan" onChange={(e) => onChange({ ...rule, label: e.target.value })} />
        <Button type="button" variant="danger" onClick={onDelete} className="px-2.5 py-1.5 text-xs">
          Hapus
        </Button>
      </div>

      {rule.kind === "level" ? <LevelFields rule={rule} onChange={onChange} /> : <ZoneFields rule={rule} onChange={onChange} />}

      <div>
        <div className="mb-1 text-xs font-medium text-muted">Rencana trade (untuk pesan + R:R + evaluasi TP1/SL)</div>
        <PlanEditor plan={rule.plan} onChange={(plan) => onChange({ ...rule, plan })} />
      </div>
    </div>
  );
}

function LevelFields({ rule, onChange }: { rule: LevelRule; onChange: (r: Rule) => void }) {
  const wick = rule.wickZone;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Field label="Level harga">
        <Num value={rule.price} onChange={(v) => onChange({ ...rule, price: v ?? NaN })} />
      </Field>
      <Field label="Kondisi" className="col-span-2 sm:col-span-3">
        <select className={inputCls} value={rule.mode} onChange={(e) => onChange({ ...rule, mode: e.target.value as LevelMode })}>
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>
      {rule.mode === "close_above" && (
        <>
          <Field label="Syarat wick ke zona: bawah">
            <Num value={wick?.low} onChange={(v) => onChange({ ...rule, wickZone: v === null && !wick?.high ? null : { low: v ?? NaN, high: wick?.high ?? NaN } })} placeholder="opsional" />
          </Field>
          <Field label="… atas">
            <Num value={wick?.high} onChange={(v) => onChange({ ...rule, wickZone: v === null && !wick?.low ? null : { low: wick?.low ?? NaN, high: v ?? NaN } })} placeholder="opsional" />
          </Field>
          <Field label="Dalam N candle terakhir">
            <Num value={rule.wickLookback ?? 3} step="1" onChange={(v) => onChange({ ...rule, wickLookback: v ?? 3 })} />
          </Field>
        </>
      )}
    </div>
  );
}

function ZoneFields({ rule, onChange }: { rule: ZoneRule; onChange: (r: Rule) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Field label="Zona bawah">
        <Num value={rule.low} onChange={(v) => onChange({ ...rule, low: v ?? NaN })} />
      </Field>
      <Field label="Zona atas">
        <Num value={rule.high} onChange={(v) => onChange({ ...rule, high: v ?? NaN })} />
      </Field>
      <Field label="Wick minimal (% range)">
        <Num value={Math.round(rule.minWickRatio * 100)} step="1" onChange={(v) => onChange({ ...rule, minWickRatio: (v ?? 50) / 100 })} />
      </Field>
      <Field label="Arah">
        <select className={inputCls} value={rule.side} onChange={(e) => onChange({ ...rule, side: e.target.value as ZoneRule["side"] })}>
          <option value="both">Dua arah</option>
          <option value="demand">Demand saja (long)</option>
          <option value="supply">Supply saja (short)</option>
        </select>
      </Field>
    </div>
  );
}

const newId = (symbol: string, kind: string) => `${symbol.slice(0, 3).toLowerCase()}-${kind}-${Math.random().toString(36).slice(2, 7)}`;

export function SettingsEditor({ initial }: { initial: BotConfig }) {
  const [cfg, setCfg] = useState<BotConfig>(initial);
  const [result, setResult] = useState<ActionState>(null);
  const [pending, start] = useTransition();
  const [newSymbol, setNewSymbol] = useState("");

  const patch = (p: Partial<BotConfig>) => setCfg((c) => ({ ...c, ...p }));
  const patchCoin = (i: number, p: Partial<CoinConfig>) => setCfg((c) => ({ ...c, coins: c.coins.map((x, j) => (j === i ? { ...x, ...p } : x)) }));
  const setRule = (ci: number, ri: number, r: Rule | null) =>
    setCfg((c) => ({
      ...c,
      coins: c.coins.map((x, j) => (j === ci ? { ...x, rules: r ? x.rules.map((y, k) => (k === ri ? r : y)) : x.rules.filter((_, k) => k !== ri) } : x)),
    }));
  const addRule = (ci: number, kind: Rule["kind"]) => {
    const coin = cfg.coins[ci];
    const rule: Rule =
      kind === "level"
        ? { id: newId(coin.symbol, "lvl"), kind, enabled: true, label: "Level baru", price: NaN, mode: "close_below", plan: {} }
        : { id: newId(coin.symbol, "zone"), kind, enabled: true, label: "Zona baru", low: NaN, high: NaN, minWickRatio: 0.5, side: "both", plan: {} };
    patchCoin(ci, { rules: [...coin.rules, rule] });
  };

  const save = () =>
    start(async () => {
      setResult(await saveConfigAction(JSON.stringify(cfg, (_k, v) => (typeof v === "number" && Number.isNaN(v) ? null : v))));
    });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Pengaturan</h1>
          <p className="mt-1 text-sm text-muted">Ubah koin, level, zona dan rencana trade tanpa ubah kode. Angka pakai titik desimal (contoh 0.5123).</p>
        </div>
      </header>

      <Card title="Umum">
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Toggle checked={cfg.enableLevelAlerts} onChange={(v) => patch({ enableLevelAlerts: v })} label="Alert level" />
          <Toggle checked={cfg.enableZoneAlerts} onChange={(v) => patch({ enableZoneAlerts: v })} label="Alert zona rejection" />
          <Toggle checked={cfg.enableRR} onChange={(v) => patch({ enableRR: v })} label="Ringkasan R:R" />
          <Toggle checked={cfg.pauseOnWeekend} onChange={(v) => patch({ pauseOnWeekend: v })} label="Jeda Sabtu-Minggu (WIB)" />
        </div>
        <div className="mt-4 grid max-w-md grid-cols-2 gap-3">
          <Field label="Anti-spam: alert sama maks 1x per (menit)">
            <Num value={cfg.cooldownMinutes} step="1" onChange={(v) => patch({ cooldownMinutes: v ?? 60 })} />
          </Field>
          <Field label="Evaluasi TP1/SL selama (candle)">
            <Num value={cfg.evalCandles} step="1" onChange={(v) => patch({ evalCandles: v ?? 16 })} />
          </Field>
        </div>
      </Card>

      {cfg.coins.map((coin, ci) => (
        <Card
          key={coin.symbol}
          title={<span className="font-mono text-base normal-case tracking-normal text-foreground">{coin.symbol}</span>}
          action={
            <div className="flex items-center gap-3">
              <Toggle checked={coin.enabled} onChange={(enabled) => patchCoin(ci, { enabled })} label="Pantau" />
              <button
                type="button"
                className="text-xs text-muted hover:text-short"
                onClick={() => confirm(`Hapus ${coin.symbol} beserta aturannya?`) && setCfg((c) => ({ ...c, coins: c.coins.filter((_, j) => j !== ci) }))}
              >
                Hapus koin
              </button>
            </div>
          }
        >
          <div className="space-y-3">
            {coin.rules.length === 0 && <p className="text-sm text-muted">Belum ada aturan.</p>}
            {coin.rules.map((rule, ri) => (
              <RuleEditor key={rule.id} rule={rule} onChange={(r) => setRule(ci, ri, r)} onDelete={() => setRule(ci, ri, null)} />
            ))}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={() => addRule(ci, "level")}>
                + Level
              </Button>
              <Button type="button" variant="ghost" onClick={() => addRule(ci, "zone")}>
                + Zona rejection
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Card title="Tambah koin">
        <form
          className="flex max-w-md gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const s = newSymbol.trim().toUpperCase();
            if (!s || cfg.coins.some((c) => c.symbol === s)) return;
            setCfg((c) => ({ ...c, coins: [...c.coins, { symbol: s, enabled: true, rules: [] }] }));
            setNewSymbol("");
          }}
        >
          <input className={inputCls} placeholder="contoh: SOLUSDT" value={newSymbol} onChange={(e) => setNewSymbol(e.target.value)} />
          <Button variant="ghost">Tambah</Button>
        </form>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/90 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <Button type="button" onClick={save} disabled={pending}>
          {pending ? "Menyimpan…" : "Simpan pengaturan"}
        </Button>
        {result && (
          <p role="status" className={cn("text-sm", result.ok ? "text-long" : "text-short")}>
            {result.message}
          </p>
        )}
      </div>
    </div>
  );
}
