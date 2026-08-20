"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  calculateProgress,
  cloneUnit,
  createDistributionCode,
  createId,
  createRevision,
  MAX_UNIT_SESSIONS,
} from "@/lib/phase-one/domain";
import { phaseOneSeed } from "@/lib/phase-one/seed";
import type {
  ClassUnitRun,
  CurriculumReference,
  DecisionKind,
  FinalTask,
  LevelCode,
  PhaseOneData,
  SourceReference,
  TeacherClass,
  UnitContent,
  UnitDecision,
  UnitSession,
  VocabularyItem,
} from "@/lib/phase-one/types";

interface PhaseOneActions {
  selectedUnitId: string;
  selectedClassId: string;
  selectUnit: (unitId: string) => void;
  selectClass: (classId: string) => void;
  createClass: (input: Omit<TeacherClass, "id">) => string;
  createUnit: (input: { title: string; level: LevelCode; schoolYear: string }) => string;
  updateUnit: (unitId: string, patch: Partial<UnitContent>, revisionLabel?: string) => void;
  updateFinalTask: (unitId: string, patch: Partial<FinalTask>) => void;
  addSession: (unitId: string) => void;
  updateSession: (unitId: string, sessionId: string, patch: Partial<UnitSession>) => void;
  addDecision: (unitId: string, kind: DecisionKind, text: string) => void;
  updateDecision: (unitId: string, decisionId: string, patch: Partial<UnitDecision>) => void;
  addSource: (unitId: string, source: Omit<SourceReference, "id">) => void;
  addCurriculumReference: (
    unitId: string,
    reference: Omit<CurriculumReference, "id">,
  ) => void;
  addVocabularyItem: (
    unitId: string,
    item: Omit<VocabularyItem, "id" | "createdAt" | "updatedAt">,
    purpose?: "new" | "reactivation",
    sourceUnitId?: string,
  ) => string;
  attachVocabulary: (
    unitId: string,
    vocabularyId: string,
    purpose: "new" | "reactivation",
    sourceUnitId?: string,
  ) => void;
  updateVocabularyItem: (vocabularyId: string, patch: Partial<VocabularyItem>) => void;
  setClassProgress: (
    classId: string,
    unitId: string,
    currentSession: number,
    notes?: string,
  ) => void;
  forkUnitForClass: (unitId: string, classId: string) => string;
  createYearDescendant: (unitId: string, schoolYear: string) => string;
  saveRevision: (unitId: string, label: string) => void;
  restoreRevision: (revisionId: string) => void;
  setPublished: (unitId: string, published: boolean) => void;
  resetPhaseOne: () => void;
}

export type PhaseOneStore = PhaseOneData & PhaseOneActions;

function now(): string {
  return new Date().toISOString();
}

function freshUnit(input: { title: string; level: LevelCode; schoolYear: string }): UnitContent {
  const id = createId("unit");
  const timestamp = now();
  return {
    id,
    lineageRootId: id,
    title: input.title,
    theme: "",
    level: input.level,
    schoolYear: input.schoolYear,
    status: "draft",
    finalTask: {
      title: "",
      performanceType: "",
      brief: "",
      successCriteria: [],
    },
    sessions: [],
    vocabulary: [],
    grammarPoints: [],
    sourceReferences: [],
    curriculumReferences: [],
    decisions: [],
    distributionCode: createDistributionCode(),
    published: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const usePhaseOneStore = create<PhaseOneStore>()(
  persist(
    (set, get) => ({
      ...phaseOneSeed,
      selectedUnitId: phaseOneSeed.units[0].id,
      selectedClassId: phaseOneSeed.classes[0].id,

      selectUnit: (selectedUnitId) => set({ selectedUnitId }),
      selectClass: (selectedClassId) => set({ selectedClassId }),

      createClass: (input) => {
        const teacherClass: TeacherClass = { ...input, id: createId("class") };
        set((state) => ({
          classes: [...state.classes, teacherClass],
          selectedClassId: teacherClass.id,
        }));
        return teacherClass.id;
      },

      createUnit: (input) => {
        const unit = freshUnit(input);
        set((state) => ({ units: [...state.units, unit], selectedUnitId: unit.id }));
        return unit.id;
      },

      updateUnit: (unitId, patch, revisionLabel = "Before unit edit") =>
        set((state) => {
          const current = state.units.find((unit) => unit.id === unitId);
          if (!current) return state;
          const revision = createRevision(current, revisionLabel);
          return {
            units: state.units.map((unit) =>
              unit.id === unitId ? { ...unit, ...patch, id: unit.id, updatedAt: now() } : unit,
            ),
            revisions: [revision, ...state.revisions].slice(0, 150),
          };
        }),

      updateFinalTask: (unitId, patch) =>
        set((state) => {
          const current = state.units.find((unit) => unit.id === unitId);
          if (!current) return state;
          return {
            units: state.units.map((unit) =>
              unit.id === unitId
                ? {
                    ...unit,
                    finalTask: { ...unit.finalTask, ...patch },
                    updatedAt: now(),
                  }
                : unit,
            ),
          };
        }),

      addSession: (unitId) =>
        set((state) => ({
          units: state.units.map((unit) => {
            if (unit.id !== unitId || unit.sessions.length >= MAX_UNIT_SESSIONS) return unit;
            const session: UnitSession = {
              id: createId("session"),
              title: `Session ${unit.sessions.length + 1}`,
              objective: "",
              durationMinutes: 55,
              reactivationTargetPercentage: 20,
              notes: "",
            };
            return { ...unit, sessions: [...unit.sessions, session], updatedAt: now() };
          }),
        })),

      updateSession: (unitId, sessionId, patch) =>
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  sessions: unit.sessions.map((session) =>
                    session.id === sessionId ? { ...session, ...patch, id: session.id } : session,
                  ),
                  updatedAt: now(),
                }
              : unit,
          ),
        })),

      addDecision: (unitId, kind, text) =>
        set((state) => {
          if (!text.trim()) return state;
          const timestamp = now();
          const decision: UnitDecision = {
            id: createId("decision"),
            kind,
            text: text.trim(),
            active: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          return {
            units: state.units.map((unit) =>
              unit.id === unitId
                ? { ...unit, decisions: [...unit.decisions, decision], updatedAt: timestamp }
                : unit,
            ),
          };
        }),

      updateDecision: (unitId, decisionId, patch) =>
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  decisions: unit.decisions.map((decision) =>
                    decision.id === decisionId
                      ? { ...decision, ...patch, id: decision.id, updatedAt: now() }
                      : decision,
                  ),
                  updatedAt: now(),
                }
              : unit,
          ),
        })),

      addSource: (unitId, source) =>
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  sourceReferences: [
                    ...unit.sourceReferences,
                    { ...source, id: createId("source") },
                  ],
                  updatedAt: now(),
                }
              : unit,
          ),
        })),

      addCurriculumReference: (unitId, reference) =>
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  curriculumReferences: [
                    ...unit.curriculumReferences,
                    { ...reference, id: createId("curriculum") },
                  ],
                  updatedAt: now(),
                }
              : unit,
          ),
        })),

      addVocabularyItem: (unitId, input, purpose = "new", sourceUnitId) => {
        const timestamp = now();
        const item: VocabularyItem = {
          ...input,
          id: createId("vocab"),
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        set((state) => ({
          vocabulary: [...state.vocabulary, item],
          units: state.units.map((unit) =>
            unit.id === unitId
              ? {
                  ...unit,
                  vocabulary: [
                    ...unit.vocabulary,
                    { vocabularyId: item.id, purpose, sourceUnitId },
                  ],
                  updatedAt: timestamp,
                }
              : unit,
          ),
        }));
        return item.id;
      },

      attachVocabulary: (unitId, vocabularyId, purpose, sourceUnitId) =>
        set((state) => ({
          units: state.units.map((unit) => {
            if (unit.id !== unitId) return unit;
            if (unit.vocabulary.some((link) => link.vocabularyId === vocabularyId)) return unit;
            return {
              ...unit,
              vocabulary: [...unit.vocabulary, { vocabularyId, purpose, sourceUnitId }],
              updatedAt: now(),
            };
          }),
        })),

      updateVocabularyItem: (vocabularyId, patch) =>
        set((state) => ({
          vocabulary: state.vocabulary.map((item) =>
            item.id === vocabularyId
              ? { ...item, ...patch, id: item.id, updatedAt: now() }
              : item,
          ),
        })),

      setClassProgress: (classId, unitId, currentSession, notes) =>
        set((state) => {
          const unit = state.units.find((candidate) => candidate.id === unitId);
          if (!unit) return state;
          const existing = state.classRuns.find(
            (run) => run.classId === classId && run.unitId === unitId,
          );
          const normalizedSession = Math.min(unit.sessions.length, Math.max(0, currentSession));
          const progressPercent = calculateProgress(normalizedSession, unit.sessions.length);
          const status: ClassUnitRun["status"] =
            progressPercent === 0
              ? "not_started"
              : progressPercent === 100
                ? "complete"
                : "in_progress";
          if (existing) {
            return {
              classRuns: state.classRuns.map((run) =>
                run.id === existing.id
                  ? {
                      ...run,
                      currentSession: normalizedSession,
                      progressPercent,
                      status,
                      classNotes: notes ?? run.classNotes,
                      updatedAt: now(),
                    }
                  : run,
              ),
            };
          }
          return {
            classRuns: [
              ...state.classRuns,
              {
                id: createId("run"),
                classId,
                unitId,
                currentSession: normalizedSession,
                progressPercent,
                status,
                classNotes: notes ?? "",
                updatedAt: now(),
              },
            ],
          };
        }),

      forkUnitForClass: (unitId, classId) => {
        const state = get();
        const source = state.units.find((unit) => unit.id === unitId);
        const targetClass = state.classes.find((item) => item.id === classId);
        if (!source || !targetClass) return "";
        const timestamp = now();
        const fork = cloneUnit(source);
        fork.id = createId("unit");
        fork.parentUnitId = source.id;
        fork.forkedForClassId = classId;
        fork.title = `${source.title} — ${targetClass.name}`;
        fork.distributionCode = createDistributionCode();
        fork.published = false;
        fork.createdAt = timestamp;
        fork.updatedAt = timestamp;
        const priorRun = state.classRuns.find(
          (run) => run.classId === classId && run.unitId === source.id,
        );
        const forkRun: ClassUnitRun = {
          id: createId("run"),
          classId,
          unitId: fork.id,
          status: priorRun?.status ?? "not_started",
          currentSession: priorRun?.currentSession ?? 0,
          progressPercent: priorRun?.progressPercent ?? 0,
          classNotes: priorRun?.classNotes ?? "",
          updatedAt: timestamp,
        };
        set({
          units: [...state.units, fork],
          classRuns: [
            ...state.classRuns.filter(
              (run) => !(run.classId === classId && run.unitId === source.id),
            ),
            forkRun,
          ],
          selectedUnitId: fork.id,
          selectedClassId: classId,
        });
        return fork.id;
      },

      createYearDescendant: (unitId, schoolYear) => {
        const state = get();
        const source = state.units.find((unit) => unit.id === unitId);
        if (!source) return "";
        const descendant = cloneUnit(source);
        const timestamp = now();
        descendant.id = createId("unit");
        descendant.parentUnitId = source.id;
        descendant.forkedForClassId = undefined;
        descendant.schoolYear = schoolYear;
        descendant.status = "draft";
        descendant.distributionCode = createDistributionCode();
        descendant.published = false;
        descendant.createdAt = timestamp;
        descendant.updatedAt = timestamp;
        set({ units: [...state.units, descendant], selectedUnitId: descendant.id });
        return descendant.id;
      },

      saveRevision: (unitId, label) =>
        set((state) => {
          const unit = state.units.find((candidate) => candidate.id === unitId);
          if (!unit) return state;
          return { revisions: [createRevision(unit, label), ...state.revisions].slice(0, 150) };
        }),

      restoreRevision: (revisionId) =>
        set((state) => {
          const revision = state.revisions.find((candidate) => candidate.id === revisionId);
          if (!revision) return state;
          const current = state.units.find((unit) => unit.id === revision.unitId);
          const safetyRevision = current ? createRevision(current, "Before restore") : null;
          const restored = cloneUnit(revision.snapshot);
          restored.updatedAt = now();
          return {
            units: state.units.map((unit) => (unit.id === restored.id ? restored : unit)),
            revisions: safetyRevision
              ? [safetyRevision, ...state.revisions].slice(0, 150)
              : state.revisions,
            selectedUnitId: restored.id,
          };
        }),

      setPublished: (unitId, published) =>
        set((state) => ({
          units: state.units.map((unit) =>
            unit.id === unitId ? { ...unit, published, updatedAt: now() } : unit,
          ),
        })),

      resetPhaseOne: () =>
        set({
          ...phaseOneSeed,
          selectedUnitId: phaseOneSeed.units[0].id,
          selectedClassId: phaseOneSeed.classes[0].id,
        }),
    }),
    {
      name: "esl-architect-phase-one",
      version: 1,
      partialize: (state) => ({
        schemaVersion: state.schemaVersion,
        classes: state.classes,
        units: state.units,
        classRuns: state.classRuns,
        vocabulary: state.vocabulary,
        revisions: state.revisions,
        selectedUnitId: state.selectedUnitId,
        selectedClassId: state.selectedClassId,
      }),
    },
  ),
);

export function classesForUnit(unit: UnitContent, classes: TeacherClass[]): TeacherClass[] {
  if (unit.forkedForClassId) {
    return classes.filter((item) => item.id === unit.forkedForClassId);
  }
  return classes.filter(
    (item) => item.level === unit.level && item.schoolYear === unit.schoolYear,
  );
}
