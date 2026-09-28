# Train of Knowledge

Train of Knowledge adalah perjalanan belajar berbasis stasiun. Pemain memilih fase Fondasi sampai D, menaiki kereta, lalu menjawab soal untuk menambah gerbong dan membuka stasiun berikutnya.

## Vertical slice

- **Stasiun Pelabuhan:** membilang, pola, dan operasi dasar sesuai fase.
- **Stasiun Hutan:** nilai tempat, pecahan, perbandingan, atau fungsi sesuai fase.
- **Stasiun Puncak:** tantangan akhir, dari pengukuran sampai SPLDV sesuai fase.
- Setiap stasiun berisi dua soal acak dari bank soal matematika saat ini.
- Jawaban benar memberi XP, koin, streak, dan satu gerbong; jawaban salah menampilkan pembahasan dan kesempatan mencoba lagi.
- Stasiun berikutnya terbuka setelah sesi stasiun selesai. Rute dan jumlah gerbong disimpan di `localStorage`.

Vertical slice ini memakai bank soal Matematika sebagai fondasi mekanik. Struktur stasiun dan fase siap diperluas dengan bank IPAS serta mapel lain.

## Akses

- Lokal: `npm run dev:train` lalu buka `/train-of-knowledge/` melalui portal.
- Production: `/train-of-knowledge/`.
