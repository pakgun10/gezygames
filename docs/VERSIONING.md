# Versioning Gezy Games

Gezy Games memakai [Semantic Versioning](https://semver.org/) untuk **versi platform yang dirilis ke production**:

```text
MAJOR.MINOR.PATCH
```

Aturan rilis:

- **MAJOR** naik untuk perubahan yang memutus kompatibilitas, migrasi data yang wajib, perubahan kontrak publik, atau perubahan besar pada cara platform digunakan. Contoh: `1.4.2` → `2.0.0`.
- **MINOR** naik untuk kemampuan baru yang kompatibel dengan rilis sebelumnya. Menambahkan satu game baru atau satu mode besar menjadi `1.0.0` → `1.1.0`.
- **PATCH** naik untuk perbaikan bug, aksesibilitas, keamanan, performa, konten, atau tampilan yang tidak mengubah kontrak penggunaan. Contoh perbaikan pada satu game menjadi `1.1.0` → `1.1.1`.

Versi saat ini adalah **`1.5.0`**, release setelah Build the City menjadi game kesebelas yang tersedia di domain publik. Versi tidak dinaikkan untuk setiap commit lokal; versi dinaikkan ketika perubahan siap dipaketkan sebagai release dan dideploy ke production. Setiap release harus memperbarui versi root `package.json`, `package-lock.json`, footer, catatan QA, dan changelog bila tersedia.

Semua aplikasi menampilkan label berikut dari sumber versi bersama:

```text
Version : 1.5.0
```

Nomor versi platform berbeda dari versi skema `localStorage`, versi bank soal, dan versi paket internal. Skema data dapat dinaikkan sendiri jika struktur penyimpanan berubah; perubahan itu biasanya memerlukan keputusan MAJOR hanya bila pengguna harus kehilangan data atau mengikuti migrasi yang memutus kompatibilitas.

## Contoh siklus

| Perubahan                                       | Versi   |
| ----------------------------------------------- | ------- |
| Baseline production enam game                   | `1.0.0` |
| Menambah Puzzle Quest                           | `1.1.0` |
| Memperbaiki bug laporan Puzzle Quest            | `1.1.1` |
| Menambah Treasure Hunt                          | `1.2.0` |
| Menambah Math Battle                            | `1.3.0` |
| Menambah Train of Knowledge                     | `1.4.0` |
| Menambah Build the City                         | `1.5.0` |
| Menambah Quiz Runner mode waktu yang kompatibel | `1.6.0` |
| Mengubah kontrak progres sehingga migrasi wajib | `2.0.0` |
