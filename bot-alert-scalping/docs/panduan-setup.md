# Panduan setup · Fonnte & deploy (QW1)

Semua akun milik Anda. Rahasia (token, password) **jangan dikirim lewat chat**; isi sendiri di terminal dengan helper.

## 0. Jalankan di komputer sendiri dulu (10 menit)

```bash
cd bot-alert-scalping/web
npm install
node ../tools/gen_secret.mjs          # salin hasilnya untuk SESSION_SECRET
node ../tools/set_env.mjs .env.local SESSION_SECRET
node ../tools/set_env.mjs .env.local DASHBOARD_PASSWORD
npm run build && npm start            # dashboard di http://localhost:3000
npm run worker                        # terminal kedua: scan tiap close 15m
```

Tanpa token WhatsApp, alert hanya tampil di log terminal (notifier `console`). Itu normal untuk uji.

## 1. Fonnte (WhatsApp, tidak resmi)

> Fonnte memakai WhatsApp biasa lewat "perangkat tertaut". Ini **bukan API resmi Meta**: nomor bisa diblokir WhatsApp. Pakai **nomor cadangan**, bukan nomor utama. Langkah di bawah belum dicocokkan dengan dokumentasi Fonnte terbaru; tampilan situs bisa berbeda.

1. Siapkan HP dengan WhatsApp nomor cadangan.
2. Buka fonnte.com → daftar / masuk.
3. Menu **Device** → **Add device** → isi nama & nomor cadangan → simpan.
4. Klik **Connect** pada device itu → muncul QR.
5. Di HP: WhatsApp → **Perangkat tertaut** → **Tautkan perangkat** → scan QR.
6. Status device jadi *connected*. Salin **token** device.
7. Di terminal (token tidak akan tampil):
   ```bash
   node ../tools/set_env.mjs .env.local FONNTE_TOKEN
   node ../tools/set_env.mjs .env.local WA_TARGET     # nomor penerima, contoh 628123456789
   node ../tools/env_check.mjs .env.local
   ```
8. **Uji 1 pesan WA:** `npm run test:wa` → harus muncul `OK` dan pesan masuk ke nomor penerima.
9. **Uji 1 alert dari data historis:** `npm run historical -- --send` → mengirim alert historis terakhir dengan label `🧪 [UJI DATA HISTORIS]`.
   Tambah `--auto` untuk aturan demo bila level Anda belum pernah tersentuh di 10 hari terakhir.

Kalau gagal: `Fonnte HTTP 4xx: ...` biasanya token salah atau device terputus (scan QR ulang). Pesan apa adanya dari Fonnte ikut ditampilkan.

Ganti ke Telegram kapan saja: isi `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`, set `NOTIFIER=telegram`.

## 2. Supaya jalan 24/7 — pilih satu

### Opsi A (disarankan): satu server kecil yang selalu menyala (VPS)
Paling sederhana dan jadwalnya tepat (:00/:15/:30/:45 + 5 detik). Penyimpanan cukup file (`STORE=file`).
1. Sewa VPS Linux kecil (penyedia bebas; **pilih lokasi Singapura/Jakarta**, karena `api.binance.com` menolak beberapa lokasi seperti AS dengan HTTP 451. Bot sudah otomatis memakai `data-api.binance.vision` lebih dulu).
2. Pasang Node.js LTS ≥ 22.9 dan Git, clone repo, lalu ulangi langkah 0 dan 1 di VPS.
3. Jalankan permanen dengan pm2:
   ```bash
   npm install -g pm2
   pm2 start npm --name bot-web -- start
   pm2 start npm --name bot-worker -- run worker
   pm2 save && pm2 startup
   ```
4. Dashboard: buka `http://IP-VPS:3000`, sebaiknya di belakang HTTPS (misalnya Caddy) sebelum dipakai dari internet, karena password dikirim lewat form.

### Opsi B: Vercel + Firestore + penjadwal
Vercel tidak punya disk tetap, jadi wajib `STORE=firestore`, dan tidak ada proses yang selalu menyala, jadi scan dipicu lewat `GET /api/cron/scan` setiap 15 menit dengan header `Authorization: Bearer <CRON_SECRET>`.
1. Firebase: console.firebase.google.com → **Add project** → **Build → Firestore Database → Create database** (mode production). Bot hanya mengakses lewat Admin SDK di server, jadi aturan Firestore boleh menolak semua akses dari browser.
2. **Project settings → Service accounts → Generate new private key** → simpan JSON di folder `web/`, lalu jalankan `node ../tools/firebase_key_to_env.mjs <nama-file>.json .env.local` (menyalin ke 3 variabel `FIREBASE_ADMIN_*` tanpa menampilkannya, lalu menghapus file JSON). Itu kunci utama database: jangan dibagikan, jangan di-commit.
3. Push repo ke GitHub Anda, vercel.com → **Add New → Project** → pilih repo, **Root Directory** `bot-alert-scalping/web`.
4. Isi Environment Variables di Vercel (salin dari `.env.local` Anda sendiri) + `STORE=firestore` + `CRON_SECRET`. Setelah mengubah variabel: **Redeploy**.
5. Penjadwal: cek di halaman *Cron Jobs → Usage & pricing* Vercel apakah paket Anda mengizinkan jadwal per 15 menit (**belum diverifikasi**; paket gratis dulu dibatasi). Jika tidak, pakai layanan cron eksternal yang bisa mengirim header Authorization, URL `https://<domain>/api/cron/scan`, tiap 15 menit di menit :00/:15/:30/:45.
6. Cek: buka `https://<domain>/api/health` → `{"ok":true}`; `.../api/cron/scan` tanpa header → `unauthorized` (artinya hidup dan terlindungi).
7. Baca syarat penggunaan komersial paket Hobby Vercel sebelum dipakai untuk bisnis.

## 3. Mengatur level
Dashboard → **Pengaturan**: koin, level (4 jenis kondisi), zona rejection, entry/SL/TP, on/off per aturan, cooldown, jeda weekend, jumlah candle evaluasi. Simpan → berlaku di scan berikutnya. Level yang sudah tertembus pada candle yang **sudah diproses** tidak dikirim ulang; alert muncul di close berikutnya yang memenuhi syarat.
