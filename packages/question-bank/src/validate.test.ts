import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { invalidQuestionFixture, validQuestionFixture } from "./fixtures";
import { mathQuestions } from "./math";
import type { Question, QuestionBank } from "./types";
import {
  validateMathMvpCoverage,
  validateQuestionBank,
  validateQuestionBankDocument,
} from "./validate";

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

    assert.equal(
      issues.some((issue) => issue.message === "ID soal harus unik."),
      true,
    );
    assert.equal(
      issues.some((issue) => issue.field === "correctAnswer"),
      true,
    );
  });

  it("memastikan cakupan minimal dua soal pada setiap topik MVP", () => {
    assert.deepEqual(validateMathMvpCoverage(mathQuestions), []);
    const issues = validateMathMvpCoverage(mathQuestions.slice(0, 9));

    assert.ok(issues.some((issue) => issue.message.includes("Fase A membutuhkan minimal")));
    assert.ok(issues.some((issue) => issue.message.includes("Topik Membilang")));
  });

  it("memvalidasi aset soal dan dokumen bank berversi", () => {
    const withAsset: Question = {
      ...validQuestionFixture,
      assets: [
        { id: "counting-picture", kind: "image", src: "/assets/counting.svg", alt: "Tiga bintang" },
      ],
    };
    assert.deepEqual(validateQuestionBank([withAsset]), []);

    const invalidAsset: Question = {
      ...invalidQuestionFixture,
    };
    const assetIssues = validateQuestionBank([invalidAsset]);
    assert.ok(assetIssues.filter((issue) => issue.field === "assets").length >= 3);

    const invalidVersion = {
      version: 99,
      questions: [validQuestionFixture],
    } as unknown as QuestionBank;
    assert.ok(
      validateQuestionBankDocument(invalidVersion).some((issue) => issue.field === "version"),
    );
  });
});
