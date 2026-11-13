import type { ButtonHTMLAttributes, ReactNode } from "react";

export function cn(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-panel/90 p-4 sm:p-5", className)}>
      {(title || action) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" };

export function Button({ variant = "primary", className, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent text-black hover:brightness-110",
        variant === "ghost" && "border border-border bg-panel-2 text-foreground hover:border-muted",
        variant === "danger" && "border border-short/40 text-short hover:bg-short/10",
        className,
      )}
    />
  );
}

const tones = {
  long: "bg-long/15 text-long border-long/30",
  short: "bg-short/15 text-short border-short/30",
  accent: "bg-accent/15 text-accent border-accent/30",
  muted: "bg-panel-2 text-muted border-border",
} as const;

export function Badge({ tone = "muted", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-xs", tones[tone])}>{children}</span>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "long" | "short" | "accent" }) {
  return (
    <div className="rounded-lg border border-border bg-panel-2 p-3">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={cn("mt-1 font-mono text-xl font-semibold", tone === "long" && "text-long", tone === "short" && "text-short", tone === "accent" && "text-accent")}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export const outcomeTone = (o: string) => (o === "tp1" ? "long" : o === "sl" ? "short" : o === "open" ? "accent" : "muted");
export const outcomeLabel: Record<string, string> = {
  open: "berjalan",
  tp1: "TP1",
  sl: "SL",
  both: "TP1+SL (1 candle)",
  expired: "kadaluarsa",
  no_plan: "tanpa SL/TP",
};
