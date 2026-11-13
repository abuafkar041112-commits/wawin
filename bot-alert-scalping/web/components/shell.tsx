import Link from "next/link";
import type { ReactNode } from "react";
import { logoutAction } from "@/app/actions";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/settings", label: "Pengaturan" },
  { href: "/alerts", label: "Log alert" },
];

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-16 sm:px-6">
      <nav className="sticky top-0 z-10 -mx-4 mb-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid size-7 place-items-center rounded-md bg-accent font-mono text-xs font-bold text-black">15m</span>
          <span>Bot Alert Scalping</span>
        </Link>
        <div className="order-last -mx-2.5 flex w-full flex-wrap items-center gap-1 text-sm sm:order-none sm:mx-0 sm:w-auto sm:flex-1">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-md px-2.5 py-1.5 text-muted hover:bg-panel-2 hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </div>
        <form action={logoutAction} className="ml-auto sm:ml-0">
          <button className="text-sm text-muted hover:text-foreground">Keluar</button>
        </form>
      </nav>
      {children}
      <footer className="mt-12 text-xs text-muted">
        Bot ini hanya mengirim alert dan tidak mengeksekusi order. Bukan nasihat keuangan; keputusan entry tetap di tangan Anda.
      </footer>
    </div>
  );
}
