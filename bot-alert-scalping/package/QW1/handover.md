# Handover · QW1

## Akun & kunci (semua milik Anda)
| Layanan | Kunci | Ditaruh di |
|---|---|---|
| Dashboard | `DASHBOARD_PASSWORD`, `SESSION_SECRET` | `.env.local` / env hosting |
| Fonnte | `FONNTE_TOKEN` (+ `WA_TARGET`) | `.env.local` / env hosting |
| Telegram (opsional) | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | sama |
| Firebase (hanya Vercel) | `FIREBASE_ADMIN_*` | sama; di Vercel tempel nilai private key **tanpa tanda kutip** |
| Penjadwal HTTP | `CRON_SECRET` | env hosting + header di penjadwal |
| Binance | — | tanpa key (data publik) |

Daftar lengkap: `docs/env.md`. Langkah demi langkah: `docs/panduan-setup.md`.

## Deploy & rollback
- **VPS (disarankan):** `git pull && npm install && npm run build && pm2 restart bot-web bot-worker`. Rollback: `git checkout <commit-sebelumnya>` lalu ulangi perintah yang sama. Backup data: salin `web/data/db.json`.
- **Vercel:** setiap push ke branch produksi = deploy baru. Rollback: Deployments → deploy lama → *Promote to Production*. Ubah env → Redeploy.

## Mock / belum diuji
- Fonnte: endpoint & format respons belum dicocokkan dengan docs resmi (tidak bisa dibuka dari mesin build). Jalankan `npm run test:wa` dulu.
- Vercel Cron per 15 menit: batas paket belum diverifikasi.
- Firestore store ditulis tapi belum dijalankan terhadap project sungguhan.

## Biaya per panggilan
Tidak ada AI. Binance market data gratis (batas rate publik; bot memanggil 1 request per koin per 15 menit). Biaya Fonnte / VPS / Vercel / Firebase mengikuti paket Anda masing-masing (baca harga terbaru di situs mereka).

## Risiko yang perlu Anda tahu
- Fonnte bukan API resmi WhatsApp: nomor bisa diblokir. Pakai nomor cadangan. Opsi resmi: WhatsApp Cloud API (Meta) — modul notifier sudah terpisah, tinggal ditambah.
- Login dashboard = satu password. Pakai password kuat dan HTTPS. Tidak ada rate-limit selain jeda 0,8 dtk per percobaan salah.
- Ini alat bantu sinyal, bukan nasihat keuangan.

## Kalau nanti ingin eksekusi order otomatis
Itu di luar v1 dan butuh tim penuh (Developer Director/Danu): API key trade-only tanpa izin withdraw, whitelist IP, batas rugi harian, dan review keamanan terpisah.
