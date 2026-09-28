# Game Design Brief — Puzzle Quest: Petualangan Puzzle

**Status:** Vertical slice tersedia  
**Rilis sasaran:** Game ekspansi setelah Quiz Runner  
**Fase awal:** A–D

## Janji permainan

Pemain menjelajah ruang teka-teki dan membuka pintu dengan menyusun langkah matematika atau memasangkan dua representasi yang berhubungan. Jawaban tidak disajikan sebagai pilihan A/B/C biasa; pemain melakukan operasi berpikir melalui kepingan yang dapat disentuh, dipilih dengan keyboard, atau dipasangkan dengan pola ketuk-ketuk.

## Loop vertical slice

1. Pemain memilih fase dan materi yang memiliki puzzle.
2. Soal matematika dari bank bersama memberi konteks tantangan.
3. Pemain menyelesaikan satu dari dua jenis interaksi: `sequence` atau `match`.
4. Jawaban benar menyalakan kristal, membuka pintu, dan memberi XP serta koin.
5. Jawaban salah memberi pembahasan; pemain boleh memperbaiki puzzle tanpa kehilangan progres pintu.
6. Setelah empat pintu atau seluruh materi terpilih dikuasai, laporan belajar ditampilkan.

## Jenis interaksi

### `sequence` — susun langkah

Pemain mengetuk kepingan dalam urutan yang benar. Setiap kepingan juga merupakan tombol keyboard. Tombol angka memilih kepingan pertama sampai ketiga, dan tombol `Atur ulang` mengembalikan puzzle ke keadaan awal.

Contoh Fase A: `Mulai dari 7 → Tambahkan 5 → Hasilnya 12`.

### `match` — hubungkan pasangan

Pemain mengetuk satu keping dari kolom kiri lalu satu keping dari kolom kanan. Mode ini sengaja memakai ketuk-ketuk agar tidak bergantung pada drag panjang di layar kelas. Tombol angka memilih keping kiri, sedangkan `Q`, `W`, dan `E` memilih keping kanan pertama sampai ketiga.

Contoh Fase D: `1 → 2`, `2 → 4`, dan `3 → 6` untuk relasi “dua kali dari”.

## Konten dan validasi

Konten vertical slice disimpan di `apps/puzzle-quest/src/puzzles.ts`. Setiap puzzle memiliki `questionId` yang harus menunjuk ke soal `published` pada bank soal bersama. Validasi saat modul dimuat memeriksa:

- ID puzzle tidak boleh ganda dan judul/instruksi wajib tersedia.
- `sequence` harus memakai semua kepingan tepat sekali, tanpa indeks di luar batas.
- `match` harus memiliki jumlah kolom dan pasangan yang sama, dengan setiap indeks kiri dan kanan muncul tepat sekali.
- Kunci jawaban dan pembahasan tetap berasal dari soal bank agar laporan bersama tidak memiliki salinan konten.

Vertical slice saat ini mencakup dua puzzle untuk setiap fase A–D: penjumlahan/pengurangan, perkalian/pecahan, persentase/luas, serta fungsi/relasi. Penambahan fase atau topik baru dilakukan dengan menambah soal terbit di bank dan satu entri puzzle yang lolos validasi.

## Progres dan remedial

Puzzle Quest memakai `game-core` untuk sesi, pengacakan soal, percobaan ulang, remedial, pause, dan hasil. Progress hiburan berupa XP, koin, streak, level, serta jumlah sesi disimpan lewat paket `progress`. Laporan menggunakan `session-report` dan tetap memisahkan akurasi belajar dari hadiah permainan.

Kesalahan pertama memberi kesempatan memperbaiki puzzle yang sama. Jika masih salah, mesin sesi menjadwalkan konsep tersebut untuk muncul kembali setelah soal lain. Mode ini tidak menghapus pintu yang sudah dibuka.

## Aksesibilitas

- Semua kepingan adalah tombol native dengan focus state yang terlihat.
- Interaksi pasangan memiliki alternatif ketuk-ketuk dan tidak memerlukan drag.
- Tombol `P` dan `Escape` menjeda sesi; perpindahan tab juga menjeda.
- Audio bersifat pelengkap dan dapat dimatikan.
- `prefers-reduced-motion` mengurangi animasi dekoratif.
- Layout mengecil menjadi satu kolom pada ponsel tanpa mengubah urutan interaksi.
