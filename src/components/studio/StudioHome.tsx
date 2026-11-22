"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, FileArchive, Globe, Loader2, MousePointerClick, Plus, Trash2, X } from "lucide-react";
import { createStudioLesson, deleteStudioLesson, duplicateStudioLesson, listStudioLessons } from "@/app/actions/studio";
import { STUDIO_TEMPLATES } from "@/lib/studio/templates";
import { GenerateLessonDialog } from "./ai/GenerateLessonDialog";
import { GeniallyImportDialog } from "./GeniallyImportDialog";
import type { LessonSummary } from "@/lib/studio/types";

export function StudioHome() {
  const router = useRouter();
  const [lessons, setLessons] = useState<LessonSummary[] | null>(null);
  const [error, setError] = useState<{ message: string; needsSignIn?: boolean } | null>(null);
  const [picker, setPicker] = useState(false);
  const [generator, setGenerator] = useState(false);
  const [importer, setImporter] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () =>
    listStudioLessons().then((result) => {
      if (!result.ok) {
        setError({ message: result.message, needsSignIn: result.needsSignIn });
        setLessons([]);
        return;
      }
      setError(null);
      setLessons(result.lessons);
    });

  useEffect(() => {
    let cancelled = false;
    listStudioLessons().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setError({ message: result.message, needsSignIn: result.needsSignIn });
        setLessons([]);
        return;
      }
      setLessons(result.lessons);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const create = async (templateId: string) => {
    setBusy("create");
    const result = await createStudioLesson(templateId);
    setBusy(null);
    if (!result.ok) {
      setError({ message: result.message, needsSignIn: result.needsSignIn });
      setPicker(false);
      return;
    }
    router.push(`/studio/${result.lessonId}`);
  };

  const duplicate = async (lesson: LessonSummary) => {
    setBusy(lesson.id);
    const result = await duplicateStudioLesson(lesson.id);
    setBusy(null);
    if (!result.ok) {
      setError({ message: result.message });
      return;
    }
    await refresh();
  };

  const remove = async (lesson: LessonSummary) => {
    const published = lesson.publication?.active;
    if (!window.confirm(`Supprimer « ${lesson.title} » ?${published ? " La leçon est publiée : le lien cessera de fonctionner." : ""} Les médias de cette leçon seront supprimés.`)) return;
    setBusy(lesson.id);
    const result = await deleteStudioLesson(lesson.id);
    setBusy(null);
    if (!result.ok) {
      setError({ message: result.message });
      return;
    }
    await refresh();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#758184]">Interactive Studio</p>
          <h1 className="mt-1 text-3xl font-black text-[#18282b]">Leçons interactives</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Transformez une image, un plan ou un audio en activité cliquable : zones, étiquettes, fenêtres, questions. Publiez un lien ou un QR code, sans compte élève.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setImporter(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#285d68] bg-white px-5 text-sm font-black text-[#285d68] hover:bg-[#e8f3f1]">
            <FileArchive size={18} /> Importer un Genially
          </button>
          <button type="button" onClick={() => setPicker(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#285d68] px-5 text-sm font-black text-white shadow hover:bg-[#1f4b54]">
            <Plus size={18} /> Nouvelle leçon
          </button>
        </div>
      </div>
      {generator ? <GenerateLessonDialog onClose={() => setGenerator(false)} /> : null}
      <GeniallyImportDialog open={importer} onClose={() => setImporter(false)} onImported={() => void refresh()} />

      {error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-bold">{error.message}</p>
          {error.needsSignIn ? (
            <Link href="/account" className="mt-3 inline-flex rounded-lg bg-[#285d68] px-4 py-2 text-sm font-bold text-white">Se connecter</Link>
          ) : null}
        </div>
      ) : null}

      {lessons === null ? (
        <p className="mt-10 flex items-center gap-2 text-slate-500"><Loader2 className="animate-spin" /> Chargement…</p>
      ) : lessons.length === 0 && !error ? (
        <div className="mt-10 rounded-3xl border-2 border-dashed border-slate-300 bg-white p-10 text-center">
          <MousePointerClick className="mx-auto text-[#285d68]" size={36} />
          <p className="mt-3 text-lg font-black text-[#18282b]">Aucune leçon pour l&apos;instant</p>
          <p className="mt-1 text-sm text-slate-600">Commencez avec le modèle « Écouter → repérer → répondre » : un plan de ville prêt à adapter.</p>
          <button type="button" onClick={() => setPicker(true)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#285d68] px-5 text-sm font-black text-white">
            <Plus size={18} /> Créer une leçon
          </button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lessons.map((lesson) => (
            <li key={lesson.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/studio/${lesson.id}`} className="min-w-0 flex-1 text-lg font-black text-[#18282b] hover:text-[#285d68]">
                  {lesson.title || "Sans titre"}
                </Link>
                {lesson.publication?.active ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#e8f3f1] px-2 py-1 text-[11px] font-black text-[#285d68]"><Globe size={12} /> v{lesson.publication.version}</span>
                ) : (
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">Brouillon</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {lesson.level ? `${lesson.level} · ` : ""}{lesson.pageCount} page{lesson.pageCount > 1 ? "s" : ""} · modifiée le {new Date(lesson.updatedAt).toLocaleDateString("fr-FR")}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/studio/${lesson.id}`} className="inline-flex min-h-9 items-center rounded-lg bg-[#285d68] px-3 text-xs font-bold text-white">Ouvrir</Link>
                {lesson.publication?.active ? (
                  <a href={`/play/${lesson.publication.code}`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-bold"><ExternalLink size={12} /> Lien élève</a>
                ) : null}
                <button type="button" disabled={busy === lesson.id} onClick={() => void duplicate(lesson)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-bold disabled:opacity-40"><Copy size={12} /> Dupliquer</button>
                <button type="button" disabled={busy === lesson.id} onClick={() => void remove(lesson)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-bold text-[#a33d25] disabled:opacity-40"><Trash2 size={12} /></button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {picker ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18282b]/50 p-4" onClick={() => setPicker(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="picker-title" className="max-h-full w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <h2 id="picker-title" className="text-xl font-black">Choisir un point de départ</h2>
              <button type="button" aria-label="Fermer" onClick={() => setPicker(false)} className="rounded-full border border-slate-300 p-2 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <button type="button" onClick={() => { setPicker(false); setGenerator(true); }} className="mt-4 min-h-14 w-full rounded-xl bg-[#285d68] px-5 text-left font-black text-white">✦ Générer avec l’IA <span className="block text-xs font-normal">Décrivez une leçon, vérifiez son plan, puis ouvrez-la dans le Studio.</span></button>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {STUDIO_TEMPLATES.map((template) => (
                <li key={template.id}>
                  <button type="button" disabled={busy === "create"} onClick={() => void create(template.id)} className="h-full w-full rounded-2xl border-2 border-slate-200 p-4 text-left hover:border-[#285d68] hover:bg-[#e8f3f1] disabled:opacity-50">
                    <p className="text-xs font-black uppercase tracking-wide text-[#285d68]">{template.routine}</p>
                    <p className="mt-1 text-base font-black text-[#18282b]">{template.name}</p>
                    <p className="mt-1 text-sm text-slate-600">{template.description}</p>
                  </button>
                </li>
              ))}
            </ul>
            {busy === "create" ? <p className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="animate-spin" size={16} /> Création…</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
