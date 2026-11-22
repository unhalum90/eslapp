"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { unzipSync } from "fflate";
import { AlertTriangle, CheckCircle2, FileArchive, Info, Loader2, X } from "lucide-react";
import { createStudioAssetUpload, importStudioLesson, saveStudioLesson } from "@/app/actions/studio";
import { createClient } from "@/lib/supabase/client";
import { convertGenially, extractGeniallyJson, type ConversionResult, type ImportIssue } from "@/lib/studio/genially/convert";
import { matchZipEntry } from "@/lib/studio/genially/zip";
import { optimizeImage, probeAudio, probeImage, rasterizeImportSvg } from "@/lib/studio/media";
import type { StudioDocument } from "@/lib/studio/types";

type Step =
  | { kind: "pick" }
  | { kind: "reading"; name: string }
  | { kind: "analyzed"; result: ConversionResult; entries: Record<string, Uint8Array>; root: string; fileName: string }
  | { kind: "importing"; label: string; done: number; total: number }
  | { kind: "done"; lessonId: string; issues: ImportIssue[]; result: ConversionResult; mediaFailures: string[]; resizedCount: number }
  | { kind: "error"; message: string };

const SEVERITY_ORDER: ImportIssue["severity"][] = ["error", "warning", "info"];

export function GeniallyImportDialog({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const inputRef = useRef<HTMLInputElement>(null);
  if (!open) return null;

  const close = () => {
    if (step.kind === "importing") return;
    setStep({ kind: "pick" });
    onClose();
  };

  const analyze = async (file: File) => {
    setStep({ kind: "reading", name: file.name });
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const entries = unzipSync(bytes, { filter: (entry) => !entry.name.includes("__MACOSX/") && !entry.name.endsWith("/") });
      const htmlKey = Object.keys(entries).find((key) => /(^|\/)genially\.html$/.test(key));
      if (!htmlKey) throw new Error("Ce zip ne contient pas de fichier genially.html. Exportez la présentation depuis Genially au format HTML.");
      const root = htmlKey.slice(0, htmlKey.length - "genially.html".length);
      const html = new TextDecoder("utf-8").decode(entries[htmlKey]);
      const data = extractGeniallyJson(html);
      const result = convertGenially(data);
      const entryNames = Object.keys(entries);
      for (const media of result.media) {
        if (!media.inlineSvg && !matchZipEntry(entryNames, root, media.zipPath)) {
          result.issues.push({ severity: "warning", code: "missing-media", message: `Média absent ou ambigu dans le zip : ${media.name}.` });
        }
      }
      setStep({ kind: "analyzed", result, entries, root, fileName: file.name });
    } catch (error) {
      setStep({ kind: "error", message: error instanceof Error ? error.message : "Lecture du zip impossible." });
    }
  };

  const runImport = async () => {
    if (step.kind !== "analyzed") return;
    const { result, entries, root } = step;
    const supabase = createClient();
    if (!supabase) {
      setStep({ kind: "error", message: "Supabase n'est pas configuré dans le navigateur." });
      return;
    }
    const doc: StudioDocument = structuredClone(result.document);
    const total = result.media.length;
    const entryNames = Object.keys(entries);
    setStep({ kind: "importing", label: "Création de la leçon…", done: 0, total });
    const created = await importStudioLesson(doc);
    if (!created.ok) {
      setStep({ kind: "error", message: created.message });
      return;
    }
    const lessonId = created.lessonId;
    const mediaFailures: string[] = [];
    let resizedCount = 0;

    for (let index = 0; index < result.media.length; index += 1) {
      const request = result.media[index];
      setStep({ kind: "importing", label: `Média ${index + 1}/${total} : ${request.name}`, done: index, total });
      const entryName = matchZipEntry(entryNames, root, request.zipPath);
      const bytes = request.inlineSvg ? new TextEncoder().encode(request.inlineSvg) : entryName ? entries[entryName] : undefined;
      if (!bytes) {
        mediaFailures.push(`${request.name} (absent du zip)`);
        continue;
      }
      try {
        let blob: Blob = new Blob([bytes as BlobPart], { type: request.mime });
        let mime = request.mime;
        let name = request.name;
        let width: number | undefined;
        let height: number | undefined;
        let duration: number | undefined;
        if (request.kind === "image") {
          const optimized = mime === "image/svg+xml"
            ? await rasterizeImportSvg(blob, name)
            : await optimizeImage(blob, mime, name);
          blob = optimized.blob;
          mime = optimized.mime;
          name = optimized.name;
          width = optimized.width;
          height = optimized.height;
          if (optimized.resized) resizedCount += 1;
          if (!width || !height) {
            const probed = await probeImage(blob);
            if (probed) ({ width, height } = probed);
          }
        } else {
          const probed = await probeAudio(blob);
          if (probed) duration = Math.round(probed * 10) / 10;
        }
        const ticket = await createStudioAssetUpload(lessonId, { name, mime, bytes: blob.size });
        if (!ticket.ok) throw new Error(ticket.message);
        const { error } = await supabase.storage.from(ticket.bucket).uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: mime, upsert: true });
        if (error) throw new Error(error.message);
        const asset = doc.assets[request.assetId];
        if (asset) {
          asset.path = ticket.path;
          asset.bytes = blob.size;
          asset.mime = mime;
          asset.name = name;
          if (width && height) {
            asset.width = width;
            asset.height = height;
          }
          if (duration) asset.duration = duration;
        }
      } catch (error) {
        mediaFailures.push(`${request.name} (${error instanceof Error ? error.message : "échec"})`);
      }
    }

    setStep({ kind: "importing", label: "Enregistrement de la leçon…", done: total, total });
    const saved = await saveStudioLesson(lessonId, doc, "", 1);
    if (!saved.ok) {
      setStep({ kind: "error", message: "message" in saved ? saved.message : "La leçon a été créée mais les médias n'ont pas pu être enregistrés. Ouvrez-la et réessayez l'import." });
      onImported();
      return;
    }
    onImported();
    setStep({ kind: "done", lessonId, issues: result.issues, result, mediaFailures, resizedCount });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18282b]/50 p-4" onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="genially-import-title" className="max-h-full w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="genially-import-title" className="text-xl font-black">Importer un Genially</h2>
            <p className="mt-1 text-sm text-slate-600">Depuis Genially : Partager → Télécharger → HTML. Déposez le fichier .zip obtenu.</p>
          </div>
          <button type="button" aria-label="Fermer" disabled={step.kind === "importing"} onClick={close} className="rounded-full border border-slate-300 p-2 hover:bg-slate-100 disabled:opacity-40"><X size={18} /></button>
        </div>

        {step.kind === "pick" || step.kind === "error" ? (
          <div className="mt-5">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 px-4 py-10 text-center hover:border-[#285d68] hover:bg-[#e8f3f1]">
              <FileArchive className="text-[#285d68]" size={32} />
              <span className="text-sm font-bold text-[#18282b]">Choisir le fichier .zip exporté</span>
              <span className="text-xs text-slate-500">Les images et audios du zip sont importés. Les vidéos YouTube et contenus Google Drive deviennent des liens.</span>
              <input ref={inputRef} type="file" accept=".zip,application/zip" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void analyze(file); }} />
            </label>
            {step.kind === "error" ? <p role="alert" className="mt-4 rounded-lg bg-orange-50 px-3 py-2 text-sm font-semibold text-[#a33d25]">{step.message}</p> : null}
          </div>
        ) : null}

        {step.kind === "reading" ? (
          <p className="mt-6 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="animate-spin" size={16} /> Lecture de {step.name}…</p>
        ) : null}

        {step.kind === "analyzed" ? (
          <div className="mt-5">
            <p className="text-base font-black text-[#18282b]">{step.result.sourceName}</p>
            <StatsGrid result={step.result} />
            <IssueList issues={step.result.issues} />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-bold" onClick={() => setStep({ kind: "pick" })}>Autre fichier</button>
              <button type="button" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#285d68] px-4 text-sm font-bold text-white" onClick={() => void runImport()}>
                Importer dans le Studio
              </button>
            </div>
          </div>
        ) : null}

        {step.kind === "importing" ? (
          <div className="mt-6">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-700"><Loader2 className="animate-spin" size={16} /> {step.label}</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full bg-[#285d68] transition-all" style={{ width: `${step.total ? Math.round((step.done / step.total) * 100) : 100}%` }} />
            </div>
            <p className="mt-2 text-xs text-slate-500">Ne fermez pas cette fenêtre pendant l&apos;import.</p>
          </div>
        ) : null}

        {step.kind === "done" ? (
          <div className="mt-5">
            <p className="flex items-center gap-2 text-base font-black text-emerald-700"><CheckCircle2 size={18} /> Import terminé</p>
            <StatsGrid result={step.result} />
            {step.resizedCount ? <p className="mt-2 text-xs text-slate-500">{step.resizedCount} image(s) redimensionnée(s) à 1600 px pour un chargement rapide en classe.</p> : null}
            {step.mediaFailures.length ? (
              <div className="mt-3 rounded-2xl border border-[#d45b3f]/40 bg-orange-50 p-3 text-sm">
                <p className="font-black text-[#a33d25]">Médias non importés</p>
                <ul className="mt-1 list-disc pl-5">{step.mediaFailures.map((failure) => <li key={failure}>{failure}</li>)}</ul>
              </div>
            ) : null}
            <IssueList issues={step.issues} />
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-bold" onClick={close}>Fermer</button>
              <button type="button" className="inline-flex min-h-10 items-center rounded-lg bg-[#285d68] px-4 text-sm font-bold text-white" onClick={() => router.push(`/studio/${step.lessonId}`)}>Ouvrir la leçon</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StatsGrid({ result }: { result: ConversionResult }) {
  const { stats, media } = result;
  const cells: [string, number][] = [
    ["Pages", stats.pages],
    ["Éléments", stats.elements],
    ["Zones cliquables", stats.hotspots],
    ["Étiquettes", stats.tooltips],
    ["Liens de page", stats.navigations],
    ["Audios", stats.audio],
    ["Médias à importer", media.length],
    ["Contenus remplacés", stats.embedsReplaced],
  ];
  return (
    <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {cells.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-[#f4f2eb] px-3 py-2">
          <dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</dt>
          <dd className="text-lg font-black text-[#18282b]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function IssueList({ issues }: { issues: ImportIssue[] }) {
  const [expanded, setExpanded] = useState(false);
  if (issues.length === 0) return <p className="mt-3 text-sm font-semibold text-emerald-700">Rien à signaler.</p>;
  const sorted = [...issues].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  const grouped = new Map<string, { issue: ImportIssue; count: number }>();
  for (const issue of sorted) {
    const key = `${issue.severity}:${issue.code}:${issue.message}`;
    const entry = grouped.get(key);
    if (entry) entry.count += 1;
    else grouped.set(key, { issue, count: 1 });
  }
  const list = [...grouped.values()];
  const visible = expanded ? list : list.slice(0, 8);
  return (
    <div className="mt-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-500">À vérifier après l&apos;import</p>
      <ul className="mt-1 max-h-64 space-y-1 overflow-auto text-sm">
        {visible.map(({ issue, count }, index) => (
          <li key={index} className="flex items-start gap-2 rounded-lg px-2 py-1">
            {issue.severity === "warning" || issue.severity === "error" ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" /> : <Info size={16} className="mt-0.5 shrink-0 text-[#285d68]" />}
            <span>{issue.message}{count > 1 ? ` (×${count})` : ""}</span>
          </li>
        ))}
      </ul>
      {list.length > 8 ? (
        <button type="button" className="mt-1 text-xs font-bold text-[#285d68] underline-offset-2 hover:underline" onClick={() => setExpanded((value) => !value)}>
          {expanded ? "Réduire" : `Voir les ${list.length - 8} autres`}
        </button>
      ) : null}
    </div>
  );
}
