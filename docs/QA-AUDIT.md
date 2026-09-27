# Audit QA awal — Math Archer

**Tanggal:** 27 September 2026  
**Build yang diuji:** `13166fd`  
**URL produksi:** `https://games.gezytech.web.id`

Dokumen ini mencatat pemeriksaan otomatis dan smoke test yang sudah dijalankan. Uji perangkat fisik dan sesi bersama siswa tetap menjadi pekerjaan GZG-018 dan GZG-021.

## Cakupan yang lulus

- Pipeline VPS: lint, format check, typecheck, 18 unit test, validasi 50 soal untuk lima fase, build portal/game, dan `nginx -t`.
- Portal produksi: judul, footer legal, tautan Math Archer, dan pembukaan game.
- Math Archer produksi pada viewport 390×844 dengan touch: setup, mulai sesi, tiga sasaran, tombol audio, pesan saat audio dimatikan, layout dua kolom, tanpa overflow, dan tanpa error JavaScript.
- Math Archer produksi pada desktop 1280×800: setup menuju arena dan kontrol HUD.
- Preview build lokal dengan keyboard: Enter memulai sesi, tombol `1–3` memilih sasaran, `P` membuka pause, dan Escape melanjutkan sesi.
- Preview build lokal dengan `prefers-reduced-motion: reduce`: durasi animasi dipangkas dan dialog pause tetap dapat digunakan.
- Refresh URL langsung `/math-archer/` membuka setup game yang benar.

## Pemeriksaan performa awal

Ukuran output Vite dari build produksi:

| Aplikasi    | JavaScript |      CSS | Gzip JavaScript | Gzip CSS |
| ----------- | ---------: | -------: | --------------: | -------: |
| Portal      |   13.29 kB | 18.20 kB |         4.64 kB |  5.40 kB |
| Math Archer |   44.91 kB | 23.78 kB |        13.43 kB |  6.30 kB |

MVP belum membundel gambar atau audio pihak ketiga. Cue permainan memakai Web Audio API dan pembacaan soal memakai Speech Synthesis API; kegagalan keduanya ditangani sebagai fitur tambahan sehingga sesi tetap berjalan.

## Pekerjaan lanjutan

- Uji nyata pada IFP 52 inci, tablet, beberapa ponsel portrait/landscape, zoom browser, dan pembaca layar.
- Uji perpindahan tab pada browser nyata serta keterbacaan kontras dengan alat audit aksesibilitas.
- Tetapkan baseline performa di jaringan lambat dan pantau ukuran bundle saat game berikutnya ditambahkan.
