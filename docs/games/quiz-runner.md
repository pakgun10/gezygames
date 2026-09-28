# Game Design Brief — Quiz Runner: Pelari Cerdas

**Status:** Vertical slice tersedia  
**Rilis sasaran:** Game keenam setelah Math Space Mission  
**Fase awal:** A–D

## Janji permainan

Pemain berlari melewati lintasan dan memilih jalur jawaban yang tepat. Matematika menjadi keputusan yang langsung mengubah gerakan karakter: jalur benar membuat pelari melaju, jalur keliru memicu rintangan dan pembahasan.

## Vertical slice pertama

Quiz Runner membuktikan loop satu lintasan:

1. Pemain memilih fase dan materi.
2. Soal muncul bersama empat jalur jawaban yang memiliki label 1–4.
3. Jawaban benar membuat karakter melompat melewati rintangan dan menambah jarak, XP, koin, serta streak.
4. Jawaban salah membuat karakter tersandung, mengurangi jarak secara terbatas, dan memberi remedial.
5. Setelah semua rintangan dikuasai, pemain tiba di garis akhir dan melihat laporan belajar.

Mode interaksi utama mendukung sentuh, mouse, dan tombol angka. Tidak ada timer wajib pada vertical slice agar anak dapat memusatkan perhatian pada konsep.

## Perluasan lintas fase

| Fase | Bentuk lintasan                 | Contoh materi                       |
| ---- | ------------------------------- | ----------------------------------- |
| A    | Memilih jalur warna dan bentuk  | Bilangan, tambah, kurang, posisi    |
| B    | Melewati jembatan dan rintangan | Kali, bagi, pecahan, pengukuran     |
| C    | Sprint dengan checkpoint data   | Desimal, persen, luas, perbandingan |
| D    | Rute bercabang dan strategi     | Persamaan, fungsi, geometri, data   |

Konten berikutnya dapat menambah mode waktu opsional, item bantuan, dan lintasan bercabang. Hukuman kesalahan perlu tetap ringan dan selalu disertai pembahasan.

## Kebutuhan mesin dan konten

Lintasan, rintangan, lane, animasi, dan aturan gerak sebaiknya menjadi definisi data. Engine bersama perlu mengekspos event `laneSelected`, `obstacleHit`, dan `checkpointReached` agar game tidak menyimpan logika sesi sendiri.

## Kriteria keberhasilan desain

- Pemain memahami hubungan antara jawaban dan gerakan karakter.
- Empat jalur terbaca jelas pada layar sentuh kecil maupun IFP.
- Kesalahan memberi kesempatan memperbaiki konsep tanpa memutus sesi.
- Satu lintasan dapat selesai dalam 3–5 menit dan menghasilkan laporan.
