# Gezy Games

Portal permainan edukasi berbasis web untuk anak PAUD/TK sampai siswa SMP. Proyek ini sedang dikembangkan berdasarkan [PRD](./docs/PRD.md) dan [backlog](./docs/ISSUES.md).

Brief game aktif:

- [Math Archer / Pemanah Matematika](./docs/games/math-archer.md)
- [Math Adventure: Jelajah Pulau Matematika](./docs/games/math-adventure.md)

Dokumen fondasi:

- [Arsitektur](./docs/ARCHITECTURE.md)
- [Panduan konten Matematika MVP](./docs/CONTENT-GUIDE.md)
- [Deployment VPS](./deploy/README.md)

## Menjalankan portal

```bash
npm install
npm run dev
```

Perintah pemeriksaan utama:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Folder `lompatkodok/` adalah referensi lokal dan diabaikan oleh Git. Kode maupun asetnya bukan bagian dari Gezy Games.
