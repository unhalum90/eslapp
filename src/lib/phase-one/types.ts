export type LevelCode = "6e" | "5e" | "4e" | "3e" | "SEGPA";
export type CefrLevel = "A1" | "A1+" | "A2" | "A2+" | "B1" | "B1+" | "B2";

export type DocumentRole =
  | "sequence_plan"
  | "teacher_guide"
  | "student_sheet"
  | "support_sheet"
  | "vocabulary_cards"
  | "activity"
  | "assessment"
  | "correction"
  | "rubric"
  | "self_assessment"
  | "final_task";

export type DocumentAdaptation = "standard" | "pap";

export interface PrintProfile {
  paper: "A4" | "letter";
  orientation: "portrait" | "landscape";
  targetPages: number;
  copiesPerPage: 1 | 2 | 3 | 4 | 6;
  colorMode: "monochrome" | "accent" | "color";
  template: "classic" | "themed";
}

export interface SequenceFrame {
  sequenceOrder: number | null;
  period: string;
  culturalAxis: string;
  problematic: string;
  notions: string[];
  cefrEntry: CefrLevel | null;
  cefrTarget: CefrLevel | null;
  communicativeGoals: string[];
  lexicalFields: string[];
  phonologyPoints: string[];
  reactivatedGrammarPoints: string[];
}

export interface SequencePackPreferences {
  includeTeacherGuides: boolean;
  includeStudentSheets: boolean;
  includePap: boolean;
  includeAssessment: boolean;
  includeCorrection: boolean;
  includeRubric: boolean;
  printTemplate: "classic" | "themed";
}

export interface NewUnitInput {
  title: string;
  level: LevelCode;
  schoolYear: string;
  theme?: string;
  finalTask?: FinalTask;
  sequenceFrame?: Partial<SequenceFrame>;
  sessionCount?: number;
  packPreferences?: Partial<SequencePackPreferences>;
}

export type UnitStatus = "draft" | "ready" | "archived";
export type ClassUnitStatus = "not_started" | "in_progress" | "complete";
export type SourceKind = "url" | "video" | "pdf" | "image" | "textbook" | "text";
export type DecisionKind = "constraint" | "choice" | "rejection" | "note";

export interface TeacherClass {
  id: string;
  name: string;
  level: LevelCode;
  schoolYear: string;
  notes: string;
}

export interface CurriculumReference {
  id: string;
  title: string;
  version: string;
  url: string;
  notes: string;
}

export interface UnitSession {
  id: string;
  title: string;
  objective: string;
  durationMinutes: number;
  reactivationTargetPercentage: number;
  notes: string;
  question?: string;
  communicativeObjectives?: string[];
  culturalObjectives?: string[];
  grammarFocus?: string[];
  vocabularyFocus?: string[];
  phonologyFocus?: string[];
  expectedProduction?: string;
  traceEcrite?: string;
  homework?: string;
  differentiationNotes?: string[];
  assessmentNotes?: string;
}

export interface UnitMaterial {
  id: string;
  kind: "worksheet" | "activity";
  title: string;
  purpose: string;
  instructions: string;
  studentContent: string;
  teacherNotes: string;
  imageUrls: string[];
  role?: DocumentRole;
  adaptation?: DocumentAdaptation;
  sessionId?: string;
  familyId?: string;
  sortOrder?: number;
  printProfile?: PrintProfile;
  sharedTaskIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UnitDecision {
  id: string;
  kind: DecisionKind;
  text: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SourceReference {
  id: string;
  kind: SourceKind;
  title: string;
  url: string;
  citation: string;
  notes: string;
}

export interface VocabularyAudio {
  accent: string;
  url: string;
}

export interface VocabularyItem {
  id: string;
  term: string;
  translationFr: string;
  phonetic: string;
  imageUrl: string;
  audio: VocabularyAudio[];
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnitVocabularyLink {
  vocabularyId: string;
  purpose: "new" | "reactivation";
  sourceUnitId?: string;
}

export interface FinalTask {
  title: string;
  performanceType: string;
  brief: string;
  successCriteria: string[];
  standardExpectation?: string;
  papExpectation?: string;
  alternativeMode?: string;
}

export interface UnitContent {
  id: string;
  lineageRootId: string;
  parentUnitId?: string;
  forkedForClassId?: string;
  title: string;
  theme: string;
  level: LevelCode;
  schoolYear: string;
  status: UnitStatus;
  sequenceFrame?: SequenceFrame;
  packPreferences?: SequencePackPreferences;
  finalTask: FinalTask;
  sessions: UnitSession[];
  materials: UnitMaterial[];
  vocabulary: UnitVocabularyLink[];
  grammarPoints: string[];
  sourceReferences: SourceReference[];
  curriculumReferences: CurriculumReference[];
  decisions: UnitDecision[];
  distributionCode: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassUnitRun {
  id: string;
  classId: string;
  unitId: string;
  status: ClassUnitStatus;
  currentSession: number;
  progressPercent: number;
  classNotes: string;
  updatedAt: string;
}

export interface UnitRevision {
  id: string;
  unitId: string;
  label: string;
  createdAt: string;
  snapshot: UnitContent;
}

export interface PhaseOneData {
  schemaVersion: 1;
  classes: TeacherClass[];
  units: UnitContent[];
  classRuns: ClassUnitRun[];
  vocabulary: VocabularyItem[];
  revisions: UnitRevision[];
}

export interface PublishedPracticeVocabulary {
  id: string;
  term: string;
  translationFr: string;
  phonetic: string;
  imageUrl: string;
  audio: VocabularyAudio[];
  purpose: "new" | "reactivation";
}

export interface PublishedPracticeUnit {
  schemaVersion: 1;
  unitId: string;
  title: string;
  theme: string;
  level: LevelCode;
  finalTaskTitle: string;
  distributionCode: string;
  sessions: Array<Pick<UnitSession, "id" | "title" | "objective">>;
  vocabulary: PublishedPracticeVocabulary[];
}

export type ReuseAssessment =
  | { kind: "available"; message: string }
  | { kind: "duplicate"; vocabularyId: string; message: string }
  | { kind: "reactivation"; vocabularyId: string; sourceUnitId: string; message: string }
  | { kind: "similar"; vocabularyId: string; message: string };
