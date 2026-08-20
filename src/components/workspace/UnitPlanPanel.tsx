"use client";

import { useState } from "react";
import { CheckCircle2, Plus, Save, Target } from "lucide-react";
import { MAX_UNIT_SESSIONS } from "@/lib/phase-one/domain";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import type { UnitContent } from "@/lib/phase-one/types";

function parseList(value: string): string[] {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function UnitPlanPanel({ unit }: { unit: UnitContent }) {
  const { updateUnit, updateFinalTask, addSession, updateSession, saveRevision } =
    usePhaseOneStore();
  const [versionLabel, setVersionLabel] = useState("");

  const checkpoint = (label: string) => saveRevision(unit.id, label);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-700">
              <Target size={18} /> Backward design
            </div>
            <h2 className="mt-1 text-xl font-black text-slate-950">Start with the final task</h2>
            <p className="mt-1 text-sm text-slate-500">
              The task defines the language requirements; sessions form the path toward it.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={versionLabel}
              onChange={(event) => setVersionLabel(event.target.value)}
              placeholder="Version note"
              className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => {
                saveRevision(unit.id, versionLabel || "Manual checkpoint");
                setVersionLabel("");
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              <Save size={15} /> Save version
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Final task
            <input
              key={`${unit.id}-task-title`}
              defaultValue={unit.finalTask.title}
              onBlur={(event) => {
                checkpoint("Before final-task title edit");
                updateFinalTask(unit.id, { title: event.target.value });
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-indigo-500"
            />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Performance type
            <input
              key={`${unit.id}-task-type`}
              defaultValue={unit.finalTask.performanceType}
              onBlur={(event) => {
                checkpoint("Before performance-type edit");
                updateFinalTask(unit.id, { performanceType: event.target.value });
              }}
              placeholder="Roleplay, presentation, poster…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-indigo-500"
            />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 lg:col-span-2">
            Student brief
            <textarea
              key={`${unit.id}-task-brief`}
              defaultValue={unit.finalTask.brief}
              onBlur={(event) => {
                checkpoint("Before final-task brief edit");
                updateFinalTask(unit.id, { brief: event.target.value });
              }}
              rows={3}
              className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-indigo-500"
            />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700 lg:col-span-2">
            Success criteria — one per line
            <textarea
              key={`${unit.id}-task-criteria`}
              defaultValue={unit.finalTask.successCriteria.join("\n")}
              onBlur={(event) => {
                checkpoint("Before success-criteria edit");
                updateFinalTask(unit.id, { successCriteria: parseList(event.target.value) });
              }}
              rows={3}
              className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-indigo-500"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">Session path</h2>
            <p className="text-sm text-slate-500">Up to eight sessions, each tied to the final task.</p>
          </div>
          <button
            type="button"
            onClick={() => addSession(unit.id)}
            disabled={unit.sessions.length >= MAX_UNIT_SESSIONS}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={16} /> Add session
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {unit.sessions.map((session, index) => (
            <div key={session.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-black text-indigo-700">
                  {index + 1}
                </div>
                <input
                  key={`${session.id}-title`}
                  defaultValue={session.title}
                  onBlur={(event) => updateSession(unit.id, session.id, { title: event.target.value })}
                  aria-label={`Session ${index + 1} title`}
                  className="min-w-0 flex-1 border-0 bg-transparent text-base font-bold text-slate-900 outline-none"
                />
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  Reactivation
                  <input
                    key={`${session.id}-reactivation`}
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={session.reactivationTargetPercentage}
                    onBlur={(event) =>
                      updateSession(unit.id, session.id, {
                        reactivationTargetPercentage: Number(event.target.value),
                      })
                    }
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-slate-900"
                  />
                  %
                </label>
              </div>
              <textarea
                key={`${session.id}-objective`}
                defaultValue={session.objective}
                onBlur={(event) => updateSession(unit.id, session.id, { objective: event.target.value })}
                placeholder="Observable session objective"
                rows={2}
                className="mt-3 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
              />
            </div>
          ))}
          {unit.sessions.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
              Define the final task, then add the first step toward it.
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600" />
          <h2 className="text-lg font-black text-slate-950">Language requirements</h2>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Grammar points — one per line
            <textarea
              key={`${unit.id}-grammar`}
              defaultValue={unit.grammarPoints.join("\n")}
              onBlur={(event) =>
                updateUnit(
                  unit.id,
                  { grammarPoints: parseList(event.target.value) },
                  "Before grammar requirements edit",
                )
              }
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-indigo-500"
            />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-700">
            Unit theme and framing
            <textarea
              key={`${unit.id}-theme`}
              defaultValue={unit.theme}
              onBlur={(event) =>
                updateUnit(unit.id, { theme: event.target.value }, "Before unit theme edit")
              }
              rows={5}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-normal text-slate-900 outline-none focus:border-indigo-500"
            />
          </label>
        </div>
      </section>
    </div>
  );
}

