# Product Requirements Document — Gezy Games

**Status:** Draft awal  
**Versi dokumen:** 0.1  
**Tanggal:** 27 September 2026  
**Pemilik produk:** Gezy Tech

## 1. Ringkasan produk

Gezy Games adalah portal permainan edukasi berbasis web untuk anak dari PAUD/TK sampai SMP. Portal ini berisi beberapa game dengan mekanik yang berbeda, tetapi memakai fondasi yang sama untuk bank soal, pemilihan fase, progres belajar, remedial, skor, laporan hasil, audio, dan aksesibilitas.

Produk akan tersedia di `games.gezytech.web.id`. Setiap game dapat dimainkan langsung dari browser pada ponsel, tablet, laptop, dan layar sentuh sekolah tanpa instalasi aplikasi.

Repositori `lompatkodok` dipakai sebagai referensi pengalaman dan arah visual. Game, kode, dan aset Lompat Kodok tidak menjadi bagian dari katalog Gezy Games.

## 2. Latar belakang

Latihan soal sering terasa terpisah dari permainan: anak membaca soal, memilih jawaban, lalu menerima skor dalam tampilan yang sama berulang kali. Gezy Games menghubungkan keberhasilan belajar dengan perubahan yang terlihat di dunia permainan, misalnya mempertahankan kastil, menerbangkan pesawat, melakukan eksperimen, atau membangun kota.

Tantangan produk ini adalah membuat banyak pengalaman bermain tanpa menggandakan sistem dan konten pada setiap game. Karena itu, sistem belajar dan bank soal harus menjadi layanan bersama, sedangkan setiap game bertanggung jawab atas mekanik dan presentasinya.

## 3. Visi

Membuat latihan pelajaran SD terasa seperti petualangan yang ingin dimainkan kembali, sambil tetap memberi hasil belajar yang jelas kepada siswa, orang tua, dan guru.

## 4. Sasaran produk

1. Menyediakan satu portal untuk menemukan dan memainkan berbagai game edukasi.
2. Memisahkan konten pelajaran dari mekanik game agar satu materi dapat digunakan dengan aman oleh beberapa game.
3. Membantu siswa menguasai materi melalui latihan bertahap, umpan balik, pembahasan, dan pengulangan soal yang belum dikuasai.
4. Memberikan pengalaman yang nyaman pada perangkat pribadi maupun layar kelas.
5. Membuat penambahan game dan materi berikutnya lebih cepat melalui komponen bersama.

## 5. Pengguna utama

### 5.1 Anak PAUD/TK, siswa SD, dan siswa SMP

- Fase Fondasi untuk PAUD/TK, Fase A–C untuk SD, dan Fase D untuk SMP kelas 7–9.
- Bermain sendiri atau bersama arahan guru/orang tua.
- Membutuhkan instruksi singkat, target yang jelas, sentuhan yang mudah, dan umpan balik yang tidak mempermalukan.

### 5.2 Guru dan orang tua

- Memilihkan mapel, fase, atau topik.
- Melihat ringkasan hasil setelah permainan selesai.
- Membutuhkan informasi tentang soal yang benar, salah, belum dijawab, dan pembahasannya.

## 6. Prinsip produk

1. **Belajar menggerakkan permainan.** Jawaban benar harus menghasilkan perubahan yang dapat dilihat atau didengar.
2. **Kesalahan adalah bagian dari belajar.** Jawaban salah menampilkan petunjuk atau pembahasan dan dapat dijadwalkan ulang untuk remedial.
3. **Materi sesuai kemampuan.** Pemain memilih fase dan topik sebelum bermain; tingkat kesulitan berkembang secara wajar.
4. **Mudah disentuh dan dibaca.** Kontrol, teks, dan kontras harus sesuai untuk anak dan layar kelas.
5. **Cepat dimulai.** Versi awal tidak mewajibkan akun.
6. **Setiap game punya alasan untuk ada.** Game baru harus menawarkan mekanik atau tujuan belajar yang berbeda, bukan sekadar mengganti gambar latar.

## 7. Ruang lingkup rilis

### 7.1 MVP — versi 0.1

MVP membuktikan bahwa portal, bank soal, sistem progres, dan satu game dapat bekerja sebagai satu produk.

Termasuk dalam MVP:

- Portal Gezy Games dengan katalog game.
- Halaman detail singkat untuk game yang tersedia.
- Game pertama: **Math Archer / Pemanah Matematika**.
- Materi Matematika untuk Fase Fondasi, A, B, C, dan D, dimulai dari sekumpulan topik prioritas.
- Pemilihan fase dan topik.
- Nama panggilan pemain tanpa akun.
- Mesin sesi: soal, tiga pilihan, skor, nyawa opsional, timer opsional, pause, remedial, dan status selesai.
- Penyimpanan preferensi dan progres terakhir di browser.
- Laporan hasil per sesi beserta pembahasan.
- Dukungan klik, sentuh, keyboard, layar penuh, dan tata letak responsif.
- Audio yang dapat dimatikan.
- Deployment statis ke `games.gezytech.web.id`.

### 7.2 Versi 0.2 — petualangan unggulan

- **Math Adventure: Jelajah Pulau Matematika** untuk Fase D sebagai vertical slice awal.
- Peta pulau, karakter, misi wilayah, XP, koin, item kosmetik, achievement, dan boss battle.
- Wilayah awal: Pantai (Himpunan), Hutan (Relasi), Danau (Fungsi), Desa (Persamaan), Gunung (SPLDV), dan Kastil (tantangan akhir).
- Jenis interaksi di luar pilihan teks, termasuk memilih diagram, memasangkan objek, dan menyusun hubungan.
- Menggunakan bank soal dan komponen sesi yang sama dengan perluasan untuk interaksi petualangan.

### 7.3 Versi 0.3 — interaksi IPA

- **Science Lab / Laboratorium Sains**.
- Eksperimen virtual sederhana dengan interaksi selain pilihan ganda.
- Materi IPAS awal dan penjelasan sebab-akibat.

### 7.4 Di luar MVP

- Akun siswa, kelas, dan sinkronisasi antarperangkat.
- Dashboard guru berbasis server.
- Multiplayer waktu nyata.
- Pembayaran, iklan, dan pembelian dalam game.
- Aplikasi native Android/iOS.
- Pembuatan soal otomatis tanpa proses editorial.
- Kesebelas game lain sebagai syarat peluncuran pertama.

## 8. Katalog game yang direncanakan

| Game | Materi utama | Mekanik inti | Nilai pembeda |
|---|---|---|---|
| Math Castle | Matematika | Jawaban memperkuat benteng atau menyerang pengepung | Strategi pertahanan ringan |
| Math Space Mission | Matematika | Jawaban memberi energi untuk berpindah planet | Perjalanan dan koleksi planet |
| Science Lab | IPAS | Mengatur bahan/alat lalu memprediksi dan mengamati hasil | Eksperimen sebab-akibat |
| Quiz Runner | Semua mapel | Berlari dan memilih jalur jawaban | Kelancaran materi yang sudah dipelajari |
| Math Archer | Matematika | Membidik target jawaban lalu melihat panah mengenai sasaran | First playable yang cepat, taktil, dan cocok untuk IFP |
| Puzzle Quest | Matematika | Menyusun dan memanipulasi objek | Geometri, pola, pecahan, dan logika |
| Treasure Hunt | Semua mapel | Menjelajah peta, mencari petunjuk, dan membuka lokasi | Eksplorasi bercabang |
| Math Battle | Matematika | Jawaban menjadi serangan atau pertahanan | Pertarungan bergiliran |
| Train of Knowledge | Semua mapel | Jawaban membuka stasiun dan gerbong | Progres linear yang mudah dipahami |
| Math Adventure | Matematika | Menjelajah pulau dan menuntaskan misi wilayah | Game unggulan dengan peta, karakter, ekonomi, dan boss battle |
| Build the City | Matematika | Menghasilkan dan membelanjakan sumber daya | Matematika terapan dan perencanaan |
| Dragon Quiz | Semua mapel | Menghadapi naga melalui beberapa fase | Pertarungan bos dan pencapaian |

Nama Indonesia dapat menjadi nama utama di UI, sedangkan nama Inggris dipakai sebagai nama seri atau slug bila diperlukan.

## 9. Pengalaman pengguna MVP

### 9.1 Alur portal

1. Pengguna membuka `games.gezytech.web.id`.
2. Portal menampilkan identitas Gezy Games dan kartu game.
3. Game yang sudah tersedia memiliki tombol **Mainkan**; game mendatang diberi label **Segera hadir**.
4. Kartu menampilkan mapel, fase yang didukung, mekanik singkat, dan progres terakhir jika ada.
5. Pengguna membuka Math Archer.

### 9.2 Alur Math Archer

1. Pengguna memilih fase dan topik.
2. Pengguna mengisi atau memakai kembali nama panggilan.
3. Layar menjelaskan tujuan dan kontrol secara singkat.
4. Sesi dimulai dengan target yang jelas, misalnya menguasai 10 sasaran soal.
5. Pemain menyentuh atau memilih target jawaban, lalu panah bergerak menuju sasaran.
6. Jawaban benar memberi XP, koin, dan streak; jawaban salah memberi petunjuk atau kesempatan mencoba lagi sebelum konsep muncul kembali.
7. Sesi selesai saat target tercapai atau kondisi akhir terpenuhi.
8. Laporan menampilkan skor, akurasi, penguasaan per topik, waktu, serta rincian jawaban.
9. Pemain dapat mengulang, mengganti topik, atau kembali ke portal.

## 10. Persyaratan fungsional

### 10.1 Portal

- Menampilkan semua game dalam katalog yang terkurasi.
- Mendukung status `available`, `coming-soon`, dan `maintenance`.
- Memfilter game berdasarkan mapel dan fase ketika jumlah game sudah memerlukan filter.
- Menampilkan progres lokal tanpa mewajibkan identitas pribadi.
- Menyediakan navigasi yang konsisten menuju beranda, bantuan, pengaturan, dan permainan.

### 10.2 Bank soal

Setiap soal minimal memiliki:

- ID stabil dan unik.
- Mapel, fase, topik, dan tingkat kesulitan.
- Jenis interaksi.
- Teks atau instruksi soal.
- Pilihan dan jawaban benar bila menggunakan pilihan ganda.
- Pembahasan yang dapat dipahami siswa.
- Informasi aset bila soal membutuhkan ilustrasi.
- Status editorial, misalnya `draft`, `reviewed`, atau `published`.

Bank soal harus dapat divalidasi sebelum build agar soal tanpa jawaban, ID ganda, atau pilihan yang tidak valid tidak masuk ke rilis.

### 10.3 Mesin sesi bersama

- Membuat sesi dari mapel, fase, topik, dan panjang sesi.
- Mengacak pilihan tanpa mengubah makna jawaban.
- Menghindari pengulangan soal yang terlalu dekat.
- Menjadwalkan konsep yang salah untuk muncul kembali setelah beberapa soal lain.
- Mendukung timer aktif, timer santai, atau tanpa timer sesuai jenis game.
- Menghasilkan hasil sesi yang dapat dibaca game dan laporan.
- Memisahkan penguasaan materi dari skor hiburan.

### 10.4 Progres lokal

- Menyimpan nama panggilan, preferensi audio, fase terakhir, dan progres game di browser.
- Menyimpan data dengan versi skema agar dapat dimigrasikan.
- Menyediakan tombol untuk menghapus progres lokal.
- Tetap dapat dimainkan ketika penyimpanan browser tidak tersedia, dengan pemberitahuan ringan.

### 10.5 Laporan hasil

- Menampilkan jumlah benar, salah, tidak terjawab, akurasi, waktu, dan skor.
- Mengelompokkan hasil berdasarkan topik atau keterampilan.
- Menampilkan soal, jawaban pemain, jawaban benar, dan pembahasan.
- Menggunakan bahasa yang mendukung proses belajar.

## 11. Model konten awal

Contoh bentuk data konseptual:

```json
{
  "id": "math-b-addition-001",
  "subject": "matematika",
  "phase": "B",
  "topic": "penjumlahan",
  "difficulty": 1,
  "type": "multiple-choice",
  "prompt": "Berapa hasil 24 + 18?",
  "choices": ["32", "42", "52"],
  "correctAnswer": "42",
  "explanation": "24 + 18 = 24 + 10 + 8 = 42.",
  "status": "reviewed"
}
```

Skema final perlu mendukung soal yang dihasilkan dari template matematika dan soal yang ditulis manual. Hasil generasi tetap harus konsisten, dapat diuji, dan memiliki kunci jawaban kanonik.

## 12. Arah visual

Gezy Games memakai suasana alam yang hangat, ramah, dan penuh kedalaman seperti referensi Lompat Kodok. Ciri visual utamanya:

- Ilustrasi kartun ramah anak dengan tekstur ringan dan beberapa lapisan kedalaman.
- Area tengah yang cukup tenang agar soal dan kontrol mudah dibaca.
- Bentuk membulat, bayangan lembut, dan elemen kayu atau alam.
- Kontras kuat untuk teks, fokus keyboard, jawaban, dan status permainan.
- Animasi yang memberi rasa hidup tanpa mengganggu kegiatan membaca.

### 12.1 Palet merek utama

| Peran | Warna | Kode |
|---|---|---|
| Hijau hutan utama | Forest | `#214B3B` |
| Latar gelap | Forest Deep | `#17352F` |
| Hijau rumput | Grass | `#70A453` |
| Hijau lumut | Moss | `#355F3E` |
| Aksen hadiah/tindakan | Gold | `#F4C662` |
| Permukaan terang/teks | Cream | `#FFF6D9` |
| Kayu | Wood | `#9A5535` |
| Batu/peringatan | Rock | `#A95D39` |
| Langit/air | Sky | `#83C4D1` |
| Teks gelap | Ink | `#27332D` |

Hijau menjadi pengikat visual portal dan seluruh game. Setiap game mendapat aksen tambahan sesuai dunianya, misalnya biru-ungu untuk Space Mission, merah bata untuk Math Castle, dan emas-kayu untuk Math Archer, tetapi header, tombol utama, fokus, dan laporan tetap terasa sebagai produk Gezy Games.

### 12.2 Arah latar per game

Latar harus menggambarkan dunia game sekaligus menyisakan area visual yang tenang untuk UI. Aset tidak boleh memiliki teks, jawaban, atau kontrol yang sudah menyatu di dalam gambar karena elemen tersebut perlu responsif dan dapat diakses.

## 13. Aksesibilitas dan perangkat

- Target sentuh minimal 44 × 44 piksel CSS; aksi utama pada mode IFP diutamakan berukuran 88 piksel atau lebih.
- Teks utama tetap terbaca pada ponsel kecil dan layar kelas besar.
- Semua tindakan utama dapat dilakukan dengan keyboard.
- Fokus keyboard terlihat jelas.
- Informasi benar/salah tidak disampaikan hanya melalui warna.
- Audio memiliki tombol mati/nyala dan bukan satu-satunya pembawa informasi.
- Animasi dekoratif menghormati preferensi `prefers-reduced-motion`.
- Dialog pengaturan dan bantuan menjebak fokus dengan benar dan dapat ditutup melalui keyboard.
- Game dijaga agar nyaman pada orientasi landscape; portrait mendapat tata letak yang layak atau instruksi rotasi yang jelas bila benar-benar diperlukan.

## 14. Persyaratan teknis

- Monorepo berbasis TypeScript.
- Vite untuk development dan build aplikasi web.
- Paket bersama untuk model konten, mesin sesi, progres, UI, dan audio.
- Phaser dipakai hanya pada game yang membutuhkan scene, kamera, fisika, atau tabrakan.
- Portal dan UI berbasis DOM agar teks dan aksesibilitas tetap baik.
- Build menghasilkan berkas statis yang dapat disajikan Nginx.
- URL game stabil, misalnya `/math-castle/`.
- Tidak ada ketergantungan runtime pada layanan pihak ketiga untuk memainkan MVP.
- Aset inti tersedia secara lokal dan memiliki catatan sumber/lisensi.

Arsitektur rinci akan dicatat dalam dokumen terpisah setelah spike teknis pada milestone Foundation.

## 15. Privasi dan keamanan

- MVP tidak meminta email, nomor telepon, sekolah, atau data pribadi anak.
- Nama pemain diperlakukan sebagai nama panggilan dan hanya disimpan lokal.
- Tidak ada iklan, pelacak lintas situs, atau analitik pihak ketiga pada MVP.
- Jika analitik produk ditambahkan, data harus minimal, anonim, dan didokumentasikan sebelum digunakan.
- Konten serta aset pihak ketiga harus memiliki izin atau lisensi yang jelas.

## 16. Kinerja dan kualitas

- Halaman portal harus terasa siap digunakan dalam waktu singkat pada koneksi seluler wajar.
- Aset gambar menggunakan ukuran dan format yang sesuai kebutuhan tampilan.
- Perpindahan layar utama tidak membutuhkan pemuatan ulang penuh jika arsitektur memungkinkan.
- Tidak ada error JavaScript pada alur utama.
- Status permainan tidak berubah saat tab tidak aktif; timer dijeda dengan aman.
- Build produksi dan validasi bank soal wajib berhasil sebelum deployment.

Target angka performa final ditetapkan setelah prototipe pertama dan pengukuran pada perangkat sasaran.

## 17. Ukuran keberhasilan

Untuk MVP tanpa akun dan tanpa analitik eksternal, keberhasilan awal dinilai melalui pengujian langsung dan data sesi lokal.

- Minimal 80% penguji siswa dapat memulai game tanpa bantuan setelah membaca petunjuk.
- Minimal 80% sesi uji dapat diselesaikan tanpa error atau kebingungan navigasi.
- Pengguna memahami hubungan antara jawaban dan perubahan di dalam game.
- Laporan hasil dapat dipahami oleh guru/orang tua dan menunjukkan konsep yang perlu diulang.
- Game kedua dapat memakai mesin sesi dan bank soal tanpa menyalin implementasi inti.
- Alur utama berjalan pada ponsel, desktop, dan layar sentuh sasaran.

## 18. Milestone

| Milestone | Hasil utama |
|---|---|
| M0 — Product foundation | PRD, backlog, keputusan arsitektur, dan panduan konten |
| M1 — Platform foundation | Workspace, design tokens, portal shell, bank soal, session engine, dan progres lokal |
| M2 — First playable | Math Archer dapat dimainkan dari pemilihan materi hingga laporan |
| M3 — MVP release | QA perangkat, optimasi aset, deployment, dan monitoring dasar |
| M4 — Flagship vertical slice | Math Adventure menghadirkan peta, karakter, dua wilayah, dan boss awal |
| M5 — Interactive learning | Science Lab memperkenalkan eksperimen virtual |

## 19. Risiko dan mitigasi

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Dua belas game dibangun bersamaan | Fondasi tidak stabil dan banyak pekerjaan setengah selesai | Selesaikan satu vertical slice sebelum ekspansi |
| Semua game terasa seperti kuis dengan skin berbeda | Pemain cepat bosan | Tetapkan nilai pembeda dan jenis interaksi dalam brief tiap game |
| Konten salah atau tidak sesuai fase | Menurunkan kepercayaan | Skema tervalidasi dan proses review editorial |
| Aset terlalu berat | Lambat pada perangkat sekolah | Anggaran aset, kompresi, dan uji perangkat nyata |
| Timer membuat siswa cemas | Mengganggu tujuan belajar | Timer opsional dan disesuaikan dengan jenis latihan |
| Progres lokal hilang saat data browser dibersihkan | Pengalaman terputus | Jelaskan batas MVP dan rencanakan akun pada fase berikutnya |
| Paket bersama terlalu abstrak sejak awal | Pengembangan lambat | Abstraksi hanya setelah kebutuhan Math Archer terbukti |

## 20. Keputusan yang masih terbuka

Keputusan ini tidak menghalangi penyiapan fondasi, tetapi perlu ditetapkan sebelum implementasi terkait:

1. Nama tampilan final saat ini menggunakan **Gezy Games**; perubahan merek tetap dapat dievaluasi sebelum rilis publik.
2. Apakah nama game utama memakai bahasa Indonesia, Inggris, atau format dwibahasa.
3. Topik Matematika prioritas untuk Fase Fondasi, A, B, C, dan D pada MVP.
4. Panjang sesi default: 10, 15, atau 20 soal.
5. Bentuk karakter dan item kosmetik pertama untuk Math Adventure.
6. Perangkat sekolah sasaran minimum yang perlu diuji secara langsung.

## 21. Kriteria rilis MVP

MVP siap dirilis ketika:

- Portal dan Math Archer dapat diakses melalui URL produksi.
- Alur mulai, bermain, jeda, selesai, laporan, ulang, dan kembali ke portal berhasil.
- Bank soal awal telah direview dan lolos validasi otomatis.
- Remedial menampilkan kembali konsep yang salah sesuai aturan.
- Progres lokal dan penghapusan data bekerja.
- Pengujian keyboard, sentuh, audio, reduced motion, dan tata letak perangkat sasaran selesai.
- Tidak ada masalah kritis terbuka.
- Sumber/lisensi seluruh aset rilis tercatat.
