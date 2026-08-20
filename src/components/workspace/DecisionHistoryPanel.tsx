"use client";

import { useMemo, useState } from "react";
import { Clock3, History, Plus, RotateCcw } from "lucide-react";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import type { DecisionKind, UnitContent } from "@/lib/phase-one/types";

const KINDS: Array<{ value: DecisionKind; label: string }> = [
  { value: "choice", label: "Choice" },
  { value: "constraint", label: "Constraint" },
  { value: "rejection", label: "Rejected proposal" },
  { value: "note", label: "Note" },
];

export function DecisionHistoryPanel({ unit }: { unit: UnitContent }) {
  const { revisions, addDecision, updateDecision, saveRevision, restoreRevision } =
    usePhaseOneStore();
  const [kind, setKind] = useState<DecisionKind>("choice");
  const [text, setText] = useState("");
  const unitRevisions = useMemo(
    () => revisions.filter((revision) => revision.unitId === unit.id),
    [revisions, unit.id],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <History size={19} className="text-indigo-600" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Current decision record</h2>
            <p className="text-sm text-slate-500">
              Editable now; every checkpoint preserves the prior state for time travel.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {unit.decisions.map((decision) => (
            <article
              key={decision.id}
              className={`rounded-xl border p-4 ${
                decision.active
                  ? "border-slate-200 bg-white"
                  : "border-slate-100 bg-slate-50 opacity-65"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${
                    decision.kind === "rejection"
                      ? "bg-rose-100 text-rose-700"
                      : decision.kind === "constraint"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {KINDS.find((item) => item.value === decision.kind)?.label}
                </span>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  Active
                  <input
                    type="checkbox"
                    checked={decision.active}
                    onChange={(event) => {
                      saveRevision(unit.id, "Before decision activation change");
                      updateDecision(unit.id, decision.id, { active: event.target.checked });
                    }}
                    className="h-4 w-4 accent-indigo-600"
                  />
                </label>
              </div>
              <textarea
                key={`${decision.id}-${decision.updatedAt}`}
                defaultValue={decision.text}
                onBlur={(event) => {
                  if (event.target.value === decision.text) return;
                  saveRevision(unit.id, "Before decision rewrite");
                  updateDecision(unit.id, decision.id, { text: event.target.value });
                }}
                rows={2}
                className="mt-3 w-full resize-y border-0 bg-transparent p-0 text-sm leading-6 text-slate-800 outline-none"
              />
            </article>
          ))}
        </div>

        <div className="mt-5 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4">
          <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto]">
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as DecisionKind)}
              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {KINDS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
            <input
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && text.trim()) {
                  addDecision(unit.id, kind, text);
                  setText("");
                }
              }}
              placeholder="Record a choice, constraint or rejection…"
              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => {
                addDecision(unit.id, kind, text);
                setText("");
              }}
              disabled={!text.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-40"
            >
              <Plus size={15} /> Add
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Clock3 size={19} className="text-emerald-600" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Version history</h2>
            <p className="text-sm text-slate-500">Restore any previous state without deleting later work.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {unitRevisions.map((revision) => (
            <article key={revision.id} className="rounded-xl border border-slate-200 p-3">
              <p className="text-sm font-bold text-slate-900">{revision.label}</p>
              <p className="mt-1 text-xs text-slate-500">
                {new Intl.DateTimeFormat("en-GB", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(revision.createdAt))}
              </p>
              <button
                type="button"
                onClick={() => restoreRevision(revision.id)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-indigo-300 hover:text-indigo-700"
              >
                <RotateCcw size={13} /> Restore as current
              </button>
            </article>
          ))}
          {unitRevisions.length === 0 && (
            <p className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-500">
              No saved versions yet. Use “Save version” in the Plan tab before a major change.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

