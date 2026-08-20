"use client";

import { useState } from "react";
import { BookMarked, ExternalLink, Link2, Plus } from "lucide-react";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import type { SourceKind, UnitContent } from "@/lib/phase-one/types";

export function SourcesPanel({ unit }: { unit: UnitContent }) {
  const { addSource, addCurriculumReference } = usePhaseOneStore();
  const [sourceTitle, setSourceTitle] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceKind, setSourceKind] = useState<SourceKind>("url");
  const [curriculumTitle, setCurriculumTitle] = useState("");
  const [curriculumVersion, setCurriculumVersion] = useState("");
  const [curriculumUrl, setCurriculumUrl] = useState("");

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Link2 size={19} className="text-indigo-600" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Source references</h2>
            <p className="text-sm text-slate-500">
              Keep provenance and links; do not silently copy external material.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {unit.sourceReferences.map((source) => (
            <article key={source.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                    {source.kind}
                  </span>
                  <p className="mt-2 font-bold text-slate-900">{source.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{source.citation}</p>
                </div>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-indigo-700"
                    aria-label={`Open ${source.title}`}
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 space-y-2 rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4">
          <input
            value={sourceTitle}
            onChange={(event) => setSourceTitle(event.target.value)}
            placeholder="Source title"
            className="w-full rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
          <div className="grid grid-cols-[110px_1fr] gap-2">
            <select
              value={sourceKind}
              onChange={(event) => setSourceKind(event.target.value as SourceKind)}
              className="rounded-lg border border-indigo-200 bg-white px-2 py-2 text-sm text-slate-900"
            >
              {['url', 'video', 'pdf', 'image', 'textbook', 'text'].map((kind) => (
                <option key={kind} value={kind}>{kind}</option>
              ))}
            </select>
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="Reference URL"
              className="rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-500"
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!sourceTitle.trim()) return;
              addSource(unit.id, {
                title: sourceTitle.trim(),
                kind: sourceKind,
                url: sourceUrl.trim(),
                citation: sourceTitle.trim(),
                notes: "Reference only",
              });
              setSourceTitle("");
              setSourceUrl("");
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <Plus size={15} /> Add reference
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <BookMarked size={19} className="text-emerald-600" />
          <div>
            <h2 className="text-lg font-black text-slate-950">Curriculum alignment</h2>
            <p className="text-sm text-slate-500">
              Requirements stay tied to a visible source and version.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {unit.curriculumReferences.map((reference) => (
            <article key={reference.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900">{reference.title}</p>
                  <p className="mt-1 text-xs font-semibold text-emerald-700">{reference.version}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{reference.notes}</p>
                </div>
                {reference.url && (
                  <a
                    href={reference.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:text-indigo-700"
                    aria-label={`Open ${reference.title}`}
                  >
                    <ExternalLink size={15} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-5 space-y-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50 p-4">
          <input
            value={curriculumTitle}
            onChange={(event) => setCurriculumTitle(event.target.value)}
            placeholder="Official source title"
            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
          />
          <input
            value={curriculumVersion}
            onChange={(event) => setCurriculumVersion(event.target.value)}
            placeholder="Version or school year"
            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
          />
          <input
            value={curriculumUrl}
            onChange={(event) => setCurriculumUrl(event.target.value)}
            placeholder="Official URL"
            className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500"
          />
          <button
            type="button"
            onClick={() => {
              if (!curriculumTitle.trim()) return;
              addCurriculumReference(unit.id, {
                title: curriculumTitle.trim(),
                version: curriculumVersion.trim() || "Version not recorded",
                url: curriculumUrl.trim(),
                notes: "Verify this source before generating or revising the unit.",
              });
              setCurriculumTitle("");
              setCurriculumVersion("");
              setCurriculumUrl("");
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
          >
            <Plus size={15} /> Add curriculum source
          </button>
        </div>
      </section>
    </div>
  );
}

