"use client";

import {
  ArrowRight,
  BookOpenCheck,
  Check,
  Circle,
  ClipboardCheck,
  Clock3,
  FileStack,
  GraduationCap,
  Layers3,
  Sparkles,
  Target,
} from "lucide-react";
import type { UnitContent } from "@/lib/phase-one/types";
import {
  SESSION_PACK_ROLES,
  sessionPackCompleteness,
} from "@/lib/teacher-pack/sessionPack";

interface SequenceOverviewPanelProps {
  unit: UnitContent;
  onOpenPlan: () => void;
  onOpenSession: (sessionId: string) => void;
  onOpenMaterials: () => void;
}

export function SequenceOverviewPanel({
  unit,
  onOpenPlan,
  onOpenSession,
  onOpenMaterials,
}: SequenceOverviewPanelProps) {
  const sessionStatus = unit.sessions.map((session) => {
    const materials = (unit.materials ?? []).filter((material) => material.sessionId === session.id);
    return {
      session,
      ready: sessionPackCompleteness(materials),
      total: SESSION_PACK_ROLES.length,
    };
  });
  const sessionReady = sessionStatus.reduce((sum, item) => sum + item.ready, 0);
  const sessionExpected = Math.max(1, sessionStatus.length * SESSION_PACK_ROLES.length);
  const extraExpected =
    (unit.packPreferences?.includeAssessment === false ? 0 : 2) +
    (unit.packPreferences?.includeCorrection === false ? 0 : 1) +
    (unit.packPreferences?.includeRubric === false ? 0 : 1);
  const extraReady = (unit.materials ?? []).filter((material) =>
    ["assessment", "correction", "rubric", "final_task"].includes(material.role ?? ""),
  ).length;
  const ready = sessionReady + extraReady;
  const expected = sessionExpected + extraExpected;
  const percentage = Math.min(100, Math.round((ready / Math.max(1, expected)) * 100));
  const firstIncomplete = sessionStatus.find((item) => item.ready < item.total)?.session;
  const frame = unit.sequenceFrame;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-3xl border border-[#d8d5ca] bg-[#173b45] text-white shadow-sm">
        <div className="grid lg:grid-cols-[1.25fr_.75fr]">
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#b9dcdb]">
              <span>{frame?.culturalAxis || "Axe culturel à préciser"}</span>
              <span className="text-[#6fa0a5]">•</span>
              <span>{frame?.cefrEntry ?? "A1+"} → {frame?.cefrTarget ?? "A2"}</span>
              <span className="text-[#6fa0a5]">•</span>
              <span>{unit.sessions.length} séances</span>
            </div>
            <p className="mt-5 max-w-3xl font-serif text-2xl font-bold leading-tight text-white sm:text-3xl">
              {frame?.problematic || "Ajoutez la problématique qui donnera sa cohérence à toute la séquence."}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => firstIncomplete ? onOpenSession(firstIncomplete.id) : onOpenMaterials()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#d45b3f] px-4 py-2.5 text-sm font-black text-white shadow-sm hover:bg-[#bd4b33]"
              >
                <Sparkles size={16} /> {firstIncomplete ? "Compléter le dossier" : "Voir tous les documents"}
              </button>
              <button
                type="button"
                onClick={onOpenPlan}
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-bold text-white hover:bg-white/15"
              >
                <BookOpenCheck size={16} /> Modifier le cadrage
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 bg-[#204b55] p-6 lg:border-l lg:border-t-0 sm:p-8">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#b9dcdb]">Dossier de séquence</p>
            <div className="mt-4 flex items-end justify-between">
              <div>
                <span className="text-4xl font-black">{ready}</span>
                <span className="ml-1 text-sm font-bold text-[#b9dcdb]">/ {expected} documents</span>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">{percentage}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
              <div className="h-full rounded-full bg-[#efd184]" style={{ width: `${percentage}%` }} />
            </div>
            <p className="mt-4 text-xs leading-5 text-[#d2e6e5]">
              Les versions élève, PAP et correction sont comptées comme des documents distincts et alignés.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#285d68]">
            <Target size={15} /> Tâche finale
          </div>
          <h2 className="mt-3 text-xl font-black text-[#213337]">
            {unit.finalTask.title || "Tâche finale à définir"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#647174]">
            {unit.finalTask.brief || "Décrivez la mission concrète que les élèves devront accomplir."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#f1eee5] px-3 py-1 text-xs font-bold text-[#5f6869]">
              {unit.finalTask.performanceType || "Production à préciser"}
            </span>
            {unit.finalTask.standardExpectation ? (
              <span className="rounded-full bg-[#e8f3f1] px-3 py-1 text-xs font-bold text-[#285d68]">
                {unit.finalTask.standardExpectation}
              </span>
            ) : null}
          </div>
        </article>

        <article className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#285d68]">
            <GraduationCap size={15} /> Signature pédagogique
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-[#4f5d60]">
            {["Réactivation", "Input", "Compréhension", "Langue", "Production"].map((item, index) => (
              <div key={item} className="flex items-center gap-2">
                <span className="rounded-lg border border-[#d8d5ca] bg-[#f8f7f2] px-2.5 py-1.5">{item}</span>
                {index < 4 ? <ArrowRight size={13} className="text-[#a7aaa5]" /> : null}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm leading-6 text-[#647174]">
            Une seule progression, puis des accès différenciés. Le PAP conserve l’objectif et la tâche finale.
          </p>
        </article>
      </section>

      <section className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#285d68]">
              <Layers3 size={15} /> Parcours de la séquence
            </div>
            <h2 className="mt-1 text-xl font-black text-[#213337]">Chaque séance avance vers la tâche finale</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6c7779]">
            <Clock3 size={14} /> 45–55 minutes par séance
          </span>
        </div>

        {sessionStatus.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {sessionStatus.map(({ session, ready: sessionDocumentCount, total }, index) => {
              const complete = sessionDocumentCount === total;
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onOpenSession(session.id)}
                  className="group rounded-2xl border border-[#dedbd1] bg-[#fbfaf6] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#78aeb2] hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[#d45b3f]">
                      Séance {index + 1}
                    </span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full ${complete ? "bg-[#dcefdc] text-[#347047]" : "bg-[#ece9df] text-[#9b9b90]"}`}>
                      {complete ? <Check size={14} /> : <Circle size={12} />}
                    </span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 min-h-10 text-sm font-black leading-5 text-[#243337]">
                    {session.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[#6c7779]">
                    {session.objective || "Objectif à préciser"}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t border-[#e7e4dc] pt-3 text-[11px] font-bold">
                    <span className={complete ? "text-[#347047]" : "text-[#7c8485]"}>
                      {sessionDocumentCount} / {total} documents
                    </span>
                    <span className="inline-flex items-center gap-1 text-[#285d68] opacity-0 transition-opacity group-hover:opacity-100">
                      Ouvrir <ArrowRight size={13} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenPlan}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-[#b8b5aa] bg-[#fbfaf6] p-8 text-sm font-bold text-[#647174] hover:border-[#78aeb2] hover:text-[#285d68]"
          >
            <Sparkles size={17} /> Ajouter le parcours de séances
          </button>
        )}
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <PackStatusCard icon={ClipboardCheck} label="Évaluation" ready={(unit.materials ?? []).some((item) => item.role === "assessment")} />
        <PackStatusCard icon={FileStack} label="Correction" ready={(unit.materials ?? []).some((item) => item.role === "correction" && !item.sessionId)} />
        <PackStatusCard icon={Target} label="Tâche finale & grille" ready={(unit.materials ?? []).some((item) => item.role === "rubric" || item.role === "final_task")} />
      </section>
    </div>
  );
}

function PackStatusCard({
  icon: Icon,
  label,
  ready,
}: {
  icon: typeof ClipboardCheck;
  label: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[#d8d5ca] bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f1eee5] text-[#285d68]">
          <Icon size={17} />
        </span>
        <span className="text-sm font-black text-[#2c3c3f]">{label}</span>
      </div>
      <span className={`text-[11px] font-black ${ready ? "text-[#347047]" : "text-[#9a9487]"}`}>
        {ready ? "PRÊT" : "À CRÉER"}
      </span>
    </div>
  );
}
