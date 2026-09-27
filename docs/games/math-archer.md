# Game Design Brief — Math Archer / Pemanah Matematika

**Status:** First playable  
**Fase:** Fondasi, A, B, C, D  
**Perangkat utama:** Ponsel, tablet, desktop, dan IFP 52 inci

## Janji permainan

Pemain membaca atau mendengar tantangan, membidik salah satu sasaran, lalu melihat panah terbang dan mengenai target. Jawaban terasa sebagai sebuah aksi fisik dengan hasil yang langsung terlihat.

## Loop 20 detik

1. Soal tampil pada papan kayu.
2. Tiga atau empat target bergerak masuk ke arena.
3. Pemain menyentuh target atau menekan tombol angka.
4. Pemanah menarik tali dan panah melesat.
5. Target benar pecah dengan feedback XP; target keliru membuat panah meleset dan memberi petunjuk.
6. Arena menyiapkan sasaran berikutnya.

## Mode sesi

- **Santai:** tanpa timer, direkomendasikan untuk materi baru dan Fase Fondasi.
- **Latihan:** waktu longgar per soal, tetapi waktu habis tidak langsung mengakhiri sesi.
- **Tantangan:** timer dan bonus kecepatan untuk materi yang telah dikuasai.

Sesi default berisi 10 target konsep. Soal yang belum dikuasai muncul kembali setelah 2–4 soal lain.

## HUD

```text
┌──────────────────────────────────────────────────────────────┐
│ ⭐ 1.250 XP    💰 350    🔥 5       ❤️❤️❤️    LEVEL 5      │
├──────────────────────────────────────────────────────────────┤
│                  Berapa hasil 3 × 8?                         │
│                                                              │
│      🎯 21          🎯 24          🎯 27          🎯 32      │
│                                                              │
│  🏹 PEMANAH                         ███████░░░  7/10          │
└──────────────────────────────────────────────────────────────┘
```

Pada ponsel, statistik sekunder diringkas dan target menjadi grid 2 × 2. Pada IFP, target diperbesar dan disebar horizontal agar beberapa siswa dapat berdiskusi tanpa menutupi soal.

## Skor dan progres

- Jawaban benar pertama: `+100 XP` dan koin dasar.
- Streak menaikkan feedback dan bonus kecil, dengan batas agar tidak mendominasi hasil.
- Salah pertama: streak berhenti dan satu petunjuk muncul; pemain boleh mencoba lagi.
- Salah kedua: solusi ditampilkan singkat dan konsep dijadwalkan untuk remedial.
- Hati dipakai sebagai ketahanan sesi pada mode Tantangan. Mode Santai tidak berakhir karena hati habis.
- Laporan mastery tetap terpisah dari XP, koin, dan level.

## Fase Fondasi

Fase Fondasi tidak bergantung pada kemampuan membaca. Papan dapat menampilkan:

- Menentukan kumpulan yang memiliki 3 benda.
- Memilih bentuk lingkaran.
- Memilih kelompok yang lebih banyak atau lebih sedikit.
- Melanjutkan pola warna atau bentuk.
- Mengenali posisi atas, bawah, kiri, dan kanan.

Instruksi memiliki tombol audio, sasaran memakai ilustrasi besar, sesi 5–7 target, dan tidak memakai timer wajib atau kondisi kalah.

## Animasi dan rasa bermain

- Arah panah dihitung dari posisi pemanah menuju pusat target.
- Durasi terbang 350–550 ms agar terasa cepat namun tetap dapat diikuti mata.
- Target benar memakai pecahan kayu/debu ringan; target salah bergoyang dan panah menancap di tanah di dekatnya.
- Input dikunci selama panah bergerak untuk mencegah jawaban ganda.
- Reduced motion mengganti lintasan panah dengan transisi sorot singkat.
- Audio memiliki cue menarik tali, melesat, kena target, meleset, dan hadiah; seluruh informasi juga tersedia secara visual.

## Kontrol

| Perangkat     | Kontrol                                                     |
| ------------- | ----------------------------------------------------------- |
| Sentuh/IFP    | Sentuh langsung target                                      |
| Mouse         | Klik target                                                 |
| Keyboard      | Tombol 1–4 memilih target; Space/Enter melanjutkan          |
| Aksesibilitas | Target berupa tombol asli dengan label soal dan isi jawaban |

## First playable

- Setup fase dan mode sesi.
- Satu arena hutan dengan pemanah serta 3–4 target.
- Minimal lima soal terbit untuk setiap fase.
- Animasi tembak benar dan meleset.
- XP, koin, streak, progres, dan tiga hati pada mode Tantangan.
- Remedial setelah jeda.
- Layar hasil dengan mastery dan pembahasan.
- Layout ponsel dan IFP.

## Definition of done

- Sesi dapat diselesaikan dengan sentuh, mouse, atau keyboard.
- Pemain tidak dapat mengirim dua jawaban selama animasi.
- Mode Santai dapat dimainkan tanpa tekanan waktu atau kondisi kalah.
- Soal salah muncul kembali dan tidak memberi XP mastery dua kali.
- UI tetap terbaca pada 390 × 844 dan 1920 × 1080.
- Audio, fullscreen, pause, dan reduced motion berfungsi.
