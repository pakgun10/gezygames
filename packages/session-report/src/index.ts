import type { SessionResult } from "@gezy-games/game-core";
import type { Question } from "@gezy-games/question-bank";

export type QuestionResultStatus = "correct" | "incorrect" | "unanswered";

export interface QuestionReport {
  readonly questionId: string;
  readonly topic: string;
  readonly prompt: string;
  readonly status: QuestionResultStatus;
  readonly playerAnswers: readonly string[];
  readonly correctAnswer: string;
  readonly explanation: string;
}

export interface TopicReport {
  readonly topic: string;
  readonly correct: number;
  readonly incorrect: number;
  readonly unanswered: number;
  readonly total: number;
}

export interface SessionReport {
  readonly correct: number;
  readonly incorrect: number;
  readonly unanswered: number;
  readonly accuracy: number;
  readonly elapsedMs: number;
  readonly points: number;
  readonly topics: readonly TopicReport[];
  readonly questions: readonly QuestionReport[];
}

const answerLabel = (answer: string): string => answer === "__TIMEOUT__" ? "Waktu habis" : answer;

export const createSessionReport = (
  result: SessionResult,
  questionBank: readonly Question[],
): SessionReport => {
  const questionsById = new Map(questionBank.map((question) => [question.id, question]));
  const mastered = new Set(result.masteredQuestionIds);

  const questions = result.questionIds.map((questionId): QuestionReport => {
    const question = questionsById.get(questionId);
    if (!question) throw new Error(`Soal ${questionId} tidak ditemukan saat membuat laporan.`);
    const attempts = result.attempts.filter((attempt) => attempt.questionId === questionId);
    const status: QuestionResultStatus = mastered.has(questionId)
      ? "correct"
      : attempts.length > 0
        ? "incorrect"
        : "unanswered";

    return {
      questionId,
      topic: question.topic,
      prompt: question.prompt,
      status,
      playerAnswers: attempts.map((attempt) => answerLabel(attempt.selectedAnswer)),
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    };
  });

  const topics = [...new Set(questions.map((question) => question.topic))].map((topic): TopicReport => {
    const topicQuestions = questions.filter((question) => question.topic === topic);
    return {
      topic,
      correct: topicQuestions.filter((question) => question.status === "correct").length,
      incorrect: topicQuestions.filter((question) => question.status === "incorrect").length,
      unanswered: topicQuestions.filter((question) => question.status === "unanswered").length,
      total: topicQuestions.length,
    };
  });

  return {
    correct: result.correctAttempts,
    incorrect: result.incorrectAttempts,
    unanswered: result.unansweredQuestions,
    accuracy: result.accuracy,
    elapsedMs: result.elapsedMs,
    points: result.points,
    topics,
    questions,
  };
};

export const formatDuration = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const escapeHtml = (value: string): string => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const statusLabels: Record<QuestionResultStatus, string> = {
  correct: "Dikuasai",
  incorrect: "Perlu dicoba lagi",
  unanswered: "Belum dijawab",
};

export const renderSessionReport = (report: SessionReport): string => `
  <section class="session-report" aria-labelledby="session-report-title">
    <h2 id="session-report-title">Laporan belajar</h2>
    <div class="report-overview">
      <div><span>BENAR</span><strong>${report.correct}</strong></div>
      <div><span>SALAH</span><strong>${report.incorrect}</strong></div>
      <div><span>BELUM DIJAWAB</span><strong>${report.unanswered}</strong></div>
      <div><span>AKURASI</span><strong>${Math.round(report.accuracy * 100)}%</strong></div>
      <div><span>WAKTU AKTIF</span><strong>${formatDuration(report.elapsedMs)}</strong></div>
      <div><span>SKOR BELAJAR</span><strong>${report.points}</strong></div>
    </div>

    <div class="topic-report">
      <h3>Hasil per materi</h3>
      <ul>
        ${report.topics.map((topic) => `
          <li>
            <strong>${escapeHtml(topic.topic)}</strong>
            <span>${topic.correct}/${topic.total} dikuasai${topic.incorrect > 0 ? ` · ${topic.incorrect} perlu diulang` : ""}${topic.unanswered > 0 ? ` · ${topic.unanswered} belum dijawab` : ""}</span>
          </li>
        `).join("")}
      </ul>
    </div>

    <details class="answer-review">
      <summary>Lihat rincian jawaban (${report.questions.length})</summary>
      <ol>
        ${report.questions.map((question, index) => `
          <li class="answer-review__item answer-review__item--${question.status}">
            <div class="answer-review__heading">
              <span>Soal ${index + 1} · ${escapeHtml(question.topic)}</span>
              <strong>${statusLabels[question.status]}</strong>
            </div>
            <p class="answer-review__prompt">${escapeHtml(question.prompt)}</p>
            <dl>
              <div>
                <dt>Jawabanmu</dt>
                <dd>${question.playerAnswers.length > 0 ? question.playerAnswers.map(escapeHtml).join(" → ") : "Belum dijawab"}</dd>
              </div>
              <div>
                <dt>Jawaban benar</dt>
                <dd>${escapeHtml(question.correctAnswer)}</dd>
              </div>
            </dl>
            <p class="answer-review__explanation"><strong>Pembahasan:</strong> ${escapeHtml(question.explanation)}</p>
          </li>
        `).join("")}
      </ol>
    </details>
  </section>
`;
