export type SendResult = { ok: boolean; error?: string };

export interface Notifier {
  readonly name: string;
  send(text: string): Promise<SendResult>;
}

/**
 * Fonnte (unofficial WhatsApp gateway). Endpoint, header and fields follow
 * Fonnte's commonly documented API; docs.fonnte.com could not be read from the
 * build machine on 2026-11-13, so verify with `npm run test:wa` before relying on it.
 */
export class FonnteNotifier implements Notifier {
  readonly name = "fonnte";
  constructor(
    private token: string,
    private target: string,
    private url = process.env.FONNTE_URL || "https://api.fonnte.com/send",
  ) {}

  async send(text: string): Promise<SendResult> {
    try {
      const body = new URLSearchParams({ target: this.target, message: text, countryCode: process.env.FONNTE_COUNTRY_CODE || "62" });
      const res = await fetch(this.url, {
        method: "POST",
        headers: { Authorization: this.token },
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const raw = await res.text();
      let json: { status?: boolean; reason?: string; detail?: string } = {};
      try {
        json = JSON.parse(raw);
      } catch {
        /* not JSON */
      }
      if (res.ok && json.status === true) return { ok: true };
      return { ok: false, error: `Fonnte HTTP ${res.status}: ${json.reason || json.detail || raw.slice(0, 200)}` };
    } catch (e) {
      return { ok: false, error: `Fonnte: ${(e as Error).message}` };
    }
  }
}

/** Telegram Bot API, the drop-in alternative mentioned in the brief. */
export class TelegramNotifier implements Notifier {
  readonly name = "telegram";
  constructor(
    private token: string,
    private chatId: string,
  ) {}

  async send(text: string): Promise<SendResult> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${this.token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: this.chatId, text }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
      return json.ok ? { ok: true } : { ok: false, error: `Telegram HTTP ${res.status}: ${json.description ?? ""}` };
    } catch (e) {
      return { ok: false, error: `Telegram: ${(e as Error).message}` };
    }
  }
}

/** Prints to the server log. Used when no WhatsApp token is set (local test). */
export class ConsoleNotifier implements Notifier {
  readonly name = "console";
  readonly sent: string[] = [];
  async send(text: string): Promise<SendResult> {
    this.sent.push(text);
    console.log(`\n----- ALERT (console) -----\n${text}\n---------------------------`);
    return { ok: true };
  }
}

/**
 * NOTIFIER=fonnte|telegram|console. Without NOTIFIER: fonnte when FONNTE_TOKEN
 * and WA_TARGET are set, otherwise console.
 */
export function getNotifier(env: NodeJS.ProcessEnv = process.env): Notifier {
  const kind = env.NOTIFIER || (env.FONNTE_TOKEN && env.WA_TARGET ? "fonnte" : "console");
  if (kind === "fonnte") {
    if (!env.FONNTE_TOKEN || !env.WA_TARGET) throw new Error("NOTIFIER=fonnte needs FONNTE_TOKEN and WA_TARGET");
    return new FonnteNotifier(env.FONNTE_TOKEN, env.WA_TARGET);
  }
  if (kind === "telegram") {
    if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) throw new Error("NOTIFIER=telegram needs TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID");
    return new TelegramNotifier(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID);
  }
  return new ConsoleNotifier();
}
