"use client";

import { useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  BookOpenCheck,
  Check,
  Circle,
  FileCheck2,
  FileText,
  GraduationCap,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { generateSessionPack } from "@/app/actions/generateSessionPack";
import { createId } from "@/lib/phase-one/domain";
import type { UnitContent, UnitMaterial, UnitSession } from "@/lib/phase-one/types";
import { useAiAgentStore } from "@/lib/store/useAiAgentStore";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import {
  buildSessionPackArtifacts,
  materialRoleKey,
  roleLabel,
  SESSION_PACK_ROLES,
} from "@/lib/teacher-pack/sessionPack";
import { MaterialCard } from "./MaterialsPanel";

interface SessionPackPanelProps {
  unit: UnitContent;
  session: UnitSession;
  onBack: () => void;
}

const roleIcons = {
  teacher_guide: BookOpenCheck,
  student_sheet: FileText,
  "student_sheet:pap": GraduationCap,
  correction: FileCheck2,
} as const;

export function SessionPackPanel({ unit, session, onBack }: SessionPackPanelProps) {
  const updateUnit = usePhaseOneStore((state) => state.updateUnit);
  const selectedAgent = useAiAgentStore((state) => state.selectedAgent);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const sessionNumber = Math.max(1, unit.sessions.findIndex((item) => item.id === session.id) + 1);
  const sessionMaterials = useMemo(
    () =>
      (unit.materials ?? [])
        .filter((material) => material.sessionId === session.id)
        .toSorted((left, right) => (left.sortOrder ?? 100) - (right.sortOrder ?? 100)),
    [session.id, unit.materials],
  );
  const materialsByRole = useMemo(
    () => new Map(sessionMaterials.map((material) => [materialRoleKey(material), material])),
    [sessionMaterials],
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState(sessionMaterials[0]?.id ?? "");

  const selectedMaterial =
    sessionMaterials.find((material) => material.id === selectedMaterialId) ?? sessionMaterials[0];

  const updateMaterial = (materialId: string, patch: Partial<UnitMaterial>) => {
    const current = usePhaseOneStore.getState().units.find((candidate) => candidate.id === unit.id);
    if (!current) return;
    updateUnit(
      unit.id,
      {
        materials: (current.materials ?? []).map((material) =>
          material.id === materialId
            ? { ...material, ...patch, id: material.id, updatedAt: new Date().toISOString() }
            : material,
        ),
      },
      "Avant modification du document",
    );
  };

  const generatePack = () => {
    setError("");
    startTransition(async () => {
      const frame = unit.sequenceFrame;
      const result = await generateSessionPack(
        {
          unit: {
            title: unit.title,
            theme: unit.theme,
            level: unit.level,
            culturalAxis: frame?.culturalAxis ?? "",
            problematic: frame?.problematic ?? unit.theme,
            cefrEntry: frame?.cefrEntry ?? null,
            cefrTarget: frame?.cefrTarget ?? null,
            finalTask: unit.finalTask.title,
            finalTaskBrief: unit.finalTask.brief,
            grammarPoints: unit.grammarPoints,
            lexicalFields: frame?.lexicalFields ?? [],
          },
          session: {
            title: session.title,
            objective: session.objective,
            question: session.question ?? "",
            durationMinutes: session.durationMinutes,
            notes: session.notes,
          },
          sessionNumber,
          previousSessions: unit.sessions
            .slice(0, sessionNumber - 1)
            .map(({ title, objective }) => ({ title, objective })),
          sourceSummaries: unit.sourceReferences.map(({ title, kind, notes }) => ({
            title,
            kind,
            notes,
          })),
        },
        selectedAgent,
      );

      if (!result.ok) {
        setError(result.message);
        return;
      }

      const familyId = createId("pack");
      const timestamp = new Date().toISOString();
      const artifacts = buildSessionPackArtifacts({
        unit,
        session,
        sessionNumber,
        familyId,
        pack: result.pack,
      }).map((artifact) => ({
        ...artifact,
        id: createId("material"),
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
      const generatedRoleKeys = new Set(SESSION_PACK_ROLES);
      const retained = (unit.materials ?? []).filter(
        (material) =>
          material.sessionId !== session.id || !generatedRoleKeys.has(materialRoleKey(material) as (typeof SESSION_PACK_ROLES)[number]),
      );

      updateUnit(
        unit.id,
        { materials: [...retained, ...artifacts] },
        `Avant génération de la séance ${sessionNumber}`,
      );
      setSelectedMaterialId(artifacts.find((artifact) => materialRoleKey(artifact) === "student_sheet")?.id ?? artifacts[0].id);
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.13em] text-[#617174] hover:text-[#285d68]"
        >
          <ArrowLeft size={14} /> Vue d’ensemble
        </button>
        <div className="mt-4 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#d45b3f]">
              Séance {sessionNumber} · {session.durationMinutes} minutes
            </p>
            <h1 className="mt-1 font-serif text-3xl font-bold text-[#203337]">{session.title}</h1>
            <p className="mt-2 text-sm leading-6 text-[#647174]">
              {session.objective || "Ajoutez un objectif observable avant de générer les documents."}
            </p>
            {session.question ? (
              <p className="mt-3 rounded-xl border-l-4 border-[#78aeb2] bg-[#e8f3f1] px-4 py-3 text-sm font-bold text-[#285d68]">
                {session.question}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={generatePack}
            disabled={isPending}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d45b3f] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#bd4b33] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? <RefreshCw size={16} className="animate-spin" /> : sessionMaterials.length ? <RefreshCw size={16} /> : <Sparkles size={16} />}
            {isPending ? "Construction du dossier…" : sessionMaterials.length ? "Régénérer les 4 documents" : "Générer les 4 documents"}
          </button>
        </div>
        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[#d8d5ca] bg-white p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {SESSION_PACK_ROLES.map((role) => {
            const material = materialsByRole.get(role);
            const Icon = roleIcons[role];
            const selected = material?.id === selectedMaterial?.id;
            return (
              <button
                key={role}
                type="button"
                disabled={!material}
                onClick={() => material && setSelectedMaterialId(material.id)}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  selected
                    ? "border-[#285d68] bg-[#e8f3f1]"
                    : material
                      ? "border-[#ddd9cd] bg-white hover:border-[#78aeb2]"
                      : "border-dashed border-[#ddd9cd] bg-[#f8f7f2] opacity-70"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${material ? "bg-[#285d68] text-white" : "bg-[#e8e5dc] text-[#9d9c95]"}`}>
                    <Icon size={16} />
                  </span>
                  <span className={material ? "text-[#347047]" : "text-[#aaa79d]"}>
                    {material ? <Check size={16} /> : <Circle size={14} />}
                  </span>
                </div>
                <p className="mt-3 text-sm font-black text-[#293a3d]">
                  {material ? roleLabel(material) : role === "student_sheet:pap" ? "Version PAP" : role === "teacher_guide" ? "Fiche professeur" : role === "student_sheet" ? "Fiche élève" : "Correction"}
                </p>
                <p className="mt-1 text-[11px] text-[#6f7a7c]">
                  {material ? `${material.printProfile?.targetPages ?? 2} pages · prêt à relire` : "À générer"}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {selectedMaterial ? (
        <MaterialCard material={selectedMaterial} updateMaterial={updateMaterial} />
      ) : (
        <section className="rounded-3xl border border-dashed border-[#b9b5aa] bg-[#fbfaf6] px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f3f1] text-[#285d68]">
            <Sparkles size={21} />
          </span>
          <h2 className="mt-4 text-lg font-black text-[#243337]">Un seul clic crée un dossier aligné</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687577]">
            La fiche professeur, la fiche élève, la version PAP et la correction partageront les mêmes tâches et la même numérotation.
          </p>
        </section>
      )}
    </div>
  );
}
