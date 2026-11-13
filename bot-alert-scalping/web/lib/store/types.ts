import type { AlertRecord, BotConfig, Outcome } from "../core/types";

export type ScanSummary = {
  at: number;
  ok: boolean;
  source: string;
  sent: number;
  skippedCooldown: number;
  evaluated: number;
  paused: boolean;
  errors: string[];
};

export interface Store {
  readonly name: string;
  getConfig(): Promise<BotConfig>;
  saveConfig(cfg: BotConfig): Promise<void>;
  /** Inserts the alert only if its id is new. Returns false when it already exists. */
  claimAlert(rec: AlertRecord): Promise<boolean>;
  updateAlert(id: string, patch: Partial<AlertRecord>): Promise<void>;
  listAlerts(opts?: { limit?: number; symbol?: string; outcome?: Outcome }): Promise<AlertRecord[]>;
  getMeta<T>(key: string): Promise<T | null>;
  setMeta<T>(key: string, value: T): Promise<void>;
}
