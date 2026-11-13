# BRIEF · QW1 · Bot Alert Scalping Crypto → WhatsApp (v1)

- **Route:** solo (Nathan). Tag yang diasumsikan aktif: `website-webapp`. Platform: web (Next.js) + worker Node.
- **Must-have:** (1) pantau BTCUSDT & ETHUSDT 15m dari data publik Binance, hanya candle close; (2) alert level cross per koin; (3) alert rejection di zona (wick ≥ 50%); (4) R:R otomatis dari entry/SL/TP; (5) kirim ke WhatsApp (Fonnte), notifier bisa diganti, anti-spam 1x/jam; (6) dashboard atur koin/level/zona/plan + on/off + jeda weekend; (7) log alert + evaluasi TP1 vs SL setelah N candle.
- **Di luar cakupan:** eksekusi order otomatis.
- **Look:** gelap ala terminal trading, Space Grotesk + JetBrains Mono, aksen amber, hijau = long, merah = short. Alasan: dibaca cepat, angka rata (mono), cocok untuk layar trading.
- **Asumsi:** "level cross" = candle yang close menembus level (close sebelumnya di sisi lain); "BTC > 69.150 lalu rejection" = high di atas level lalu close kembali di bawah; "mode weekend" = jeda alert Sabtu–Minggu WIB; evaluasi diukur dari close candle alert (bukan fill entry); login dashboard = satu password pemilik (bukan Clerk) karena hanya ada satu pengguna.
