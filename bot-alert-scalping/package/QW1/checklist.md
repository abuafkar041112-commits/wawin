# Checklist · QW1

## Sebelum jalan
- [ ] `node tools/env_check.mjs web/.env.local` → `DASHBOARD_PASSWORD`, `SESSION_SECRET`, `FONNTE_TOKEN`, `WA_TARGET` = set
- [ ] Nomor WA cadangan tertaut di Fonnte (status connected)
- [ ] `npm run test:wa` → pesan tes masuk
- [ ] `npm run historical -- --send` → 1 alert historis masuk ke WA
- [ ] Level/zona/plan di **Pengaturan** sudah sesuai rencana hari ini
- [ ] Hosting dipilih (VPS + pm2, atau Vercel + Firestore + penjadwal) dan variabel yang sama diisi di sana
- [ ] Dashboard diakses lewat HTTPS
- [ ] Vercel saja: `STORE=firestore`, `CRON_SECRET` diisi, penjadwal tiap 15 menit memakai header `Authorization: Bearer …`

## Setelah jalan
- [ ] Dashboard: "Scan terakhir" berwarna hijau dan < 20 menit lalu
- [ ] Tidak ada "Error scan terakhir"
- [ ] Alert pertama masuk WA dan tercatat di **Log alert** dengan status kirim hijau
- [ ] Setelah beberapa hari: lihat win rate per koin di Log alert, rapikan level yang terlalu sering memicu
- [ ] Backup `web/data/db.json` (VPS) secara berkala
