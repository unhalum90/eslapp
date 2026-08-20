"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, GitFork, Link2, QrCode, RotateCcw } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { buildPracticePayload } from "@/lib/phase-one/domain";
import { createClient } from "@/lib/supabase/client";
import { classesForUnit, usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import type { UnitContent } from "@/lib/phase-one/types";

export function DeliveryPanel({ unit }: { unit: UnitContent }) {
  const {
    classes,
    classRuns,
    selectedClassId,
    setClassProgress,
    forkUnitForClass,
    createYearDescendant,
    setPublished,
    vocabulary,
  } = usePhaseOneStore();
  const [copied, setCopied] = useState(false);
  const [nextYear, setNextYear] = useState("2027–2028");
  const [publishMessage, setPublishMessage] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const relevantClasses = useMemo(() => classesForUnit(unit, classes), [classes, unit]);
  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const practicePath = `/practice/${unit.distributionCode}`;
  const origin = useSyncExternalStore(
    () => () => undefined,
    () => window.location.origin,
    () => "",
  );
  const practiceUrl = origin ? `${origin}${practicePath}` : practicePath;

  const updatePublication = async (published: boolean) => {
    setIsPublishing(true);
    setPublishMessage("");
    setPublished(unit.id, published);
    const supabase = createClient();
    if (!supabase) {
      setPublishMessage("Saved on this device. Configure Supabase for cross-device access.");
      setIsPublishing(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setPublishMessage("Saved on this device. Sign in before publishing across devices.");
      setIsPublishing(false);
      return;
    }
    const { error } = await supabase.from("unit_publications").upsert(
      {
        owner_id: user.id,
        unit_id: unit.id,
        code: unit.distributionCode,
        payload: buildPracticePayload({ ...unit, published }, vocabulary),
        published,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id,unit_id" },
    );
    setPublishMessage(
      error
        ? `Saved locally; remote publication failed: ${error.message}`
        : published
          ? "Published across devices. The permanent code is active."
          : "Practice access is temporarily unpublished; the code is preserved.",
    );
    setIsPublishing(false);
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Check size={19} className="text-emerald-600" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Manual class progress</h2>
            <p className="text-sm text-slate-500">
              The teacher—not student analytics—decides what each class has completed.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {relevantClasses.map((teacherClass) => {
            const run = classRuns.find(
              (candidate) => candidate.classId === teacherClass.id && candidate.unitId === unit.id,
            );
            return (
              <article key={teacherClass.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-900">{teacherClass.name}</p>
                    <p className="text-xs text-slate-500">{teacherClass.schoolYear}</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    Sessions completed
                    <input
                      type="number"
                      min={0}
                      max={unit.sessions.length}
                      value={run?.currentSession ?? 0}
                      onChange={(event) =>
                        setClassProgress(
                          teacherClass.id,
                          unit.id,
                          Number(event.target.value),
                        )
                      }
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-slate-900"
                    />
                    / {unit.sessions.length}
                  </label>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${run?.progressPercent ?? 0}%` }}
                  />
                </div>
                <textarea
                  value={run?.classNotes ?? ""}
                  onChange={(event) =>
                    setClassProgress(
                      teacherClass.id,
                      unit.id,
                      run?.currentSession ?? 0,
                      event.target.value,
                    )
                  }
                  placeholder="Class-specific delivery notes"
                  rows={2}
                  className="mt-3 w-full resize-y rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
                />
                {!unit.forkedForClassId && (
                  <button
                    type="button"
                    onClick={() => forkUnitForClass(unit.id, teacherClass.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
                  >
                    <GitFork size={14} /> Fork content for {teacherClass.name}
                  </button>
                )}
              </article>
            );
          })}
          {relevantClasses.length === 0 && (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              No class currently matches this unit’s level and school year.
            </p>
          )}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <h3 className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Link2 size={16} /> Linked year-over-year descendant
          </h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Create a new editable unit while preserving lineage. Changes do not overwrite the parent.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              value={nextYear}
              onChange={(event) => setNextYear(event.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
              aria-label="Next school year"
            />
            <button
              type="button"
              onClick={() => createYearDescendant(unit.id, nextYear)}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white hover:bg-slate-800"
            >
              <RotateCcw size={15} /> Create descendant
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <QrCode size={19} className="text-indigo-600" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Anonymous practice distribution</h2>
            <p className="text-sm text-slate-500">Permanent code; practice only; no student profile.</p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white">
          <div className="grid gap-5 sm:grid-cols-[150px_1fr] sm:items-center">
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG value={practiceUrl} size={126} level="M" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-300">Access code</p>
              <p className="mt-1 font-mono text-3xl font-black tracking-[0.16em]">
                {unit.distributionCode}
              </p>
              <p className="mt-3 break-all text-xs leading-5 text-slate-300">{practiceUrl}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(practiceUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              } catch {
                setPublishMessage("Copy was blocked by the browser. Select the URL above instead.");
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-indigo-300"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <Link
            href={practicePath}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:border-indigo-300"
          >
            <ExternalLink size={15} /> Preview
          </Link>
        </div>

        <label className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Publish practice view</p>
            <p className="text-xs text-slate-500">
              Codes never expire. The teacher can temporarily unpublish access.
            </p>
          </div>
          <input
            type="checkbox"
            checked={unit.published}
            disabled={isPublishing}
            onChange={(event) => void updatePublication(event.target.checked)}
            className="h-5 w-5 accent-indigo-600"
          />
        </label>

        {publishMessage && (
          <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-xs leading-5 text-slate-700">
            {publishMessage}
          </p>
        )}

        <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
          Local-first mode is active. Apply the Phase 1 Supabase migration to make published codes
          resolve across devices; the on-device preview already uses the permanent code contract.
        </div>
        {selectedClass && (
          <p className="mt-3 text-xs text-slate-500">
            Current class context: <strong>{selectedClass.name}</strong>. The practice page records no
            student or pair result.
          </p>
        )}
      </section>
    </div>
  );
}
