# Sumber · QW1 (dibaca 2026-11-13)

| Topik | Sumber | Status |
|---|---|---|
| Next.js 16.4.6: `proxy.ts` (pengganti middleware), `cookies()`, Server Functions, Route Handlers, Cache Components (`connection()`, `force-dynamic` dihapus) | Docs resmi yang ikut terpasang di `web/node_modules/next/dist/docs/` | Dibaca |
| Binance klines `GET /api/v3/klines` (urutan field: openTime, open, high, low, close, volume, closeTime, …) | Respons nyata dari `data-api.binance.vision` | Diuji langsung |
| `api.binance.com` membalas **HTTP 451** "restricted location" dari server di AS; `data-api.binance.vision` membalas 200 | Uji `curl` dari mesin build | Diuji langsung. Halaman docs developers.binance.com tidak bisa dibuka dari mesin build |
| Fonnte `POST https://api.fonnte.com/send`, header `Authorization: <token>`, field `target`, `message`, `countryCode`; respons JSON `status` (true/false) + `reason` | Pengetahuan umum tentang API Fonnte | **[belum diverifikasi]** docs.fonnte.com tidak bisa dibuka dari mesin build. Cek dengan `npm run test:wa` |
| Telegram Bot API `sendMessage` (`chat_id`, `text`) | Pengetahuan umum | **[belum diverifikasi]**, opsional |
| Vercel: batas frekuensi Cron di paket Hobby, `regions: ["sin1"]` di `vercel.json`, aturan komersial Hobby | — | **[belum diverifikasi]** vercel.com tidak bisa dibuka dari mesin build. Baca halaman Cron Jobs & Fair Use sebelum deploy |
| shadcn/ui | — | Tidak dipakai: registry ui.shadcn.com diblokir jaringan build; komponen kecil ditulis sendiri dengan Tailwind |
| Google Fonts via `next/font/google` | — | Tidak dipakai: fonts.googleapis.com diblokir saat build; font di-self-host lewat paket npm `@fontsource-variable` (OFL-1.1) |
