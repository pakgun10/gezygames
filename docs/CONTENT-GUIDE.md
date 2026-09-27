# Panduan Konten Matematika MVP

**Versi:** 0.1  
**Status:** Siap untuk tinjauan editorial  
**Pemilik keputusan konten:** Pak Gun / Gezy Tech  
**Ruang lingkup:** Math Archer versi MVP

Dokumen ini menetapkan cakupan awal agar satu materi dapat dipakai ulang oleh game lain tanpa mengubah makna, jawaban, atau tingkat kesulitannya. Cakupan ini adalah urutan latihan MVP, bukan pengganti alur ajar sekolah.

## Acuan fase

Pembagian fase mengikuti panduan Capaian Pembelajaran Kemendikdasmen edisi revisi 2025:

- **Fondasi:** PAUD/RA.
- **A:** kelas I–II SD/MI.
- **B:** kelas III–IV SD/MI.
- **C:** kelas V–VI SD/MI.
- **D:** kelas VII–IX SMP/MTs.

Rujukan utama:

- [Panduan Capaian Pembelajaran edisi revisi 2025](https://kurikulum.kemendikdasmen.go.id/file/1755668120_manage_file.pdf)
- [Panduan mata pelajaran Matematika Fase A–F](https://repositori.kemendikdasmen.go.id/33608/)
- [Panduan Capaian Pembelajaran Fase Fondasi](https://repositori.kemendikdasmen.go.id/33597/)

## Target bank soal MVP

Setiap fase memiliki lima topik inti dan sedikitnya dua soal terbit untuk tiap topik. Target minimalnya adalah **10 soal per fase** atau **50 soal** untuk Fondasi sampai Fase D. Pemeriksaan otomatis menolak build jika batas ini tidak terpenuhi.

| Fase | Topik inti | Tujuan belajar ringkas | Contoh ID |
|---|---|---|---|
| Fondasi | Membilang | Menghubungkan jumlah benda dengan lambang bilangan sampai 10. | `math-foundation-counting-001` |
| Fondasi | Bentuk | Membedakan bentuk dasar melalui ciri visual. | `math-foundation-shapes-001` |
| Fondasi | Banyak dan sedikit | Membandingkan kumpulan konkret. | `math-foundation-more-less-001` |
| Fondasi | Pola | Melanjutkan pola sederhana warna atau bentuk. | `math-foundation-pattern-001` |
| Fondasi | Posisi | Mengenali atas, bawah, kiri, dan kanan pada objek konkret. | `math-foundation-position-001` |
| A | Penjumlahan | Menjumlahkan bilangan sederhana dan konteks benda. | `math-a-addition-001` |
| A | Pengurangan | Mengurangi bilangan sederhana sampai 20. | `math-a-subtraction-001` |
| A | Nilai tempat | Mengenali puluhan dan satuan. | `math-a-place-value-001` |
| A | Pola bilangan | Menentukan aturan tambah sederhana dalam urutan. | `math-a-pattern-001` |
| A | Pengukuran panjang | Membaca serta membandingkan panjang dalam cm. | `math-a-measurement-001` |
| B | Penjumlahan | Menjumlahkan bilangan cacah hingga ratusan. | `math-b-addition-001` |
| B | Perkalian | Memahami perkalian sebagai kelompok sama banyak. | `math-b-multiplication-001` |
| B | Pembagian | Membagi sama rata melalui fakta perkalian. | `math-b-division-001` |
| B | Pecahan | Mengenali bagian dari keseluruhan dan pecahan senilai sederhana. | `math-b-fraction-001` |
| B | Keliling | Menghitung keliling persegi dan persegi panjang. | `math-b-perimeter-001` |
| C | Pecahan | Menjumlah serta mengurangkan pecahan berpenyebut terkait. | `math-c-fraction-001` |
| C | Desimal | Mengoperasikan desimal dengan nilai tempat yang benar. | `math-c-decimal-001` |
| C | Persentase | Menghubungkan persen dengan pecahan dan bilangan. | `math-c-percentage-001` |
| C | Luas | Menggunakan rumus luas persegi panjang dan segitiga. | `math-c-area-001` |
| C | Perbandingan | Menyelesaikan perbandingan senilai sederhana. | `math-c-ratio-001` |
| D | Himpunan | Mengenali anggota serta gabungan himpunan. | `math-d-set-001` |
| D | Relasi | Membaca pasangan berurutan dari aturan relasi. | `math-d-relation-001` |
| D | Fungsi | Menghitung nilai fungsi dari substitusi. | `math-d-function-001` |
| D | Persamaan linear | Menyelesaikan persamaan linear satu variabel. | `math-d-equation-001` |
| D | SPLDV | Menentukan solusi sistem dua persamaan linear. | `math-d-spldv-001` |

## Aturan penulisan soal

1. Satu soal mengukur satu gagasan utama.
2. Gunakan Bahasa Indonesia yang pendek, langsung, dan sesuai fase.
3. Gunakan simbol matematika yang konsisten: `+`, `−`, `×`, `÷`, `=`, `∈`, dan `∪`.
4. Pada Fondasi, instruksi harus tetap dapat dipahami melalui objek, emoji, atau ilustrasi; audio menjadi pendamping, bukan satu-satunya petunjuk.
5. Setiap pilihan memakai satuan yang sama jika jawabannya berupa ukuran atau jumlah benda.
6. Tepat satu pilihan harus sama persis dengan kunci jawaban.
7. Distraktor harus masuk akal: kesalahan hitung umum, salah satuan, atau miskonsepsi yang relevan. Distraktor tidak boleh sengaja menjebak melalui bahasa.
8. Pembahasan menjelaskan langkah atau alasan jawaban dalam satu sampai tiga kalimat, dengan nada yang mendukung.
9. Hindari konteks yang mengasumsikan kepemilikan, pengalaman, atau latar budaya tertentu.
10. Soal tidak boleh menyebut hadiah game, streak, atau tekanan waktu.

## Kesulitan

| Nilai | Makna | Contoh |
|---|---|---|
| 1 | Mengenali konsep atau operasi langsung. | `7 + 5`, memilih lingkaran, anggota himpunan. |
| 2 | Menerapkan satu langkah atau representasi lain. | Nilai tempat, keliling, nilai fungsi. |
| 3 | Menghubungkan beberapa langkah atau proporsi. | Perbandingan, SPLDV, soal konteks. |

Kesulitan mengukur beban penalaran, bukan panjang teks. Soal Fase Fondasi dapat berkesulitan 2 tanpa menambah tuntutan membaca.

## Proses editorial

1. **Draft:** penyusun membuat soal, kunci, pembahasan, dan alasan distraktor.
2. **Pemeriksaan otomatis:** ID, fase, pilihan, kunci, pembahasan, status, dan cakupan minimum harus lulus.
3. **Tinjauan mata pelajaran:** guru atau reviewer memeriksa ketepatan konsep, tingkat fase, bahasa, dan kemungkinan jawaban ganda.
4. **Persetujuan rilis:** Pak Gun / Gezy Tech menyetujui soal untuk status `published`.
5. **Uji pemain:** temuan siswa, guru, atau orang tua menghasilkan perbaikan atau penggantian soal melalui ID baru.

## Checklist review

- [ ] Operasi, notasi, satuan, dan jawaban sudah benar.
- [ ] Hanya ada satu jawaban yang benar.
- [ ] Distraktor mencerminkan miskonsepsi yang wajar dan tidak ambigu.
- [ ] Bahasa serta konteks sesuai fase.
- [ ] Pembahasan menerangkan alasan, bukan hanya mengulang kunci.
- [ ] Materi cocok dengan tujuan topik pada tabel cakupan.
- [ ] Soal dapat dibaca pada layar dan tersedia tanpa audio.
- [ ] Tidak memuat data pribadi, stereotip, atau konteks yang mengucilkan.
- [ ] Soal telah dicoba pada tampilan Math Archer.
- [ ] Reviewer mata pelajaran dan pemilik konten mencatat persetujuan sebelum rilis publik yang lebih luas.

## Batas MVP

Bank awal memberi dua variasi per topik agar pilihan materi dapat dimainkan sebagai sesi singkat. Jumlah ini belum cukup sebagai kumpulan penilaian berisiko tinggi atau sebagai pengganti latihan kelas. Penambahan berikutnya memprioritaskan variasi representasi, generator yang dapat diuji, dan hasil uji siswa.
