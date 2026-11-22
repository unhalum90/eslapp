"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, X } from "lucide-react";
import { AgentSelector } from "@/components/ai/AgentSelector";
import { useAiAgentStore } from "@/lib/store/useAiAgentStore";
import { generateSlidePlan, createLessonFromPlan, generatePagePlan } from "@/app/actions/studioAi";
import { routines, slidePlanSchema, type SlidePlan } from "@/lib/studio/ai/plan";
import { buildDocument } from "@/lib/studio/ai/layout";
const labels = ["Écouter → repérer → répondre", "Explorer → lire → vérifier", "Observer → prédire → révéler", "Lire → choisir → expliquer", "Vocabulaire", "Libre"];
export function GenerateLessonDialog({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const modal = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = window.document.activeElement;
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const agent = useAiAgentStore(s => s.selectedAgent);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<SlidePlan["level"]>("6e");
  const [routine, setRoutine] = useState<typeof routines[number]>(routines[0]);
  const [pageCount, setPageCount] = useState(6);
  const [contentLanguage, setLanguage] = useState<"en" | "fr">("en");
  const [extraInstructions, setExtra] = useState("");
  const [plan, setPlan] = useState<SlidePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const generate = async () => {
    setBusy(true); setMessage("");
    try { const result = await generateSlidePlan({ topic, level, routine, pageCount, contentLanguage, extraInstructions, agent });
      if (result.ok) setPlan(result.plan); else setMessage(result.message);
    } catch { setMessage("La connexion a été interrompue. Réessayez."); } finally { setBusy(false); }
  };
  const create = async () => {
    setBusy(true); setMessage("");
    try { const result = await createLessonFromPlan(plan); if (result.ok) router.push(`/studio/${result.lessonId}`); else setMessage(result.message); }
    catch { setMessage("La création a échoué. Réessayez."); } finally { setBusy(false); }
  };
  const regenerate = async (index: number) => {
    if (!plan) return;
    setBusy(true); setMessage("");
    try {
      const old = plan.pages[index];
      const result = await generatePagePlan({ lessonSummary: plan.title, brief: `${topic} — Remplace cette page : ${JSON.stringify(old)}`.slice(0,700), level, contentLanguage, agent });
      if (!result.ok) throw new Error(result.message);
      const next = slidePlanSchema.safeParse({ ...plan, pages: plan.pages.map((p,i) => i === index ? result.page : p) });
      if (!next.success) throw new Error("La page proposée invaliderait le plan. Réessayez.");
      setPlan(next.data);
    } catch(e) { setMessage(e instanceof Error ? e.message : "Régénération impossible."); } finally { setBusy(false); }
  };
  const remove = (index: number) => {
    if (!plan) return;
    const pages = plan.pages.filter((_, i) => i !== index).map(p => p.layout !== "menu" ? p : { ...p, items: p.items.filter(item => item.targetPageIndex !== index).map(item => ({ ...item, targetPageIndex: item.targetPageIndex > index ? item.targetPageIndex - 1 : item.targetPageIndex })) });
    const result = slidePlanSchema.safeParse({ ...plan, pages });
    if (result.success) { setPlan(result.data); setMessage(""); } else setMessage("Cette suppression invaliderait le plan (3 pages minimum, 2 destinations par menu).");
  };
  const warnings = useMemo(() => plan ? buildDocument(plan, { seed: "preview" }).report : [], [plan]);
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18282b]/50 p-4" onKeyDown={e => { if (e.key === "Escape" && !busy) onClose(); }}>
    <section ref={modal} onKeyDown={e => {
      if (e.key !== "Tab") return;
      const fields = modal.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]');
      if (!fields?.length) return;
      const first = fields[0]; const last = fields[fields.length - 1];
      if (e.shiftKey && window.document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && window.document.activeElement === last) { e.preventDefault(); first.focus(); }
    }} role="dialog" aria-modal="true" aria-labelledby="generate-title" className="max-h-full w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
      <div className="flex items-center justify-between"><h2 id="generate-title" className="flex items-center gap-2 text-xl font-black"><Sparkles size={22} /> Générer avec l’IA</h2><button type="button" disabled={busy} onClick={onClose} aria-label="Fermer" className="p-3"><X /></button></div>
      <p className="mt-2 text-sm text-slate-600">Décrivez votre leçon. Vérifiez le plan, puis complétez les interactions dans le Studio.</p>
      {!plan ? <form className="mt-5 space-y-4" onSubmit={e => { e.preventDefault(); void generate(); }}>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block text-sm font-bold">Sujet<textarea autoFocus required maxLength={1500} value={topic} onChange={e => setTopic(e.target.value)} className="teacher-input block w-full" rows={3} placeholder="Une leçon sur les animaux d’Australie, avec du vocabulaire et des questions de compréhension…" /></label>
          <div className="grid grid-cols-2 gap-4"><label className="text-sm font-bold">Niveau<select value={level} onChange={e => setLevel(e.target.value as typeof level)} className="teacher-input block w-full">{["6e", "5e", "4e", "3e"].map(v => <option key={v}>{v}</option>)}</select></label><label className="text-sm font-bold">Langue des contenus<select className="teacher-input block w-full" value={contentLanguage} onChange={e => setLanguage(e.target.value as "en" | "fr")}><option value="en">Anglais</option><option value="fr">Français</option></select></label></div>
          <label className="block text-sm font-bold">Routine<select className="teacher-input block w-full" value={routine} onChange={e => setRoutine(e.target.value as typeof routine)}>{routines.map((v, i) => <option key={v} value={v}>{labels[i]}</option>)}</select></label>
          <label className="block text-sm font-bold">{pageCount} pages<input className="mt-2 block w-full" type="range" min={3} max={12} value={pageCount} onChange={e => setPageCount(Number(e.target.value))} /></label>
          <label className="block text-sm font-bold">Précisions (facultatif)<textarea className="teacher-input block w-full" maxLength={1500} value={extraInstructions} onChange={e => setExtra(e.target.value)} /></label><AgentSelector />
        </fieldset><button disabled={busy || !topic.trim()} className="min-h-11 rounded-xl bg-[#285d68] px-5 font-bold text-white disabled:opacity-50">Générer le plan</button>
      </form> : <div className="mt-5">
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Vérifiez les contenus générés avant de les utiliser en classe. Les illustrations et zones proposées restent à compléter.</p>
        <h3 className="mt-4 text-lg font-black">{plan.title}</h3><ol className="my-4 space-y-2">{plan.pages.map((p, i) => <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"><div><p className="font-bold">{i + 1}. {p.heading ?? (p.layout === "question" ? p.prompt : "Page")}</p><p className="text-xs text-slate-500">{p.layout}</p></div><button type="button" disabled={busy} onClick={() => void regenerate(i)} className="text-sm font-bold text-[#285d68]">Régénérer</button><button type="button" disabled={busy || plan.pages.length <= 3} onClick={() => remove(i)} className="text-sm text-red-800 disabled:opacity-40">Supprimer</button></li>)}</ol>
        {warnings.length > 0 && <details className="mb-4 text-sm text-amber-900"><summary>{warnings.length} éléments à vérifier</summary><ul>{warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul></details>}
        <div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => setPlan(null)} className="min-h-11 rounded-xl border px-4 font-bold">Modifier la demande</button><button type="button" disabled={busy} onClick={() => void generate()} className="min-h-11 rounded-xl border px-4 font-bold">Régénérer le plan</button><button type="button" disabled={busy} onClick={() => void create()} className="min-h-11 rounded-xl bg-[#285d68] px-5 font-bold text-white">Créer la leçon</button></div>
      </div>}
      {busy && <p role="status" className="mt-4 flex items-center gap-2 text-sm"><Loader2 size={18} className="animate-spin" /> Préparation… Cela peut prendre une minute.</p>}
      {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{message}</p>}
    </section>
  </div>;
}
