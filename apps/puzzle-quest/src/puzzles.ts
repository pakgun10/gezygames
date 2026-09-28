import { mathQuestions, type Phase, type Question } from "@gezy-games/question-bank";

export interface SequencePuzzle {
  readonly kind: "sequence";
  readonly questionId: string;
  readonly title: string;
  readonly instruction: string;
  readonly pieces: readonly string[];
  readonly correctOrder: readonly number[];
}

export interface MatchPuzzle {
  readonly kind: "match";
  readonly questionId: string;
  readonly title: string;
  readonly instruction: string;
  readonly left: readonly string[];
  readonly right: readonly string[];
  readonly pairs: readonly (readonly [number, number])[];
}

export type PuzzleChallenge = SequencePuzzle | MatchPuzzle;

/**
 * Konten vertical slice sengaja memakai soal bank bersama. Puzzle hanya
 * menentukan representasi dan interaksi; kunci jawaban dan pembahasan tetap
 * berasal dari Question agar laporan belajar konsisten.
 */
export const puzzleChallenges: readonly PuzzleChallenge[] = [
  {
    kind: "sequence",
    questionId: "math-a-addition-001",
    title: "Jembatan penjumlahan",
    instruction: "Susun kepingan dari cerita hitung sampai hasil akhirnya.",
    pieces: ["Mulai dari 7", "Tambahkan 5", "Hasilnya 12"],
    correctOrder: [0, 1, 2],
  },
  {
    kind: "match",
    questionId: "math-a-subtraction-001",
    title: "Pintu pasangan bilangan",
    instruction: "Ketuk satu keping kiri lalu pasangkan dengan hasil di kanan.",
    left: ["15 − 7", "18 − 9", "47: angka 4"],
    right: ["60", "9", "8"],
    pairs: [
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  },
  {
    kind: "sequence",
    questionId: "math-b-multiplication-001",
    title: "Jembatan kelompok",
    instruction: "Susun model perkalian dari banyak kelompok sampai jumlah pensil.",
    pieces: ["6 kotak", "Masing-masing × 8 pensil", "Total 48 pensil"],
    correctOrder: [0, 1, 2],
  },
  {
    kind: "match",
    questionId: "math-b-fraction-001",
    title: "Pintu pecahan senilai",
    instruction: "Pasangkan pecahan dengan bentuk yang nilainya sama.",
    left: ["1/2", "1/3", "3/4"],
    right: ["2/4", "2/6", "3/4"],
    pairs: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
  },
  {
    kind: "sequence",
    questionId: "math-c-percentage-001",
    title: "Mesin persentase",
    instruction: "Susun cara menemukan 25% dari 80.",
    pieces: ["Ambil 25% dari 80", "Hitung 80 ÷ 4", "Hasilnya 20"],
    correctOrder: [0, 1, 2],
  },
  {
    kind: "match",
    questionId: "math-c-area-001",
    title: "Ruang luas persegi panjang",
    instruction: "Hubungkan ukuran dengan perannya dalam menghitung luas.",
    left: ["Panjang", "Lebar", "Luas"],
    right: ["60 cm²", "5 cm", "12 cm"],
    pairs: [
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  },
  {
    kind: "sequence",
    questionId: "math-d-function-001",
    title: "Menara fungsi",
    instruction: "Susun langkah menghitung f(5) jika f(x) = 3x − 2.",
    pieces: ["Masukkan x = 5", "Hitung 3 × 5 − 2", "Hasilnya 13"],
    correctOrder: [0, 1, 2],
  },
  {
    kind: "match",
    questionId: "math-d-relation-001",
    title: "Gerbang relasi",
    instruction: "Hubungkan setiap anggota A dengan dua kali nilainya di B.",
    left: ["1", "2", "3"],
    right: ["2", "4", "6"],
    pairs: [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
  },
] as const;

const challengeByQuestionId = new Map(
  puzzleChallenges.map((challenge) => [challenge.questionId, challenge]),
);

export const getPuzzleChallenge = (questionId: string): PuzzleChallenge | undefined =>
  challengeByQuestionId.get(questionId);

export const puzzleQuestionsForPhase = (
  questions: readonly Question[],
  phase: Phase,
  topic?: string | null,
): readonly Question[] =>
  questions.filter(
    (question) =>
      question.phase === phase &&
      question.status === "published" &&
      challengeByQuestionId.has(question.id) &&
      (topic === undefined || topic === null || question.topic === topic),
  );

export const validatePuzzleContent = (challenges: readonly PuzzleChallenge[]): string[] => {
  const errors: string[] = [];
  const ids = new Set<string>();
  const questionsById = new Map(mathQuestions.map((question) => [question.id, question]));
  challenges.forEach((challenge) => {
    if (ids.has(challenge.questionId)) errors.push(`${challenge.questionId}: ID puzzle ganda.`);
    ids.add(challenge.questionId);
    const sourceQuestion = questionsById.get(challenge.questionId);
    if (!sourceQuestion || sourceQuestion.status !== "published")
      errors.push(`${challenge.questionId}: harus menunjuk ke soal published pada bank bersama.`);
    if (!challenge.title.trim() || !challenge.instruction.trim())
      errors.push(`${challenge.questionId}: judul dan instruksi wajib diisi.`);

    if (challenge.kind === "sequence") {
      const expected = challenge.correctOrder;
      const validIndices = expected.every(
        (index) => Number.isInteger(index) && index >= 0 && index < challenge.pieces.length,
      );
      if (
        challenge.pieces.length < 2 ||
        expected.length !== challenge.pieces.length ||
        !validIndices
      )
        errors.push(
          `${challenge.questionId}: urutan puzzle harus memakai semua kepingan tepat sekali.`,
        );
      if (new Set(expected).size !== expected.length)
        errors.push(`${challenge.questionId}: urutan puzzle tidak boleh mengulang kepingan.`);
    } else {
      const validPairs = challenge.pairs.every(
        ([leftIndex, rightIndex]) =>
          Number.isInteger(leftIndex) &&
          Number.isInteger(rightIndex) &&
          leftIndex >= 0 &&
          leftIndex < challenge.left.length &&
          rightIndex >= 0 &&
          rightIndex < challenge.right.length,
      );
      const leftIndices = challenge.pairs.map(([leftIndex]) => leftIndex);
      const rightIndices = challenge.pairs.map(([, rightIndex]) => rightIndex);
      if (
        challenge.left.length < 2 ||
        challenge.left.length !== challenge.right.length ||
        challenge.pairs.length !== challenge.left.length ||
        !validPairs ||
        new Set(leftIndices).size !== leftIndices.length ||
        new Set(rightIndices).size !== rightIndices.length
      )
        errors.push(
          `${challenge.questionId}: pasangan puzzle harus membentuk pemetaan satu-ke-satu.`,
        );
    }
  });
  return errors;
};

const contentErrors = validatePuzzleContent(puzzleChallenges);
if (contentErrors.length > 0)
  throw new Error(`Konten Puzzle Quest tidak valid:\n${contentErrors.join("\n")}`);
