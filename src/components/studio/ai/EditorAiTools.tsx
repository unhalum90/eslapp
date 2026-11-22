"use client";
import { useState } from "react";
import { generatePagePlan, rewriteText, illustratePage } from "@/app/actions/studioAi";
import { createStudioAssetUpload, getStudioAssetUrls } from "@/app/actions/studio";
import { createClient } from "@/lib/supabase/client";
import { applyPagePlan } from "@/lib/studio/ai/edit";
import { createElement, lintDocument } from "@/lib/studio/document";
import { useStudioEditorStore, selectCurrentPage, selectSelectedElement } from "@/lib/store/useStudioEditorStore";
import { useAiAgentStore } from "@/lib/store/useAiAgentStore";
export function EditorAiTools() {
  const document = useStudioEditorStore(s => s.document);
  const page = useStudioEditorStore(selectCurrentPage);
  const element = useStudioEditorStore(selectSelectedElement);
  const [mode, setMode] = useState<"add" | "replace" | "image" | null>(null);
  const [brief, setBrief] = useState("");
  const [style, setStyle] = useState<"flat" | "photo" | "sketch">("flat");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!document || !page) return null;
  const button = "min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-bold disabled:opacity-40";
  const start = (next: typeof mode) => { setMode(next); setMessage(""); setBrief(next === "image" ? (page.notes.split("Illustration suggérée : ")[1] ?? "").slice(0,500) : ""); };
  const context = { level: document.level ?? "6e", contentLanguage: document.settings.contentLanguage, agent: useAiAgentStore.getState().selectedAgent };
  const rewrite = async (intent: "simplify" | "shorten" | "expand" | "correct") => {
    if (element?.content.type !== "text") return;
    const original = element.content.text; const elementId = element.id;
    setBusy(true); setMessage("");
    try {
      const result = await rewriteText({ ...context, text: original, intent, maxChars: element.frame.height <= 144 ? 60 : 420 });
      if (!result.ok) throw new Error(result.message);
      const state = useStudioEditorStore.getState();
      const current = state.document?.pages.flatMap(p => p.elements).find(e => e.id === elementId);
      if (current?.content.type !== "text" || current.content.text !== original) throw new Error("Le texte a changé pendant la génération. Réessayez.");
      state.update(d => { const e = d.pages.flatMap(p => p.elements).find(e => e.id === elementId); if (e?.content.type === "text") e.content.text = result.text; });
    } catch(e) { setMessage(e instanceof Error ? e.message : "Reformulation impossible."); } finally { setBusy(false); }
  };
  const run = async () => {
    const state = useStudioEditorStore.getState(); const baseline = state.document; const pageId = page.id;
    setBusy(true); setMessage("");
    try {
      if (mode === "image") {
        if (!state.lessonId) throw new Error("Enregistrez la leçon d’abord.");
        const result = await illustratePage({ lessonId: state.lessonId, prompt: brief, style });
        if (!result.ok) throw new Error(result.message);
        const blob = await (await fetch(result.dataUrl)).blob();
        const name = `IA · ${brief}`.slice(0,200);
        const ticket = await createStudioAssetUpload(state.lessonId, { name, mime: blob.type, bytes: blob.size });
        if (!ticket.ok) throw new Error(ticket.message);
        const client = createClient(); if (!client) throw new Error("Stockage indisponible.");
        const upload = await client.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, blob, {contentType:blob.type,upsert:true});
        if (upload.error) throw new Error("Téléversement impossible.");
        const assetId = ticket.assetId;
        const urls = await getStudioAssetUrls([{id:assetId,path:ticket.path}]);
        if (!urls.ok) throw new Error(urls.message);
        const latest = useStudioEditorStore.getState();
        if (latest.lessonId !== state.lessonId || !latest.document?.pages.some(p => p.id === pageId)) throw new Error("La page a été fermée pendant la génération.");
        latest.mergeAssetUrls(urls.urls);
        latest.update(d => {
          d.assets[assetId] = {id:assetId,kind:"image",name,mime:blob.type,bytes:blob.size,path:ticket.path};
          const p = d.pages.find(p => p.id === pageId)!;
          let image = p.elements.find(e => e.content.type === "image" && !e.content.assetId);
          if (!image) { image = createElement("image",{x:940,y:450},p.elements.length); p.elements.push(image); }
          image.content = {type:"image",assetId,alt:brief.slice(0,200),fit:"contain",radius:24};
        });
      } else {
        const result = await generatePagePlan({ ...context, lessonSummary: document.title, brief });
        if (!result.ok) throw new Error(result.message);
        const latest = useStudioEditorStore.getState();
        if (latest.document !== baseline) throw new Error("La leçon a changé pendant la génération. Réessayez.");
        const draft = structuredClone(document); const nextId = applyPagePlan(draft,result.page, mode === "replace" ? pageId : undefined);
        if (lintDocument(draft).some(i => i.severity === "error")) throw new Error("La page proposée invaliderait la leçon.");
        latest.update(d => { d.pages = draft.pages; }); latest.setPage(nextId);
      }
      setMode(null);
    } catch(e) { setMessage(e instanceof Error ? e.message : "Opération impossible."); } finally { setBusy(false); }
  };
  return <div className="border-b border-slate-200 bg-white px-3 py-2">
    {document.pages.some(p => p.notes.includes("[studio-ai-review]")) && <p className="mb-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Vérifiez les contenus générés avant de les utiliser en classe.</p>}
    <div className="flex flex-wrap items-center gap-2"><span className="text-xs font-black text-[#285d68]">IA</span><button className={button} disabled={busy} onClick={() => start("add")}>Ajouter une page avec l’IA</button><button className={button} disabled={busy} onClick={() => start("replace")}>Régénérer cette page</button><button className={button} disabled={busy} onClick={() => start("image")}>Illustrer cette page</button>
    {element?.content.type === "text" && <select aria-label="Reformuler le texte sélectionné" disabled={busy} className={button} value="" onChange={e => { if (e.target.value) void rewrite(e.target.value as "simplify" | "shorten" | "expand" | "correct"); }}><option value="">Reformuler…</option><option value="simplify">Simplifier</option><option value="shorten">Raccourcir</option><option value="expand">Développer</option><option value="correct">Corriger</option></select>}</div>
    {mode && <form className="mt-3 flex flex-wrap items-end gap-2" onSubmit={e => {e.preventDefault();void run();}}><label className="min-w-48 flex-1 text-xs font-bold">{mode === "image" ? "Illustration souhaitée" : "Contenu de la page"}<textarea autoFocus required disabled={busy} maxLength={500} value={brief} onChange={e=>setBrief(e.target.value)} className="teacher-input block w-full" /></label>{mode === "image" && <><select aria-label="Style d’illustration" value={style} disabled={busy} onChange={e=>setStyle(e.target.value as typeof style)} className={button}><option value="flat">Illustration</option><option value="photo">Photo</option><option value="sketch">Croquis</option></select><p className="w-full text-xs text-amber-900">Une image sera facturée par votre fournisseur selon son tarif actuel. Le montant exact dépend de votre configuration. Le bouton Générer lance cet appel payant.</p></>}<button disabled={busy || !brief.trim()} className={button}>{busy ? "Génération…" : "Générer"}</button><button type="button" disabled={busy} className={button} onClick={()=>setMode(null)}>Annuler</button></form>}
    {busy && <p role="status" className="mt-2 text-xs">Préparation…</p>}{message && <p role="alert" className="mt-2 text-sm text-red-800">{message}</p>}
  </div>;
}
