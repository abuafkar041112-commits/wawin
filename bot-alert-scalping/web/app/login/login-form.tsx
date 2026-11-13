"use client";

import { useActionState } from "react";
import { loginAction, type ActionState } from "../actions";
import { Button } from "@/components/ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(loginAction, null);
  return (
    <form action={action} className="space-y-4">
      <label className="block text-sm">
        <span className="mb-1.5 block text-muted">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full rounded-lg border border-border bg-panel-2 px-3 py-2.5 text-foreground"
        />
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm text-short">
          {state.message}
        </p>
      )}
      <Button className="w-full" disabled={pending}>
        {pending ? "Memeriksa…" : "Masuk"}
      </Button>
    </form>
  );
}
