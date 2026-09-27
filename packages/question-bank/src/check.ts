import { mathQuestionBank } from "./math";
import { phases } from "./types";
import { validateMathMvpCoverage, validateQuestionBankDocument } from "./validate";

const issues = [
  ...validateQuestionBankDocument(mathQuestionBank),
  ...validateMathMvpCoverage(mathQuestionBank.questions),
];

for (const question of mathQuestionBank.questions) {
  if (question.status !== "published") {
    issues.push({
      questionId: question.id,
      field: "status",
      message: "Bank soal produksi hanya boleh memuat soal berstatus published.",
    });
  }
}

for (const phase of phases) {
  if (
    !mathQuestionBank.questions.some(
      (question) => question.phase === phase && question.status === "published",
    )
  ) {
    issues.push({
      questionId: `phase-${phase}`,
      field: "status",
      message: `Fase ${phase} belum memiliki soal berstatus published.`,
    });
  }
}

if (issues.length > 0) {
  console.error("Validasi bank soal gagal:");
  issues.forEach((issue) => {
    console.error(`- ${issue.questionId} [${issue.field}]: ${issue.message}`);
  });
  process.exitCode = 1;
} else {
  const publishedCount = mathQuestionBank.questions.filter(
    (question) => question.status === "published",
  ).length;
  console.log(`Bank soal valid: ${publishedCount} soal published untuk ${phases.length} fase.`);
}
