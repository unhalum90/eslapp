"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FileText, Gamepad2, Images, Printer, Sparkles } from "lucide-react";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import type { UnitContent, UnitMaterial } from "@/lib/phase-one/types";
import { buildGoogleDocumentHtml, toRichHtml } from "@/lib/materials/richText";
import { GoogleDriveButton } from "./GoogleDriveButton";
import { RichDocumentEditor } from "./RichDocumentEditor";
import { roleLabel } from "@/lib/teacher-pack/sessionPack";

interface MaterialCardProps {
  material: UnitMaterial;
  updateMaterial: (materialId: string, patch: Partial<UnitMaterial>) => void;
}

export function MaterialCard({ material, updateMaterial }: MaterialCardProps) {
  const Icon = material.kind === "worksheet" ? FileText : Gamepad2;
  const [studentHtml, setStudentHtml] = useState(() => toRichHtml(material.studentContent));
  const [teacherNotesHtml, setTeacherNotesHtml] = useState(() => toRichHtml(material.teacherNotes));
  const [instructions, setInstructions] = useState(material.instructions);

  const getGoogleDocument = useCallback(
    () =>
      buildGoogleDocumentHtml({
        title: material.title,
        purpose: material.purpose,
        instructions,
        studentHtml,
        teacherNotesHtml: material.teacherNotes ? teacherNotesHtml : "",
        imageUrls: material.imageUrls,
        role: material.role,
        adaptation: material.adaptation,
        printProfile: material.printProfile,
      }),
    [instructions, material, studentHtml, teacherNotesHtml],
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Icon size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#285d68]">
                {roleLabel(material)}
              </span>
              <input
                key={`${material.id}-${material.updatedAt}-title`}
                defaultValue={material.title}
                onBlur={(event) => {
                  const title = event.target.value.trim();
                  if (title && title !== material.title) updateMaterial(material.id, { title });
                }}
                aria-label={`${material.kind} title`}
                className="mt-0.5 w-full border-0 bg-transparent p-0 text-lg font-black text-slate-950 outline-none"
              />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-start gap-2">
            <Link
              href={`/workspace/print/${material.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 hover:border-[#78aeb2] hover:text-[#285d68]"
            >
              <Printer size={14} /> Aperçu A4
            </Link>
            {material.imageUrls.length > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
                <Images size={11} /> {material.imageUrls.length}
              </span>
            ) : null}
            <GoogleDriveButton
              materialId={material.id}
              documentName={material.title}
              getHtml={getGoogleDocument}
            />
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-600">{material.purpose}</p>
      </header>

      {material.imageUrls.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 border-b border-slate-100 p-4 sm:grid-cols-3">
          {material.imageUrls.map((imageUrl, index) => (
            <Image
              key={`${material.id}-image-${index}`}
              src={imageUrl}
              alt={`${material.title} visual ${index + 1}`}
              width={360}
              height={240}
              unoptimized
              className="aspect-[4/3] w-full rounded-lg border border-slate-200 object-cover"
            />
          ))}
        </div>
      ) : null}

      <div className="space-y-5 p-5">
        <label className="block text-xs font-black uppercase tracking-wider text-slate-500">
          Student instructions
          <textarea
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            onBlur={(event) => {
              if (event.target.value !== material.instructions) {
                updateMaterial(material.id, { instructions: event.target.value });
              }
            }}
            rows={3}
            className="mt-2 w-full resize-y rounded-xl border border-slate-200 p-3 text-sm font-normal normal-case tracking-normal text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </label>

        <section aria-labelledby={`${material.id}-student-document`}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3
              id={`${material.id}-student-document`}
              className="text-xs font-black uppercase tracking-wider text-slate-500"
            >
              Classroom-ready document
            </h3>
            <span className="text-[11px] text-slate-400">Edit it just like a normal document</span>
          </div>
          <RichDocumentEditor
            value={studentHtml}
            onChange={setStudentHtml}
            onCommit={(html) => {
              setStudentHtml(html);
              if (html !== material.studentContent) {
                updateMaterial(material.id, { studentContent: html });
              }
            }}
            label={`${material.title} student document`}
          />
        </section>

        {material.teacherNotes ? (
          <section aria-labelledby={`${material.id}-teacher-notes`}>
            <h3
              id={`${material.id}-teacher-notes`}
              className="mb-2 text-xs font-black uppercase tracking-wider text-amber-700"
            >
              Teacher notes / answer key
            </h3>
            <RichDocumentEditor
              value={teacherNotesHtml}
              onChange={setTeacherNotesHtml}
              onCommit={(html) => {
                setTeacherNotesHtml(html);
                if (html !== material.teacherNotes) {
                  updateMaterial(material.id, { teacherNotes: html });
                }
              }}
              label={`${material.title} teacher notes`}
              tone="teacher"
            />
          </section>
        ) : null}
      </div>
    </article>
  );
}

export function MaterialsPanel({ unit }: { unit: UnitContent }) {
  const updateUnit = usePhaseOneStore((state) => state.updateUnit);
  const materials = unit.materials ?? [];

  const updateMaterial = (materialId: string, patch: Partial<UnitMaterial>) => {
    updateUnit(
      unit.id,
      {
        materials: materials.map((material) =>
          material.id === materialId
            ? { ...material, ...patch, id: material.id, updatedAt: new Date().toISOString() }
            : material,
        ),
      },
      "Before material edit",
    );
  };

  if (materials.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-indigo-300 bg-indigo-50 p-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm">
          <Sparkles size={22} />
        </div>
        <h2 className="mt-4 text-lg font-black text-slate-950">Build the first unit material</h2>
        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
          Ask Unit Architect to create a classroom-ready worksheet or activity. Review its content,
          compare any requested visuals, then apply it here.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      {materials.map((material) => (
        <MaterialCard key={material.id} material={material} updateMaterial={updateMaterial} />
      ))}
    </div>
  );
}
