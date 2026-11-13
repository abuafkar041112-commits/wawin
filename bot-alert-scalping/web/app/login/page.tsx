import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Masuk" };

export default function LoginPage() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-panel p-6">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-accent font-mono text-sm font-bold text-black">15m</span>
          <div>
            <h1 className="text-lg font-semibold">Bot Alert Scalping</h1>
            <p className="text-sm text-muted">Dashboard pemilik</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
