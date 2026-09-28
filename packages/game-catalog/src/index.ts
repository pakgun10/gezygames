export type Subject = "Matematika" | "IPAS" | "Semua mapel";
export type GameStatus = "in-development" | "planned";

export interface GameCatalogItem {
  readonly slug: string;
  readonly name: string;
  readonly internationalName: string;
  readonly subject: Subject;
  readonly phases: readonly ("Fondasi" | "A" | "B" | "C" | "D")[];
  readonly mechanic: string;
  readonly description: string;
  readonly icon: string;
  readonly theme: string;
  readonly status: GameStatus;
}

export const games: readonly GameCatalogItem[] = [
  {
    slug: "math-castle",
    name: "Benteng Matematika",
    internationalName: "Math Castle",
    subject: "Matematika",
    phases: ["A", "B", "C", "D"],
    mechanic: "Strategi pertahanan",
    description: "Jawab soal untuk memperkuat benteng dan menghalau serangan musuh.",
    icon: "🏰",
    theme: "castle",
    status: "in-development",
  },
  {
    slug: "math-space-mission",
    name: "Misi Antariksa",
    internationalName: "Math Space Mission",
    subject: "Matematika",
    phases: ["A", "B", "C", "D"],
    mechanic: "Perjalanan planet",
    description: "Kumpulkan energi dari jawaban benar untuk menjelajah planet baru.",
    icon: "🚀",
    theme: "space",
    status: "in-development",
  },
  {
    slug: "science-lab",
    name: "Laboratorium Sains",
    internationalName: "Science Lab",
    subject: "IPAS",
    phases: ["Fondasi", "A", "B", "C", "D"],
    mechanic: "Eksperimen virtual",
    description: "Atur bahan, buat prediksi, lalu amati hasil eksperimenmu.",
    icon: "🧪",
    theme: "lab",
    status: "in-development",
  },
  {
    slug: "quiz-runner",
    name: "Pelari Cerdas",
    internationalName: "Quiz Runner",
    subject: "Semua mapel",
    phases: ["A", "B", "C", "D"],
    mechanic: "Lari dan pilih jalur",
    description: "Pilih jalur jawaban yang tepat sambil berlari menuju garis akhir.",
    icon: "🏃",
    theme: "runner",
    status: "in-development",
  },
  {
    slug: "math-archer",
    name: "Pemanah Matematika",
    internationalName: "Math Archer",
    subject: "Matematika",
    phases: ["Fondasi", "A", "B", "C", "D"],
    mechanic: "Bidik jawaban",
    description: "Arahkan panah ke sasaran yang memuat jawaban paling tepat.",
    icon: "🏹",
    theme: "archer",
    status: "in-development",
  },
  {
    slug: "puzzle-quest",
    name: "Petualangan Puzzle",
    internationalName: "Puzzle Quest",
    subject: "Matematika",
    phases: ["A", "B", "C", "D"],
    mechanic: "Susun dan pecahkan",
    description: "Gunakan pola, bentuk, dan pecahan untuk membuka jalan berikutnya.",
    icon: "🧩",
    theme: "puzzle",
    status: "in-development",
  },
  {
    slug: "treasure-hunt",
    name: "Perburuan Harta Karun",
    internationalName: "Treasure Hunt",
    subject: "Semua mapel",
    phases: ["A", "B", "C", "D"],
    mechanic: "Eksplorasi peta",
    description: "Ikuti petunjuk, temukan soal, dan buka peti di pulau misterius.",
    icon: "🗺️",
    theme: "treasure",
    status: "in-development",
  },
  {
    slug: "math-battle",
    name: "Pertarungan Matematika",
    internationalName: "Math Battle",
    subject: "Matematika",
    phases: ["A", "B", "C", "D"],
    mechanic: "Duel bergiliran",
    description: "Bangun serangan dan pertahanan dengan memecahkan soal matematika.",
    icon: "⚔️",
    theme: "battle",
    status: "in-development",
  },
  {
    slug: "train-of-knowledge",
    name: "Kereta Pengetahuan",
    internationalName: "Train of Knowledge",
    subject: "Semua mapel",
    phases: ["Fondasi", "A", "B", "C", "D"],
    mechanic: "Perjalanan stasiun",
    description: "Jawab pertanyaan untuk menambah gerbong dan mencapai stasiun baru.",
    icon: "🚂",
    theme: "train",
    status: "in-development",
  },
  {
    slug: "build-the-city",
    name: "Bangun Kota",
    internationalName: "Build the City",
    subject: "Matematika",
    phases: ["B", "C", "D"],
    mechanic: "Bangun dan kelola",
    description: "Gunakan hasil hitungan sebagai anggaran untuk membangun fasilitas kota.",
    icon: "🏭",
    theme: "city",
    status: "in-development",
  },
  {
    slug: "math-adventure",
    name: "Jelajah Pulau Matematika",
    internationalName: "Math Adventure",
    subject: "Matematika",
    phases: ["A", "B", "C", "D"],
    mechanic: "Petualangan dunia terbuka",
    description: "Jelajahi pulau, tuntaskan misi wilayah, dan hadapi boss matematika.",
    icon: "🏝️",
    theme: "island",
    status: "planned",
  },
  {
    slug: "dragon-quiz",
    name: "Kuis Sang Naga",
    internationalName: "Dragon Quiz",
    subject: "Semua mapel",
    phases: ["A", "B", "C", "D"],
    mechanic: "Pertarungan bos",
    description: "Kuasai setiap tahap pertanyaan untuk menghadapi naga penjaga.",
    icon: "🐉",
    theme: "dragon",
    status: "planned",
  },
] as const;

export const subjects = ["Semua", "Matematika", "IPAS", "Semua mapel"] as const;
export type SubjectFilter = (typeof subjects)[number];
