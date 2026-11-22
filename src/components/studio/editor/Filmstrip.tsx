"use client";

import { useState } from "react";
import { isIncomplete } from "@/lib/studio/ai/layout";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Lock, LockOpen, Plus, Trash2 } from "lucide-react";
import { createPage, duplicatePage } from "@/lib/studio/document";
import { selectCurrentPage, useStudioEditorStore } from "@/lib/store/useStudioEditorStore";
import { StudioStage } from "../renderer/StudioStage";

const THUMB_SCALE = 0.14;

export function Filmstrip() {
  const [todoOnly, setTodoOnly] = useState(false);
  const document = useStudioEditorStore((state) => state.document);
  const page = useStudioEditorStore(selectCurrentPage);
  const selectedId = useStudioEditorStore((state) => state.selectedId);
  const assetUrls = useStudioEditorStore((state) => state.assetUrls);
  const { setPage, update, select } = useStudioEditorStore.getState();
  if (!document || !page) return null;

  const currentIndex = document.pages.findIndex((candidate) => candidate.id === page.id);
  const movePage = (from: number, to: number) => {
    if (to < 0 || to >= document.pages.length) return;
    update((doc) => {
      const [moved] = doc.pages.splice(from, 1);
      doc.pages.splice(to, 0, moved);
    });
  };

  const buttonClass = "inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:border-[#285d68] hover:bg-[#e8f3f1] disabled:opacity-30";

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[#d8d5ca] bg-white" aria-label="Pages et calques">
      <div className="flex items-center justify-between border-b border-[#d8d5ca] px-3 py-2">
        <h2 className="text-xs font-black uppercase tracking-wide text-slate-500">Pages</h2>
        <button
          type="button"
          className={buttonClass}
          title="Ajouter une page"
          aria-label="Ajouter une page"
          onClick={() => {
            const next = createPage({ name: `Page ${document.pages.length + 1}` });
            update((doc) => {
              doc.pages.splice(currentIndex + 1, 0, next);
            });
            setPage(next.id);
          }}
        >
          <Plus size={16} />
        </button>
      </div>
      <ol className="min-h-0 flex-1 overflow-auto p-2">
        {document.pages.map((candidate, index) => {
          const active = candidate.id === page.id;
          return (
            <li key={candidate.id} className="mb-2">
              <div
                role="button"
                tabIndex={0}
                aria-label={`Page ${index + 1} : ${candidate.name}`}
                onClick={() => setPage(candidate.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setPage(candidate.id);
                  }
                }}
                aria-current={active ? "page" : undefined}
                className={`w-full cursor-pointer rounded-xl border-2 p-1.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#285d68] ${active ? "border-[#285d68] bg-[#e8f3f1]" : "border-transparent hover:border-slate-300"}`}
              >
                <div inert className="pointer-events-none overflow-hidden rounded-md border border-slate-200 bg-white">
                  <StudioStage document={document} page={candidate} scale={THUMB_SCALE} mode="editor" resolveAssetUrl={(id) => (id ? assetUrls[id] : undefined)} showHiddenInEditor={false} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-1 px-0.5">
                  <span className="truncate text-xs font-bold text-[#18282b]">
                    {index + 1}. {candidate.name}
                  </span>
                  {candidate.hiddenFromNavigation ? <EyeOff size={12} className="shrink-0 text-slate-400" aria-label="Page cachée" /> : null}
                </div>
              </div>
              {active ? (
                <div className="mt-1 flex items-center justify-center gap-1">
                  <button type="button" className={buttonClass} title="Monter" aria-label="Monter la page" disabled={index === 0} onClick={() => movePage(index, index - 1)}>
                    <ArrowUp size={14} />
                  </button>
                  <button type="button" className={buttonClass} title="Descendre" aria-label="Descendre la page" disabled={index === document.pages.length - 1} onClick={() => movePage(index, index + 1)}>
                    <ArrowDown size={14} />
                  </button>
                  <button
                    type="button"
                    className={buttonClass}
                    title="Dupliquer la page"
                    aria-label="Dupliquer la page"
                    onClick={() => {
                      const copy = duplicatePage(candidate);
                      update((doc) => {
                        doc.pages.splice(index + 1, 0, copy);
                      });
                      setPage(copy.id);
                    }}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${buttonClass} hover:!border-[#d45b3f] hover:!bg-orange-50`}
                    title="Supprimer la page"
                    aria-label="Supprimer la page"
                    disabled={document.pages.length <= 1}
                    onClick={() => {
                      if (!window.confirm(`Supprimer la page « ${candidate.name} » ?`)) return;
                      const nextId = document.pages[index + 1]?.id ?? document.pages[index - 1]?.id;
                      update((doc) => {
                        doc.pages = doc.pages.filter((item) => item.id !== candidate.id);
                      });
                      if (nextId) setPage(nextId);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="border-t border-[#d8d5ca]">
        <h2 className="px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500">Calques</h2>
        <button type="button" aria-pressed={todoOnly} onClick={() => setTodoOnly(!todoOnly)} className="mx-3 mb-2 rounded-full border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900">À compléter · {page.elements.filter(isIncomplete).length}{todoOnly ? " ✓" : ""}</button>
        <ol className="max-h-56 overflow-auto px-2 pb-2" aria-label="Éléments de la page, du premier plan à l'arrière-plan">
          {[...page.elements].filter(e => !todoOnly || isIncomplete(e)).reverse().map((element) => {
            const active = element.id === selectedId;
            return (
              <li key={element.id} className={`mb-1 flex items-center gap-1 rounded-lg border px-1.5 py-1 text-xs ${active ? "border-[#285d68] bg-[#e8f3f1]" : "border-transparent hover:bg-slate-50"}`}>
                <button type="button" onClick={() => select(element.id)} className="min-w-0 flex-1 truncate text-left font-semibold text-[#18282b]" aria-current={active ? "true" : undefined}>
                  {element.name}
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 hover:text-[#285d68]"
                  title={element.initiallyVisible ? "Masquer au départ" : "Afficher au départ"}
                  aria-label={element.initiallyVisible ? `Masquer ${element.name} au départ` : `Afficher ${element.name} au départ`}
                  aria-pressed={!element.initiallyVisible}
                  onClick={() => update((doc) => {
                    const found = doc.pages.flatMap((candidate) => candidate.elements).find((item) => item.id === element.id);
                    if (found) found.initiallyVisible = !found.initiallyVisible;
                  })}
                >
                  {element.initiallyVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button
                  type="button"
                  className="rounded p-1 text-slate-500 hover:text-[#285d68]"
                  title={element.lockedInEditor ? "Déverrouiller" : "Verrouiller"}
                  aria-label={element.lockedInEditor ? `Déverrouiller ${element.name}` : `Verrouiller ${element.name}`}
                  aria-pressed={element.lockedInEditor}
                  onClick={() => update((doc) => {
                    const found = doc.pages.flatMap((candidate) => candidate.elements).find((item) => item.id === element.id);
                    if (found) found.lockedInEditor = !found.lockedInEditor;
                  })}
                >
                  {element.lockedInEditor ? <Lock size={14} /> : <LockOpen size={14} />}
                </button>
              </li>
            );
          })}
          {page.elements.length === 0 ? <li className="px-2 py-1 text-xs text-slate-400">Page vide</li> : null}
        </ol>
      </div>
    </aside>
  );
}
