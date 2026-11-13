# Bot Alert Scalping Crypto → WhatsApp (QW1, v1)

Memantau BTCUSDT & ETHUSDT (bisa tambah SOL/XRP/BNB) di timeframe 15m dari data publik Binance, dan mengirim alert WhatsApp saat setup Anda terpenuhi: level tembus, sweep + rejection, atau candle rejection di zona. **Tidak mengeksekusi order.**

## Jalankan lokal
```bash
cd web
npm install
cp .env.example .env.local      # lalu isi lewat ../tools/set_env.mjs
npm run build && npm start      # dashboard http://localhost:3000
npm run worker                  # terminal kedua: scan tiap close 15m
```
Perintah lain: `npm test`, `npm run test:wa` (pesan tes), `npm run historical -- [--auto] [--send]` (uji data historis).

## Peta folder
```
web/
  app/                 dashboard (/), pengaturan (/settings), log (/alerts), login, API cron & health
  lib/core/            logika bot: binance, rules, format pesan + R:R, evaluate, scan, time
  lib/notify/          notifier: Fonnte, Telegram, console
  lib/store/           penyimpanan: file (VPS/PC) atau Firestore (Vercel)
  scripts/             worker 24/7, uji historis, tes WA
  tests/               unit test
docs/                  brief, state, sumber, stack, env, QA, panduan setup
tools/                 helper env (tanpa menampilkan rahasia)
```

## What works / what does not
**Works (diuji):** aturan level 4 jenis + zona rejection, R:R otomatis, format pesan, anti-spam 1x/jam, dedupe per candle (aman walau worker & cron jalan bersamaan), evaluasi TP1/SL + win rate, dashboard + login password, worker terjadwal :00/:15/:30/:45 + 5 dtk, endpoint cron dengan secret, uji historis dengan data Binance asli.

**Not yet / not tested:** kirim WhatsApp sungguhan (butuh token Fonnte Anda), Firestore & Vercel, Telegram. Alert yang gagal terkirim tercatat sebagai "gagal" dan tidak dikirim ulang otomatis. Jika scan terlewat (server mati), candle yang terlewat tidak di-backfill; hanya candle close terakhir yang dicek. Evaluasi diukur dari close candle alert, bukan dari entry yang benar-benar terisi.
