import type { Phase, Question } from "@gezy-games/question-bank";

export interface SessionCriteria {
  readonly phase?: Phase;
  readonly topic?: string;
  readonly difficulty?: Question["difficulty"];
}

export interface SessionConfig {
  readonly questionCount: number;
  readonly remedialGap: number;
  readonly pointsPerCorrectAnswer: number;
  readonly immediateRetries: number;
}

export interface SessionAttempt {
  readonly questionId: string;
  readonly selectedAnswer: string;
  readonly correct: boolean;
  readonly isRemedial: boolean;
}

export interface SessionResult {
  readonly correctAttempts: number;
  readonly incorrectAttempts: number;
  readonly unansweredQuestions: number;
  readonly masteredQuestions: number;
  readonly targetQuestions: number;
  readonly accuracy: number;
  readonly points: number;
  readonly elapsedMs: number;
  readonly questionIds: readonly string[];
  readonly masteredQuestionIds: readonly string[];
  readonly attempts: readonly SessionAttempt[];
}

export interface SessionSnapshot {
  readonly currentQuestion: Question | null;
  readonly completed: boolean;
  readonly paused: boolean;
  readonly progress: number;
  readonly target: number;
  readonly points: number;
  readonly elapsedMs: number;
  readonly attempts: readonly SessionAttempt[];
}

export interface GameSession {
  getSnapshot(): SessionSnapshot;
  submitAnswer(answer: string): SessionAttempt;
  pause(): void;
  resume(): void;
  finish(): void;
  getResult(): SessionResult;
}

const defaultConfig: SessionConfig = {
  questionCount: 10,
  remedialGap: 3,
  pointsPerCorrectAnswer: 10,
  immediateRetries: 0,
};

const shuffle = <T>(values: readonly T[], random: () => number): T[] => {
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [output[index], output[swapIndex]] = [output[swapIndex] as T, output[index] as T];
  }
  return output;
};

export const selectQuestions = (
  questionBank: readonly Question[],
  criteria: SessionCriteria,
): readonly Question[] => questionBank.filter((question) => (
  question.status === "published"
  && (criteria.phase === undefined || question.phase === criteria.phase)
  && (criteria.topic === undefined || question.topic === criteria.topic)
  && (criteria.difficulty === undefined || question.difficulty === criteria.difficulty)
));

export const shuffleQuestionChoices = (
  question: Question,
  random: () => number = Math.random,
): readonly string[] => shuffle(question.choices, random);

export const createGameSession = (
  availableQuestions: readonly Question[],
  config: Partial<SessionConfig> = {},
  random: () => number = Math.random,
  now: () => number = Date.now,
): GameSession => {
  if (availableQuestions.length === 0) {
    throw new Error("Sesi membutuhkan setidaknya satu soal.");
  }

  const resolvedConfig = { ...defaultConfig, ...config };
  if (resolvedConfig.questionCount < 1) throw new Error("Jumlah soal minimal satu.");
  if (resolvedConfig.remedialGap < 1) throw new Error("Jarak remedial minimal satu soal.");
  if (resolvedConfig.immediateRetries < 0) throw new Error("Jumlah percobaan ulang tidak boleh negatif.");

  const selectedQuestions = shuffle(availableQuestions, random).slice(0, resolvedConfig.questionCount);
  const questionsById = new Map(selectedQuestions.map((question) => [question.id, question]));
  const queue = selectedQuestions.map((question) => ({ questionId: question.id, remedial: false }));
  const mastered = new Set<string>();
  const attempts: SessionAttempt[] = [];
  const startedAt = now();
  let cursor = 0;
  let paused = false;
  let pausedAt: number | null = null;
  let totalPausedMs = 0;
  let endedAt: number | null = null;
  let points = 0;
  let immediateWrongAttempts = 0;

  const getCurrent = (): Question | null => {
    const entry = queue[cursor];
    if (!entry || mastered.size === selectedQuestions.length) return null;
    return questionsById.get(entry.questionId) ?? null;
  };

  const getElapsedMs = (): number => {
    const effectiveEnd = endedAt ?? pausedAt ?? now();
    return Math.max(0, effectiveEnd - startedAt - totalPausedMs);
  };

  const markFinished = (): void => {
    if (endedAt !== null) return;
    const timestamp = pausedAt ?? now();
    endedAt = timestamp;
    if (pausedAt !== null) {
      totalPausedMs += Math.max(0, timestamp - pausedAt);
      pausedAt = null;
    }
    paused = false;
  };

  const getSnapshot = (): SessionSnapshot => ({
    currentQuestion: getCurrent(),
    completed: getCurrent() === null,
    paused,
    progress: mastered.size,
    target: selectedQuestions.length,
    points,
    elapsedMs: getElapsedMs(),
    attempts: [...attempts],
  });

  return {
    getSnapshot,

    submitAnswer(answer: string): SessionAttempt {
      if (paused) throw new Error("Sesi sedang dijeda.");

      const question = getCurrent();
      const queueEntry = queue[cursor];
      if (!question || !queueEntry) throw new Error("Sesi sudah selesai.");

      const correct = answer === question.correctAnswer;
      const attempt: SessionAttempt = {
        questionId: question.id,
        selectedAnswer: answer,
        correct,
        isRemedial: queueEntry.remedial,
      };
      attempts.push(attempt);

      if (correct) {
        if (!mastered.has(question.id)) points += resolvedConfig.pointsPerCorrectAnswer;
        mastered.add(question.id);
        immediateWrongAttempts = 0;
      } else {
        immediateWrongAttempts += 1;
        if (immediateWrongAttempts <= resolvedConfig.immediateRetries) {
          return attempt;
        }

        const alreadyQueued = queue
          .slice(cursor + 1)
          .some((entry) => entry.questionId === question.id);
        if (!alreadyQueued) {
          const insertAt = Math.min(cursor + resolvedConfig.remedialGap + 1, queue.length);
          queue.splice(insertAt, 0, { questionId: question.id, remedial: true });
        }
        immediateWrongAttempts = 0;
      }

      cursor += 1;
      if (getCurrent() === null) markFinished();
      return attempt;
    },

    pause(): void {
      if (paused || endedAt !== null) return;
      paused = true;
      pausedAt = now();
    },

    resume(): void {
      if (!paused || pausedAt === null || endedAt !== null) return;
      totalPausedMs += Math.max(0, now() - pausedAt);
      pausedAt = null;
      paused = false;
    },

    finish(): void {
      markFinished();
    },

    getResult(): SessionResult {
      const correctAttempts = attempts.filter((attempt) => attempt.correct).length;
      const incorrectAttempts = attempts.length - correctAttempts;
      const attemptedQuestionIds = new Set(attempts.map((attempt) => attempt.questionId));
      return {
        correctAttempts,
        incorrectAttempts,
        unansweredQuestions: selectedQuestions.length - attemptedQuestionIds.size,
        masteredQuestions: mastered.size,
        targetQuestions: selectedQuestions.length,
        accuracy: attempts.length === 0 ? 0 : correctAttempts / attempts.length,
        points,
        elapsedMs: getElapsedMs(),
        questionIds: selectedQuestions.map((question) => question.id),
        masteredQuestionIds: [...mastered],
        attempts: [...attempts],
      };
    },
  };
};
