# Audit QA awal — Math Archer

**Tanggal:** 27 September 2026  
**Build yang diuji:** `495c703`
**URL produksi:** `https://games.gezytech.web.id`

Dokumen ini mencatat pemeriksaan otomatis dan smoke test yang sudah dijalankan. Uji perangkat fisik dan sesi bersama siswa tetap menjadi pekerjaan GZG-018 dan GZG-021.

## Cakupan yang lulus

- Pipeline VPS: lint, format check, typecheck, 19 unit test, validasi 50 soal untuk lima fase, build portal/game, dan `nginx -t`.
- Portal produksi: judul, footer legal, tautan Math Archer, dan pembukaan game.
- Math Archer produksi pada viewport 390×844 dengan touch: setup, mulai sesi, tiga sasaran, tombol audio, pesan saat audio dimatikan, layout dua kolom, tanpa overflow, dan tanpa error JavaScript.
- Math Archer produksi pada desktop 1280×800: setup menuju arena dan kontrol HUD.
- Preview build lokal dengan keyboard: Enter memulai sesi, tombol `1–3` memilih sasaran, `P` membuka pause, dan Escape melanjutkan sesi.
- Fokus berpindah ke soal baru untuk pembaca layar dan ke judul laporan saat sesi selesai.
- Preview build lokal dengan `prefers-reduced-motion: reduce`: durasi animasi dipangkas dan dialog pause tetap dapat digunakan.
- Refresh URL langsung `/math-archer/` membuka setup game yang benar.

## Math Adventure vertical slice

- Kartu Math Adventure muncul sebagai **Mainkan vertical slice** dari portal.
- Pada viewport 390×844, setup membuka peta Pantai–Hutan–boss tanpa overflow.
- Misi Pantai memakai Himpunan, membuka Hutan setelah selesai, lalu Hutan memakai Relasi dan membuka boss.
- Boss menggabungkan Himpunan dan Relasi; seluruh rangkaian dapat diselesaikan sampai laporan hasil, dengan progres peta `3/3` dan tanpa error JavaScript.

## Science Lab prototype

- Kartu Science Lab muncul sebagai **Mainkan prototipe** dari portal.
- Pada viewport 390×844 dengan sentuhan dan desktop dengan mouse, setup membuka meja eksperimen tanpa overflow.
- Pemain memilih kerikil, pasir, dan kapas, menyusun tiga lapisan, lalu menjalankan penyaringan.
- Urutan benar mengubah meter kejernihan menjadi 92%, menampilkan hasil observasi, memberi XP/koin, dan mencegah hadiah ganda dari klik ulang.
- Urutan salah menampilkan petunjuk, mengembalikan langkah ke tahap penyusunan, dan mengizinkan percobaan ulang tanpa error JavaScript.

## Math Castle vertical slice

- Kartu Math Castle muncul sebagai **Mainkan vertical slice** dari portal.
- Pada viewport 390×844, setup fase/materi membuka arena kastil tanpa overflow.
- Jawaban benar menampilkan serangan balik, menambah XP/koin/streak, dan memperkuat meter tembok.
- Jawaban salah menampilkan serangan musuh, pembahasan, dan kesempatan mencoba kembali melalui mesin remedial.
- Sesi dapat diselesaikan sampai laporan hasil dengan sentuh atau mouse tanpa error aplikasi.

## Math Space Mission vertical slice

- Kartu Math Space Mission muncul sebagai **Mainkan vertical slice** dari portal.
- Pada viewport 390×844, setup fase/materi dan jalur tiga planet tampil tanpa overflow.
- Jawaban benar mengisi bahan bakar, menggerakkan roket, dan menandai progres planet.
- Jawaban salah menampilkan feedback, mengurangi energi secara terbatas, dan mengulang konsep melalui remedial.
- Sesi dapat diselesaikan sampai laporan hasil tanpa error aplikasi.

## Pemeriksaan performa awal

Ukuran output Vite dari build produksi:

| Aplikasi           | JavaScript |      CSS | Gzip JavaScript | Gzip CSS |
| ------------------ | ---------: | -------: | --------------: | -------: |
| Portal             |   13.29 kB | 18.20 kB |         4.64 kB |  5.40 kB |
| Math Archer        |   44.91 kB | 23.78 kB |        13.43 kB |  6.30 kB |
| Math Adventure     |   43.20 kB | 19.32 kB |        12.68 kB |  4.99 kB |
| Science Lab        |   16.31 kB | 15.62 kB |         5.68 kB |  4.27 kB |
| Math Castle        |   40.20 kB | 18.43 kB |        12.05 kB |  5.02 kB |
| Math Space Mission |   40.43 kB | 18.79 kB |        12.18 kB |  5.06 kB |

MVP belum membundel gambar atau audio pihak ketiga. Cue permainan memakai Web Audio API dan pembacaan soal memakai Speech Synthesis API; kegagalan keduanya ditangani sebagai fitur tambahan sehingga sesi tetap berjalan.

Build menjalankan `npm run check:bundle` dengan budget awal: portal maksimal 25 kB JavaScript/30 kB CSS raw dan 8 kB/8 kB gzip; Math Archer maksimal 70 kB JavaScript/35 kB CSS raw dan 18 kB/10 kB gzip; Math Adventure maksimal 85 kB JavaScript/45 kB CSS raw dan 22 kB/12 kB gzip; Science Lab maksimal 75 kB JavaScript/45 kB CSS raw dan 20 kB/12 kB gzip; Math Castle dan Math Space Mission maksimal 85 kB JavaScript/45 kB CSS raw dan 22 kB/12 kB gzip.

## Pekerjaan lanjutan

- Uji nyata pada IFP 52 inci, tablet, beberapa ponsel portrait/landscape, zoom browser, dan pembaca layar.
- Uji perpindahan tab pada browser nyata serta keterbacaan kontras dengan alat audit aksesibilitas.
- Tetapkan baseline performa di jaringan lambat dan pantau ukuran bundle saat game berikutnya ditambahkan.
