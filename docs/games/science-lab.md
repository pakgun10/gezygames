# Game Design Brief — Science Lab: Laboratorium Sains

**Status:** Prototipe interaksi tersedia  
**Rilis sasaran:** Prototipe setelah Math Adventure  
**Fase awal:** Fondasi–D dengan tujuan belajar dan tingkat bantuan yang berbeda

## Janji permainan

Pemain menjadi ilmuwan muda yang membantu desa menjernihkan air. Mereka memilih bahan, menyusun lapisan penyaring, menjalankan eksperimen, lalu mengamati perubahan kejernihan. Interaksi utama terjadi pada meja kerja virtual sehingga pemain melakukan tindakan dan melihat akibatnya.

## Vertical slice pertama

Eksperimen **Air Bersih untuk Desa** membuktikan alur dasar berikut:

1. Pemain membaca masalah dan memilih bahan kerikil, pasir, serta kapas.
2. Bahan disusun dari lapisan paling bawah ke paling atas melalui sentuhan atau mouse.
3. Pemain mengalirkan air dan melihat animasi mesin, perubahan warna tangki, serta meter kejernihan.
4. Urutan benar memberi feedback, XP, koin, dan satu sesi tersimpan; urutan keliru memberi petunjuk dan kesempatan menyusun ulang.

Urutan awal memakai prinsip sederhana: kotoran besar ditahan lebih dulu, lalu partikel lebih kecil. Tujuan belajar dan penjelasan singkat tampil di dalam eksperimen, bukan hanya pada halaman informasi.

## Perluasan lintas fase

| Fase    | Contoh eksperimen                                              | Bentuk bantuan                          |
| ------- | -------------------------------------------------------------- | --------------------------------------- |
| Fondasi | Mengelompokkan benda yang mengapung dan tenggelam              | Ikon besar, audio opsional, tanpa timer |
| A       | Mengamati perubahan wujud air                                  | Urutan langkah dengan contoh visual     |
| B       | Menyaring campuran dan membandingkan hasil                     | Prediksi sebelum eksperimen             |
| C       | Rangkaian gaya, cahaya, atau perubahan suhu                    | Variabel dapat diubah satu per satu     |
| D       | Merancang prosedur, membaca data, dan menjelaskan sebab-akibat | Tabel hasil, hipotesis, dan laporan     |

Konten berikutnya sebaiknya memakai registry eksperimen, bukan cabang kode per game. Setiap eksperimen perlu mendefinisikan tujuan, bahan, tindakan yang tersedia, aturan validasi, observasi, feedback, dan rubrik penjelasan.

## Kebutuhan mesin sesi

Prototipe menggunakan progres bersama untuk XP, koin, dan jumlah sesi. Perluasan berikut memerlukan model konten terstruktur:

```ts
interface ExperimentDefinition {
  id: string;
  phase: "Fondasi" | "A" | "B" | "C" | "D";
  objective: string;
  materials: MaterialDefinition[];
  steps: ExperimentStep[];
  evaluate(state: ExperimentState): ExperimentResult;
}
```

Mesin sesi harus menyimpan percobaan yang selesai, prediksi, observasi, percobaan ulang, mastery per konsep, serta alasan kesalahan. Timer dan kondisi gagal bersifat opsional; mode Fondasi dan mode aksesibilitas tidak boleh menghukum percobaan ulang.

## Layout IFP dan aksesibilitas

- Target bahan dan tombol aksi minimal 88 × 88 piksel CSS pada layout layar besar.
- Setiap operasi drag memiliki alternatif ketuk untuk memilih dan menyusun.
- Perubahan kejernihan diumumkan melalui status live dan tetap terlihat secara visual.
- Suara dapat dimatikan; kegagalan Web Audio tidak menghentikan eksperimen.
- Layout responsif diuji pada sentuh 390×844 dan mouse desktop.

## Kriteria keberhasilan desain

- Penguji dapat menjelaskan mengapa urutan bahan memengaruhi hasil.
- Perubahan hasil terlihat jelas tanpa membaca kode atau instruksi tambahan.
- Pemain melakukan setidaknya tiga tindakan bermakna sebelum menerima feedback.
- Eksperimen dapat diulang setelah salah tanpa kehilangan sesi atau progres sebelumnya.
