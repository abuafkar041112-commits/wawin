# Variabel environment · QW1

File: `web/.env.local` (git-ignored). Contoh tanpa nilai: `web/.env.example`. Isi nilai rahasia dengan `node tools/set_env.mjs web/.env.local NAMA_VARIABEL`, cek dengan `node tools/env_check.mjs web/.env.local`.

| Nama | Wajib | Rahasia | Untuk |
|---|---|---|---|
| `DASHBOARD_PASSWORD` | ya | ya | Password masuk dashboard (8+ karakter) |
| `SESSION_SECRET` | ya | ya | Menandatangani cookie login (32+ karakter, buat dengan `node tools/gen_secret.mjs`) |
| `FONNTE_TOKEN` | untuk WA | ya | Token device Fonnte |
| `WA_TARGET` | untuk WA | tidak* | Nomor tujuan, format `628…`, pisahkan koma untuk beberapa nomor |
| `NOTIFIER` | tidak | tidak | `fonnte` / `telegram` / `console`. Kosong = fonnte jika token ada |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | jika telegram | token ya | Alternatif WhatsApp |
| `STORE` | tidak | tidak | `file` (default, VPS/PC) atau `firestore` (wajib di Vercel) |
| `DATA_DIR` | tidak | tidak | Folder data untuk `STORE=file` (default `web/data`) |
| `FIREBASE_ADMIN_PROJECT_ID`, `FIREBASE_ADMIN_CLIENT_EMAIL`, `FIREBASE_ADMIN_PRIVATE_KEY` | jika firestore | private key ya | Akses server ke Firestore |
| `CRON_SECRET` | jika pakai `/api/cron/scan` | ya | Header `Authorization: Bearer <CRON_SECRET>` (16+ karakter) |
| `BINANCE_BASE_URLS` | tidak | tidak | Urutan sumber data. Default `https://data-api.binance.vision,https://api.binance.com` |

\* Nomor HP adalah data pribadi; jangan di-commit.
