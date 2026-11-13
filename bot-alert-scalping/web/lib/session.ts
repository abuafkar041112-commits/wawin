import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./auth";

/** Real check, used by every page and server action (proxy.ts is only the fast path). */
export async function requireSession(): Promise<void> {
  await connection(); // request-time only: the expiry check reads the clock
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySessionToken(token))) redirect("/login");
}
