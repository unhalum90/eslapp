"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Check, Languages, Plus, RotateCcw, Volume2 } from "lucide-react";
import { assessVocabularyReuse, vocabularyCompleteness } from "@/lib/phase-one/domain";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import type { UnitContent } from "@/lib/phase-one/types";

export function VocabularyPanel({ unit }: { unit: UnitContent }) {
  const { units, vocabulary, addVocabularyItem, attachVocabulary } = usePhaseOneStore();
  const [term, setTerm] = useState("");
  const [translation, setTranslation] = useState("");
  const [phonetic, setPhonetic] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [accent, setAccent] = useState("GB");

  const assessment = useMemo(
    () => assessVocabularyReuse(term, unit.id, { units, vocabulary }),
    [term, unit.id, units, vocabulary],
  );
  const attachedIds = new Set(unit.vocabulary.map((link) => link.vocabularyId));
  const attached = unit.vocabulary
    .map((link) => ({
      link,
      item: vocabulary.find((candidate) => candidate.id === link.vocabularyId),
    }))
    .filter((entry) => entry.item !== undefined);

  const clearForm = () => {
    setTerm("");
    setTranslation("");
    setPhonetic("");
    setImageUrl("");
    setAudioUrl("");
  };

  const addOrAttach = () => {
    if (!term.trim() || assessment.kind === "duplicate") return;
    if (assessment.kind === "reactivation") {
      attachVocabulary(
        unit.id,
        assessment.vocabularyId,
        "reactivation",
        assessment.sourceUnitId,
      );
      clearForm();
      return;
    }
    if (assessment.kind === "similar") {
      attachVocabulary(unit.id, assessment.vocabularyId, "new");
      clearForm();
      return;
    }
    addVocabularyItem(unit.id, {
      term: term.trim(),
      translationFr: translation.trim(),
      phonetic: phonetic.trim(),
      imageUrl: imageUrl.trim(),
      audio: audioUrl.trim() ? [{ accent, url: audioUrl.trim() }] : [],
      tags: [],
      notes: "",
    });
    clearForm();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Languages size={19} className="text-indigo-600" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Unit vocabulary</h2>
            <p className="text-sm text-slate-500">
              Global items are attached—not retyped. Reactivation is explicit and visible.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {attached.map(({ item, link }) => {
            if (!item) return null;
            const completeness = vocabularyCompleteness(item);
            return (
              <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-slate-950">{item.term}</p>
                    <p className="text-sm text-slate-500">{item.phonetic || "Pronunciation missing"}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                      link.purpose === "reactivation"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {link.purpose}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-700">{item.translationFr || "Translation missing"}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-2 text-slate-400">
                    <span title={item.imageUrl ? "Image linked" : "Image missing"}>▣</span>
                    <Volume2
                      size={16}
                      className={item.audio.length > 0 ? "text-emerald-600" : ""}
                    />
                  </div>
                  <span className={completeness === 100 ? "text-emerald-700" : "text-amber-700"}>
                    <span className="text-xs font-bold">{completeness}% complete</span>
                  </span>
                </div>
              </article>
            );
          })}
          {attached.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 sm:col-span-2">
              Add the vocabulary required by the final task.
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-slate-950">Add or reuse an item</h2>
        <p className="mt-1 text-sm text-slate-500">All items belong to the global registry.</p>

        <div className="mt-4 space-y-3">
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="English term"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
          {term.trim() && (
            <div
              className={`flex items-start gap-2 rounded-lg p-3 text-xs leading-5 ${
                assessment.kind === "available"
                  ? "bg-emerald-50 text-emerald-800"
                  : assessment.kind === "reactivation"
                    ? "bg-blue-50 text-blue-800"
                    : "bg-amber-50 text-amber-800"
              }`}
            >
              {assessment.kind === "available" ? (
                <Check size={15} className="mt-0.5 shrink-0" />
              ) : assessment.kind === "reactivation" ? (
                <RotateCcw size={15} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              )}
              {assessment.message}
            </div>
          )}
          <input
            value={translation}
            onChange={(event) => setTranslation(event.target.value)}
            placeholder="French translation"
            disabled={assessment.kind !== "available"}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:bg-slate-50"
          />
          <input
            value={phonetic}
            onChange={(event) => setPhonetic(event.target.value)}
            placeholder="Phonetic transcription"
            disabled={assessment.kind !== "available"}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:bg-slate-50"
          />
          <input
            value={imageUrl}
            onChange={(event) => setImageUrl(event.target.value)}
            placeholder="Image reference URL"
            disabled={assessment.kind !== "available"}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:bg-slate-50"
          />
          <div className="grid grid-cols-[90px_1fr] gap-2">
            <select
              value={accent}
              onChange={(event) => setAccent(event.target.value)}
              disabled={assessment.kind !== "available"}
              className="rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-sm text-slate-900 disabled:bg-slate-50"
            >
              {['GB', 'US', 'AU', 'IE', 'CA', 'NZ', 'IN', 'ZA'].map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            <input
              value={audioUrl}
              onChange={(event) => setAudioUrl(event.target.value)}
              placeholder="Cached audio URL"
              disabled={assessment.kind !== "available"}
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500 disabled:bg-slate-50"
            />
          </div>
          <button
            type="button"
            onClick={addOrAttach}
            disabled={!term.trim() || assessment.kind === "duplicate"}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {assessment.kind === "reactivation" ? <RotateCcw size={16} /> : <Plus size={16} />}
            {assessment.kind === "reactivation"
              ? "Attach as reactivation"
              : assessment.kind === "similar"
                ? "Attach existing item"
                : "Create global item"}
          </button>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
            Other registry items
          </h3>
          <div className="mt-2 space-y-2">
            {vocabulary
              .filter((item) => !attachedIds.has(item.id))
              .slice(0, 6)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => attachVocabulary(unit.id, item.id, "reactivation")}
                  className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:border-indigo-300"
                >
                  <span className="font-semibold text-slate-800">{item.term}</span>
                  <span className="text-xs text-indigo-600">Reactivate</span>
                </button>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}

