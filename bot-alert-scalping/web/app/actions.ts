"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "@/lib/auth";
import { getNotifier } from "@/lib/notify";
import { scanNow } from "@/lib/runtime";
import { parseConfig } from "@/lib/schema";
import { requireSession } from "@/lib/session";
import { getStore } from "@/lib/store";

export type ActionState = { ok: boolean; message: string } | null;

const digest = (s: string) => createHash("sha256").update(s).digest();

export async function loginAction(_prev: ActionState, form: FormData): Promise<ActionState> {
  const expected = process.env.DASHBOARD_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  const problems: string[] = [];
  if (!expected) problems.push("DASHBOARD_PASSWORD tidak terbaca");
  else if (expected.length < 8) problems.push(`DASHBOARD_PASSWORD hanya ${expected.length} karakter (min 8)`);
  if (!secret) problems.push("SESSION_SECRET tidak terbaca");
  else if (secret.length < 32) problems.push(`SESSION_SECRET hanya ${secret.length} karakter (min 32)`);
  if (problems.length || !expected) {
    // Details go to the server window only, never to the visitor.
    const envFile = path.join(process.cwd(), ".env.local");
    console.error(`[login] ${problems.join("; ")}. Folder server: ${process.cwd()} · .env.local ${existsSync(envFile) ? "ada" : "TIDAK ADA"} di folder itu.`);
    return {
      ok: false,
      message: `Server belum disetel: ${problems.join("; ")}. Jalankan ulang jalankan-bot.bat (ia akan memperbaiki ini), atau lihat jendela Dashboard.`,
    };
  }

  const given = String(form.get("password") ?? "");
  if (!timingSafeEqual(digest(given), digest(expected))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { ok: false, message: "Password salah." };
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect("/");
}

export async function logoutAction() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

export async function saveConfigAction(json: string): Promise<ActionState> {
  await requireSession();
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    return { ok: false, message: "Data tidak valid." };
  }
  const parsed = parseConfig(input);
  if (!parsed.ok) return { ok: false, message: parsed.error };
  const store = await getStore();
  await store.saveConfig({ ...parsed.config, updatedAt: Date.now() });
  revalidatePath("/", "layout");
  return { ok: true, message: "Tersimpan. Berlaku di scan berikutnya." };
}

export async function scanAction(): Promise<ActionState> {
  await requireSession();
  try {
    const s = await scanNow("dashboard");
    revalidatePath("/", "layout");
    const parts = [`${s.sent} alert terkirim`, `${s.evaluated} hasil dievaluasi`];
    if (s.skippedCooldown) parts.push(`${s.skippedCooldown} ditahan cooldown`);
    if (s.paused) parts.push("mode weekend: alert dijeda");
    return { ok: s.ok, message: s.ok ? `Scan selesai: ${parts.join(", ")}.` : `Scan ada error: ${s.errors.join("; ")}` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function testWaAction(): Promise<ActionState> {
  await requireSession();
  try {
    const n = getNotifier();
    const res = await n.send(`✅ Tes Bot Alert Scalping\nNotifier: ${n.name}\nJika pesan ini masuk, notifikasi siap.`);
    return res.ok ? { ok: true, message: `Pesan tes terkirim lewat ${n.name}.` } : { ok: false, message: res.error ?? "Gagal kirim." };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
