import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mathQuestions } from "./math";
import type { Question } from "./types";
import { validateQuestionBank } from "./validate";

describe("validateQuestionBank", () => {
  it("menerima bank soal terbit saat ini", () => {
    assert.deepEqual(validateQuestionBank(mathQuestions), []);
  });

  it("menolak ID ganda dan kunci yang tidak ada dalam pilihan", () => {
    const invalid: Question = {
      ...mathQuestions[0],
      correctAnswer: "99",
    };

    const issues = validateQuestionBank([mathQuestions[0], invalid]);

    assert.equal(issues.some((issue) => issue.message === "ID soal harus unik."), true);
    assert.equal(issues.some((issue) => issue.field === "correctAnswer"), true);
  });
});
