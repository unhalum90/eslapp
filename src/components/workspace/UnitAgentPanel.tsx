"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Images,
  PanelRightClose,
  Send,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { generateImageVariants } from "@/app/actions/image";
import { askUnitArchitect } from "@/app/actions/unitAgent";
import { IMAGE_AGENTS, TEXT_AGENTS } from "@/lib/ai/catalog";
import { useAiAgentStore } from "@/lib/store/useAiAgentStore";
import { usePhaseOneStore } from "@/lib/store/usePhaseOneStore";
import { useUnitAgentStore } from "@/lib/store/useUnitAgentStore";
import { sanitizeRichHtml } from "@/lib/materials/richText";
import type { UnitContent } from "@/lib/phase-one/types";
import type {
  ImageGenerationMode,
  ImageGenerationVariant,
} from "@/lib/image-generation/types";
import type {
  GeneratedUnitAgentProposal,
  UnitAgentMessage,
  UnitAgentProposal,
  UnitAgentSection,
} from "@/lib/unit-agent/types";

type WorkspaceTab = "plan" | "vocabulary" | "materials" | "sources" | "decisions" | "delivery";

const QUICK_PROMPTS = [
  "Propose trois tâches finales adaptées à cette classe.",
  "Construis un parcours cohérent de séances vers la tâche finale.",
  "Déduis la grammaire, le lexique et la phonologie nécessaires.",
  "Vérifie que chaque séance réactive les acquis précédents.",
  "Propose une problématique culturelle plus forte.",
  "Repère les manques et les contradictions du dossier.",
];

const BLANK_UNIT_PROMPTS = [
  "I have no idea yet. Ask me one question at a time.",
  "Suggest three very different unit ideas for this class level.",
  "Help me turn a theme into a motivating final task.",
  "I know the final task. Help me plan backward from it.",
];

function isBlankUnit(unit: UnitContent): boolean {
  const normalizedTitle = unit.title.trim().toLowerCase();
  const hasMeaningfulTitle = normalizedTitle !== "" && normalizedTitle !== "new unit";
  return (
    !hasMeaningfulTitle &&
    !unit.theme.trim() &&
    !unit.finalTask.title.trim() &&
    unit.sessions.length === 0 &&
    (unit.materials ?? []).length === 0 &&
    unit.vocabulary.length === 0 &&
    unit.grammarPoints.length === 0 &&
    unit.sourceReferences.length === 0
  );
}

const SECTION_LABELS: Record<UnitAgentSection, string> = {
  unitTitle: "Unit title",
  theme: "Theme and framing",
  finalTask: "Final task",
  grammarPoints: "Grammar requirements",
  sessions: "Session path",
  vocabularyItems: "Visual vocabulary",
  materials: "Classroom materials",
};

function createMessageId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function availableSections(proposal: GeneratedUnitAgentProposal): UnitAgentSection[] {
  const sections: UnitAgentSection[] = [];
  if (proposal.patch.unitTitle !== null) sections.push("unitTitle");
  if (proposal.patch.theme !== null) sections.push("theme");
  if (proposal.patch.finalTask !== null) sections.push("finalTask");
  if (proposal.patch.grammarPoints !== null) sections.push("grammarPoints");
  if (proposal.patch.sessions !== null) sections.push("sessions");
  if (proposal.patch.vocabularyItems != null) sections.push("vocabularyItems");
  if (proposal.patch.materials != null) sections.push("materials");
  return sections;
}

function sectionPreview(section: UnitAgentSection, proposal: UnitAgentProposal): string {
  const patch = proposal.patch;
  if (section === "unitTitle") return patch.unitTitle ?? "";
  if (section === "theme") return patch.theme ?? "";
  if (section === "finalTask") return patch.finalTask?.title ?? "";
  if (section === "grammarPoints") {
    return `${patch.grammarPoints?.length ?? 0} grammar point${patch.grammarPoints?.length === 1 ? "" : "s"}`;
  }
  if (section === "vocabularyItems") {
    return `${patch.vocabularyItems?.length ?? 0} vocabulary item${patch.vocabularyItems?.length === 1 ? "" : "s"}`;
  }
  if (section === "materials") {
    return `${patch.materials?.length ?? 0} material${patch.materials?.length === 1 ? "" : "s"}`;
  }
  return `${patch.sessions?.length ?? 0} session${patch.sessions?.length === 1 ? "" : "s"}`;
}

async function compactImageDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/")) return dataUrl;
  const source = new window.Image();
  source.src = dataUrl;
  await new Promise<void>((resolve, reject) => {
    source.onload = () => resolve();
    source.onerror = () => reject(new Error("The selected image could not be prepared."));
  });

  const maximumSide = 640;
  const scale = Math.min(1, maximumSide / Math.max(source.naturalWidth, source.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", 0.82);
}

function ImageComparisonBuilder({
  title,
  subtitle,
  imagePrompt,
  selectionKey,
  defaultMode,
  onSelect,
}: {
  title: string;
  subtitle: string;
  imagePrompt: string;
  selectionKey: string;
  defaultMode: ImageGenerationMode;
  onSelect: (selectionKey: string, dataUrl: string | null) => void;
}) {
  const [mode, setMode] = useState<ImageGenerationMode>(defaultMode);
  const [results, setResults] = useState<ImageGenerationVariant[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const chooseMode = (nextMode: ImageGenerationMode) => {
    setMode(nextMode);
    setResults([]);
    setSelectedProvider(null);
    setError("");
    onSelect(selectionKey, null);
  };

  const generate = async () => {
    setIsGenerating(true);
    setError("");
    setResults([]);
    setSelectedProvider(null);
    onSelect(selectionKey, null);
    try {
      const providers = mode === "compare" ? (["gemini", "openai"] as const) : [mode];
      const variants = await generateImageVariants(imagePrompt, [...providers]);
      setResults(variants);
      const successful = variants.filter((variant) => variant.dataUrl);
      if (successful.length === 1 && successful[0].dataUrl) {
        setSelectedProvider(successful[0].provider);
        onSelect(selectionKey, successful[0].dataUrl);
      }
      if (successful.length === 0) {
        setError(variants.map((variant) => variant.error).filter(Boolean).join(" "));
      }
    } catch (generationError) {
      const detail = generationError instanceof Error ? generationError.message : "";
      setError(
        detail.toLowerCase().includes("sign in")
          ? "Sign in with a teacher account to generate images."
          : "Image generation failed. Check the provider configuration and try again.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
        <Images size={16} className="shrink-0 text-indigo-600" />
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">{imagePrompt}</p>

      <div className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-slate-200 p-1">
        {([
          ["gemini", "Gemini"],
          ["openai", "OpenAI"],
          ["compare", "Compare"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => chooseMode(value)}
            className={`rounded-md px-2 py-1.5 text-[10px] font-black ${
              mode === value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void generate()}
        disabled={isGenerating}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {isGenerating
          ? "Generating…"
          : mode === "compare"
            ? "Generate both previews"
            : `Generate with ${mode === "gemini" ? IMAGE_AGENTS.gemini.label : IMAGE_AGENTS.openai.label}`}
      </button>

      {error ? <p className="mt-2 text-xs leading-5 text-rose-600">{error}</p> : null}

      {results.length > 0 ? (
        <div className={`mt-3 grid gap-2 ${results.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {results.map((result) => (
            <div key={result.provider} className="min-w-0">
              {result.dataUrl ? (
                <button
                  type="button"
                  aria-pressed={selectedProvider === result.provider}
                  onClick={() => {
                    setSelectedProvider(result.provider);
                    onSelect(selectionKey, result.dataUrl);
                  }}
                  className={`w-full overflow-hidden rounded-lg border-2 bg-white text-left ${
                    selectedProvider === result.provider
                      ? "border-emerald-500 ring-2 ring-emerald-100"
                      : "border-transparent hover:border-indigo-300"
                  }`}
                >
                  <Image
                    src={result.dataUrl}
                    alt={`${title} generated by ${result.providerLabel}`}
                    width={320}
                    height={320}
                    unoptimized
                    className="aspect-square w-full object-cover"
                  />
                  <span className="flex items-center justify-between gap-1 px-2 py-1.5 text-[9px] font-black text-slate-700">
                    {result.providerLabel}
                    {selectedProvider === result.provider ? (
                      <CheckCircle2 size={12} className="text-emerald-600" />
                    ) : null}
                  </span>
                </button>
              ) : (
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-2 text-[10px] leading-4 text-rose-600">
                  <span className="font-bold">{result.providerLabel}</span>
                  <br />
                  {result.error}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProposalCard({
  messageId,
  proposal,
  onApply,
  onReject,
  defaultImageMode,
}: {
  messageId: string;
  proposal: UnitAgentProposal;
  onApply: (
    messageId: string,
    proposal: UnitAgentProposal,
    sections: UnitAgentSection[],
    generatedImages: Record<string, string>,
  ) => Promise<void>;
  onReject: (messageId: string, proposal: UnitAgentProposal) => void;
  defaultImageMode: ImageGenerationMode;
}) {
  const sections = useMemo(() => availableSections(proposal), [proposal]);
  const [selected, setSelected] = useState<UnitAgentSection[]>(() => sections);
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [isApplying, setIsApplying] = useState(false);
  const pending = proposal.status === "pending";

  const applySelected = async () => {
    setIsApplying(true);
    try {
      await onApply(messageId, proposal, selected, generatedImages);
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-indigo-200 bg-white">
      <div className="border-b border-indigo-100 bg-indigo-50 p-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-indigo-700">
              Proposed update
            </p>
            <p className="mt-1 text-sm font-black text-slate-950">{proposal.title}</p>
          </div>
          {proposal.status !== "pending" ? (
            <span
              className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${
                proposal.status === "rejected"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {proposal.status.replace("_", " ")}
            </span>
          ) : null}
        </div>
        {proposal.rationale ? (
          <p className="mt-1 text-xs leading-5 text-slate-600">{proposal.rationale}</p>
        ) : null}
      </div>

      <div className="space-y-1 p-2">
        {sections.map((section) => {
          const checked = selected.includes(section);
          return (
            <label
              key={section}
              className={`flex items-start gap-2 rounded-lg p-2 ${
                pending ? "cursor-pointer hover:bg-slate-50" : "cursor-default"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={!pending}
                onChange={() =>
                  setSelected((current) =>
                    current.includes(section)
                      ? current.filter((item) => item !== section)
                      : [...current, section],
                  )
                }
                className="mt-0.5 h-4 w-4 accent-indigo-600"
              />
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-800">
                  {SECTION_LABELS[section]}
                </span>
                <span className="block truncate text-[11px] text-slate-500">
                  {sectionPreview(section, proposal)}
                </span>
              </span>
            </label>
          );
        })}
      </div>

      {pending &&
      selected.includes("vocabularyItems") &&
      proposal.patch.vocabularyItems?.length ? (
        <div className="space-y-3 border-t border-slate-100 p-3">
          <div>
            <p className="text-xs font-black text-slate-800">Build the visual vocabulary</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              Choose one provider or compare both. Select the image you want before applying; images
              are optional and missing facets remain visible.
            </p>
          </div>
          {proposal.patch.vocabularyItems.map((item, index) => (
            <ImageComparisonBuilder
              key={`${item.term}-${index}`}
              title={item.term}
              subtitle={`${item.translationFr || "No translation"}${item.phonetic ? ` · ${item.phonetic}` : ""}`}
              imagePrompt={item.imagePrompt}
              selectionKey={`vocabulary:${index}`}
              defaultMode={defaultImageMode}
              onSelect={(selectionKey, dataUrl) =>
                setGeneratedImages((current) => {
                  const next = { ...current };
                  if (dataUrl) next[selectionKey] = dataUrl;
                  else delete next[selectionKey];
                  return next;
                })
              }
            />
          ))}
        </div>
      ) : null}

      {pending && selected.includes("materials") && proposal.patch.materials?.length ? (
        <div className="space-y-3 border-t border-slate-100 p-3">
          <div>
            <p className="text-xs font-black text-slate-800">Build the classroom materials</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">
              The complete student content and teacher notes will be saved in Materials. Generate
              only the visuals you want to keep.
            </p>
          </div>
          {proposal.patch.materials.map((material, materialIndex) => (
            <div key={`${material.title}-${materialIndex}`} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600">
                    {material.kind}
                  </span>
                  <p className="text-sm font-black text-slate-900">{material.title}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500">
                  {material.imagePrompts.length} visual{material.imagePrompts.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">{material.purpose}</p>
              <details className="mt-2 rounded-lg bg-slate-50 p-2">
                <summary className="cursor-pointer text-[10px] font-bold text-slate-600">
                  Preview classroom content
                </summary>
                <div
                  className="mt-2 text-[10px] leading-5 text-slate-600 [&_h1]:mt-3 [&_h1]:font-black [&_h2]:mt-3 [&_h2]:font-bold [&_h3]:mt-2 [&_h3]:font-bold [&_ol]:list-decimal [&_ol]:pl-4 [&_p]:my-1 [&_ul]:list-disc [&_ul]:pl-4"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(material.studentContent) }}
                />
              </details>
              {material.imagePrompts.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {material.imagePrompts.map((imagePrompt, imageIndex) => (
                    <ImageComparisonBuilder
                      key={`${material.title}-image-${imageIndex}`}
                      title={`${material.title} · visual ${imageIndex + 1}`}
                      subtitle={material.kind === "worksheet" ? "Worksheet visual" : "Activity visual"}
                      imagePrompt={imagePrompt}
                      selectionKey={`material:${materialIndex}:${imageIndex}`}
                      defaultMode={defaultImageMode}
                      onSelect={(selectionKey, dataUrl) =>
                        setGeneratedImages((current) => {
                          const next = { ...current };
                          if (dataUrl) next[selectionKey] = dataUrl;
                          else delete next[selectionKey];
                          return next;
                        })
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {pending ? (
        <div className="grid grid-cols-2 gap-2 border-t border-slate-100 p-3">
          <button
            type="button"
            onClick={() => onReject(messageId, proposal)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
          >
            <X size={14} /> Reject & remember
          </button>
          <button
            type="button"
            disabled={selected.length === 0 || isApplying}
            onClick={() => void applySelected()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            {isApplying ? "Preparing…" : "Apply selected"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function UnitAgentPanel({ unit, activeTab }: { unit: UnitContent; activeTab: WorkspaceTab }) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const selectedAgent = useAiAgentStore((state) => state.selectedAgent);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { vocabulary, applyUnitAgentProposal, addDecision } = usePhaseOneStore();
  const messagesByUnit = useUnitAgentStore((state) => state.messagesByUnit);
  const appendMessage = useUnitAgentStore((state) => state.appendMessage);
  const setProposalStatus = useUnitAgentStore((state) => state.setProposalStatus);
  const clearConversation = useUnitAgentStore((state) => state.clearConversation);
  const clearFailedAttempts = useUnitAgentStore((state) => state.clearFailedAttempts);
  const setPanelOpen = useUnitAgentStore((state) => state.setPanelOpen);
  const defaultImageMode = useUnitAgentStore((state) => state.defaultImageMode);
  const setDefaultImageMode = useUnitAgentStore((state) => state.setDefaultImageMode);
  const messages = messagesByUnit[unit.id] ?? [];
  const blankUnit = isBlankUnit(unit);

  useEffect(() => {
    clearFailedAttempts(unit.id);
  }, [clearFailedAttempts, unit.id]);

  const unitVocabulary = useMemo(() => {
    const attachedIds = new Set(unit.vocabulary.map((link) => link.vocabularyId));
    return vocabulary.filter((item) => attachedIds.has(item.id));
  }, [unit.vocabulary, vocabulary]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [isLoading, messages.length]);

  const sendPrompt = async (rawPrompt: string) => {
    const prompt = rawPrompt.trim();
    if (!prompt || isLoading) return;

    const userMessage: UnitAgentMessage = {
      id: createMessageId("message"),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    appendMessage(unit.id, userMessage);
    setInput("");
    setIsLoading(true);

    try {
      const currentState = usePhaseOneStore.getState();
      const currentUnit =
        currentState.units.find((candidate) => candidate.id === unit.id) ?? unit;
      const attachedIds = new Set(currentUnit.vocabulary.map((link) => link.vocabularyId));
      const result = await askUnitArchitect(
        {
          prompt,
          context: {
            unit: {
              id: currentUnit.id,
              title: currentUnit.title,
              theme: currentUnit.theme,
              level: currentUnit.level,
              schoolYear: currentUnit.schoolYear,
              status: currentUnit.status,
              sequenceFrame: currentUnit.sequenceFrame,
              packPreferences: currentUnit.packPreferences,
              finalTask: currentUnit.finalTask,
              sessions: currentUnit.sessions,
              materials: currentUnit.materials ?? [],
              grammarPoints: currentUnit.grammarPoints,
            },
            vocabulary: currentState.vocabulary
              .filter((item) => attachedIds.has(item.id))
              .map(({ term, translationFr, phonetic, tags, notes }) => ({
                term,
                translationFr,
                phonetic,
                tags,
                notes,
              })),
            sources: currentUnit.sourceReferences,
            curriculumReferences: currentUnit.curriculumReferences,
            decisions: currentUnit.decisions.filter((decision) => decision.active),
            activeTab,
            level: currentUnit.level,
          },
          conversation: messages.slice(-12).map(({ role, content }) => ({ role, content })),
        },
        selectedAgent,
      );

      if (!result.ok) {
        appendMessage(unit.id, {
          id: createMessageId("message"),
          role: "assistant",
          content: result.message,
          createdAt: new Date().toISOString(),
          errorCode: result.code,
        });
        return;
      }

      const { response } = result;

      appendMessage(unit.id, {
        id: createMessageId("message"),
        role: "assistant",
        content: response.assistantMessage,
        createdAt: new Date().toISOString(),
        proposal: response.proposal
          ? {
              ...response.proposal,
              id: createMessageId("proposal"),
              status: "pending",
              appliedSections: [],
            }
          : undefined,
      });
    } catch {
      appendMessage(unit.id, {
        id: createMessageId("message"),
        role: "assistant",
        content: "Unit Architect lost its connection before the request completed. Try again.",
        createdAt: new Date().toISOString(),
        errorCode: "PROVIDER_FAILED",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyProposal = async (
    messageId: string,
    proposal: UnitAgentProposal,
    sections: UnitAgentSection[],
    generatedImages: Record<string, string>,
  ) => {
    const compactedEntries = await Promise.all(
      Object.entries(generatedImages).map(async ([selectionKey, dataUrl]) => [
        selectionKey,
        await compactImageDataUrl(dataUrl),
      ] as const),
    );
    applyUnitAgentProposal(unit.id, proposal, sections, Object.fromEntries(compactedEntries));
    const allSections = availableSections(proposal);
    setProposalStatus(
      unit.id,
      messageId,
      sections.length === allSections.length ? "applied" : "partially_applied",
      sections,
    );
  };

  const rejectProposal = (messageId: string, proposal: UnitAgentProposal) => {
    addDecision(
      unit.id,
      "rejection",
      `Rejected Unit Architect proposal: ${proposal.title}. ${proposal.rationale}`.trim(),
    );
    setProposalStatus(unit.id, messageId, "rejected");
  };

  return (
    <>
      <button
        type="button"
        aria-label="Close Unit Architect"
        onClick={() => setPanelOpen(false)}
        className="fixed inset-0 z-40 cursor-default bg-slate-950/30 2xl:hidden"
      />
      <aside
        data-onboarding="unit-architect"
        className="fixed bottom-0 right-0 top-16 z-50 flex w-[min(92vw,430px)] flex-col border-l border-slate-200 bg-white shadow-2xl 2xl:sticky 2xl:top-4 2xl:z-0 2xl:h-[calc(100vh-8rem)] 2xl:w-[400px] 2xl:shrink-0 2xl:rounded-2xl 2xl:border 2xl:shadow-sm"
      >
        <header className="border-b border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
                <Sparkles size={19} />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-slate-950">Unit Architect</h2>
                <p className="truncate text-xs text-slate-500">
                  {TEXT_AGENTS[selectedAgent].label} · dossier actif
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Clear this unit’s conversation? Applied unit changes will remain.")) {
                      clearConversation(unit.id);
                    }
                  }}
                  aria-label="Clear conversation"
                  title="Clear conversation"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                aria-label="Close Unit Architect"
                title="Close Unit Architect"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <PanelRightClose size={17} />
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
              {unit.level}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
              {unit.sessions.length}/8 sessions
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
              {unitVocabulary.length} vocabulary
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
              {(unit.materials ?? []).length} materials
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
              {unit.decisions.filter((decision) => decision.active).length} decisions
            </span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Image output
            </span>
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
              {([
                ["gemini", "Gemini"],
                ["openai", "OpenAI"],
                ["compare", "Compare"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={defaultImageMode === value}
                  title={
                    value === "gemini"
                      ? IMAGE_AGENTS.gemini.label
                      : value === "openai"
                        ? IMAGE_AGENTS.openai.label
                        : "Generate with both providers"
                  }
                  onClick={() => setDefaultImageMode(value)}
                  className={`rounded-md px-2 py-1 text-[9px] font-black ${
                    defaultImageMode === value
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="flex min-h-full flex-col justify-center">
              <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-4">
                <div className="flex items-center gap-2 text-sm font-black text-indigo-900">
                  <Bot size={17} /> {blankUnit ? "Let’s invent this unit together" : "Plan this unit with AI"}
                </div>
                <p className="mt-2 text-xs leading-5 text-slate-600">
                  {blankUnit
                    ? "You don’t need a title or a finished idea. Start with a theme, a cultural topic, a language goal—or simply say you have no idea yet. I’ll ask one useful question at a time."
                    : "I can see the current plan, vocabulary, materials, sources and active decisions. I’ll propose changes and complete classroom artifacts for review before anything is applied."}
                </p>
              </div>
              <div className="mt-4 space-y-2">
                {(blankUnit ? BLANK_UNIT_PROMPTS : QUICK_PROMPTS).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendPrompt(prompt)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left text-xs font-semibold leading-5 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
                  >
                    {prompt}
                    <ChevronRight size={14} className="shrink-0 text-slate-400" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, messageIndex) => (
                <article
                  key={message.id}
                  className={message.role === "user" ? "flex justify-end" : "block"}
                >
                  <div
                    className={`max-w-[92%] rounded-2xl px-3.5 py-3 text-sm leading-6 ${
                      message.role === "user"
                        ? "rounded-br-md bg-slate-950 text-white"
                        : "rounded-bl-md bg-slate-100 text-slate-700"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">
                      {message.content === "The selected text agent is not configured on this server."
                        ? "Unit Architect hit a temporary connection problem. Let’s try that again."
                        : message.content}
                    </p>
                    {message.errorCode === "AUTH_REQUIRED" ? (
                      <Link
                        href="/account"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:bg-indigo-700"
                      >
                        Sign in to continue <ChevronRight size={13} />
                      </Link>
                    ) : null}
                    {message.errorCode &&
                    message.errorCode !== "AUTH_REQUIRED" &&
                    message.errorCode !== "ACCESS_DENIED" &&
                    messages[messageIndex - 1]?.role === "user" ? (
                      <button
                        type="button"
                        onClick={() => void sendPrompt(messages[messageIndex - 1].content)}
                        disabled={isLoading}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
                      >
                        Try that again <Sparkles size={13} />
                      </button>
                    ) : null}
                    {message.proposal ? (
                      <ProposalCard
                        messageId={message.id}
                        proposal={message.proposal}
                        onApply={applyProposal}
                        onReject={rejectProposal}
                        defaultImageMode={defaultImageMode}
                      />
                    ) : null}
                  </div>
                </article>
              ))}
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Reviewing the unit…
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 bg-white p-3 2xl:rounded-b-2xl">
          <label className="sr-only" htmlFor="unit-architect-prompt">
            Ask Unit Architect about this unit
          </label>
          <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <textarea
              id="unit-architect-prompt"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendPrompt(input);
                }
              }}
              rows={3}
              placeholder={
                blankUnit
                  ? "Tell me what you’re considering—or say “I have no idea”…"
                  : "Ask about this unit…"
              }
              className="w-full resize-none border-0 px-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[10px] font-medium text-slate-400">Enter to send · Shift+Enter for a line</span>
              <button
                type="button"
                onClick={() => void sendPrompt(input)}
                disabled={!input.trim() || isLoading}
                aria-label="Send to Unit Architect"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400">
            <CheckCircle2 size={12} className="text-emerald-500" /> Changes require your approval
          </div>
        </div>
      </aside>
    </>
  );
}
