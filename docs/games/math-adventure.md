# Game Design Brief — Math Adventure: Jelajah Pulau Matematika

**Status:** Vertical slice tersedia
**Rilis sasaran:** Vertical slice setelah Math Archer  
**Fase awal:** D, lalu dapat dibuatkan dunia dan materi untuk fase lain

## Janji permainan

Pemain merasa sedang menjelajahi sebuah pulau, menolong penduduk, membuka jalan, menemukan item, dan menghadapi boss. Matematika menjadi alat untuk melakukan aksi di dunia tersebut, bukan layar kuis yang ditempelkan di atas latar permainan.

## Peta Fase D

```text
                    🏔️ GUNUNG
                       │
              ┌────────┴────────┐
              │                 │
          🏘️ DESA          🏰 KASTIL
              │                 │
              │                 │
        🌳 HUTAN ──────── 🌊 DANAU
              │
           🏝️ PANTAI
```

| Wilayah | Materi          | Fantasi dan aktivitas                                         |
| ------- | --------------- | ------------------------------------------------------------- |
| Pantai  | Himpunan        | Mengelompokkan benda temuan dan membaca peta pertama          |
| Hutan   | Relasi          | Menghubungkan makhluk, jejak, atau tanaman dengan pasangannya |
| Danau   | Fungsi          | Mengaktifkan jembatan air melalui mesin input-output          |
| Desa    | Persamaan       | Membantu transaksi, pembangunan, dan teka-teki penduduk       |
| Gunung  | SPLDV           | Menentukan dua nilai untuk membuka jalur pendakian            |
| Kastil  | Tantangan akhir | Menggabungkan seluruh keterampilan dalam boss battle bertahap |

Urutan awal adalah Pantai → Hutan. Setelah itu peta mulai bercabang. Danau dan Desa memberi kunci berbeda; keduanya diperlukan untuk membuka Gunung atau Kastil. Peta harus terasa bebas dijelajahi, tetapi dependensi materi tetap terjaga.

## Loop permainan

1. Pemain memilih misi dari peta atau berbicara dengan karakter.
2. Karakter bergerak menuju lokasi tantangan.
3. Cerita singkat menjelaskan masalah dunia permainan.
4. Pemain menyelesaikan 3–5 interaksi matematika yang saling berkaitan.
5. Dunia berubah: gerbang terbuka, jembatan muncul, warga tertolong, atau musuh mundur.
6. Pemain menerima XP, koin, item, dan progres wilayah.
7. Konsep yang belum dikuasai masuk ke misi remedial di lokasi berbeda.

Satu misi reguler ditargetkan selesai dalam 4–7 menit. Boss battle dapat berlangsung 8–12 menit dan memiliki checkpoint.

## Interaksi belajar

Game tidak bergantung pada pilihan A/B/C/D. Sistem menyediakan registry jenis interaksi agar konten dapat menentukan cara pemain menjawab.

### Pilih diagram

Contoh Relasi menampilkan `A = {1, 2, 3}` dan `B = {2, 4, 6}`. Pemain memilih diagram panah yang menunjukkan “dua kali dari”. Diagram harus dirender sebagai elemen interaktif, bukan gambar dengan hotspot tersembunyi.

### Hubungkan pasangan

Pemain menarik atau mengetuk anggota himpunan kiri lalu anggota himpunan kanan. Garis hubungan muncul di antara keduanya. Pada IFP, mode ketuk-ketuk tersedia agar pemain tidak harus menahan drag panjang.

### Mesin fungsi

Pemain memasukkan angka ke mesin, mengamati output, lalu menentukan aturan fungsi. Animasi hanya memperjelas hubungan input-output dan dapat dipercepat.

### Susun langkah

Untuk persamaan dan SPLDV, pemain menyusun operasi ke urutan yang benar atau memilih operasi yang menjaga kedua ruas tetap setara.

### Jawaban numerik

Keypad layar digunakan untuk hasil yang tidak cocok dijadikan pilihan. Tombol besar dan tombol hapus harus mudah digunakan pada IFP.

## Contoh misi Relasi: Gerbang Hutan

**Pemicu:** Penjaga hutan meminta pemain memperbaiki jalur energi pada gerbang.

**Tantangan:**

```text
A = {1, 2, 3}
B = {2, 4, 6}
Relasi dari A ke B adalah “dua kali dari”.
```

Pemain memilih atau menyusun panah `1 → 2`, `2 → 4`, dan `3 → 6`.

**Benar:** Jalur energi menyala satu per satu, gerbang terbuka, pemain mendapat 100 XP dan koin misi.  
**Belum tepat:** Garis yang keliru bergetar, satu petunjuk muncul, dan pemain dapat memperbaiki diagram. Streak berhenti, tetapi progres misi tidak dihapus.  
**Remedial:** Relasi serupa muncul beberapa misi kemudian dengan konteks berbeda.

## Sistem progres dan ekonomi

| Sistem      | Fungsi                                        | Aturan utama                                               |
| ----------- | --------------------------------------------- | ---------------------------------------------------------- |
| XP          | Membuka level akun lokal dan wilayah          | Diberikan terutama untuk penguasaan, bukan kecepatan       |
| Koin        | Membeli kosmetik karakter dan dekorasi kemah  | Tidak membeli jawaban atau peluang acak                    |
| Level       | Menunjukkan perjalanan pemain                 | Tidak mengunci materi yang harus dipelajari                |
| Streak      | Memberi feedback atas rangkaian jawaban benar | Bonus dibatasi agar satu kesalahan tidak terasa menghukum  |
| Hati/energi | Menunjukkan ketahanan pada misi tertentu      | Mode santai dan Fase Fondasi tidak memakai kegagalan keras |
| Achievement | Menghargai eksplorasi dan kebiasaan baik      | Termasuk mencoba kembali dan menguasai konsep sulit        |
| Item        | Kosmetik atau alat cerita                     | Item belajar memberi petunjuk, bukan melewati materi       |

Progres belajar dan progres hiburan disimpan terpisah. XP tinggi tidak boleh menutupi konsep yang belum dikuasai.

## Boss battle

Boss memiliki beberapa fase mekanik, bukan sekadar health bar panjang:

1. **Membaca pola:** pemain mengenali konsep dan memilih alat yang benar.
2. **Membangun solusi:** pemain menyelesaikan interaksi utama.
3. **Serangan balik:** boss mengubah angka atau representasi sehingga pemain menerapkan konsep yang sama dalam bentuk lain.
4. **Penutup:** pemain menjelaskan atau memilih alasan mengapa solusi benar.

Jawaban benar mengurangi pertahanan boss. Kesalahan memberi petunjuk visual dan kesempatan pulih. Checkpoint mencegah siswa mengulang seluruh battle akibat satu konsep sulit.

## Perluasan lintas fase

Pulau dan narasi dapat berubah sesuai fase; materi Fase D tidak diturunkan begitu saja kepada anak yang lebih muda.

| Fase    | Contoh wilayah/materi                                            |
| ------- | ---------------------------------------------------------------- |
| Fondasi | Mengelompokkan warna/bentuk, banyak-sedikit, pola visual, posisi |
| A       | Bilangan, penjumlahan, pengurangan, bentuk, pengukuran awal      |
| B       | Perkalian, pembagian, pecahan awal, keliling, data sederhana     |
| C       | Pecahan, desimal, persen, luas-volume, perbandingan awal         |
| D       | Himpunan, relasi, fungsi, persamaan, SPLDV, geometri dan data    |

Fase Fondasi memakai instruksi audio/visual, sesi lebih singkat, tanpa timer wajib, dan tanpa kondisi kalah yang keras.

## Layout IFP 52 inci

- Desain dasar 16:9 dengan safe area yang menjaga HUD dan kontrol tidak menempel tepi.
- Target aksi utama minimal 88 × 88 piksel CSS pada layout layar besar.
- Soal berada pada area fokus di tengah; HUD memakai tepi atas dan tidak mengubah layout saat angka bertambah.
- Pemain dapat menyelesaikan aksi dengan satu sentuhan. Drag selalu memiliki alternatif ketuk-ketuk.
- Guru dapat menjeda, mengulang instruksi, menonaktifkan timer, dan membuka pembahasan.
- Keyboard 1–4, panah, Enter, Escape, serta layar penuh tetap didukung.

## State utama

```text
Portal → Pilih profil/fase → Peta pulau → Dialog misi
                                      ↓
                                 Tantangan
                              ↙             ↘
                       Umpan balik       Boss phase
                              ↘             ↙
                              Hadiah misi
                                   ↓
                               Peta pulau
```

State minimum yang disimpan lokal: fase, posisi peta, wilayah terbuka, misi selesai, mastery per keterampilan, XP, koin, level, achievement, karakter, dan item kosmetik.

## Vertical slice pertama

Vertical slice cukup untuk membuktikan rasa petualangan tanpa membangun seluruh pulau:

- Satu karakter yang dapat dipilih.
- Peta Pantai dan Hutan.
- Tiga misi Himpunan dan tiga misi Relasi.
- Interaksi klasifikasi, pilih diagram, serta hubungkan pasangan.
- Satu gerbang yang benar-benar terbuka setelah tantangan.
- Satu mini-boss dengan dua fase.
- XP, koin, satu achievement, dan satu item kosmetik.
- Laporan penguasaan Himpunan dan Relasi.

## Kriteria keberhasilan desain

- Penguji menyebut aktivitas sebagai bermain atau berpetualang, bukan mengerjakan lembar soal.
- Perubahan dunia setelah jawaban dapat dipahami tanpa penjelasan tambahan.
- Setidaknya dua interaksi utama bukan pilihan teks biasa.
- Pemain dapat kembali ke peta dan mengetahui misi berikutnya.
- Guru dapat menjalankan seluruh vertical slice dari IFP tanpa mouse.
