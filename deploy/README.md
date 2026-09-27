# Deployment

Gezy Games menghasilkan situs statis di `dist/`; tidak memerlukan PM2 atau proses aplikasi yang terus hidup.

## Update produksi

Jalankan pada VPS sebagai pengguna `ubuntu`:

```bash
cd /home/ubuntu/gezygames
git pull --ff-only
npm ci
npm run typecheck
npm test
npm run build
sudo nginx -t
sudo systemctl reload nginx
```

Konfigurasi Nginx produksi berada di `deploy/nginx/gezygames.conf`. File `gezygames-bootstrap.conf` hanya dipakai ketika sertifikat TLS pertama belum tersedia.

## Pemeriksaan setelah deploy

```bash
curl -fsSI https://games.gezytech.web.id/
curl -fsSI https://games.gezytech.web.id/math-archer/
sudo systemctl is-active nginx
```

Buka Math Archer, mulai satu sesi, lalu pastikan laporan hasil dan refresh langsung pada `/math-archer/` berfungsi.

## Rollback

Gunakan commit yang sudah diketahui baik dari riwayat Git. Perintah ini memindahkan checkout VPS ke commit tersebut tanpa mengubah riwayat GitHub:

```bash
cd /home/ubuntu/gezygames
git log --oneline -10
git checkout --detach <commit-baik>
npm ci
npm run build
sudo nginx -t
sudo systemctl reload nginx
```

Untuk kembali menerima update terbaru setelah rollback:

```bash
cd /home/ubuntu/gezygames
git switch main
git pull --ff-only
```
