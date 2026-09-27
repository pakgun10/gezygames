# Inventaris Aset Math Archer

**Status:** MVP  
**Diperbarui:** 27 September 2026  
**Pemilik:** Gezy Tech

Math Archer MVP tidak mengirim berkas gambar, musik, atau efek suara pihak ketiga. Arena dibuat dari CSS dan bentuk teks; efek suara dibuat saat berjalan melalui Web Audio API. Inventaris ini harus diperbarui sebelum aset berkas baru masuk ke repositori.

| Aset atau elemen                 | Bentuk                                   | Sumber                                                     | Kepemilikan/lisensi                    | Catatan                                                                                         |
| -------------------------------- | ---------------------------------------- | ---------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Latar hutan, bukit, awan, rumput | CSS gradient, clip-path, dan bentuk HTML | Kode Gezy Games                                            | Gezy Tech                              | Tidak memuat teks, soal, jawaban, atau kontrol yang menyatu.                                    |
| Pemanah, busur, sasaran, panah   | CSS dan karakter emoji sistem            | Kode Gezy Games; glyph emoji berasal dari perangkat pemain | Kode: Gezy Tech. Emoji tidak dibundel. | Pemanah memiliki state normal dan menembak; sasaran memiliki state normal, kena, dan meleset.   |
| Ikon status                      | Emoji sistem dan teks                    | Perangkat pemain                                           | Tidak dibundel                         | Informasi penting juga diberikan melalui label teks dan warna.                                  |
| Efek tarik, kena, dan meleset    | Web Audio API oscillator                 | Kode Gezy Games                                            | Gezy Tech                              | Tidak ada file audio eksternal; semua cue dapat dimatikan.                                      |
| Pembacaan soal                   | Web Speech API browser                   | Perangkat pemain                                           | Layanan sistem browser                 | Bersifat tambahan. Soal tetap terbaca di papan dan game tetap berjalan bila API tidak tersedia. |
| Favicon portal                   | SVG vektor berbasis palet Gezy Games     | Kode Gezy Games                                            | Gezy Tech                              | Dipakai portal dan subpath game melalui root build.                                             |

## Aturan aset berikutnya

1. Simpan aset lokal di bawah aplikasi atau paket yang memakainya; jangan bergantung pada URL aset pihak ketiga saat runtime.
2. Catat URL sumber, pembuat, lisensi, tanggal perolehan, dan perubahan yang dilakukan untuk setiap berkas non-kode.
3. Optimalkan gambar ke WebP/AVIF atau SVG sesuai kebutuhan; hindari mengirim ukuran yang lebih besar dari tampilan terbesar.
4. Latar tidak boleh memuat soal, pilihan, teks instruksi, atau tombol agar UI tetap responsif dan dapat diakses.
5. Setiap aset karakter atau objek interaktif harus mencatat state yang dibutuhkan oleh mekanik permainan.
6. Audio harus dapat dimatikan dan tidak boleh menjadi satu-satunya pembawa informasi.
