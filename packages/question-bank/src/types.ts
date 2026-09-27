export const phases = ["Fondasi", "A", "B", "C", "D"] as const;
export type Phase = (typeof phases)[number];

export const questionStatuses = ["draft", "reviewed", "published"] as const;
export type QuestionStatus = (typeof questionStatuses)[number];

export interface MultipleChoiceQuestion {
  readonly id: string;
  readonly subject: "matematika";
  readonly phase: Phase;
  readonly topic: string;
  readonly difficulty: 1 | 2 | 3;
  readonly type: "multiple-choice";
  readonly prompt: string;
  readonly choices: readonly [string, string, string];
  readonly correctAnswer: string;
  readonly explanation: string;
  readonly status: QuestionStatus;
}

export type Question = MultipleChoiceQuestion;

export interface QuestionValidationIssue {
  readonly questionId: string;
  readonly field: keyof Question | "id";
  readonly message: string;
}
