# Game Design Brief — Math Castle: Benteng Matematika

**Status:** Vertical slice tersedia  
**Rilis sasaran:** Game keempat setelah Math Archer, Math Adventure, dan Science Lab  
**Fase awal:** Fondasi–D

## Janji permainan

Pemain menjadi penjaga kastil. Setiap gelombang musuh mewakili satu tantangan matematika; jawaban benar memperkuat tembok dan menghalau musuh, sementara jawaban yang belum tepat memberi kesempatan mencoba kembali dengan pembahasan.

## Vertical slice pertama

Math Castle saat ini membuktikan loop berikut:

1. Pemain memilih fase dan materi dari portal.
2. Kastil menampilkan gelombang soal dengan empat perisai jawaban.
3. Jawaban benar menaikkan XP, koin, streak, dan kekuatan tembok.
4. Jawaban salah memicu animasi serangan, mengurangi kekuatan tembok secara terbatas, dan menampilkan penjelasan.
5. Setelah semua soal dikuasai, pemain menerima laporan belajar serta progres permainan.

Sesi memakai bank soal dan mesin remedial bersama. Pemain dapat menyentuh, mengeklik, memakai tombol angka 1–4, menjeda, mendengarkan soal, dan membuka layar penuh.

## Perluasan lintas fase

| Fase    | Bentuk pertahanan                                | Contoh materi                     |
| ------- | ------------------------------------------------ | --------------------------------- |
| Fondasi | Menyalakan lampu kastil dan mengelompokkan benda | Warna, bentuk, banyak-sedikit     |
| A       | Memperbaiki pagar dan menara                     | Bilangan, tambah, kurang, ukuran  |
| B       | Menambah pasukan dan persediaan                  | Kali, bagi, pecahan awal, data    |
| C       | Mengatur jebakan dan jalur tembok                | Desimal, persen, luas, volume     |
| D       | Mengelola beberapa gerbang dan strategi          | Persamaan, fungsi, geometri, data |

Mode santai tidak memiliki kondisi kalah keras. Mode tantangan dapat menambahkan batas waktu, tipe musuh, dan pilihan pertahanan setelah fondasi interaksi terbukti dipahami.

## Kebutuhan mesin dan konten

Gelombang berikutnya sebaiknya didefinisikan sebagai data yang berisi musuh, topik, aturan damage, feedback, dan hadiah. Engine bersama perlu mendukung modifier pertahanan tanpa menyalin mesin sesi. Progres belajar harus tetap terpisah dari kosmetik kastil dan tidak boleh membeli jawaban.

## Kriteria keberhasilan desain

- Pemain dapat menjelaskan hubungan antara jawaban dan keadaan kastil.
- Perubahan tembok dan musuh terlihat jelas setelah setiap jawaban.
- Kesalahan terasa sebagai informasi dan kesempatan memperbaiki strategi.
- Satu sesi dapat selesai sekitar 3–5 menit pada layar sentuh dan desktop.
