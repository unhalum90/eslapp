"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Circle, ClipboardCheck, FileCheck2, FileText, GraduationCap, RefreshCw, Sparkles } from "lucide-react";
import { generateAssessmentPack } from "@/app/actions/generateAssessmentPack";
import { createId } from "@/lib/phase-one/domain";
import type { UnitContent, UnitMaterial } from "@/lib/phase-one/types";
import { useAiAgentStore } from "@/lib/store/useAiAgentStore";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import {
  ASSESSMENT_PACK_ROLES,
  assessmentRoleKey,
  buildAssessmentPackArtifacts,
} from "@/lib/teacher-pack/assessmentPack";
import { roleLabel } from "@/lib/teacher-pack/sessionPack";
import { MaterialCard } from "./MaterialsPanel";

const roleIcons = {
  assessment: ClipboardCheck,
  "assessment:pap": GraduationCap,
  correction: FileCheck2,
  rubric: FileText,
} as const;

export function AssessmentPackPanel({ unit }: { unit: UnitContent }) {
  const updateUnit = usePhaseOneStore((state) => state.updateUnit);
  const selectedAgent = useAiAgentStore((state) => state.selectedAgent);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const materials = useMemo(
    () =>
      (unit.materials ?? [])
        .filter((material) =>
          !material.sessionId && ["assessment", "correction", "rubric"].includes(material.role ?? ""),
        )
        .toSorted((left, right) => (left.sortOrder ?? 500) - (right.sortOrder ?? 500)),
    [unit.materials],
  );
  const materialsByRole = useMemo(
    () => new Map(materials.map((material) => [assessmentRoleKey(material), material])),
    [materials],
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState(materials[0]?.id ?? "");

  const selectedMaterial = materials.find((material) => material.id === selectedMaterialId) ?? materials[0];

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
      "Avant modification de l’évaluation",
    );
  };

  const generatePack = () => {
    setError("");
    startTransition(async () => {
      const frame = unit.sequenceFrame;
      const result = await generateAssessmentPack(
        {
          unit: {
            title: unit.title,
            theme: unit.theme,
            level: unit.level,
            problematic: frame?.problematic ?? unit.theme,
            culturalAxis: frame?.culturalAxis ?? "",
            cefrEntry: frame?.cefrEntry ?? null,
            cefrTarget: frame?.cefrTarget ?? null,
            grammarPoints: unit.grammarPoints,
            lexicalFields: frame?.lexicalFields ?? [],
            phonologyPoints: frame?.phonologyPoints ?? [],
            finalTask: unit.finalTask.title,
            finalTaskBrief: unit.finalTask.brief,
            successCriteria: unit.finalTask.successCriteria,
          },
          sessions: unit.sessions.map((session) => ({
            title: session.title,
            objective: session.objective,
            expectedProduction: session.expectedProduction ?? "",
          })),
        },
        selectedAgent,
      );
      if (!result.ok) {
        setError(result.message);
        return;
      }

      const timestamp = new Date().toISOString();
      const familyId = createId("assessment");
      const artifacts = buildAssessmentPackArtifacts({ unit, familyId, pack: result.pack }).map((artifact) => ({
        ...artifact,
        id: createId("material"),
        createdAt: timestamp,
        updatedAt: timestamp,
      }));
      const generatedKeys = new Set(ASSESSMENT_PACK_ROLES);
      const retained = (unit.materials ?? []).filter(
        (material) => material.sessionId || !generatedKeys.has(assessmentRoleKey(material) as (typeof ASSESSMENT_PACK_ROLES)[number]),
      );
      updateUnit(unit.id, { materials: [...retained, ...artifacts] }, "Avant génération de l’évaluation");
      setSelectedMaterialId(artifacts.find((artifact) => assessmentRoleKey(artifact) === "assessment")?.id ?? artifacts[0].id);
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#d45b3f]">Évaluation de fin de séquence</p>
            <h1 className="mt-1 font-serif text-3xl font-bold text-[#203337]">Standard, PAP, correction et grille — ensemble</h1>
            <p className="mt-2 text-sm leading-6 text-[#647174]">
              L’évaluation reprend uniquement ce qui a été travaillé dans les séances et conduit vers « {unit.finalTask.title || "la tâche finale"} ».
            </p>
          </div>
          <button
            type="button"
            onClick={generatePack}
            disabled={isPending}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d45b3f] px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-[#bd4b33] disabled:cursor-wait disabled:opacity-60"
          >
            {isPending ? <RefreshCw size={16} className="animate-spin" /> : materials.length ? <RefreshCw size={16} /> : <Sparkles size={16} />}
            {isPending ? "Construction de l’évaluation…" : materials.length ? "Régénérer le pack" : "Générer les 4 documents"}
          </button>
        </div>
        {error ? <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      </section>

      <section className="rounded-2xl border border-[#d8d5ca] bg-white p-4 shadow-sm">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {ASSESSMENT_PACK_ROLES.map((role) => {
            const material = materialsByRole.get(role);
            const Icon = roleIcons[role];
            const selected = material?.id === selectedMaterial?.id;
            const fallbackLabel = role === "assessment:pap" ? "Évaluation PAP" : role === "assessment" ? "Évaluation" : role === "correction" ? "Correction" : "Grille & autoévaluation";
            return (
              <button
                key={role}
                type="button"
                disabled={!material}
                onClick={() => material && setSelectedMaterialId(material.id)}
                className={`rounded-xl border p-3 text-left ${selected ? "border-[#285d68] bg-[#e8f3f1]" : material ? "border-[#ddd9cd] hover:border-[#78aeb2]" : "border-dashed border-[#ddd9cd] bg-[#f8f7f2] opacity-70"}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${material ? "bg-[#285d68] text-white" : "bg-[#e8e5dc] text-[#9d9c95]"}`}><Icon size={16} /></span>
                  <span className={material ? "text-[#347047]" : "text-[#aaa79d]"}>{material ? <Check size={16} /> : <Circle size={14} />}</span>
                </div>
                <p className="mt-3 text-sm font-black text-[#293a3d]">{material ? roleLabel(material) : fallbackLabel}</p>
                <p className="mt-1 text-[11px] text-[#6f7a7c]">{material ? `${material.printProfile?.targetPages ?? 2} page${material.printProfile?.targetPages === 1 ? "" : "s"} · prêt à relire` : "À générer"}</p>
              </button>
            );
          })}
        </div>
      </section>

      {selectedMaterial ? (
        <MaterialCard material={selectedMaterial} updateMaterial={updateMaterial} />
      ) : (
        <section className="rounded-3xl border border-dashed border-[#b9b5aa] bg-[#fbfaf6] px-6 py-14 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f3f1] text-[#285d68]"><ClipboardCheck size={21} /></span>
          <h2 className="mt-4 text-lg font-black text-[#243337]">Une évaluation sans effet de surprise</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#687577]">Les tâches, les aides PAP, les réponses et les critères sont construits depuis un seul modèle noté sur 20.</p>
        </section>
      )}
    </div>
  );
}
