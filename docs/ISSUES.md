# Backlog Issues — Gezy Games

**Sumber kebutuhan:** [PRD](./PRD.md)  
**Status:** Backlog awal, belum dipublikasikan ke GitHub  
**Konvensi prioritas:** P0 wajib untuk MVP, P1 penting setelah alur inti, P2 pengembangan berikutnya

Dokumen ini berisi issue yang cukup konkret untuk dipindahkan ke GitHub. Urutannya mengikuti dependensi produk. Detail teknis boleh disesuaikan setelah spike arsitektur, tetapi acceptance criteria menjaga hasil yang diharapkan.

## Milestone M0 — Product foundation

### GZG-001 — Tetapkan nama produk dan konvensi nama game

**Tipe:** Decision  
**Prioritas:** P0  
**Depends on:** —

Tentukan nama portal, pola nama Indonesia/Inggris, dan aturan slug URL agar UI, metadata, dan struktur aplikasi konsisten.

**Acceptance criteria**

- [ ] Nama produk utama dipilih.
- [ ] Pola nama game dipilih: Indonesia, Inggris, atau dwibahasa.
- [ ] Aturan slug URL didokumentasikan.
- [x] Judul dan deskripsi singkat Math Archer ditetapkan.

### GZG-002 — Susun panduan konten dan cakupan Matematika MVP

**Tipe:** Content  
**Prioritas:** P0  
**Depends on:** —

Tentukan topik prioritas untuk Fase Fondasi, A, B, C, dan D serta standar penulisan soal dan pembahasan.

**Acceptance criteria**

- [ ] Topik MVP untuk setiap fase terdaftar.
- [ ] Setiap topik memiliki tujuan belajar dan contoh soal.
- [ ] Aturan bahasa, notasi, distraktor, dan pembahasan didokumentasikan.
- [ ] Ada checklist review ketepatan materi dan kesesuaian fase.
- [ ] Pemilik atau proses persetujuan konten ditentukan.

### GZG-003 — Buat brief game Math Archer dan Math Adventure

**Tipe:** Game design  
**Prioritas:** P0  
**Depends on:** GZG-001, GZG-002

Definisikan first playable Math Archer serta arah game unggulan Math Adventure, termasuk loop, ekonomi, progres, interaksi belajar, dan kebutuhan aset.

**Acceptance criteria**

- [x] Tujuan belajar dan target pemain ditulis.
- [x] Loop Math Archer dan alur satu sesi dijelaskan.
- [x] Peta, wilayah, misi, ekonomi, dan loop Math Adventure dijelaskan.
- [x] Efek jawaban benar, salah, dan waktu habis ditentukan.
- [x] Prinsip mode IFP dan target sentuh ditentukan.
- [x] Timer dapat dinonaktifkan atau memakai mode santai.

### GZG-004 — Lakukan spike arsitektur dan catat keputusan

**Tipe:** Technical spike  
**Prioritas:** P0  
**Depends on:** GZG-003

Buktikan struktur monorepo, build multi-aplikasi, paket bersama, serta batas antara DOM UI dan scene game.

**Acceptance criteria**

- [ ] Opsi workspace dan struktur direktori dibandingkan singkat.
- [ ] Portal dan satu aplikasi contoh dapat memakai paket TypeScript bersama.
- [ ] Strategi routing/deployment untuk `/` dan `/math-castle/` terbukti.
- [ ] Keputusan penggunaan Phaser beserta batasnya dicatat.
- [ ] Hasil spike ditulis dalam `docs/ARCHITECTURE.md`.

## Milestone M1 — Platform foundation

### GZG-005 — Inisialisasi monorepo dan quality gates

**Tipe:** Infrastructure  
**Prioritas:** P0  
**Depends on:** GZG-004

Siapkan workspace utama untuk portal, game, dan paket bersama.

**Acceptance criteria**

- [ ] Portal dan Math Archer memiliki aplikasi terpisah dalam satu workspace.
- [ ] Perintah development dan production build terdokumentasi.
- [ ] Type checking, lint, dan formatting dapat dijalankan dari root.
- [ ] Build bersih berhasil dari checkout baru.
- [ ] Repositori Lompat Kodok tidak disalin ke source tree produk.

### GZG-006 — Implementasikan design tokens dan komponen UI dasar

**Tipe:** Design system  
**Prioritas:** P0  
**Depends on:** GZG-005

Terapkan palet hijau Gezy Games, tipografi, jarak, bentuk, bayangan, serta komponen interaksi yang konsisten.

**Acceptance criteria**

- [ ] Token warna utama mencakup forest, forest deep, grass, moss, gold, cream, wood, rock, sky, dan ink dari PRD.
- [ ] Tombol primer, sekunder, kartu, badge, dialog, input, dan focus state tersedia.
- [ ] Komponen memenuhi ukuran target sentuh minimum.
- [ ] Informasi status tidak hanya bergantung pada warna.
- [ ] Contoh komponen dapat dilihat pada halaman internal atau portal.

### GZG-007 — Bangun portal katalog responsif

**Tipe:** Feature  
**Prioritas:** P0  
**Depends on:** GZG-005, GZG-006

Buat beranda Gezy Games yang memperkenalkan produk dan menampilkan katalog dua belas game.

**Acceptance criteria**

- [ ] Seluruh game pada PRD tampil sebagai kartu katalog.
- [ ] Math Archer berstatus dapat dimainkan; game lain dapat ditandai segera hadir sesuai roadmap.
- [ ] Kartu menampilkan nama, mapel, fase, mekanik singkat, status, dan aksi yang sesuai.
- [ ] Portal responsif pada ponsel, tablet, desktop, dan layar besar.
- [ ] Navigasi keyboard dan focus order masuk akal.
- [ ] Metadata halaman, favicon, dan theme color tersedia.

### GZG-008 — Definisikan skema bank soal bersama

**Tipe:** Platform  
**Prioritas:** P0  
**Depends on:** GZG-002, GZG-005

Buat tipe data dan aturan validasi untuk soal manual maupun soal berbasis generator.

**Acceptance criteria**

- [ ] Skema mendukung ID, mapel, fase, topik, kesulitan, tipe, prompt, jawaban, pembahasan, aset, dan status editorial.
- [ ] ID ganda dan data wajib yang hilang menyebabkan validasi gagal.
- [ ] Pilihan ganda menjamin tepat satu jawaban benar.
- [ ] Skema memiliki versi.
- [ ] Contoh valid dan tidak valid tersedia sebagai fixture.

### GZG-009 — Buat pipeline validasi konten

**Tipe:** Tooling  
**Prioritas:** P0  
**Depends on:** GZG-008

Tambahkan pemeriksaan bank soal sebagai bagian dari workflow pengembangan dan build.

**Acceptance criteria**

- [ ] Semua data soal diperiksa terhadap skema.
- [ ] Error menyebut file atau ID soal dan alasan kegagalan.
- [ ] Soal berstatus draft tidak masuk build produksi.
- [ ] Perintah validasi dapat dijalankan dari root.
- [ ] Build produksi gagal jika konten terbit tidak valid.

### GZG-010 — Implementasikan mesin sesi dan remedial

**Tipe:** Platform  
**Prioritas:** P0  
**Depends on:** GZG-008

Buat mesin murni tanpa ketergantungan UI yang mengatur pemilihan soal, jawaban, remedial, skor belajar, dan hasil sesi.

**Acceptance criteria**

- [ ] Sesi dapat dibuat berdasarkan fase, topik, dan jumlah soal.
- [ ] Pilihan dapat diacak tanpa merusak kunci jawaban.
- [ ] Soal atau konsep yang salah dijadwalkan ulang setelah jarak yang dapat dikonfigurasi.
- [ ] Mesin membedakan penguasaan materi dan skor game.
- [ ] Pause tidak mengurangi waktu sesi.
- [ ] Hasil sesi memuat data yang diperlukan laporan.
- [ ] Unit test mencakup pengacakan, remedial, pause, dan kondisi selesai.

### GZG-011 — Implementasikan penyimpanan progres lokal

**Tipe:** Platform  
**Prioritas:** P0  
**Depends on:** GZG-005

Simpan preferensi dan progres dasar di browser dengan skema yang dapat berkembang.

**Acceptance criteria**

- [ ] Nama panggilan, audio, fase terakhir, topik terakhir, dan progres per game dapat disimpan.
- [ ] Payload penyimpanan memiliki nomor versi.
- [ ] Data rusak ditangani tanpa membuat aplikasi gagal dibuka.
- [ ] Game tetap dapat dimainkan bila storage tidak tersedia.
- [ ] Pengguna dapat menghapus seluruh progres lokal.

### GZG-012 — Buat shell game bersama

**Tipe:** Platform  
**Prioritas:** P0  
**Depends on:** GZG-006, GZG-010, GZG-011

Sediakan UI umum untuk konfigurasi sesi, HUD, pause, bantuan, audio, layar penuh, dan keluar ke portal.

**Acceptance criteria**

- [ ] Game dapat memilih fase, topik, nama pemain, dan mode waktu.
- [ ] HUD dapat menampilkan progres, skor game, status target, dan timer bila aktif.
- [ ] Menu pause menghentikan waktu dan input permainan.
- [ ] Perpindahan tab menjeda sesi dengan aman.
- [ ] Bantuan kontrol tersedia untuk sentuh dan keyboard.
- [ ] Keluar dari sesi meminta konfirmasi hanya ketika progres sesi akan hilang.

### GZG-013 — Buat komponen laporan hasil bersama

**Tipe:** Feature  
**Prioritas:** P0  
**Depends on:** GZG-010, GZG-006

Buat laporan yang dapat dipakai semua game dan memisahkan hasil belajar dari skor hiburan.

**Acceptance criteria**

- [ ] Ringkasan menampilkan benar, salah, tidak terjawab, akurasi, waktu, dan skor.
- [ ] Hasil dapat dikelompokkan per topik.
- [ ] Rincian menampilkan soal, jawaban pemain, jawaban benar, dan pembahasan.
- [ ] Tersedia aksi ulangi, ganti materi, dan kembali ke portal.
- [ ] Laporan terbaca pada ponsel serta dapat dinavigasi dengan keyboard.

## Milestone M2 — Math Archer first playable

### GZG-014 — Produksi bank soal Matematika Fase Fondasi–D

**Tipe:** Content  
**Prioritas:** P0  
**Depends on:** GZG-002, GZG-008, GZG-009

Tulis atau bangun generator untuk set soal awal berdasarkan cakupan yang telah disepakati.

**Acceptance criteria**

- [ ] Setiap fase memiliki jumlah soal minimum yang disepakati untuk topik MVP.
- [ ] Semua soal memiliki pembahasan.
- [ ] Distraktor masuk akal dan tidak ambigu.
- [ ] Soal telah melalui review editorial.
- [ ] Seluruh konten lolos pipeline validasi.

### GZG-015 — Bangun scene dan loop inti Math Archer

**Tipe:** Game feature  
**Prioritas:** P0  
**Depends on:** GZG-003, GZG-010, GZG-012, GZG-014

Implementasikan satu sesi lengkap Math Archer dari pemilihan fase hingga kondisi akhir.

**Acceptance criteria**

- [ ] Pertanyaan dan pilihan terhubung ke mesin sesi bersama.
- [ ] Jawaban benar menghasilkan animasi panah mengenai target, XP, koin, dan streak.
- [ ] Jawaban salah menghasilkan panah meleset, petunjuk ramah, dan state game yang konsisten.
- [ ] Kondisi menang dan kalah sesuai brief.
- [ ] Remedial muncul tanpa terasa sebagai pengulangan langsung.
- [ ] Sesi dapat diselesaikan dengan sentuh, mouse, dan keyboard.
- [ ] Hasil dikirim ke laporan bersama.

### GZG-016 — Buat aset dan audio Math Archer

**Tipe:** Art/audio  
**Prioritas:** P0  
**Depends on:** GZG-003, GZG-006

Buat arena memanah yang konsisten dengan gaya hijau-alam Gezy Games dan tetap menyisakan area baca yang tenang.

**Acceptance criteria**

- [ ] Daftar aset final mengacu pada brief game.
- [ ] Latar tidak memiliki teks, soal, jawaban, atau kontrol yang menyatu di gambar.
- [ ] Aset karakter/objek penting memiliki state yang diperlukan.
- [ ] Ukuran dan format aset dioptimalkan untuk web.
- [ ] Audio memiliki volume yang wajar dan dapat dimatikan.
- [ ] Sumber, kepemilikan, dan lisensi setiap aset tercatat.

### GZG-017 — Tambahkan animasi, feedback, dan reduced motion

**Tipe:** UX  
**Prioritas:** P1  
**Depends on:** GZG-015, GZG-016

Tambahkan respons visual/audio yang membuat aksi terasa hidup tanpa menghalangi kegiatan belajar.

**Acceptance criteria**

- [ ] Jawaban benar, salah, serangan, kerusakan, dan kemenangan memiliki feedback yang berbeda.
- [ ] Input dikunci selama transisi yang dapat menyebabkan jawaban ganda.
- [ ] Animasi tidak menunda soal berikutnya secara berlebihan.
- [ ] `prefers-reduced-motion` mengurangi atau mengganti animasi besar.
- [ ] Informasi tetap lengkap ketika audio dimatikan.

## Milestone M3 — MVP release

### GZG-018 — Audit aksesibilitas dan pengujian perangkat

**Tipe:** QA  
**Prioritas:** P0  
**Depends on:** GZG-007, GZG-013, GZG-015, GZG-017

Uji alur utama pada kombinasi ukuran layar dan metode input sasaran.

**Acceptance criteria**

- [ ] Alur portal hingga laporan selesai diuji dengan keyboard saja.
- [ ] Target sentuh, focus state, dialog, kontras, dan zoom diperiksa.
- [ ] Ponsel portrait/landscape, tablet, desktop, dan layar besar diuji.
- [ ] Pause ketika tab tersembunyi dan kembali aktif diuji.
- [ ] Masalah P0 dan P1 hasil audit ditutup atau memiliki keputusan rilis eksplisit.

### GZG-019 — Optimalkan performa dan ketahanan runtime

**Tipe:** Performance  
**Prioritas:** P0  
**Depends on:** GZG-015, GZG-016

Ukur dan perbaiki waktu muat, ukuran aset, serta perilaku aplikasi pada kondisi tidak ideal.

**Acceptance criteria**

- [ ] Bundle dan aset terbesar diidentifikasi serta dicatat.
- [ ] Gambar/audio dimuat sesuai kebutuhan dan dikompresi secara layak.
- [ ] Tidak ada error JavaScript pada alur utama.
- [ ] Refresh pada URL game langsung tetap membuka aplikasi yang benar.
- [ ] Kegagalan audio atau storage tidak menghentikan permainan.
- [ ] Anggaran performa awal ditetapkan berdasarkan hasil pengukuran.

### GZG-020 — Siapkan build dan deployment VPS

**Tipe:** Operations  
**Prioritas:** P0  
**Depends on:** GZG-007, GZG-015, GZG-019

Publikasikan build statis melalui Nginx pada domain produksi dengan proses deployment yang dapat diulang.

**Acceptance criteria**

- [ ] Build produksi menghasilkan portal dan game pada path yang benar.
- [ ] Konfigurasi Nginx menangani root, subpath game, caching aset, dan fallback yang diperlukan.
- [ ] HTTPS aktif untuk `games.gezytech.web.id`.
- [ ] Prosedur deployment dan rollback terdokumentasi.
- [ ] Smoke test produksi mencakup portal, mulai game, selesai, laporan, dan refresh URL langsung.

### GZG-021 — Lakukan sesi uji pengguna MVP

**Tipe:** Research  
**Prioritas:** P1  
**Depends on:** GZG-018, GZG-020

Amati siswa dan pendamping menggunakan produk untuk menguji pemahaman, kenyamanan, dan nilai belajarnya.

**Acceptance criteria**

- [ ] Skenario dan pertanyaan uji disiapkan tanpa mengarahkan jawaban.
- [ ] Penguji mencakup perwakilan perangkat dan fase sasaran yang realistis.
- [ ] Kemampuan memulai, memahami akibat jawaban, menyelesaikan sesi, dan membaca laporan dicatat.
- [ ] Temuan dikelompokkan berdasarkan tingkat dampak.
- [ ] Perbaikan kritis dibuat menjadi issue lanjutan sebelum ekspansi game.

## Milestone M4 — Platform validation

### GZG-022 — Buat vertical slice Math Adventure

**Tipe:** Game feature  
**Prioritas:** P2  
**Depends on:** GZG-021

Bangun game unggulan kedua yang memakai fondasi bersama serta menambahkan peta, karakter, misi, dan tipe interaksi baru.

**Acceptance criteria**

- [ ] Brief menjelaskan peta pulau, progres wilayah, misi, ekonomi, boss, kondisi akhir, dan kebutuhan aset.
- [ ] Game memakai bank soal, mesin sesi, progres, shell, dan laporan bersama.
- [ ] Tidak ada salinan paket inti di aplikasi game.
- [ ] Perbedaan kebutuhan yang sah menghasilkan perbaikan API bersama yang terdokumentasi.
- [ ] Vertical slice Pantai–Hutan–boss awal dapat dimainkan dari portal.

## Milestone M5 — Interactive learning

### GZG-023 — Rancang prototipe interaksi Science Lab

**Tipe:** Research/prototype  
**Prioritas:** P2  
**Depends on:** GZG-021

Uji satu eksperimen virtual sederhana yang melibatkan manipulasi, prediksi, observasi, dan penjelasan.

**Acceptance criteria**

- [ ] Eksperimen terkait tujuan belajar IPAS yang spesifik.
- [ ] Pemain melakukan interaksi bermakna selain memilih jawaban teks.
- [ ] Hasil eksperimen dapat diamati dan dijelaskan.
- [ ] Prototipe diuji pada sentuh dan mouse.
- [ ] Kebutuhan perluasan model konten dan mesin sesi didokumentasikan.

## Issue template yang disarankan

Gunakan format ini saat backlog dipindahkan ke GitHub:

```md
## Masalah

Jelaskan kebutuhan pengguna atau masalah yang ingin diselesaikan.

## Hasil yang diharapkan

Jelaskan perilaku akhir dari sudut pandang pengguna.

## Acceptance criteria

- [ ] Kriteria yang dapat diuji

## Catatan

Tautan desain, keputusan teknis, dependensi, atau batas scope.
```

## Label yang disarankan

- Tipe: `type: feature`, `type: platform`, `type: content`, `type: design`, `type: qa`, `type: ops`, `type: research`
- Prioritas: `priority: p0`, `priority: p1`, `priority: p2`
- Area: `area: portal`, `area: game-core`, `area: questions`, `area: progress`, `area: math-castle`, `area: accessibility`
- Status khusus: `blocked`, `needs-decision`, `good-first-issue`
