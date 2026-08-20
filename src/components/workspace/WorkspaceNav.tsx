"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronRight, FolderGit2, Plus, Users } from "lucide-react";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import type { LevelCode } from "@/lib/phase-one/types";

const LEVELS: LevelCode[] = ["6e", "5e", "4e", "3e", "SEGPA"];

export function WorkspaceNav() {
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
  } = usePhaseOneStore();
  const [showNewClass, setShowNewClass] = useState(false);
  const [className, setClassName] = useState("");
  const [classLevel, setClassLevel] = useState<LevelCode>("5e");
  const [schoolYear, setSchoolYear] = useState("2026–2027");

  const selectedClass = classes.find((item) => item.id === selectedClassId) ?? classes[0];
  const visibleUnits = useMemo(() => {
    if (!selectedClass) return units;
    const forkedParentIds = new Set(
      units
        .filter((unit) => unit.forkedForClassId === selectedClass.id && unit.parentUnitId)
        .map((unit) => unit.parentUnitId as string),
    );
    return units.filter((unit) => {
      if (unit.level !== selectedClass.level || unit.schoolYear !== selectedClass.schoolYear) {
        return false;
      }
      if (unit.forkedForClassId) return unit.forkedForClassId === selectedClass.id;
      return !forkedParentIds.has(unit.id);
    });
  }, [selectedClass, units]);

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

  return (
    <aside className="w-full lg:w-72 shrink-0 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-950 p-4 text-white">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.16em] text-indigo-200">
          <FolderGit2 size={16} />
          Phase 1
        </div>
        <p className="mt-2 text-lg font-black">Teacher authoring</p>
        <p className="mt-1 text-xs leading-5 text-slate-300">
          Shared content, class forks and manual delivery progress.
        </p>
      </div>

      <div className="p-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <Users size={14} /> Classes
          </span>
          <button
            type="button"
            onClick={() => setShowNewClass((value) => !value)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-700"
            aria-label="Add a class"
          >
            <Plus size={16} />
          </button>
        </div>

        {showNewClass && (
          <div className="mb-3 space-y-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3">
            <input
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              placeholder="Class name"
              className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={classLevel}
                onChange={(event) => setClassLevel(event.target.value as LevelCode)}
                className="rounded-lg border border-indigo-200 bg-white px-2 py-2 text-sm text-slate-900"
              >
                {LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <input
                value={schoolYear}
                onChange={(event) => setSchoolYear(event.target.value)}
                aria-label="School year"
                className="rounded-lg border border-indigo-200 bg-white px-2 py-2 text-sm text-slate-900"
              />
            </div>
            <button
              type="button"
              onClick={createTeacherClass}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700"
            >
              Create class
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
                    ? "bg-indigo-600 font-bold text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{teacherClass.name}</span>
                <span className={active ? "text-indigo-100" : "text-slate-400"}>
                  {teacherClass.level}
                </span>
              </button>
            );
          })}
        </div>

        <div className="my-4 border-t border-slate-200" />

        <div className="mb-2 flex items-center justify-between px-2">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <BookOpen size={14} /> Units
          </span>
          <button
            type="button"
            onClick={() => {
              if (!selectedClass) return;
              createUnit({
                title: "New unit",
                level: selectedClass.level,
                schoolYear: selectedClass.schoolYear,
              });
            }}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-indigo-700"
            aria-label="Create a unit"
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
              <button
                key={unit.id}
                type="button"
                onClick={() => selectUnit(unit.id)}
                className={`w-full rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-indigo-300 bg-indigo-50 shadow-sm"
                    : "border-transparent hover:border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-bold leading-5 text-slate-900">{unit.title}</span>
                  <ChevronRight size={15} className={active ? "text-indigo-600" : "text-slate-300"} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{unit.sessions.length}/8 sessions</span>
                  <span>{run?.progressPercent ?? 0}% delivered</span>
                </div>
                {run && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${run.progressPercent}%` }}
                    />
                  </div>
                )}
                {unit.forkedForClassId && (
                  <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    Class fork
                  </span>
                )}
              </button>
            );
          })}
          {visibleUnits.length === 0 && (
            <p className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              No unit for this class yet. Create one to start backward planning.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}

