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

