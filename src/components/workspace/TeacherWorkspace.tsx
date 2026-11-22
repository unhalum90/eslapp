"use client";

import { useMemo, useState } from "react";
import {
  BookOpenCheck,
  ChevronDown,
  Circle,
  FileCheck2,
  FileStack,
  FolderOpen,
  History,
  LibraryBig,
  PanelRightOpen,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { WorkspaceNav } from "./WorkspaceNav";
import { UnitPlanPanel } from "./UnitPlanPanel";
import { VocabularyPanel } from "./VocabularyPanel";
import { SourcesPanel } from "./SourcesPanel";
import { DecisionHistoryPanel } from "./DecisionHistoryPanel";
import { DeliveryPanel } from "./DeliveryPanel";
import { UnitAgentPanel } from "./UnitAgentPanel";
import { MaterialsPanel } from "./MaterialsPanel";
import { SequenceOverviewPanel } from "./SequenceOverviewPanel";
import { SessionPackPanel } from "./SessionPackPanel";
import { AssessmentPackPanel } from "./AssessmentPackPanel";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import { useUnitAgentStore } from "@/lib/store/useUnitAgentStore";
import { sessionPackCompleteness } from "@/lib/teacher-pack/sessionPack";

type WorkspaceView =
  | "overview"
  | "plan"
  | "vocabulary"
  | "materials"
  | "sources"
  | "decisions"
  | "delivery"
  | "assessment"
  | "final-task"
  | `session:${string}`;

type AgentTab = "plan" | "vocabulary" | "materials" | "sources" | "decisions" | "delivery";

export function TeacherWorkspace({ initialTab = "overview" }: { initialTab?: WorkspaceView }) {
  const { units, selectedUnitId, updateUnit } = usePhaseOneStore();
  const panelOpen = useUnitAgentStore((state) => state.panelOpen);
  const setPanelOpen = useUnitAgentStore((state) => state.setPanelOpen);
  const [viewState, setViewState] = useState<{ unitId: string; view: WorkspaceView }>({
    unitId: selectedUnitId,
    view: initialTab,
  });
  const [navigationCollapsed, setNavigationCollapsed] = useState(false);
  const unit = useMemo(
    () => units.find((candidate) => candidate.id === selectedUnitId) ?? units[0],
    [selectedUnitId, units],
  );

  if (!unit) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-6">
        <div className="rounded-3xl border border-dashed border-[#b8b5aa] bg-white p-12 text-center">
          <h1 className="text-2xl font-black text-[#203337]">Créez votre première séquence</h1>
          <p className="mt-2 text-sm text-[#687477]">Ajoutez une classe, puis ouvrez un nouveau dossier depuis le panneau de gauche.</p>
        </div>
      </div>
    );
  }

  const view = viewState.unitId === unit.id ? viewState.view : "overview";
  const setView = (nextView: WorkspaceView) => setViewState({ unitId: unit.id, view: nextView });

  const selectedSessionId = view.startsWith("session:") ? view.slice("session:".length) : "";
  const selectedSession = unit.sessions.find((session) => session.id === selectedSessionId);
  const frame = unit.sequenceFrame;
  const agentTab: AgentTab =
    view === "vocabulary" || view === "materials" || view === "sources" || view === "decisions" || view === "delivery"
      ? view
      : "plan";

  return (
    <div className="teacher-workspace min-h-[calc(100vh-4rem)]">
      <div className="flex min-h-[calc(100vh-4rem)] flex-col xl:flex-row xl:items-stretch">
        <WorkspaceNav collapsed={navigationCollapsed} onCollapsedChange={setNavigationCollapsed} />

        <div className="min-w-0 flex-1">
          <header className="border-b border-[#d8d5ca] bg-white px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-[#285d68]">
                  <span>{unit.level}</span>
                  <span className="text-[#bbb8ae]">•</span>
                  <span>{unit.schoolYear}</span>
                  <span className="text-[#bbb8ae]">•</span>
                  <span>{frame?.cefrEntry ?? "A1+"} → {frame?.cefrTarget ?? "A2"}</span>
                  {unit.packPreferences?.includePap !== false ? (
                    <span className="rounded-full bg-[#edf5e9] px-2 py-1 normal-case tracking-normal text-[#347047]">Standard + PAP</span>
                  ) : null}
                </div>
                <input
                  key={`${unit.id}-${unit.title}`}
                  defaultValue={unit.title}
                  onBlur={(event) => {
                    if (event.target.value === unit.title) return;
                    updateUnit(unit.id, { title: event.target.value }, "Avant modification du titre");
                  }}
                  aria-label="Titre de la séquence"
                  className="mt-1 w-full border-0 bg-transparent p-0 font-serif text-2xl font-bold text-[#203337] outline-none sm:text-3xl"
                />
                <p className="mt-1 truncate text-sm text-[#687477]">
                  {frame?.problematic || unit.finalTask.title || "Cadrage à compléter"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="relative">
                  <span className="sr-only">État de la séquence</span>
                  <select
                    value={unit.status}
                    onChange={(event) => updateUnit(unit.id, { status: event.target.value as "draft" | "ready" | "archived" }, "Avant changement d’état")}
                    className={`appearance-none rounded-xl border py-2.5 pl-3 pr-9 text-xs font-black ${unit.status === "ready" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : unit.status === "draft" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-slate-300 bg-slate-100 text-slate-700"}`}
                  >
                    <option value="draft">En préparation</option>
                    <option value="ready">Prête à utiliser</option>
                    <option value="archived">Archivée</option>
                  </select>
                  <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#889092]" />
                </label>
                {!panelOpen ? (
                  <button
                    type="button"
                    onClick={() => setPanelOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-3 py-2.5 text-xs font-black text-white shadow-sm hover:bg-violet-800"
                  >
                    <Sparkles size={15} />
                    <span className="hidden sm:inline">Assistant de séquence</span>
                    <PanelRightOpen size={15} className="sm:hidden" />
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <div className="flex min-w-0 flex-col 2xl:flex-row 2xl:items-start">
            <SequenceDocumentNav unit={unit} view={view} onViewChange={setView} />

            <main className="min-w-0 flex-1 p-4 sm:p-6">
              {view === "overview" ? (
                <SequenceOverviewPanel
                  unit={unit}
                  onOpenPlan={() => setView("plan")}
                  onOpenSession={(sessionId) => setView(`session:${sessionId}`)}
                  onOpenMaterials={() => setView("materials")}
                />
              ) : null}
              {view === "plan" ? <UnitPlanPanel unit={unit} /> : null}
              {view === "vocabulary" ? <VocabularyPanel unit={unit} /> : null}
              {view === "materials" ? <MaterialsPanel unit={unit} /> : null}
              {view === "sources" ? <SourcesPanel unit={unit} /> : null}
              {view === "decisions" ? <DecisionHistoryPanel unit={unit} /> : null}
              {view === "delivery" ? <DeliveryPanel unit={unit} /> : null}
              {view === "assessment" ? <AssessmentPackPanel unit={unit} /> : null}
              {view === "final-task" ? (
                <ComingPackPanel
                  icon={Target}
                  eyebrow="Tâche finale"
                  title={unit.finalTask.title || "Préparer la tâche finale"}
                  description={unit.finalTask.brief || "Ajoutez la consigne-mission, les attentes standard/PAP et les critères de réussite dans le plan de séquence."}
                  actionLabel="Modifier la tâche finale"
                  onAction={() => setView("plan")}
                />
              ) : null}
              {selectedSession ? (
                <SessionPackPanel unit={unit} session={selectedSession} onBack={() => setView("overview")} />
              ) : null}
            </main>

            {panelOpen ? <UnitAgentPanel unit={unit} activeTab={agentTab} /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SequenceDocumentNav({
  unit,
  view,
  onViewChange,
}: {
  unit: ReturnType<typeof usePhaseOneStore.getState>["units"][number];
  view: WorkspaceView;
  onViewChange: (view: WorkspaceView) => void;
}) {
  const topItems = [
    { id: "overview" as const, label: "Vue d’ensemble", tone: "teal", icon: FolderOpen },
    { id: "plan" as const, label: "Plan de séquence", tone: "blue", icon: BookOpenCheck },
  ];
  const resourceItems = [
    { id: "materials" as const, label: "Tous les documents", tone: "blue", icon: FileStack },
    { id: "vocabulary" as const, label: "Lexique", tone: "violet", icon: LibraryBig },
    { id: "sources" as const, label: "Sources", tone: "amber", icon: Circle },
    { id: "decisions" as const, label: "Historique", tone: "slate", icon: History },
    { id: "delivery" as const, label: "Diffusion", tone: "teal", icon: Send },
  ];

  return (
    <aside className="shrink-0 border-b border-[#d8d5ca] bg-[#fbfaf6] p-3 2xl:min-h-[calc(100vh-8.8rem)] 2xl:w-60 2xl:border-b-0 2xl:border-r">
      <nav aria-label="Documents de la séquence" className="flex gap-2 overflow-x-auto 2xl:block 2xl:space-y-1">
        {topItems.map((item) => (
          <DocumentNavButton key={item.id} active={view === item.id} tone={item.tone} icon={item.icon} label={item.label} onClick={() => onViewChange(item.id)} />
        ))}

        <p className="hidden px-3 pb-1 pt-5 text-[10px] font-black uppercase tracking-[0.16em] text-[#666258] 2xl:block">Séances</p>
        {unit.sessions.map((session, index) => {
          const count = sessionPackCompleteness((unit.materials ?? []).filter((material) => material.sessionId === session.id));
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => onViewChange(`session:${session.id}`)}
              aria-current={view === `session:${session.id}` ? "page" : undefined}
              data-tone="teal"
              className="workspace-nav-button flex min-w-44 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors 2xl:w-full"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${view === `session:${session.id}` ? "bg-white/15" : "bg-[#ece9df]"}`}>{index + 1}</span>
              <span className="min-w-0 flex-1 truncate">{session.title}</span>
              <span className={`text-[10px] ${view === `session:${session.id}` ? "text-[#d5e9e8]" : count === 4 ? "text-[#347047]" : "text-[#596b64]"}`}>{count}/4</span>
            </button>
          );
        })}

        <p className="hidden px-3 pb-1 pt-5 text-[10px] font-black uppercase tracking-[0.16em] text-[#666258] 2xl:block">Évaluation & tâche finale</p>
        <DocumentNavButton active={view === "assessment"} tone="rose" icon={FileCheck2} label="Évaluation" onClick={() => onViewChange("assessment")} />
        <DocumentNavButton active={view === "final-task"} tone="amber" icon={Target} label="Tâche finale" onClick={() => onViewChange("final-task")} />

        <p className="hidden px-3 pb-1 pt-5 text-[10px] font-black uppercase tracking-[0.16em] text-[#666258] 2xl:block">Ressources</p>
        {resourceItems.map((item) => (
          <DocumentNavButton key={item.id} active={view === item.id} tone={item.tone} icon={item.icon} label={item.label} onClick={() => onViewChange(item.id)} />
        ))}
      </nav>
    </aside>
  );
}

function DocumentNavButton({
  active,
  tone,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  tone: string;
  icon: typeof BookOpenCheck;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      data-tone={tone}
      className="workspace-nav-button flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors 2xl:w-full"
    >
      <Icon size={15} /> {label}
    </button>
  );
}

function ComingPackPanel({
  icon: Icon,
  eyebrow,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: typeof FileCheck2;
  eyebrow: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <section className="rounded-3xl border border-[#d8d5ca] bg-white p-7 shadow-sm sm:p-10">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f3f1] text-[#285d68]"><Icon size={22} /></span>
      <p className="mt-5 text-[11px] font-black uppercase tracking-[0.16em] text-[#d45b3f]">{eyebrow}</p>
      <h1 className="mt-1 max-w-2xl font-serif text-3xl font-bold text-[#203337]">{title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#647174]">{description}</p>
      <button type="button" onClick={onAction} className="mt-6 rounded-xl bg-[#285d68] px-4 py-2.5 text-sm font-black text-white hover:bg-[#214d56]">{actionLabel}</button>
    </section>
  );
}
