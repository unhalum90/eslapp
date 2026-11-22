"use client";

import { useState } from "react";
import { BookOpenCheck, CheckCircle2, Plus, Save } from "lucide-react";
import { MAX_UNIT_SESSIONS } from "@/lib/phase-one/domain";
import type { CefrLevel, SequenceFrame, UnitContent } from "@/lib/phase-one/types";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import { CEFR_LEVELS, resolveSequenceFrame } from "@/lib/teacher-pack/profile";

function parseList(value: string): string[] {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

export function UnitPlanPanel({ unit }: { unit: UnitContent }) {
  const { updateUnit, updateFinalTask, addSession, updateSession, saveRevision } = usePhaseOneStore();
  const [versionLabel, setVersionLabel] = useState("");
  const frame = resolveSequenceFrame(unit.sequenceFrame);

  const updateFrame = (patch: Partial<SequenceFrame>, label: string) => {
    updateUnit(unit.id, { sequenceFrame: { ...frame, ...patch } }, label);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.15em] text-[#285d68]">
              <BookOpenCheck size={16} /> Plan de séquence
            </div>
            <h1 className="mt-1 font-serif text-3xl font-bold text-[#203337]">Le fil directeur avant les fiches</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#657276]">
              La problématique, le niveau CECRL et la tâche finale pilotent chaque séance et chaque document.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              value={versionLabel}
              onChange={(event) => setVersionLabel(event.target.value)}
              placeholder="Nom du jalon"
              aria-label="Nom du jalon"
              className="w-36 rounded-xl border border-[#ddd9cd] px-3 py-2 text-sm outline-none focus:border-[#78aeb2]"
            />
            <button
              type="button"
              onClick={() => {
                saveRevision(unit.id, versionLabel || "Jalon manuel");
                setVersionLabel("");
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#285d68] px-3 py-2 text-sm font-black text-white hover:bg-[#214d56]"
            >
              <Save size={15} /> Enregistrer
            </button>
          </div>
        </div>
      </section>

      <PlanSection number="01" title="Cadrage culturel et CECRL" description="Ce bloc apparaît dans la vue d’ensemble et guide les propositions de l’assistant.">
        <label className="field-label lg:col-span-2">
          Problématique
          <input
            key={`${unit.id}-${unit.updatedAt}-problematic`}
            defaultValue={frame.problematic}
            onBlur={(event) => updateFrame({ problematic: event.target.value }, "Avant modification de la problématique")}
            placeholder="How can…?"
            className="teacher-input text-base font-bold"
          />
        </label>
        <label className="field-label lg:col-span-2">
          Axe culturel
          <input
            key={`${unit.id}-${unit.updatedAt}-axis`}
            defaultValue={frame.culturalAxis}
            onBlur={(event) => updateFrame({ culturalAxis: event.target.value }, "Avant modification de l’axe culturel")}
            className="teacher-input"
          />
        </label>
        <label className="field-label">
          Niveau d’entrée
          <select
            value={frame.cefrEntry ?? "A1+"}
            onChange={(event) => updateFrame({ cefrEntry: event.target.value as CefrLevel }, "Avant modification du CECRL")}
            className="teacher-input"
          >
            {CEFR_LEVELS.map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>
        <label className="field-label">
          Niveau cible
          <select
            value={frame.cefrTarget ?? "A2"}
            onChange={(event) => updateFrame({ cefrTarget: event.target.value as CefrLevel }, "Avant modification du CECRL")}
            className="teacher-input"
          >
            {CEFR_LEVELS.map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>
        <label className="field-label">
          Période
          <input
            key={`${unit.id}-${unit.updatedAt}-period`}
            defaultValue={frame.period}
            onBlur={(event) => updateFrame({ period: event.target.value }, "Avant modification de la période")}
            placeholder="Septembre – octobre"
            className="teacher-input"
          />
        </label>
        <label className="field-label">
          Ordre dans l’année
          <input
            type="number"
            min={1}
            max={12}
            key={`${unit.id}-${unit.updatedAt}-order`}
            defaultValue={frame.sequenceOrder ?? ""}
            onBlur={(event) => updateFrame({ sequenceOrder: event.target.value ? Number(event.target.value) : null }, "Avant modification de l’ordre")}
            className="teacher-input"
          />
        </label>
      </PlanSection>

      <PlanSection number="02" title="Tâche finale" description="On construit les séances à rebours depuis cette performance.">
        <label className="field-label lg:col-span-2">
          Tâche
          <input
            key={`${unit.id}-${unit.updatedAt}-final-title`}
            defaultValue={unit.finalTask.title}
            onBlur={(event) => updateFinalTask(unit.id, { title: event.target.value })}
            className="teacher-input text-base font-bold"
          />
        </label>
        <label className="field-label">
          Forme de production
          <input
            key={`${unit.id}-${unit.updatedAt}-final-type`}
            defaultValue={unit.finalTask.performanceType}
            onBlur={(event) => updateFinalTask(unit.id, { performanceType: event.target.value })}
            className="teacher-input"
          />
        </label>
        <label className="field-label">
          Attendu standard
          <input
            key={`${unit.id}-${unit.updatedAt}-final-standard`}
            defaultValue={unit.finalTask.standardExpectation ?? ""}
            onBlur={(event) => updateFinalTask(unit.id, { standardExpectation: event.target.value })}
            placeholder="Ex. 120–180 words / 2 minutes"
            className="teacher-input"
          />
        </label>
        <label className="field-label lg:col-span-2">
          Consigne-mission élève
          <textarea
            key={`${unit.id}-${unit.updatedAt}-final-brief`}
            defaultValue={unit.finalTask.brief}
            onBlur={(event) => updateFinalTask(unit.id, { brief: event.target.value })}
            rows={3}
            className="teacher-input resize-y"
          />
        </label>
        <label className="field-label">
          Attendu PAP
          <input
            key={`${unit.id}-${unit.updatedAt}-final-pap`}
            defaultValue={unit.finalTask.papExpectation ?? ""}
            onBlur={(event) => updateFinalTask(unit.id, { papExpectation: event.target.value })}
            placeholder="Ex. 80–120 words / oral possible"
            className="teacher-input"
          />
        </label>
        <label className="field-label">
          Modalité alternative
          <input
            key={`${unit.id}-${unit.updatedAt}-final-mode`}
            defaultValue={unit.finalTask.alternativeMode ?? ""}
            onBlur={(event) => updateFinalTask(unit.id, { alternativeMode: event.target.value })}
            placeholder="Audio, dictée à l’adulte…"
            className="teacher-input"
          />
        </label>
        <label className="field-label lg:col-span-2">
          Critères de réussite — un par ligne
          <textarea
            key={`${unit.id}-${unit.updatedAt}-criteria`}
            defaultValue={unit.finalTask.successCriteria.join("\n")}
            onBlur={(event) => updateFinalTask(unit.id, { successCriteria: parseList(event.target.value) })}
            rows={4}
            className="teacher-input resize-y"
          />
        </label>
      </PlanSection>

      <section className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#d45b3f]">03 · Parcours</div>
            <h2 className="mt-1 text-xl font-black text-[#213337]">Séances de 45–55 minutes</h2>
            <p className="mt-1 text-sm text-[#687477]">Une question, un objectif observable et une production attendue par séance.</p>
          </div>
          <button
            type="button"
            onClick={() => addSession(unit.id)}
            disabled={unit.sessions.length >= MAX_UNIT_SESSIONS}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#285d68] px-3 py-2.5 text-sm font-black text-white hover:bg-[#214d56] disabled:opacity-40"
          >
            <Plus size={16} /> Ajouter une séance
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {unit.sessions.map((session, index) => (
            <article key={session.id} className="rounded-2xl border border-[#dedbd1] bg-[#fbfaf6] p-4">
              <div className="grid gap-3 lg:grid-cols-[auto_1fr_100px] lg:items-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#173b45] text-sm font-black text-white">{index + 1}</span>
                <input
                  key={`${session.id}-${unit.updatedAt}-title`}
                  defaultValue={session.title}
                  onBlur={(event) => updateSession(unit.id, session.id, { title: event.target.value })}
                  aria-label={`Titre de la séance ${index + 1}`}
                  className="border-0 bg-transparent text-base font-black text-[#243337] outline-none"
                />
                <label className="text-[10px] font-black uppercase tracking-wider text-[#7a8587]">
                  Durée
                  <input
                    type="number"
                    min={45}
                    max={55}
                    key={`${session.id}-${unit.updatedAt}-duration`}
                    defaultValue={session.durationMinutes}
                    onBlur={(event) => updateSession(unit.id, session.id, { durationMinutes: Number(event.target.value) })}
                    className="teacher-input mt-1 py-1.5 text-center"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <label className="field-label">
                  Question de séance
                  <input
                    key={`${session.id}-${unit.updatedAt}-question`}
                    defaultValue={session.question ?? ""}
                    onBlur={(event) => updateSession(unit.id, session.id, { question: event.target.value })}
                    placeholder="What can we learn from…?"
                    className="teacher-input"
                  />
                </label>
                <label className="field-label">
                  Objectif observable
                  <input
                    key={`${session.id}-${unit.updatedAt}-objective`}
                    defaultValue={session.objective}
                    onBlur={(event) => updateSession(unit.id, session.id, { objective: event.target.value })}
                    placeholder="Identifier, comparer, justifier…"
                    className="teacher-input"
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>

      <PlanSection number="04" title="Répertoire de langue" description="Le lexique et la phonologie restent visibles à côté des points grammaticaux.">
        <label className="field-label">
          Grammaire nouvelle — un point par ligne
          <textarea
            key={`${unit.id}-${unit.updatedAt}-grammar`}
            defaultValue={unit.grammarPoints.join("\n")}
            onBlur={(event) => updateUnit(unit.id, { grammarPoints: parseList(event.target.value) }, "Avant modification de la grammaire")}
            rows={5}
            className="teacher-input resize-y"
          />
        </label>
        <label className="field-label">
          Grammaire réactivée
          <textarea
            key={`${unit.id}-${unit.updatedAt}-reactivated`}
            defaultValue={frame.reactivatedGrammarPoints.join("\n")}
            onBlur={(event) => updateFrame({ reactivatedGrammarPoints: parseList(event.target.value) }, "Avant modification de la réactivation")}
            rows={5}
            className="teacher-input resize-y"
          />
        </label>
        <label className="field-label">
          Champs lexicaux
          <textarea
            key={`${unit.id}-${unit.updatedAt}-lexicon`}
            defaultValue={frame.lexicalFields.join("\n")}
            onBlur={(event) => updateFrame({ lexicalFields: parseList(event.target.value) }, "Avant modification du lexique")}
            rows={4}
            className="teacher-input resize-y"
          />
        </label>
        <label className="field-label">
          Phonologie
          <textarea
            key={`${unit.id}-${unit.updatedAt}-phonology`}
            defaultValue={frame.phonologyPoints.join("\n")}
            onBlur={(event) => updateFrame({ phonologyPoints: parseList(event.target.value) }, "Avant modification de la phonologie")}
            rows={4}
            className="teacher-input resize-y"
          />
        </label>
      </PlanSection>

      <div className="flex items-center gap-2 rounded-2xl border border-[#cde2d1] bg-[#edf6ed] px-4 py-3 text-xs leading-5 text-[#3f6549]">
        <CheckCircle2 size={16} className="shrink-0" />
        Les documents de séance utilisent automatiquement ce cadrage et restent liés à la tâche finale.
      </div>
    </div>
  );
}

function PlanSection({
  number,
  title,
  description,
  children,
}: {
  number: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#d8d5ca] bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-1 text-xs font-black tracking-[0.16em] text-[#d45b3f]">{number}</span>
        <div>
          <h2 className="text-xl font-black text-[#213337]">{title}</h2>
          <p className="mt-1 text-sm text-[#687477]">{description}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">{children}</div>
    </section>
  );
}
