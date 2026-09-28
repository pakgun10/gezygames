# Game Design Brief — Treasure Hunt: Perburuan Harta Karun

**Status:** Vertical slice tersedia  
**Rilis sasaran:** Game ekspansi setelah Puzzle Quest  
**Fase awal:** A–D

## Janji permainan

Pemain menjelajahi peta pulau untuk menemukan peti. Setiap lokasi memberi petunjuk singkat sebelum soal muncul, sehingga anak membaca konteks, memilih jawaban, lalu melihat jalur berikutnya terbuka. Interaksi memakai tombol pilihan dan keyboard agar nyaman pada layar sentuh kelas tanpa drag panjang.

## Peta vertical slice

1. **Pantai Mutiara** — peti pertama berisi jejak penjumlahan, perkalian, pecahan, atau himpunan sesuai fase.
2. **Hutan Petunjuk** — terbuka setelah pantai selesai; petunjuk memakai pola, keliling, persentase, fungsi, atau persamaan.
3. **Danau Cermin** — peti terakhir merangkum perjalanan dengan luas, desimal, SPLDV, atau relasi.

Lokasi yang selesai dan lokasi yang terbuka disimpan pada `localStorage` dengan kunci `gezy-games:treasure-hunt:v1`. Hadiah XP dan koin masuk ke progress bersama `@gezy-games/progress`.

## Loop permainan

1. Pemain memilih fase A–D dan membuka peta.
2. Pemain memilih lokasi yang sudah terbuka.
3. Peta menampilkan petunjuk kontekstual dan dua soal dari bank matematika bersama.
4. Jawaban benar membuka peti, memberi XP/koin, dan menggerakkan streak.
5. Jawaban salah menampilkan pembahasan serta kesempatan mencoba kembali melalui mesin remedial.
6. Setelah lokasi selesai, laporan belajar ditampilkan dan jalur berikutnya dibuka.

Vertical slice ini menggunakan bank Matematika bersama supaya laporan, fase, dan remedial konsisten. Struktur lokasi sudah dipisahkan sehingga bank IPAS dan mapel lain dapat ditambahkan tanpa mengubah mekanik peta.

## Aksesibilitas

- Lokasi dan pilihan adalah tombol native dengan fokus yang terlihat.
- Semua pilihan dapat disentuh atau dipilih dengan tombol `1–3`.
- Tombol `P` dan `Escape` menjeda sesi; perpindahan tab juga menjeda.
- Audio bersifat pelengkap dan dapat dimatikan.
- `prefers-reduced-motion` mengurangi animasi peta dan feedback.
