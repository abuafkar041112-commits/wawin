import { connection } from "next/server";

/** Liveness only. Reveals nothing about config or alerts. */
export async function GET() {
  await connection();
  return Response.json({ ok: true, at: Date.now() });
}
