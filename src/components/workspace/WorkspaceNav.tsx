"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  AudioLines,
  BookOpen,
  FolderGit2,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import { useUnitAgentStore } from "@/lib/store/useUnitAgentStore";
import type { LevelCode } from "@/lib/phase-one/types";
import type { NewUnitInput } from "@/lib/phase-one/types";
import { NewUnitWizard } from "./NewUnitWizard";

const LEVELS: LevelCode[] = ["6e", "5e", "4e", "3e", "SEGPA"];

interface WorkspaceNavProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function WorkspaceNav({ collapsed, onCollapsedChange }: WorkspaceNavProps) {
  const {
    classes,
    units,
    classRuns,
    selectedClassId,
    selectedUnitId,
    selectClass,
    selectUnit,
    createClass,
    createUnit,
    deleteUnit,
  } = usePhaseOneStore();
  const [showNewClass, setShowNewClass] = useState(false);
  const [className, setClassName] = useState("");
  const [classLevel, setClassLevel] = useState<LevelCode>("5e");
  const [schoolYear, setSchoolYear] = useState("2026–2027");
  const [showNewUnit, setShowNewUnit] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const setAgentPanelOpen = useUnitAgentStore((state) => state.setPanelOpen);
  const clearConversation = useUnitAgentStore((state) => state.clearConversation);

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? classes[0];
  const pendingDelete = units.find((unit) => unit.id === pendingDeleteId) ?? null;
  const hasLinkedDescendants = pendingDelete
    ? units.some((unit) => unit.parentUnitId === pendingDelete.id)
    : false;
  const visibleUnits = useMemo(() => {
    if (!selectedClass) return units;
    const forkedParentIds = new Set(
      units
        .filter((unit) => unit.forkedForClassId === selectedClass.id && unit.parentUnitId)
        .map((unit) => unit.parentUnitId as string),
    );
    return units
      .filter((unit) => {
        // Keep a newly created unit visible while it is active, even when the
        // teacher chose a level or school year different from the current class.
        if (unit.id === selectedUnitId) return true;
        if (unit.level !== selectedClass.level || unit.schoolYear !== selectedClass.schoolYear) {
          return false;
        }
        if (unit.forkedForClassId) return unit.forkedForClassId === selectedClass.id;
        return !forkedParentIds.has(unit.id);
      })
      .sort((left, right) => {
        if (left.id === selectedUnitId) return -1;
        if (right.id === selectedUnitId) return 1;
        return Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
      });
  }, [selectedClass, selectedUnitId, units]);

  const createTeacherClass = () => {
    if (!className.trim()) return;
    createClass({
      name: className.trim(),
      level: classLevel,
      schoolYear: schoolYear.trim() || "2026–2027",
      notes: "",
    });
    setClassName("");
    setShowNewClass(false);
  };

  const completeUnitSetup = (input: NewUnitInput) => {
    createUnit(input);
    setShowNewUnit(false);
    window.setTimeout(() => setAgentPanelOpen(true), 150);
  };

  useEffect(() => {
    if (!pendingDeleteId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPendingDeleteId(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [pendingDeleteId]);

  const confirmDeleteUnit = () => {
    if (!pendingDelete) return;
    clearConversation(pendingDelete.id);
    deleteUnit(pendingDelete.id);
    setPendingDeleteId(null);
  };

  if (collapsed) {
    return (
      <aside
        id="workspace-navigation"
        className="w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all lg:w-12"
      >
        <button
          type="button"
          onClick={() => onCollapsedChange(false)}
          aria-controls="workspace-navigation"
          aria-expanded="false"
          title="Afficher les classes et les séquences"
          className="flex w-full items-center justify-center gap-2 p-3 text-sm font-bold text-slate-600 hover:bg-[#e8f3f1] hover:text-[#285d68] lg:min-h-28 lg:flex-col"
        >
          <PanelLeftOpen size={19} />
          <span className="lg:sr-only">Afficher les classes et les séquences</span>
        </button>
      </aside>
    );
  }

  return (
    <aside
      id="workspace-navigation"
      className="w-full shrink-0 overflow-hidden border-b border-[#d8d5ca] bg-white transition-all xl:w-64 xl:border-b-0 xl:border-r"
    >
      <div className="border-b border-white/10 bg-[#173b45] p-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#b9dcdb]">
              <FolderGit2 size={16} />
              Espace enseignant
            </div>
            <p className="mt-2 text-lg font-black">Mes séquences</p>
          </div>
          <button
            type="button"
            onClick={() => onCollapsedChange(true)}
            aria-controls="workspace-navigation"
            aria-expanded="true"
            aria-label="Réduire les classes et les séquences"
            title="Réduire les classes et les séquences"
            className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
        <p className="mt-1 text-xs leading-5 text-[#d2e6e5]">
          Un dossier complet par séquence, adapté à chaque classe.
        </p>
        <Link href="/tools/speaking" className="mt-4 flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20">
          <AudioLines size={16} /> Oral des élèves
        </Link>
      </div>

      <div className="p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Users size={14} /> Mes classes
          </span>
          <button
            type="button"
            onClick={() => setShowNewClass((value) => !value)}
            className="rounded-md p-1 text-slate-500 hover:bg-[#e8f3f1] hover:text-[#285d68]"
            aria-label="Ajouter une classe"
          >
            <Plus size={16} />
          </button>
        </div>

        {showNewClass && (
          <div className="mb-3 space-y-2 rounded-xl border border-[#c8dedc] bg-[#e8f3f1] p-3">
            <input
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              placeholder="Nom de la classe"
              className="w-full rounded-lg border border-[#b8d3d1] bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#285d68]"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={classLevel}
                onChange={(event) => setClassLevel(event.target.value as LevelCode)}
                className="rounded-lg border border-[#b8d3d1] bg-white px-2 py-2 text-sm text-slate-900"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <input
                value={schoolYear}
                onChange={(event) => setSchoolYear(event.target.value)}
                aria-label="Année scolaire"
                className="rounded-lg border border-[#b8d3d1] bg-white px-2 py-2 text-sm text-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={createTeacherClass}
              className="w-full rounded-lg bg-[#285d68] px-3 py-2 text-sm font-bold text-white hover:bg-[#214d56]"
            >
              Créer la classe
            </button>
          </div>
        )}

        <div className="space-y-1">
          {classes.map((teacherClass) => {
            const active = teacherClass.id === selectedClass?.id;
            return (
              <button
                key={teacherClass.id}
                type="button"
                onClick={() => selectClass(teacherClass.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active
                    ? "bg-[#285d68] font-bold text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{teacherClass.name}</span>
                <span className={active ? "text-[#d2e6e5]" : "text-slate-400"}>
                  {teacherClass.level}
                </span>
              </button>
            );
          })}
        </div>

        <div className="my-4 border-t border-slate-200" />

        <div className="mb-2 flex items-center justify-between px-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <BookOpen size={14} /> Séquences
          </span>
          <button
            type="button"
            onClick={() => {
              if (!selectedClass) return;
              setShowNewUnit(true);
            }}
            className="rounded-md p-1 text-slate-500 hover:bg-[#e8f3f1] hover:text-[#285d68]"
            aria-label="Créer une séquence"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="space-y-2">
          {visibleUnits.map((unit) => {
            const run = classRuns.find(
              (candidate) => candidate.classId === selectedClass?.id && candidate.unitId === unit.id,
            );
            const active = unit.id === selectedUnitId;
            return (
              <div
                key={unit.id}
                className={`group relative w-full rounded-xl border transition-all ${
                  active
                    ? "border-[#78aeb2] bg-[#e8f3f1] shadow-sm"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => selectUnit(unit.id)}
                  className="w-full rounded-xl p-3 pr-11 text-left"
                >
                  <span className="block text-sm font-bold leading-5 text-slate-900">{unit.title}</span>
                  <span className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>{unit.sessions.length} séances</span>
                    <span>{run?.progressPercent ?? 0}% traité</span>
                  </span>
                  {run ? (
                    <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-full rounded-full bg-[#5a9869]"
                        style={{ width: `${run.progressPercent}%` }}
                      />
                    </span>
                  ) : null}
                  {unit.forkedForClassId ? (
                    <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      Adaptée à la classe
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingDeleteId(unit.id)}
                  aria-label={`Supprimer ${unit.title}`}
                  title={`Supprimer ${unit.title}`}
                  className={`absolute right-2 top-2 rounded-lg p-2 transition-colors ${
                    active
                      ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
                      : "text-slate-300 hover:bg-red-50 hover:text-red-600 group-hover:text-slate-400"
                  }`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
          {visibleUnits.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              Aucune séquence pour cette classe. Créez un dossier pour commencer.
            </p>
          )}
        </div>
      </div>
      {selectedClass && showNewUnit ? (
        <NewUnitWizard
          initialLevel={selectedClass.level}
          initialSchoolYear={selectedClass.schoolYear}
          onClose={() => setShowNewUnit(false)}
          onComplete={completeUnitSetup}
        />
      ) : null}
      {pendingDelete ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPendingDeleteId(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-unit-title"
            aria-describedby="delete-unit-description"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <AlertTriangle size={22} />
            </div>
            <h2 id="delete-unit-title" className="mt-4 text-xl font-black text-slate-950">
              Supprimer « {pendingDelete.title} » ?
            </h2>
            <div id="delete-unit-description" className="mt-2 space-y-2 text-sm leading-6 text-slate-600">
              <p>
                Cette action supprime définitivement la séquence, ses documents, son historique et sa progression de classe.
              </p>
              {hasLinkedDescendants ? (
                <p className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-900">
                  Les séquences descendantes seront conservées comme dossiers indépendants.
                </p>
              ) : null}
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmDeleteUnit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-black text-white hover:bg-red-700"
              >
                <Trash2 size={16} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
