import { connection } from "next/server";
import { safeEqual } from "@/lib/auth";
import { scanNow } from "@/lib/runtime";

export const maxDuration = 60;

/**
 * Called every 15 minutes by a scheduler (Vercel Cron or an external pinger).
 * Auth: "Authorization: Bearer <CRON_SECRET>".
 */
async function handle(req: Request) {
  await connection();
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return Response.json({ ok: false, reason: "CRON_SECRET not configured" }, { status: 500 });
  const auth = req.headers.get("authorization") ?? "";
  if (!safeEqual(auth, `Bearer ${secret}`)) return Response.json({ ok: false, reason: "unauthorized" }, { status: 401 });

  const summary = await scanNow("cron");
  return Response.json(summary, { status: summary.ok ? 200 : 502 });
}

export const GET = handle;
export const POST = handle;
