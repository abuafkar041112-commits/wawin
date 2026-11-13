/**
 * Single-owner password login. The session cookie is "<expiry>.<HMAC-SHA256>"
 * signed with SESSION_SECRET. Web Crypto only, so it runs in proxy.ts too.
 */
export const SESSION_COOKIE = "bot_session";
export const SESSION_DAYS = 30;

const enc = new TextEncoder();

function b64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** Constant-time string compare. */
export function safeEqual(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const s = secret();
  if (!s) throw new Error("SESSION_SECRET must be set (32+ characters)");
  const exp = String(now + SESSION_DAYS * 86_400_000);
  return `${exp}.${await hmac(s, exp)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  const s = secret();
  if (!s || !token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < now) return false;
  return safeEqual(sig, await hmac(s, exp));
}
