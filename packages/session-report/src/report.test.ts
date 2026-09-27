import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createGameSession } from "@gezy-games/game-core";
import { mathQuestions, type Question } from "@gezy-games/question-bank";
import { createSessionReport, formatDuration, renderSessionReport } from "./index";

describe("session report", () => {
  it("merangkum hasil unik, waktu, dan penguasaan per topik", () => {
    let timestamp = 0;
    const questions = mathQuestions.slice(5, 7);
    const session = createGameSession(
      questions,
      { questionCount: 2, pointsPerCorrectAnswer: 100, immediateRetries: 1 },
      () => 0.99,
      () => timestamp,
    );
    const first = session.getSnapshot().currentQuestion;
    if (!first) throw new Error("Soal pertama tidak tersedia.");

    session.submitAnswer("jawaban salah");
    timestamp = 12_000;
    session.submitAnswer(first.correctAnswer);
    session.finish();
    const report = createSessionReport(session.getResult(), questions);

    assert.deepEqual(
      {
        correct: report.correct,
        incorrect: report.incorrect,
        unanswered: report.unanswered,
        accuracy: report.accuracy,
        elapsedMs: report.elapsedMs,
        points: report.points,
      },
      { correct: 1, incorrect: 1, unanswered: 1, accuracy: 0.5, elapsedMs: 12_000, points: 100 },
    );
    assert.deepEqual(report.topics, [
      {
        topic: "Penjumlahan",
        correct: 1,
        incorrect: 0,
        unanswered: 1,
        total: 2,
      },
    ]);
    assert.equal(formatDuration(report.elapsedMs), "0:12");
  });

  it("menghasilkan markup aman dengan jawaban dan pembahasan", () => {
    const source = mathQuestions[0];
    if (!source) throw new Error("Fixture soal tidak tersedia.");
    const question: Question = { ...source, prompt: "<script>bahaya()</script>" };
    const session = createGameSession(
      [question],
      {},
      () => 0.99,
      () => 0,
    );
    session.submitAnswer(question.correctAnswer);

    const markup = renderSessionReport(createSessionReport(session.getResult(), [question]));

    assert.match(markup, /Jawaban benar/);
    assert.match(markup, /Pembahasan:/);
    assert.doesNotMatch(markup, /<script>/);
    assert.match(markup, /&lt;script&gt;/);
  });
});
