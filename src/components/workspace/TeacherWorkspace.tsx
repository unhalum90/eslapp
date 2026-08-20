"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  ChevronDown,
  CircleDot,
  FileClock,
  LibraryBig,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { WorkspaceNav } from "./WorkspaceNav";
import { UnitPlanPanel } from "./UnitPlanPanel";
import { VocabularyPanel } from "./VocabularyPanel";
import { SourcesPanel } from "./SourcesPanel";
import { DecisionHistoryPanel } from "./DecisionHistoryPanel";
import { DeliveryPanel } from "./DeliveryPanel";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";

type WorkspaceTab = "plan" | "vocabulary" | "sources" | "decisions" | "delivery";

const TABS: Array<{
  id: WorkspaceTab;
  label: string;
  icon: typeof BookOpenCheck;
}> = [
  { id: "plan", label: "Unit plan", icon: BookOpenCheck },
  { id: "vocabulary", label: "Vocabulary", icon: LibraryBig },
  { id: "sources", label: "Sources", icon: CircleDot },
  { id: "decisions", label: "Decisions & history", icon: FileClock },
  { id: "delivery", label: "Delivery", icon: Send },
];

export function TeacherWorkspace() {
  const { units, selectedUnitId, updateUnit } = usePhaseOneStore();
  const [tab, setTab] = useState<WorkspaceTab>("plan");
  const unit = useMemo(
    () => units.find((candidate) => candidate.id === selectedUnitId) ?? units[0],
    [selectedUnitId, units],
  );

  if (!unit) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <h1 className="text-2xl font-black text-slate-950">Create your first unit</h1>
        <p className="mt-2 text-slate-500">Choose or create a class, then add a unit from the left panel.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-indigo-600">
            <span>{unit.level}</span>
            <span className="text-slate-300">/</span>
            <span>{unit.schoolYear}</span>
            {unit.parentUnitId && (
              <span className="rounded-full bg-amber-100 px-2 py-1 normal-case tracking-normal text-amber-800">
                Linked descendant
              </span>
            )}
          </div>
          <input
            key={`${unit.id}-${unit.title}`}
            defaultValue={unit.title}
            onBlur={(event) => {
              if (event.target.value === unit.title) return;
              updateUnit(unit.id, { title: event.target.value }, "Before unit title edit");
            }}
            className="mt-1 w-full border-0 bg-transparent p-0 text-2xl font-black text-slate-950 outline-none md:text-3xl"
            aria-label="Unit title"
          />
          <p className="mt-1 text-sm text-slate-500">
            {unit.finalTask.title || "Define a final task to begin backward planning."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-black ${
              unit.status === "ready"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {unit.status === "ready" ? "Ready to distribute" : "Draft"}
          </span>
          <label className="relative">
            <span className="sr-only">Unit status</span>
            <select
              value={unit.status}
              onChange={(event) =>
                updateUnit(
                  unit.id,
                  { status: event.target.value as "draft" | "ready" | "archived" },
                  "Before status change",
                )
              }
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-9 text-sm font-bold text-slate-700"
            >
              <option value="draft">Draft</option>
              <option value="ready">Ready</option>
              <option value="archived">Archived</option>
            </select>
            <ChevronDown
              size={15}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
          </label>
        </div>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        <WorkspaceNav />
        <div className="min-w-0 flex-1">
          <div className="mb-5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
            <div className="flex min-w-max gap-1">
              {TABS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                      tab === item.id
                        ? "bg-slate-950 text-white"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon size={16} /> {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {tab === "plan" && <UnitPlanPanel unit={unit} />}
          {tab === "vocabulary" && <VocabularyPanel unit={unit} />}
          {tab === "sources" && <SourcesPanel unit={unit} />}
          {tab === "decisions" && <DecisionHistoryPanel unit={unit} />}
          {tab === "delivery" && <DeliveryPanel unit={unit} />}

          <div className="mt-5 flex items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs leading-5 text-indigo-900">
            <SlidersHorizontal size={16} className="shrink-0" />
            Phase 1 stores authoring data locally while the normalized Supabase migration is applied.
            Student profiles, scoring and remediation are intentionally excluded.
          </div>
        </div>
      </div>
    </div>
  );
}

