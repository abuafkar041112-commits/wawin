import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "./lib/auth";

/** Optimistic check: send visitors without a valid session to /login. */
export async function proxy(request: NextRequest) {
  const ok = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except the login page, the cron/health APIs (own auth), and static files.
  matcher: ["/((?!login|api/cron|api/health|_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
