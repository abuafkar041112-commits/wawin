import "server-only";
import { fetchKlines } from "./core/binance";
import { runScan } from "./core/scan";
import { getNotifier } from "./notify";
import { getStore } from "./store";

export async function scanNow(source: string) {
  return runScan({ store: await getStore(), notifier: getNotifier(), fetchKlines, source });
}
