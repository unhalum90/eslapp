export type LevelCode = "6e" | "5e" | "4e" | "3e" | "SEGPA";

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
  finalTask: FinalTask;
  sessions: UnitSession[];
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
