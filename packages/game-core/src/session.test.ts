import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mathQuestions } from "@gezy-games/question-bank";
import { createGameSession, selectQuestions, shuffleQuestionChoices } from "./session";

const fixedRandom = (): number => 0.99;

describe("createGameSession", () => {
  it("menyelesaikan sesi setelah seluruh soal dikuasai", () => {
    const questions = mathQuestions.slice(0, 2);
    const session = createGameSession(questions, { questionCount: 2 }, fixedRandom);

    while (!session.getSnapshot().completed) {
      const question = session.getSnapshot().currentQuestion;
      if (!question) throw new Error("Soal tidak ditemukan.");
      session.submitAnswer(question.correctAnswer);
    }

    assert.deepEqual(
      {
        correctAttempts: session.getResult().correctAttempts,
        incorrectAttempts: session.getResult().incorrectAttempts,
        masteredQuestions: session.getResult().masteredQuestions,
        points: session.getResult().points,
      },
      { correctAttempts: 2, incorrectAttempts: 0, masteredQuestions: 2, points: 20 },
    );
  });

  it("menampilkan kembali soal salah sebagai remedial setelah jeda", () => {
    const questions = mathQuestions.slice(0, 4);
    const session = createGameSession(
      questions,
      { questionCount: 4, remedialGap: 2 },
      fixedRandom,
    );
    const first = session.getSnapshot().currentQuestion;
    if (!first) throw new Error("Soal pertama tidak ditemukan.");

    session.submitAnswer("jawaban salah");

    for (let count = 0; count < 2; count += 1) {
      const question = session.getSnapshot().currentQuestion;
      if (!question) throw new Error("Soal jeda tidak ditemukan.");
      session.submitAnswer(question.correctAnswer);
    }

    assert.equal(session.getSnapshot().currentQuestion?.id, first.id);
    const remedial = session.submitAnswer(first.correctAnswer);
    assert.equal(remedial.isRemedial, true);
    assert.equal(session.getResult().incorrectAttempts, 1);
  });

  it("menolak jawaban ketika sesi dijeda", () => {
    const session = createGameSession(mathQuestions.slice(0, 1), {}, fixedRandom);
    session.pause();

    assert.throws(() => session.submitAnswer("12"), /Sesi sedang dijeda/);
    session.resume();
    assert.doesNotThrow(() => session.submitAnswer("12"));
  });

  it("dapat memberi satu kesempatan mencoba lagi sebelum maju", () => {
    const session = createGameSession(
      mathQuestions.slice(0, 2),
      { questionCount: 2, immediateRetries: 1 },
      fixedRandom,
    );
    const firstId = session.getSnapshot().currentQuestion?.id;

    session.submitAnswer("jawaban salah");
    assert.equal(session.getSnapshot().currentQuestion?.id, firstId);

    const correctAnswer = session.getSnapshot().currentQuestion?.correctAnswer;
    if (!correctAnswer) throw new Error("Jawaban benar tidak ditemukan.");
    session.submitAnswer(correctAnswer);
    assert.notEqual(session.getSnapshot().currentQuestion?.id, firstId);
  });

  it("memilih soal berdasarkan fase dan topik", () => {
    const selected = selectQuestions(mathQuestions, { phase: "A", topic: "Penjumlahan" });

    assert.equal(selected.length, 2);
    assert.ok(selected.every((question) => question.phase === "A" && question.topic === "Penjumlahan"));
  });

  it("mengacak pilihan tanpa mengubah soal atau kunci jawaban", () => {
    const question = mathQuestions[0];
    if (!question) throw new Error("Fixture soal tidak ditemukan.");
    const originalChoices = [...question.choices];

    const shuffled = shuffleQuestionChoices(question, () => 0);

    assert.notDeepEqual(shuffled, originalChoices);
    assert.deepEqual([...shuffled].sort(), [...originalChoices].sort());
    assert.ok(shuffled.includes(question.correctAnswer));
    assert.deepEqual(question.choices, originalChoices);
  });

  it("menghitung durasi aktif tanpa waktu jeda", () => {
    let timestamp = 1_000;
    const session = createGameSession(
      mathQuestions.slice(0, 1),
      { questionCount: 1 },
      fixedRandom,
      () => timestamp,
    );

    timestamp = 4_000;
    session.pause();
    timestamp = 9_000;
    assert.equal(session.getSnapshot().elapsedMs, 3_000);
    session.resume();
    timestamp = 11_000;
    session.finish();

    assert.equal(session.getResult().elapsedMs, 5_000);
    assert.equal(session.getResult().unansweredQuestions, 1);
  });
});
