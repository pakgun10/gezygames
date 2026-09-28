# Gezy Games

Portal permainan edukasi berbasis web untuk anak PAUD/TK sampai siswa SMP. Proyek ini sedang dikembangkan berdasarkan [PRD](./docs/PRD.md) dan [backlog](./docs/ISSUES.md).

Brief game aktif:

- [Math Archer / Pemanah Matematika](./docs/games/math-archer.md)
- [Math Adventure: Jelajah Pulau Matematika](./docs/games/math-adventure.md)
- [Science Lab: Laboratorium Sains](./docs/games/science-lab.md)
- [Math Castle](./docs/games/math-castle.md)
- [Math Space Mission](./docs/games/math-space-mission.md)
- [Quiz Runner](./docs/games/quiz-runner.md)
- [Puzzle Quest](./docs/games/puzzle-quest.md)
- [Kebijakan versioning](./docs/VERSIONING.md)

Math Adventure sudah memiliki vertical slice Fase D pada `/math-adventure/` dengan alur Pantai → Hutan → boss.
Science Lab sudah memiliki prototipe eksperimen penyaringan air pada `/science-lab/`.
Math Castle sudah memiliki vertical slice pertahanan kastil pada `/math-castle/`.
Math Space Mission sudah memiliki vertical slice perjalanan tiga planet pada `/math-space-mission/`.
Quiz Runner sudah memiliki vertical slice lintasan empat jalur pada `/quiz-runner/`.
Puzzle Quest sudah memiliki vertical slice susun langkah dan pasangkan pasangan pada `/puzzle-quest/`.

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
