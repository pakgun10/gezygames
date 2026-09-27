import type { Question } from "./types";

export const validQuestionFixture: Question = {
  id: "math-a-fixture-001",
  subject: "matematika",
  phase: "A",
  topic: "Penjumlahan",
  difficulty: 1,
  type: "multiple-choice",
  prompt: "Berapa hasil 2 + 3?",
  choices: ["4", "5", "6"],
  correctAnswer: "5",
  explanation: "Dua ditambah tiga sama dengan lima.",
  status: "published",
};

export const invalidQuestionFixture: Question = {
  ...validQuestionFixture,
  correctAnswer: "9",
  assets: [
    { id: "diagram", kind: "image", src: "/assets/diagram.svg" },
    { id: "diagram", kind: "audio", src: "" },
  ],
};
