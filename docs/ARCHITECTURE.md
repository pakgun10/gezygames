# Arsitektur Gezy Games

**Status:** Diterapkan untuk MVP  
**Keputusan terakhir:** 27 September 2026

## Keputusan

Gezy Games menggunakan monorepo TypeScript dengan aplikasi web terpisah dan paket bersama. Portal serta UI permainan memakai DOM, CSS, dan Vite. Mesin permainan, penyimpanan, laporan, dan konten berada pada paket TypeScript murni supaya dapat digunakan ulang tanpa menyalin aturan belajar.

```text
apps/
  portal/                 beranda dan katalog pada /
  math-archer/            game pertama pada /math-archer/
packages/
  design-system/          token, reset, fokus, reduced motion
  game-catalog/           data katalog game
  question-bank/          skema, bank, cakupan, validasi konten
  game-core/              sesi, remedial, skor belajar
  progress/               progres dan preferensi lokal berversi
  session-report/         laporan belajar per sesi
  game-shell/             HUD, bantuan, dialog, pengelolaan fokus
deploy/
  nginx/                  konfigurasi produksi statis
```

## Batas tanggung jawab

| Bagian         | Bertanggung jawab atas                                   | Tidak bertanggung jawab atas       |
| -------------- | -------------------------------------------------------- | ---------------------------------- |
| Portal         | Menemukan game, menyaring katalog, membaca progres lokal | Aturan permainan                   |
| Aplikasi game  | Arena, kontrol spesifik, animasi, feedback               | Menyalin mesin sesi atau bank soal |
| Question bank  | ID, fase, topik, jawaban, pembahasan, status editorial   | Tata letak arena                   |
| Game core      | Urutan soal, remedial, penguasaan, waktu aktif           | DOM dan CSS                        |
| Game shell     | HUD, bantuan, pause, dialog fokus                        | Mekanik unik sebuah game           |
| Session report | Ringkasan dan rincian hasil belajar                      | XP, koin, atau visual kemenangan   |
| Progress       | Preferensi dan progres lokal yang dapat dimigrasikan     | Akun atau sinkronisasi server      |

## Workspace dan build

**Pilihan yang digunakan:** npm workspaces. Ini sudah cukup untuk dua aplikasi dan paket bersama, dapat dibangun dari checkout bersih dengan `npm ci`, dan tidak menambah alat orkestrasi di luar kebutuhan MVP.

Alternatif seperti repository terpisah akan membuat versi bank soal, laporan, dan progres lebih sulit diselaraskan. Tooling monorepo yang lebih besar belum diperlukan karena build aplikasi saat ini cepat dan dependensi internal masih sedikit.

Perintah root:

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

Build menjalankan validasi konten sebelum membuat aset statis. Hasilnya:

- portal: `dist/index.html`
- Math Archer: `dist/math-archer/index.html`

## Routing dan deployment

Setiap game adalah aplikasi Vite dengan `base` URL eksplisit:

```ts
// aplikasi game baru, contoh Math Castle
export default defineConfig({
  base: "/math-castle/",
  build: { outDir: "../../dist/math-castle", emptyOutDir: false },
});
```

Nginx menyajikan `dist/` sebagai root domain. Aturan asetnya sudah mencakup `/assets/` dan `/<slug-game>/assets/`; fallback mengarahkan URL aplikasi ke `index.html` di direktori yang sesuai. Math Archer membuktikan pola ini pada `/math-archer/`. Sebelum game baru dirilis, tambahkan pengecualian cache untuk `/<slug-game>/index.html` bila diperlukan, lalu uji refresh URL tersebut langsung.

## DOM, Canvas, dan Phaser

MVP memilih DOM dan CSS untuk portal, setup, HUD, pilihan jawaban, dialog, dan laporan karena teksnya mudah diakses oleh keyboard, pembaca layar, zoom, dan layar sentuh besar.

Phaser belum menjadi ketergantungan. Phaser dipakai hanya jika sebuah game benar-benar membutuhkan:

- kamera atau peta yang bergerak;
- fisika, tabrakan, atau pathfinding;
- banyak sprite yang harus diperbarui setiap frame;
- drag-and-drop berbasis scene yang tidak praktis di DOM.

Saat Phaser dipakai, teks soal, kontrol penting, dialog, dan laporan tetap berada pada DOM. Scene Phaser mengirim peristiwa aksi ke aplikasi game; aplikasi game tetap memanggil `game-core`, `progress`, dan `session-report`. Math Adventure adalah kandidat pertama untuk evaluasi ini karena memiliki peta pulau dan eksplorasi wilayah.

## Data lokal dan privasi

MVP tidak memiliki akun atau layanan backend. Nama panggilan, audio, fase terakhir, topik terakhir, dan progres permainan disimpan pada `localStorage` dengan kunci versi. Data rusak dipulihkan menjadi kondisi kosong; kegagalan storage tidak menghentikan permainan. Pemain dapat menghapus seluruh data tersebut dari portal.

## Aset

Latar, teks soal, pilihan, dan kontrol dipisahkan. Aset inti harus disimpan lokal dan sumber/lisensinya dicatat sebelum dipakai. Karena arena Math Archer saat ini dibuat dengan CSS dan emoji sistem, belum ada aset pihak ketiga yang dikirim pada build.

## Kriteria penambahan game

Game baru harus:

1. Memiliki slug stabil dan build terpisah di `apps/<slug>/`.
2. Memakai bank soal, game core, progres, shell, dan laporan yang sesuai.
3. Menambah mekanik belajar yang berbeda, bukan hanya latar baru.
4. Lulus lint, format, typecheck, test, validasi konten, build, dan smoke test URL publik.
