import type {
  CefrLevel,
  SequenceFrame,
  SequencePackPreferences,
} from "@/lib/phase-one/types";

export const DEFAULT_SEQUENCE_FRAME: SequenceFrame = {
  sequenceOrder: null,
  period: "",
  culturalAxis: "",
  problematic: "",
  notions: [],
  cefrEntry: "A1+",
  cefrTarget: "A2",
  communicativeGoals: [],
  lexicalFields: [],
  phonologyPoints: [],
  reactivatedGrammarPoints: [],
};

export const DEFAULT_PACK_PREFERENCES: SequencePackPreferences = {
  includeTeacherGuides: true,
  includeStudentSheets: true,
  includePap: true,
  includeAssessment: true,
  includeCorrection: true,
  includeRubric: true,
  printTemplate: "classic",
};

export const CEFR_LEVELS: CefrLevel[] = ["A1", "A1+", "A2", "A2+", "B1", "B1+", "B2"];

export const TEACHER_DOCUMENT_RULES = {
  lessonMinutes: "45–55 min",
  teacherGuide: "1–2 pages",
  studentSheet: "1–2 pages",
  assessment: "2 pages",
  supportSheet: "1 page",
  lessonArc: [
    "Réactivation",
    "Input",
    "Compréhension",
    "Fait de langue",
    "Production",
    "Trace écrite",
    "Homework",
  ],
} as const;

export function resolveSequenceFrame(frame?: Partial<SequenceFrame>): SequenceFrame {
  return {
    ...DEFAULT_SEQUENCE_FRAME,
    ...frame,
    notions: [...(frame?.notions ?? DEFAULT_SEQUENCE_FRAME.notions)],
    communicativeGoals: [
      ...(frame?.communicativeGoals ?? DEFAULT_SEQUENCE_FRAME.communicativeGoals),
    ],
    lexicalFields: [...(frame?.lexicalFields ?? DEFAULT_SEQUENCE_FRAME.lexicalFields)],
    phonologyPoints: [...(frame?.phonologyPoints ?? DEFAULT_SEQUENCE_FRAME.phonologyPoints)],
    reactivatedGrammarPoints: [
      ...(frame?.reactivatedGrammarPoints ?? DEFAULT_SEQUENCE_FRAME.reactivatedGrammarPoints),
    ],
  };
}

export function resolvePackPreferences(
  preferences?: Partial<SequencePackPreferences>,
): SequencePackPreferences {
  return { ...DEFAULT_PACK_PREFERENCES, ...preferences };
}
