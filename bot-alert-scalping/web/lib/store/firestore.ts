import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { DEFAULT_CONFIG } from "../core/defaults";
import type { AlertRecord, BotConfig } from "../core/types";
import type { Store } from "./types";

function db(): Firestore {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

/** Firestore store for serverless hosting (Vercel). Server-side only (Admin SDK). */
export class FirestoreStore implements Store {
  readonly name = "firestore";

  async getConfig() {
    const snap = await db().collection("bot").doc("config").get();
    return (snap.exists ? (snap.data() as BotConfig) : null) ?? structuredClone(DEFAULT_CONFIG);
  }
  async saveConfig(cfg: BotConfig) {
    await db().collection("bot").doc("config").set(JSON.parse(JSON.stringify(cfg)));
  }
  async claimAlert(rec: AlertRecord) {
    try {
      await db().collection("alerts").doc(rec.id).create(JSON.parse(JSON.stringify(rec)));
      return true;
    } catch (e) {
      // gRPC code 6 = ALREADY_EXISTS
      if ((e as { code?: number }).code === 6) return false;
      throw e;
    }
  }
  async updateAlert(id: string, patch: Partial<AlertRecord>) {
    await db().collection("alerts").doc(id).set(JSON.parse(JSON.stringify(patch)), { merge: true });
  }
  async listAlerts(opts: { limit?: number; symbol?: string; outcome?: AlertRecord["outcome"] } = {}) {
    let q: FirebaseFirestore.Query = db().collection("alerts");
    if (opts.symbol) q = q.where("symbol", "==", opts.symbol);
    if (opts.outcome) q = q.where("outcome", "==", opts.outcome);
    // Equality filters only + in-memory sort, so no composite index is needed.
    const snap = await q.limit(opts.symbol || opts.outcome ? 500 : (opts.limit ?? 500)).get();
    const all = snap.docs.map((d) => d.data() as AlertRecord).sort((a, b) => b.createdAt - a.createdAt);
    return opts.limit ? all.slice(0, opts.limit) : all;
  }
  async getMeta<T>(key: string) {
    const snap = await db().collection("meta").doc(key).get();
    return snap.exists ? ((snap.data() as { v: T }).v ?? null) : null;
  }
  async setMeta<T>(key: string, value: T) {
    await db().collection("meta").doc(key).set({ v: JSON.parse(JSON.stringify(value)) });
  }
}
