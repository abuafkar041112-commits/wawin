# QA · QW1 (self-check, 2026-11-13)

Solo route: **Nathan adalah satu-satunya reviewer.** Tidak ada review desain, keamanan, atau QA terpisah.

Build: pass (`npm run build`, Next.js 16.4.6, semua route terkompilasi)
Types: pass (`npx tsc --noEmit`, tanpa error)
Lint: pass (`npm run lint`, 0 masalah)
Tests: pass (`npm test`: 17 dari 17 lulus: aturan level & zona, R:R, format pesan, evaluasi TP1/SL, jadwal 15m, weekend WIB, validasi pengaturan, scan dedupe + cooldown + evaluasi)
Secret scan: pass (`git grep` pola key tidak menemukan apa pun; `.env*` kecuali `.env.example`, `data/`, dan `*-firebase-adminsdk-*.json` di-ignore)
Accessibility: not run (tidak ada audit otomatis; dicek manual: label pada input, `role=switch`/`aria-checked` pada toggle, `role=status`/`role=alert` untuk pesan, fokus terlihat, kontras teks di tema gelap)
Dependency audit: pass (`npm audit --omit=dev`: 0 vulnerabilities)

## Uji end-to-end (server produksi lokal, notifier `console`)
- Tanpa login → redirect 307 ke `/login`; cookie palsu → 307; password salah → "Password salah."; password benar → dashboard.
- `/api/cron/scan`: tanpa header 401, secret salah 401, secret benar 200; dipanggil 2x → tidak ada kirim ganda.
- Pengaturan: tambah level lewat UI → "Tersimpan"; zona kosong → ditolak dengan "BTCUSDT · Zona baru · Batas bawah: wajib diisi angka".
- "Scan sekarang" dengan data Binance live → 1 alert terkirim (console) dengan format brief:
  ```
  🔴 BTCUSDT 15m — BREAKDOWN
  Close: 68.254,01 (< 68.341)
  Waktu: 14 Nov 2026 06:00 WIB
  Rencana: retest 68.341
  SL 68.514,99 | TP1 68.167,01 (1R) | TP2 67.993,02 (2R)
  ⚠️ Konfirmasi manual sebelum entry.
  ```
- "Kirim pesan tes" → terkirim lewat console.
- Worker: scan langsung saat start, jadwal berikutnya 06:15 WIB (+5 dtk), berhenti bersih saat SIGINT.
- Screenshot desktop & HP (390 px) diperiksa; nav HP diperbaiki.

## Uji data historis (999 candle 15m asli, 3–14 Nov 2026)
`npm run historical -- --auto`: aturan dari brief memicu alert nyata — BTC "Sweep 69.150 lalu rejection" 3x (13 Nov 10:45, 14:30, 22:00 WIB) dan ETH "Close > 1.922 setelah wick 1.900-1.910" (13 Nov 13:30 WIB). Aturan demo: 19 alert, TP1 9 · SL 2 · ambigu 2 · kadaluarsa 2 → win rate 82% (**aturan demo, bukan strategi; jangan dijadikan acuan trading**).

## Tidak diuji (butuh akun Anda)
- Kirim WhatsApp sungguhan lewat Fonnte (tidak ada token; api.fonnte.com juga diblokir dari mesin build).
- Firestore (`STORE=firestore`) dan deploy Vercel.
- Telegram.
