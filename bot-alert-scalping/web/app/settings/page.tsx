import type { Metadata } from "next";
import { Suspense } from "react";
import { Shell } from "@/components/shell";
import { requireSession } from "@/lib/session";
import { getStore } from "@/lib/store";
import { SettingsEditor } from "./settings-editor";

export const metadata: Metadata = { title: "Pengaturan" };

export default function Page() {
  return (
    <Shell>
      <Suspense fallback={<p className="text-muted">Memuat pengaturan…</p>}>
        <Settings />
      </Suspense>
    </Shell>
  );
}

async function Settings() {
  await requireSession();
  const cfg = await (await getStore()).getConfig();
  return <SettingsEditor initial={cfg} />;
}
