import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_CONFIG } from "../core/defaults";
import type { AlertRecord, BotConfig } from "../core/types";
import type { Store } from "./types";

type Db = { config: BotConfig | null; alerts: AlertRecord[]; meta: Record<string, unknown> };

/**
 * JSON file store for a single always-on machine (local PC, VPS) running
 * `npm start` + `npm run worker`. Not for Vercel: its file system is not persistent.
 * Writes are serialized in-process and replaced atomically (write + rename).
 */
export class FileStore implements Store {
  readonly name = "file";
  private file: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(dir = process.env.DATA_DIR || path.join(process.cwd(), "data")) {
    this.file = path.join(dir, "db.json");
  }

  private async read(): Promise<Db> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8")) as Db;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return { config: null, alerts: [], meta: {} };
      throw e;
    }
  }

  private async write(db: Db): Promise<void> {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, this.file);
  }

  /** Cross-process lock (the web server and the worker share the file). */
  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const lock = `${this.file}.lock`;
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const deadline = Date.now() + 10_000;
    for (;;) {
      try {
        const h = await fs.open(lock, "wx");
        await h.close();
        break;
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        const st = await fs.stat(lock).catch(() => null);
        if (st && Date.now() - st.mtimeMs > 30_000) await fs.rm(lock, { force: true }); // stale
        if (Date.now() > deadline) throw new Error(`Could not lock ${lock}`);
        await new Promise((r) => setTimeout(r, 50));
      }
    }
    try {
      return await fn();
    } finally {
      await fs.rm(lock, { force: true });
    }
  }

  private mutate<T>(fn: (db: Db) => T | Promise<T>): Promise<T> {
    const run = this.queue.then(() =>
      this.withLock(async () => {
        const db = await this.read();
        const result = await fn(db);
        await this.write(db);
        return result;
      }),
    );
    this.queue = run.catch(() => undefined);
    return run;
  }

  async getConfig() {
    return (await this.read()).config ?? structuredClone(DEFAULT_CONFIG);
  }
  async saveConfig(cfg: BotConfig) {
    await this.mutate((db) => {
      db.config = cfg;
    });
  }
  claimAlert(rec: AlertRecord) {
    return this.mutate((db) => {
      if (db.alerts.some((a) => a.id === rec.id)) return false;
      db.alerts.push(rec);
      if (db.alerts.length > 5000) db.alerts.splice(0, db.alerts.length - 5000);
      return true;
    });
  }
  async updateAlert(id: string, patch: Partial<AlertRecord>) {
    await this.mutate((db) => {
      const a = db.alerts.find((x) => x.id === id);
      if (a) Object.assign(a, patch);
    });
  }
  async listAlerts(opts: { limit?: number; symbol?: string; outcome?: AlertRecord["outcome"] } = {}) {
    const all = (await this.read()).alerts
      .filter((a) => (!opts.symbol || a.symbol === opts.symbol) && (!opts.outcome || a.outcome === opts.outcome))
      .sort((a, b) => b.createdAt - a.createdAt);
    return opts.limit ? all.slice(0, opts.limit) : all;
  }
  async getMeta<T>(key: string) {
    return ((await this.read()).meta[key] as T) ?? null;
  }
  async setMeta<T>(key: string, value: T) {
    await this.mutate((db) => {
      db.meta[key] = value;
    });
  }
}
