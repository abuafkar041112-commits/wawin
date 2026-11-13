# STATE · QW1

- **Status:** v1 dibangun dan diuji lokal (2026-11-13). Belum di-deploy; WhatsApp belum disambungkan (perlu token Fonnte milik user).
- **Route:** solo. Tidak ada ESCALATE. Soft signal: job terjadwal 24/7 (satu sinyal, dicatat).
- **Tag aktif:** diasumsikan `website-webapp` (belum dikonfirmasi user).
- **Kode:** `web/` (Next.js 16 + worker `scripts/worker.mts`). Data lokal di `web/data/db.json` (git-ignored).
- **Langkah berikut:** user memilih hosting (lihat `docs/panduan-setup.md`), isi `.env.local`, `npm run test:wa`, `npm run historical -- --send`.
- **Kapan perlu tim penuh (Danu):** eksekusi order otomatis, banyak pengguna/langganan, atau WhatsApp Cloud API resmi dengan template.
