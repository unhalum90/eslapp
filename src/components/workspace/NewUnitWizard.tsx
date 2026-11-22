"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Check, FileStack, Sparkles, X } from "lucide-react";
import type {
  CefrLevel,
  LevelCode,
  NewUnitInput,
  SequencePackPreferences,
} from "@/lib/phase-one/types";
import { CEFR_LEVELS, DEFAULT_PACK_PREFERENCES } from "@/lib/teacher-pack/profile";

const LEVELS: LevelCode[] = ["6e", "5e", "4e", "3e", "SEGPA"];

interface NewUnitWizardProps {
  initialLevel: LevelCode;
  initialSchoolYear: string;
  onClose: () => void;
  onComplete: (input: NewUnitInput) => void;
}

export function NewUnitWizard({
  initialLevel,
  initialSchoolYear,
  onClose,
  onComplete,
}: NewUnitWizardProps) {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState<LevelCode>(initialLevel);
  const [schoolYear, setSchoolYear] = useState(initialSchoolYear);
  const [cefrEntry, setCefrEntry] = useState<CefrLevel>("A1+");
  const [cefrTarget, setCefrTarget] = useState<CefrLevel>("A2");
  const [culturalAxis, setCulturalAxis] = useState("");
  const [problematic, setProblematic] = useState("");
  const [theme, setTheme] = useState("");
  const [finalTask, setFinalTask] = useState("");
  const [performanceType, setPerformanceType] = useState("Production orale");
  const [studentBrief, setStudentBrief] = useState("");
  const [sessionCount, setSessionCount] = useState(6);
  const [preferences, setPreferences] = useState<SequencePackPreferences>({
    ...DEFAULT_PACK_PREFERENCES,
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const finish = () => {
    if (!title.trim()) return;
    onComplete({
      title: title.trim(),
      level,
      schoolYear: schoolYear.trim() || initialSchoolYear,
      theme: theme.trim(),
      sessionCount,
      sequenceFrame: {
        culturalAxis: culturalAxis.trim(),
        problematic: problematic.trim(),
        cefrEntry,
        cefrTarget,
      },
      packPreferences: preferences,
      finalTask: {
        title: finalTask.trim(),
        performanceType,
        brief: studentBrief.trim(),
        successCriteria: [],
      },
    });
  };

  const togglePreference = (key: keyof SequencePackPreferences) => {
    if (key === "printTemplate") return;
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-sequence-title"
        className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] bg-[#f8f7f2] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[#ddd9cd] bg-white px-6 py-5 sm:px-8">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#285d68]">
              <FileStack size={15} /> Nouveau dossier de séquence
            </div>
            <h2 id="new-sequence-title" className="mt-1 text-2xl font-black text-[#18282b]">
              Une fiche de cadrage, puis l’app construit le dossier
            </h2>
            <p className="mt-1 text-sm text-[#657276]">
              Laissez un champ vide si vous souhaitez que l’assistant fasse une proposition.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-8">
          <div className="grid gap-5 lg:grid-cols-[1.05fr_.95fr]">
            <div className="space-y-5">
              <BriefSection number="01" title="Cadre de la séquence">
                <label className="field-label lg:col-span-2">
                  Titre de travail
                  <input
                    autoFocus
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex. The mystery of Blackwood Manor"
                    className="teacher-input text-base font-bold"
                  />
                </label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2">
                  <label className="field-label">
                    Niveau
                    <select
                      value={level}
                      onChange={(event) => setLevel(event.target.value as LevelCode)}
                      className="teacher-input"
                    >
                      {LEVELS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="field-label">
                    Année
                    <input
                      value={schoolYear}
                      onChange={(event) => setSchoolYear(event.target.value)}
                      className="teacher-input"
                    />
                  </label>
                  <label className="field-label">
                    CECRL départ
                    <select
                      value={cefrEntry}
                      onChange={(event) => setCefrEntry(event.target.value as CefrLevel)}
                      className="teacher-input"
                    >
                      {CEFR_LEVELS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="field-label">
                    CECRL cible
                    <select
                      value={cefrTarget}
                      onChange={(event) => setCefrTarget(event.target.value as CefrLevel)}
                      className="teacher-input"
                    >
                      {CEFR_LEVELS.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                </div>
                <label className="field-label lg:col-span-2">
                  Axe culturel
                  <input
                    value={culturalAxis}
                    onChange={(event) => setCulturalAxis(event.target.value)}
                    placeholder="Ex. Rencontres avec d’autres cultures"
                    className="teacher-input"
                  />
                </label>
                <label className="field-label lg:col-span-2">
                  Problématique
                  <input
                    value={problematic}
                    onChange={(event) => setProblematic(event.target.value)}
                    placeholder="Ex. How can clues reveal the truth?"
                    className="teacher-input"
                  />
                </label>
                <label className="field-label lg:col-span-2">
                  Univers / thème
                  <textarea
                    value={theme}
                    onChange={(event) => setTheme(event.target.value)}
                    rows={2}
                    placeholder="Décor, période, supports ou angle culturel…"
                    className="teacher-input resize-y"
                  />
                </label>
              </BriefSection>

              <BriefSection number="02" title="Tâche finale">
                <label className="field-label lg:col-span-2">
                  Ce que les élèves devront accomplir
                  <input
                    value={finalTask}
                    onChange={(event) => setFinalTask(event.target.value)}
                    placeholder="Ex. Solve the case and defend your conclusion"
                    className="teacher-input"
                  />
                </label>
                <label className="field-label">
                  Forme
                  <select
                    value={performanceType}
                    onChange={(event) => setPerformanceType(event.target.value)}
                    className="teacher-input"
                  >
                    <option>Production orale</option>
                    <option>Interaction en binôme</option>
                    <option>Production écrite</option>
                    <option>Podcast ou vidéo</option>
                    <option>Projet collaboratif</option>
                  </select>
                </label>
                <label className="field-label">
                  Nombre de séances
                  <select
                    value={sessionCount}
                    onChange={(event) => setSessionCount(Number(event.target.value))}
                    className="teacher-input"
                  >
                    {[4, 5, 6, 7, 8].map((count) => <option key={count}>{count}</option>)}
                  </select>
                </label>
                <label className="field-label lg:col-span-2">
                  Consigne-mission destinée aux élèves
                  <textarea
                    value={studentBrief}
                    onChange={(event) => setStudentBrief(event.target.value)}
                    rows={3}
                    placeholder="You are detectives. Study the evidence, question the witnesses and explain who is responsible."
                    className="teacher-input resize-y"
                  />
                </label>
              </BriefSection>
            </div>

            <div className="space-y-5">
              <BriefSection number="03" title="Contenu du dossier">
                <div className="grid gap-2 lg:col-span-2">
                  {(
                    [
                      ["includeTeacherGuides", "Fiches professeur", "déroulés minutés, trace et devoirs"],
                      ["includeStudentSheets", "Fiches élève", "documents prêts à photocopier"],
                      ["includePap", "Versions PAP", "mêmes objectifs, accès guidé"],
                      ["includeAssessment", "Évaluation", "alignée sur la tâche finale"],
                      ["includeCorrection", "Correction", "même numérotation, réponses visibles"],
                      ["includeRubric", "Grille / autoévaluation", "critères observables"],
                    ] as const
                  ).map(([key, label, helper]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={preferences[key]}
                      onClick={() => togglePreference(key)}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                        preferences[key]
                          ? "border-[#78aeb2] bg-[#e8f3f1]"
                          : "border-[#ddd9cd] bg-white"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                          preferences[key] ? "bg-[#285d68] text-white" : "bg-[#ece9df] text-transparent"
                        }`}
                      >
                        <Check size={14} />
                      </span>
                      <span>
                        <span className="block text-sm font-black text-[#243337]">{label}</span>
                        <span className="block text-xs text-[#697679]">{helper}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </BriefSection>

              <BriefSection number="04" title="Style d’impression">
                <div className="grid grid-cols-2 gap-3 lg:col-span-2">
                  {([
                    ["classic", "Classique", "Marine, bleu pâle, lisible et polyvalent"],
                    ["themed", "Thématique", "Bandeau illustré monochrome, contenu sobre"],
                  ] as const).map(([template, label, helper]) => (
                    <button
                      key={template}
                      type="button"
                      onClick={() => setPreferences((current) => ({ ...current, printTemplate: template }))}
                      className={`rounded-xl border p-4 text-left ${
                        preferences.printTemplate === template
                          ? "border-[#285d68] bg-[#285d68] text-white"
                          : "border-[#ddd9cd] bg-white text-[#243337]"
                      }`}
                    >
                      <BookOpenCheck size={18} />
                      <span className="mt-3 block text-sm font-black">{label}</span>
                      <span className={`mt-1 block text-xs leading-5 ${preferences.printTemplate === template ? "text-[#d4e9e8]" : "text-[#697679]"}`}>
                        {helper}
                      </span>
                    </button>
                  ))}
                </div>
              </BriefSection>

              <div className="rounded-2xl border border-[#e8d9ad] bg-[#fff8df] p-4 text-sm leading-6 text-[#66552a]">
                <strong>Le dossier restera modulaire.</strong> Chaque séance pourra être générée, relue et exportée séparément. Les versions standard, PAP et correction garderont les mêmes tâches.
              </div>
            </div>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#ddd9cd] bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xs text-[#697679]">
            Seul le titre est obligatoire. Le reste peut être complété avec l’assistant.
          </p>
          <div className="flex gap-2 sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!title.trim()}
              onClick={finish}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#d45b3f] px-5 py-2.5 text-sm font-black text-white shadow-sm hover:bg-[#bd4b33] disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
            >
              <Sparkles size={16} /> Créer le dossier
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function BriefSection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#ddd9cd] bg-white p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="text-xs font-black tracking-[0.16em] text-[#d45b3f]">{number}</span>
        <h3 className="text-base font-black text-[#243337]">{title}</h3>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">{children}</div>
    </section>
  );
}
