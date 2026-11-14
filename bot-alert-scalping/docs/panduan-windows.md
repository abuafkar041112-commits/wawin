# Jalankan di laptop Windows

Pakai **Command Prompt** (ketik `cmd` di Start), bukan PowerShell. Di PowerShell perintah `npm` sering ditolak dengan pesan *"running scripts is disabled"*.

## 1. Install (sekali saja)
```
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```
Tutup Command Prompt, buka lagi, lalu cek: `node --version` (harus v22.9 atau lebih baru).

## 2. Ambil kode
```
cd %USERPROFILE%\Documents
git clone -b claude/peaceful-noether-erm2b9 https://github.com/abuafkar041112-commits/wawin.git
cd wawin\bot-alert-scalping\web
npm install
```

## 3. Password dashboard
Tidak perlu langkah terpisah: `jalankan-bot.bat` mengecek sendiri. `SESSION_SECRET` dibuat otomatis, dan jika `DASHBOARD_PASSWORD` kosong kamu diminta mengetiknya dua kali (tidak tampil di layar; minimal 8 karakter, tanpa `$`).
Cek manual kapan saja: `node ..\tools\setup_login.mjs .env.local --check`

**Lupa password atau muncul "Password salah"?** Tutup kedua jendela bot, dobel-klik `web\ganti-password.bat`, ketik password baru dua kali, lalu dobel-klik `jalankan-bot.bat` lagi. Pakai huruf dan angka (boleh `! @ % - _ .`); `$ # tanda kutip \ spasi` ditolak karena bisa berubah saat dibaca server.

## 4. Jalankan
Dobel-klik **`web\jalankan-bot.bat`**. Dua jendela terbuka (Dashboard dan Worker) dan browser membuka http://localhost:3000. Jangan tutup kedua jendela itu.
Jika Windows Firewall bertanya, klik **Cancel** atau izinkan hanya **Private network**: dashboard cukup dibuka dari laptop sendiri.

Berhenti: tutup kedua jendela (atau Ctrl+C lalu `Y`). Jika lupa menutup, `jalankan-bot.bat` akan mendeteksi port 3000 masih dipakai dan menawarkan menghentikan proses lama.

## 5. Sambungkan WhatsApp
```
node ..\tools\set_env.mjs .env.local FONNTE_TOKEN
node ..\tools\set_env.mjs .env.local WA_TARGET
npm run test:wa
npm run historical -- --send
```
`WA_TARGET` format `628xxxx`. Setelah mengubah `.env.local`, tutup dua jendela bot lalu dobel-klik `jalankan-bot.bat` lagi.

## 6. Laptop jangan tidur
Settings → System → Power → **Screen and sleep** → "When plugged in, put my device to sleep after" = **Never**. Atau di Command Prompt (Run as administrator):
```
powercfg /change standby-timeout-ac 0
```
Tutup layar laptop juga bisa membuatnya tidur: Control Panel → Power Options → "Choose what closing the lid does" → **Do nothing** (saat dicolok).

## Update kode nanti
```
git pull
npm install
npm run build
```
lalu jalankan `jalankan-bot.bat` lagi.
