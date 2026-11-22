"use client";

import { useState } from "react";
import { isIncomplete } from "@/lib/studio/ai/layout";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Check, ChevronLeft, Copy, ExternalLink, Eye, Globe, Loader2, Presentation, Redo2, Share2, Undo2, X } from "lucide-react";
import { publishStudioLesson, unpublishStudioLesson } from "@/app/actions/studio";
import { lintDocument } from "@/lib/studio/document";
import type { LintIssue } from "@/lib/studio/types";
import { useStudioEditorStore, type SaveState, type ZoomSetting } from "@/lib/store/useStudioEditorStore";

const SAVE_LABELS: Record<SaveState, { label: string; tone: string }> = {
  idle: { label: "", tone: "text-slate-500" },
  saving: { label: "Enregistrement…", tone: "text-slate-500" },
  saved: { label: "Enregistré", tone: "text-emerald-700" },
  unsaved: { label: "Non enregistré", tone: "text-amber-700" },
  offline: { label: "Hors ligne — modifications conservées ici", tone: "text-amber-700" },
  conflict: { label: "Conflit : une version plus récente existe", tone: "text-[#a33d25]" },
  error: { label: "Échec de l'enregistrement", tone: "text-[#a33d25]" },
};

export function TopBar({ onSaveNow }: { onSaveNow: () => Promise<boolean> }) {
  const document = useStudioEditorStore((state) => state.document);
  const saveState = useStudioEditorStore((state) => state.saveState);
  const saveMessage = useStudioEditorStore((state) => state.saveMessage);
  const past = useStudioEditorStore((state) => state.past.length);
  const future = useStudioEditorStore((state) => state.future.length);
  const zoom = useStudioEditorStore((state) => state.zoom);
  const publication = useStudioEditorStore((state) => state.publication);
  const revision = useStudioEditorStore((state) => state.revision);
  const dirty = useStudioEditorStore((state) => state.dirty);
  const { update, undo, redo, setZoom, setPreviewOpen, setShareOpen, setPublishOpen } = useStudioEditorStore.getState();
  if (!document) return null;

  const incomplete = document.pages.flatMap(p => p.elements).filter(isIncomplete).length;
  const status = SAVE_LABELS[saveState];
  const hasUnpublishedChanges = publication?.active && (dirty || revision !== publication.publishedRevision);
  const button = "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-sm font-bold text-[#18282b] hover:border-[#285d68] hover:bg-[#e8f3f1] disabled:opacity-40";

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-[#d8d5ca] bg-white px-3 py-2">
      <Link href="/studio" className="inline-flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Retour aux leçons">
        <ChevronLeft size={20} />
      </Link>
      <input
        aria-label="Titre de la leçon"
        className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-black text-[#18282b] hover:border-slate-200 focus:border-[#285d68] focus:outline-none"
        value={document.title}
        onChange={(event) => update((doc) => { doc.title = event.target.value; })}
      />
      <span className={`text-xs font-bold ${status.tone}`} role="status" aria-live="polite" title={saveMessage ?? undefined}>
        {saveState === "saving" ? <Loader2 size={14} className="mr-1 inline animate-spin" /> : null}
        {status.label}
        {saveMessage && saveState !== "saved" ? ` · ${saveMessage}` : ""}
      </span>
      {saveState === "error" || saveState === "offline" || saveState === "conflict" ? (
        <button type="button" className={button} onClick={() => void onSaveNow()}>
          Réessayer
        </button>
      ) : null}
      {incomplete > 0 ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">{incomplete} zones à compléter</span> : null}
      <div className="mx-1 h-6 w-px bg-slate-200" />
      <button type="button" className={button} aria-label="Annuler" title="Annuler (⌘Z)" disabled={past === 0} onClick={undo}>
        <Undo2 size={16} />
      </button>
      <button type="button" className={button} aria-label="Rétablir" title="Rétablir (⇧⌘Z)" disabled={future === 0} onClick={redo}>
        <Redo2 size={16} />
      </button>
      <select aria-label="Zoom" className="min-h-9 rounded-lg border border-slate-200 px-2 text-sm font-bold" value={String(zoom)} onChange={(event) => setZoom(event.target.value === "fit" ? "fit" : (Number(event.target.value) as ZoomSetting))}>
        <option value="fit">Ajuster</option>
        <option value="0.5">50 %</option>
        <option value="0.75">75 %</option>
        <option value="1">100 %</option>
      </select>
      <div className="mx-1 h-6 w-px bg-slate-200" />
      <button type="button" className={button} onClick={() => setPreviewOpen(true)}>
        <Eye size={16} /> Aperçu
      </button>
      <button type="button" className={`${button} !border-[#285d68] !bg-[#285d68] !text-white hover:!bg-[#1f4b54]`} onClick={() => setPublishOpen(true)}>
        <Globe size={16} /> {publication?.active ? "Republier" : "Publier"}
      </button>
      {publication?.active ? (
        <>
          <button type="button" className={button} onClick={() => setShareOpen(true)}>
            <Share2 size={16} /> Partager
          </button>
          <a className={button} href={`/play/${publication.code}?classroom=1`} target="_blank" rel="noreferrer">
            <Presentation size={16} /> Mode classe
          </a>
          <span className="rounded-full bg-[#e8f3f1] px-2.5 py-1 text-xs font-black text-[#285d68]">
            Publié v{publication.version}{hasUnpublishedChanges ? " · brouillon modifié" : ""}
          </span>
        </>
      ) : publication ? (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">Dépublié</span>
      ) : null}
      <PublishDialog onSaveNow={onSaveNow} />
      <ShareDialog />
    </div>
  );
}

function PublishDialog({ onSaveNow }: { onSaveNow: () => Promise<boolean> }) {
  const open = useStudioEditorStore((state) => state.publishOpen);
  if (!open) return null;
  return <PublishDialogBody onSaveNow={onSaveNow} />;
}

function PublishDialogBody({ onSaveNow }: { onSaveNow: () => Promise<boolean> }) {
  const document = useStudioEditorStore((state) => state.document);
  const lessonId = useStudioEditorStore((state) => state.lessonId);
  const publication = useStudioEditorStore((state) => state.publication);
  const { setPublishOpen, setPublication, setShareOpen, setPage, select } = useStudioEditorStore.getState();
  const [busy, setBusy] = useState(false);
  const [serverIssues, setServerIssues] = useState<LintIssue[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);

  if (!document || !lessonId) return null;
  const issues = serverIssues ?? lintDocument(document);
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  const publish = async () => {
    setBusy(true);
    setMessage(null);
    const saved = await onSaveNow();
    if (!saved) {
      setBusy(false);
      setMessage("Enregistrez d'abord le brouillon (voir l'état d'enregistrement).");
      return;
    }
    const result = await publishStudioLesson(lessonId);
    setBusy(false);
    if (!result.ok) {
      if ("issues" in result) setServerIssues(result.issues);
      setMessage(result.message);
      return;
    }
    setPublication({ code: result.code, version: result.version, publishedAt: new Date().toISOString(), active: true, publishedRevision: useStudioEditorStore.getState().revision });
    setPublishOpen(false);
    setShareOpen(true);
  };

  const unpublish = async () => {
    if (!window.confirm("Dépublier ? Le lien ne fonctionnera plus pour les élèves.")) return;
    setBusy(true);
    const result = await unpublishStudioLesson(lessonId);
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    if (publication) setPublication({ ...publication, active: false });
    setPublishOpen(false);
  };

  const goTo = (issue: LintIssue) => {
    if (issue.pageId) setPage(issue.pageId);
    if (issue.elementId) select(issue.elementId);
    setPublishOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18282b]/50 p-4" onClick={() => setPublishOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="publish-title" className="max-h-full w-full max-w-lg overflow-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="publish-title" className="text-xl font-black">{publication?.active ? `Republier (v${publication.version + 1})` : "Publier la leçon"}</h2>
          <button type="button" aria-label="Fermer" onClick={() => setPublishOpen(false)} className="rounded-full border border-slate-300 p-2 hover:bg-slate-100"><X size={18} /></button>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          La publication crée une version figée. Les modifications suivantes du brouillon n&apos;affectent pas le lien jusqu&apos;à la prochaine republication.
        </p>
        {errors.length ? (
          <section className="mt-4 rounded-2xl border border-[#d45b3f]/40 bg-orange-50 p-3">
            <h3 className="flex items-center gap-2 text-sm font-black text-[#a33d25]"><AlertTriangle size={16} /> {errors.length} erreur{errors.length > 1 ? "s" : ""} bloquante{errors.length > 1 ? "s" : ""}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {errors.map((issue, index) => (
                <li key={index}><button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => goTo(issue)}>{issue.message}</button></li>
              ))}
            </ul>
          </section>
        ) : null}
        {warnings.length ? (
          <section className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-3">
            <h3 className="text-sm font-black text-amber-800">{warnings.length} avertissement{warnings.length > 1 ? "s" : ""}</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {warnings.map((issue, index) => (
                <li key={index}><button type="button" className="text-left underline-offset-2 hover:underline" onClick={() => goTo(issue)}>{issue.message}</button></li>
              ))}
            </ul>
          </section>
        ) : null}
        {!errors.length && !warnings.length ? <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700"><Check size={16} /> Aucun problème détecté.</p> : null}
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 accent-[#285d68]" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
          <span>J&apos;ai vérifié qu&apos;aucune information d&apos;élève n&apos;apparaît et que j&apos;ai le droit de diffuser les images et les audios. Le lien est public : toute personne qui le possède peut ouvrir la leçon.</span>
        </label>
        {message ? <p role="alert" className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-[#a33d25]">{message}</p> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {publication?.active ? (
            <button type="button" disabled={busy} className="mr-auto inline-flex min-h-10 items-center rounded-lg border border-[#d45b3f] px-4 text-sm font-bold text-[#a33d25] disabled:opacity-40" onClick={() => void unpublish()}>Dépublier</button>
          ) : null}
          <button type="button" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-bold" onClick={() => setPublishOpen(false)}>Annuler</button>
          <button type="button" disabled={busy || errors.length > 0 || !acknowledged} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#285d68] px-4 text-sm font-bold text-white disabled:opacity-40" onClick={() => void publish()}>
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />} {publication?.active ? "Republier" : "Publier"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ShareDialog() {
  const open = useStudioEditorStore((state) => state.shareOpen);
  const publication = useStudioEditorStore((state) => state.publication);
  const setShareOpen = useStudioEditorStore((state) => state.setShareOpen);
  const [copied, setCopied] = useState<string | null>(null);
  if (!open || !publication) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/play/${publication.code}`;
  const pinned = `${link}?v=${publication.version}`;
  const copy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18282b]/50 p-4" onClick={() => setShareOpen(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="share-title" className="text-xl font-black">Partager la leçon</h2>
          <button type="button" aria-label="Fermer" onClick={() => setShareOpen(false)} className="rounded-full border border-slate-300 p-2 hover:bg-slate-100"><X size={18} /></button>
        </div>
        {!publication.active ? <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Cette leçon est dépubliée : le lien est inactif.</p> : null}
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
          <div className="rounded-2xl border border-slate-200 p-3">
            <QRCodeSVG value={link} size={168} level="M" includeMargin={false} />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className="field-label">Lien élève (toujours la dernière version)</p>
              <div className="mt-1 flex gap-1">
                <input readOnly className="teacher-input !mt-0 flex-1 text-xs" value={link} onFocus={(event) => event.target.select()} />
                <button type="button" aria-label="Copier le lien" className="rounded-lg border border-slate-300 px-3 text-sm font-bold" onClick={() => void copy(link, "link")}>{copied === "link" ? <Check size={16} /> : <Copy size={16} />}</button>
              </div>
              <p className="mt-1 text-xs font-black text-[#285d68]">Code : {publication.code}</p>
            </div>
            <div>
              <p className="field-label">Lien figé v{publication.version} (reproductible)</p>
              <div className="mt-1 flex gap-1">
                <input readOnly className="teacher-input !mt-0 flex-1 text-xs" value={pinned} onFocus={(event) => event.target.select()} />
                <button type="button" aria-label="Copier le lien figé" className="rounded-lg border border-slate-300 px-3 text-sm font-bold" onClick={() => void copy(pinned, "pinned")}>{copied === "pinned" ? <Check size={16} /> : <Copy size={16} />}</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={link} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-300 px-3 text-sm font-bold"><ExternalLink size={14} /> Ouvrir</a>
              <a href={`${link}?classroom=1`} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#285d68] px-3 text-sm font-bold text-white"><Presentation size={14} /> Mode classe</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
