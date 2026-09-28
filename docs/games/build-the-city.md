# Build the City

Build the City mengubah jawaban matematika menjadi anggaran kota. Pemain memilih fase A–D, menjawab soal untuk memperoleh 💰25, lalu memilih fasilitas yang dapat dibangun dari saldo yang terlihat.

## Vertical slice

- **Sekolah Ceria** memakai operasi dasar dan membutuhkan anggaran 50.
- **Pasar Sejahtera** memakai nilai tempat, pola, pecahan, atau persamaan dan membutuhkan 80.
- **Taman Pintar** memakai pengukuran, luas, desimal, atau relasi dan membutuhkan 100.
- **Pabrik Inovasi** menjadi pembangunan akhir dan membutuhkan 130.
- Bangunan selesai mengubah ilustrasi fasilitas, membuka pilihan berikutnya, memberi XP, dan menyimpan saldo.
- Tombol pembangunan terkunci ketika anggaran tidak cukup; saldo tidak pernah menjadi negatif dan keterangan menjelaskan kebutuhan dana.

Vertical slice saat ini memakai bank soal Matematika. Struktur bangunan dan anggaran siap diperluas dengan materi lain.

## Akses

- Lokal: `npm run dev:city` lalu buka `/build-the-city/` melalui portal.
- Production: `/build-the-city/`.
