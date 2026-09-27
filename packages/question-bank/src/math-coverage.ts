import type { Phase } from "./types";

export const minimumQuestionsPerPhase = 10;
export const minimumQuestionsPerTopic = 2;

export const mathMvpTopics: Record<Phase, readonly string[]> = {
  Fondasi: ["Membilang", "Bentuk", "Banyak dan sedikit", "Pola", "Posisi"],
  A: ["Penjumlahan", "Pengurangan", "Nilai tempat", "Pola bilangan", "Pengukuran panjang"],
  B: ["Penjumlahan", "Perkalian", "Pembagian", "Pecahan", "Keliling"],
  C: ["Pecahan", "Desimal", "Persentase", "Luas", "Perbandingan"],
  D: ["Himpunan", "Relasi", "Fungsi", "Persamaan linear", "SPLDV"],
};
