"use client";

import { useActionState } from "react";
import { scanAction, testWaAction, type ActionState } from "@/app/actions";
import { Button } from "./ui";

function Result({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role="status" className={`text-sm ${state.ok ? "text-long" : "text-short"}`}>
      {state.message}
    </p>
  );
}

export function ActionButtons() {
  const [scan, doScan, scanning] = useActionState<ActionState>(scanAction, null);
  const [wa, doWa, sending] = useActionState<ActionState>(testWaAction, null);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <form action={doScan}>
          <Button disabled={scanning}>{scanning ? "Scanning…" : "Scan sekarang"}</Button>
        </form>
        <form action={doWa}>
          <Button variant="ghost" disabled={sending}>
            {sending ? "Mengirim…" : "Kirim pesan tes"}
          </Button>
        </form>
      </div>
      <Result state={scan} />
      <Result state={wa} />
    </div>
  );
}
