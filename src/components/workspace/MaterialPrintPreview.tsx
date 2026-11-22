"use client";

import { ArrowLeft, Download, FileWarning } from "lucide-react";
import Link from "next/link";
import { sanitizeRichHtml } from "@/lib/materials/richText";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import { roleLabel } from "@/lib/teacher-pack/sessionPack";

export function MaterialPrintPreview({ materialId }: { materialId: string }) {
  const units = usePhaseOneStore((state) => state.units);

  const unit = units.find((candidate) =>
    (candidate.materials ?? []).some((material) => material.id === materialId),
  );
  const material = unit?.materials.find((candidate) => candidate.id === materialId);

  if (!material || !unit) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f4f2eb] p-6">
        <div className="max-w-md rounded-2xl border border-[#ddd9cd] bg-white p-8 text-center shadow-sm">
          <FileWarning className="mx-auto text-[#d45b3f]" />
          <h1 className="mt-4 text-xl font-black text-[#243337]">Document introuvable</h1>
          <p className="mt-2 text-sm text-[#697679]">
            Revenez au dossier de séquence et ouvrez à nouveau l’aperçu.
          </p>
          <Link href="/workspace" className="mt-5 inline-flex rounded-xl bg-[#285d68] px-4 py-2.5 text-sm font-bold text-white">
            Retour au dossier
          </Link>
        </div>
      </main>
    );
  }

  const orientation = material.printProfile?.orientation ?? "portrait";
  const html = sanitizeRichHtml(material.studentContent);

  return (
    <main className="print-preview-shell min-h-screen bg-[#dfddd6] px-3 pb-12 pt-3 sm:px-6 sm:pt-5">
      <div className="print-preview-toolbar mx-auto mb-4 flex max-w-[1100px] flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cbc7bc] bg-white px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/workspace"
            aria-label="Retour au dossier"
            className="rounded-lg border border-[#ddd9cd] p-2 text-[#5d696c] hover:bg-[#f4f2eb]"
          >
            <ArrowLeft size={17} />
          </Link>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#285d68]">
              {roleLabel(material)} · {material.printProfile?.targetPages ?? 2} pages ciblées
            </p>
            <p className="truncate text-sm font-black text-[#243337]">{material.title}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-xl bg-[#d45b3f] px-4 py-2.5 text-sm font-black text-white hover:bg-[#bd4b33]"
        >
          <Download size={16} /> Imprimer / enregistrer en PDF
        </button>
      </div>

      <article
        className={`teacher-paper teacher-paper-${orientation} teacher-paper-${material.printProfile?.template ?? "classic"}`}
        aria-label={`Aperçu de ${material.title}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </main>
  );
}
