"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, EyeOff, Headphones, Loader2, RotateCcw } from "lucide-react";
import { buildPracticePayload } from "@/lib/phase-one/domain";
import type { PublishedPracticeUnit } from "@/lib/phase-one/types";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";

export function PracticeView({ code }: { code: string }) {
  const { units, vocabulary } = usePhaseOneStore();
  const [remote, setRemote] = useState<PublishedPracticeUnit | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const local = useMemo(() => {
    const unit = units.find(
      (candidate) =>
        candidate.distributionCode.toLocaleUpperCase("en") === code.toLocaleUpperCase("en") &&
        candidate.published,
    );
    return unit ? buildPracticePayload(unit, vocabulary) : null;
  }, [code, units, vocabulary]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/practice/${encodeURIComponent(code)}`)
      .then(async (response) => (response.ok ? (await response.json()) as PublishedPracticeUnit : null))
      .then((payload) => {
        if (!cancelled && payload) setRemote(payload);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  const practice = remote ?? local;

  if (loading && !practice) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-slate-500">
        <Loader2 className="mr-2 animate-spin" size={20} /> Loading practice…
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <BookOpen className="mx-auto text-slate-300" size={40} />
        <h1 className="mt-4 text-2xl font-black text-slate-950">Practice not available</h1>
        <p className="mt-2 text-slate-500">
          Check the permanent code with your teacher. The unit may be temporarily unpublished.
        </p>
        <Link href="/" className="mt-6 inline-block font-bold text-indigo-600 hover:text-indigo-800">
          Return to The ESL Architect
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">
              Pair practice · no score recorded
            </p>
            <h1 className="mt-2 text-3xl font-black md:text-4xl">{practice.title}</h1>
            <p className="mt-2 max-w-2xl text-slate-300">{practice.theme}</p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Code</p>
            <p className="font-mono text-xl font-black tracking-[0.15em]">{practice.distributionCode}</p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <p className="text-xs font-black uppercase tracking-wider text-indigo-700">Final-task direction</p>
        <p className="mt-1 text-lg font-bold text-indigo-950">
          {practice.finalTaskTitle || "Practise the vocabulary together."}
        </p>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-950">Vocabulary practice</h2>
            <p className="text-sm text-slate-500">Say the English first, then reveal the French.</p>
          </div>
          <button
            type="button"
            onClick={() => setRevealed(new Set())}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <RotateCcw size={15} /> Reset
          </button>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {practice.vocabulary.map((item) => {
            const showTranslation = revealed.has(item.id);
            return (
              <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-black text-slate-950">{item.term}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.phonetic || "Listen and repeat"}</p>
                  </div>
                  {item.purpose === "reactivation" && (
                    <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-black uppercase text-emerald-700">
                      Reactivation
                    </span>
                  )}
                </div>

                <div className="mt-5 min-h-12 rounded-xl bg-slate-50 p-3 text-center">
                  {showTranslation ? (
                    <p className="font-bold text-indigo-800">{item.translationFr || "Translation unavailable"}</p>
                  ) : (
                    <p className="text-sm text-slate-400">Try before revealing</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const next = new Set(revealed);
                    if (showTranslation) next.delete(item.id);
                    else next.add(item.id);
                    setRevealed(next);
                  }}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700"
                >
                  {showTranslation ? <EyeOff size={15} /> : <Eye size={15} />}
                  {showTranslation ? "Hide translation" : "Reveal translation"}
                </button>

                {item.audio.length > 0 && (
                  <div className="mt-3 rounded-lg border border-slate-200 p-2">
                    <p className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
                      <Headphones size={12} /> {item.audio[0].accent} accent
                    </p>
                    <audio controls preload="none" className="h-8 w-full" src={item.audio[0].url}>
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

