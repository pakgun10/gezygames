import {
  QUESTION_BANK_SCHEMA_VERSION,
  phases,
  questionAssetKinds,
  questionStatuses,
  type Question,
  type QuestionBank,
  type QuestionValidationIssue,
} from "./types";
import { mathMvpTopics, minimumQuestionsPerPhase, minimumQuestionsPerTopic } from "./math-coverage";

const idPattern = /^math-(foundation|[abcd])-[a-z0-9-]+-\d{3}$/;

export const validateQuestionBank = (
  questions: readonly Question[],
): readonly QuestionValidationIssue[] => {
  const issues: QuestionValidationIssue[] = [];
  const seenIds = new Set<string>();

  questions.forEach((question) => {
    if (!idPattern.test(question.id)) {
      issues.push({
        questionId: question.id,
        field: "id",
        message: "ID harus memakai pola math-{fase}-{topik}-{nomor tiga digit}.",
      });
    }

    if (seenIds.has(question.id)) {
      issues.push({ questionId: question.id, field: "id", message: "ID soal harus unik." });
    }
    seenIds.add(question.id);

    if (!phases.includes(question.phase)) {
      issues.push({ questionId: question.id, field: "phase", message: "Fase tidak dikenal." });
    }

    if (!questionStatuses.includes(question.status)) {
      issues.push({
        questionId: question.id,
        field: "status",
        message: "Status editorial tidak dikenal.",
      });
    }

    if (!question.prompt.trim()) {
      issues.push({
        questionId: question.id,
        field: "prompt",
        message: "Pertanyaan tidak boleh kosong.",
      });
    }

    if (!question.explanation.trim()) {
      issues.push({
        questionId: question.id,
        field: "explanation",
        message: "Pembahasan tidak boleh kosong.",
      });
    }

    if (question.assets) {
      const seenAssetIds = new Set<string>();
      question.assets.forEach((asset) => {
        if (!asset.id.trim()) {
          issues.push({
            questionId: question.id,
            field: "assets",
            message: "ID aset tidak boleh kosong.",
          });
        }
        if (seenAssetIds.has(asset.id)) {
          issues.push({
            questionId: question.id,
            field: "assets",
            message: "ID aset dalam satu soal harus unik.",
          });
        }
        seenAssetIds.add(asset.id);
        if (!questionAssetKinds.includes(asset.kind)) {
          issues.push({
            questionId: question.id,
            field: "assets",
            message: `Jenis aset ${asset.kind} tidak dikenal.`,
          });
        }
        if (!asset.src.trim()) {
          issues.push({
            questionId: question.id,
            field: "assets",
            message: "Sumber aset tidak boleh kosong.",
          });
        }
        if (asset.kind === "image" && !asset.alt?.trim()) {
          issues.push({
            questionId: question.id,
            field: "assets",
            message: "Aset gambar harus memiliki teks alternatif.",
          });
        }
      });
    }

    const normalizedChoices = question.choices.map((choice) =>
      choice.trim().toLocaleLowerCase("id"),
    );
    if (normalizedChoices.some((choice) => !choice)) {
      issues.push({
        questionId: question.id,
        field: "choices",
        message: "Pilihan tidak boleh kosong.",
      });
    }

    if (new Set(normalizedChoices).size !== question.choices.length) {
      issues.push({ questionId: question.id, field: "choices", message: "Pilihan harus berbeda." });
    }

    const correctMatches = question.choices.filter(
      (choice) => choice === question.correctAnswer,
    ).length;
    if (correctMatches !== 1) {
      issues.push({
        questionId: question.id,
        field: "correctAnswer",
        message: "Jawaban benar harus sama persis dengan satu pilihan.",
      });
    }
  });

  return issues;
};

export const validateQuestionBankDocument = (
  bank: QuestionBank,
): readonly QuestionValidationIssue[] => {
  const issues: QuestionValidationIssue[] = [];
  if (bank.version !== QUESTION_BANK_SCHEMA_VERSION) {
    issues.push({
      questionId: "__bank__",
      field: "version",
      message: `Versi bank soal harus ${QUESTION_BANK_SCHEMA_VERSION}.`,
    });
  }
  issues.push(...validateQuestionBank(bank.questions));
  return issues;
};

export const validateMathMvpCoverage = (
  questions: readonly Question[],
): readonly QuestionValidationIssue[] => {
  const issues: QuestionValidationIssue[] = [];

  for (const phase of phases) {
    const publishedQuestions = questions.filter(
      (question) => question.phase === phase && question.status === "published",
    );
    if (publishedQuestions.length < minimumQuestionsPerPhase) {
      issues.push({
        questionId: `phase-${phase}`,
        field: "status",
        message: `Fase ${phase} membutuhkan minimal ${minimumQuestionsPerPhase} soal published.`,
      });
    }

    for (const topic of mathMvpTopics[phase]) {
      const topicQuestions = publishedQuestions.filter((question) => question.topic === topic);
      if (topicQuestions.length < minimumQuestionsPerTopic) {
        issues.push({
          questionId: `phase-${phase}-${topic.toLocaleLowerCase("id").replaceAll(" ", "-")}`,
          field: "topic",
          message: `Topik ${topic} pada Fase ${phase} membutuhkan minimal ${minimumQuestionsPerTopic} soal published.`,
        });
      }
    }
  }

  return issues;
};
