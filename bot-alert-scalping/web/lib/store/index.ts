import type { Store } from "./types";
import { FileStore } from "./file";

let cached: Store | null = null;

/** STORE=firestore on Vercel; STORE=file (default) on a single always-on machine. */
export async function getStore(): Promise<Store> {
  if (cached) return cached;
  if (process.env.STORE === "firestore") {
    const { FirestoreStore } = await import("./firestore");
    cached = new FirestoreStore();
  } else {
    cached = new FileStore();
  }
  return cached;
}

export type { Store, ScanSummary } from "./types";
