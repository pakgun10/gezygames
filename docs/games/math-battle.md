# Game Design Brief — Math Battle: Pertarungan Matematika

**Status:** Vertical slice tersedia  
**Rilis sasaran:** Game ekspansi setelah Treasure Hunt  
**Fase awal:** A–D

## Janji permainan

Pemain menghadapi Drako dalam duel bergiliran. Setiap soal menjadi keputusan taktis: jawaban benar mengurangi HP lawan dan mengisi energi, sedangkan jawaban salah memberi pembahasan lalu serangan ringan dari lawan. Mode santai menjaga duel tetap dapat dilanjutkan tanpa game over mendadak.

## Loop vertical slice

1. Pemain memilih fase dan materi matematika.
2. Pemain melihat giliran, HP kedua petarung, dan energi serangan.
3. Pemain memilih salah satu dari tiga jawaban melalui sentuh atau tombol `1–3`.
4. Jawaban benar menghasilkan 25 damage, XP, koin, dan streak.
5. Jawaban salah mengurangi HP pemain secara terbatas dan menampilkan pembahasan; percobaan ulang atau remedial tetap tersedia.
6. Empat jawaban benar mengalahkan lawan awal dan membuka achievement **Penakluk Pertama**.

## Statistik dan laporan

HP lawan, HP pemain, energi, ronde, serangan lawan, XP, koin, dan streak ditampilkan selama duel. Saat sesi selesai, `session-report` bersama merangkum akurasi, materi, jawaban, pembahasan, dan waktu aktif. Progress hadiah tersimpan melalui `@gezy-games/progress` dengan slug `math-battle`.

## Aksesibilitas

- Semua jawaban adalah tombol native dengan focus state yang terlihat.
- Giliran dan feedback dibacakan melalui area `aria-live`.
- Tombol `P` dan `Escape` menjeda sesi; perpindahan tab juga menjeda.
- Audio bersifat pelengkap dan dapat dimatikan.
- `prefers-reduced-motion` mengurangi animasi dekoratif.
