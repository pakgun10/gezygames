export const phases = ["Fondasi", "A", "B", "C", "D"] as const;
export type Phase = (typeof phases)[number];

export const questionStatuses = ["draft", "reviewed", "published"] as const;
export type QuestionStatus = (typeof questionStatuses)[number];

export const questionAssetKinds = ["image", "audio"] as const;
export type QuestionAssetKind = (typeof questionAssetKinds)[number];

export const QUESTION_BANK_SCHEMA_VERSION = 1 as const;

export interface QuestionAsset {
  readonly id: string;
  readonly kind: QuestionAssetKind;
  readonly src: string;
  readonly alt?: string;
}

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
  readonly assets?: readonly QuestionAsset[];
  readonly status: QuestionStatus;
}

export type Question = MultipleChoiceQuestion;

export interface QuestionBank {
  readonly version: typeof QUESTION_BANK_SCHEMA_VERSION;
  readonly questions: readonly Question[];
}

export interface QuestionValidationIssue {
  readonly questionId: string;
  readonly field: keyof Question | "id" | "version";
  readonly message: string;
}
