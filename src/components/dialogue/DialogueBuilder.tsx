"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  FileAudio,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import {
  generateDialogueScript,
  listDialogueVoiceCatalogue,
  synthesizeDialogueAudio,
} from "@/app/actions/dialogue";
import {
  createDialogueId,
  dialogueFileName,
  DIALOGUE_LEVELS,
  estimateDialogueSeconds,
  findVoiceBySlug,
  formatDialogueDuration,
  formatDialogueScript,
  mp3BlobFromBase64Segments,
  parseDialogueScript,
  validateDialogueLines,
} from "@/lib/dialogue/domain";
import { persistDialogue } from "@/lib/dialogue/library";
import type {
  DialogueAudioSegment,
  DialogueLine,
  DialogueRecord,
  DialogueVoiceOption,
} from "@/lib/dialogue/types";
import { useAiAgentStore } from "@/lib/store/useAiAgentStore";
import { useDialogueStore } from "@/lib/store/useDialogueStore";
import { DialogueAudioPlayer } from "./DialogueAudioPlayer";
import { DialogueLibrary } from "./DialogueLibrary";
import { DialogueLineEditor } from "./DialogueLineEditor";
import { DialogueVoicePanel, type VoiceCatalogue } from "./DialogueVoicePanel";

const SITUATION_PRESETS = [
  "Ordering food at a restaurant",
  "Asking for directions in the street",
  "Checking in at a hotel",
  "Buying a train ticket",
  "Shopping for clothes",
  "At the doctor's",
];

const EMPTY_CATALOGUE: VoiceCatalogue = {
  configured: false,
  label: "Voxtral Mini TTS",
  model: "",
  voices: [],
};

export function DialogueBuilder() {
  const {
    dialogues,
    speakerLabels: labels,
    voiceSelection: selection,
    draftText,
    scenario,
    title,
    level,
    saveDialogue,
    updateDialogue,
    deleteDialogue,
    setSpeakerLabels: setLabels,
    setVoiceSelection: setSelection,
    setDraftText,
    setScenario,
    setTitle,
    setLevel,
  } = useDialogueStore();

  const selectedAgent = useAiAgentStore((state) => state.selectedAgent);

  const [catalogue, setCatalogue] = useState<VoiceCatalogue>(EMPTY_CATALOGUE);
  const [mode, setMode] = useState<"write" | "generate">("generate");
  const [turns, setTurns] = useState(8);
  const [vocabulary, setVocabulary] = useState("");
  const [register, setRegister] = useState<"informal" | "polite" | "formal">("polite");
  const [lines, setLines] = useState<DialogueLine[]>([]);
  const [segments, setSegments] = useState<DialogueAudioSegment[]>([]);
  const [audioModel, setAudioModel] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    void listDialogueVoiceCatalogue().then((result) => {
      if (!active) return;
      setCatalogue({
        configured: result.configured,
        label: result.label,
        model: result.model,
        voices: result.voices,
        message: result.message,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const estimatedSeconds = useMemo(() => estimateDialogueSeconds(lines), [lines]);
  const baseName = useMemo(() => dialogueFileName(title || "dialogue").replace(/\.mp3$/, ""), [title]);

  const resolveVoice = useCallback(
    (value: string, fallbackName: string): DialogueVoiceOption =>
      findVoiceBySlug(catalogue.voices, value) ?? {
        id: "",
        slug: "",
        name: fallbackName,
        gender: null,
        languages: ["en"],
        type: "preset",
        tags: [],
      },
    [catalogue.voices],
  );

  const handleParseText = () => {
    setError("");
    const parsed = parseDialogueScript(draftText);
    if (parsed.lines.length === 0) {
      setError("Nothing to read yet. Type or paste the dialogue first.");
      return;
    }
    setLines(parsed.lines);
    setLabels(parsed.labels);
    setSegments([]);
    setSavedId(null);
    setNotice(
      `${parsed.lines.length} lines ready${parsed.detected ? "" : " (speakers were alternated automatically)"}.`,
    );
  };

  const handleGenerate = async () => {
    setError("");
    setNotice("");
    setIsGenerating(true);
    try {
      const result = await generateDialogueScript({
        scenario,
        level,
        turns,
        vocabulary,
        register,
        agent: selectedAgent,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setLines(result.lines);
      setSegments([]);
      setSavedId(null);
      setTitle(result.title);
      setNotice(
        `${result.lines.length} lines written by ${result.engineLabel}. Review them, then create the audio.`,
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSynthesize = async () => {
    setError("");
    setNotice("");
    const problem = validateDialogueLines(lines);
    if (problem) {
      setError(problem);
      return;
    }

    setIsSynthesizing(true);
    try {
      const result = await synthesizeDialogueAudio({
        lines,
        voiceA: resolveVoice(selection.A, labels.A || "Voice A"),
        voiceB: resolveVoice(selection.B, labels.B || "Voice B"),
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setSegments(result.segments);
      setAudioModel(result.model);
      const bytes = result.segments.reduce((sum, segment) => sum + segment.bytes, 0);
      setNotice(`Audio ready: ${result.segments.length} lines, ${Math.round(bytes / 1024)} KB.`);
    } finally {
      setIsSynthesizing(false);
    }
  };

  const handleSave = async () => {
    if (segments.length === 0) {
      setError("Create the audio before saving it to the library.");
      return;
    }
    setError("");
    setNotice("Saving…");

    const audio = mp3BlobFromBase64Segments(segments.map((segment) => segment.base64));
    const timestamp = new Date().toISOString();
    const existing = savedId ? dialogues.find((item) => item.id === savedId) : undefined;
    const record: DialogueRecord = {
      id: existing?.id ?? createDialogueId(),
      title: title.trim() || scenario.trim() || "Classroom dialogue",
      scenario: scenario.trim(),
      level,
      source: mode === "generate" ? "generated" : "text",
      speakerLabels: labels,
      voices: { A: selection.A, B: selection.B, model: audioModel },
      lines,
      audioMime: "audio/mpeg",
      audioBytes: audio.size,
      durationSeconds: estimatedSeconds,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      syncState: "local",
    };

    saveDialogue(record);
    setSavedId(record.id);
    const result = await persistDialogue(record, audio);
    updateDialogue(record.id, { syncState: result.syncState });
    setNotice(result.message);
  };

  const handleCopy = async () => {
    if (lines.length === 0) return;
    try {
      await navigator.clipboard.writeText(formatDialogueScript(lines, labels));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_600);
    } catch {
      setError("The browser blocked clipboard access. Select the text manually instead.");
    }
  };

  const handleLoadFromLibrary = (record: DialogueRecord) => {
    setLines(record.lines);
    setLabels(record.speakerLabels);
    setSelection({ A: record.voices.A || selection.A, B: record.voices.B || selection.B });
    setTitle(record.title);
    setScenario(record.scenario);
    setLevel(record.level);
    setSegments([]);
    setSavedId(record.id);
    setNotice(`Loaded "${record.title}". Create the audio again to re-listen or re-download.`);
  };

  const handleDeleteFromLibrary = async (record: DialogueRecord) => {
    deleteDialogue(record.id);
    if (savedId === record.id) setSavedId(null);
  };

  const handleVoiceCreated = (voice: DialogueVoiceOption) => {
    setCatalogue((current) => ({
      ...current,
      configured: true,
      voices: [...current.voices.filter((item) => item.id !== voice.id), voice],
    }));
    setSelection({ ...selection, B: voice.slug || voice.id });
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="dialogue-title" className="field-label">
                Title
              </label>
              <input
                id="dialogue-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="At the restaurant"
                className="teacher-input w-64"
              />
            </div>
            <div>
              <label htmlFor="dialogue-level" className="field-label">
                Level
              </label>
              <select
                id="dialogue-level"
                value={level}
                onChange={(event) => setLevel(event.target.value as typeof level)}
                className="teacher-input w-24"
              >
                {DIALOGUE_LEVELS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-1 text-xs font-bold text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">
              {lines.length} lines · ~{formatDialogueDuration(estimatedSeconds)}
            </span>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
            >
              {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
              {copied ? "Copied" : "Copy script"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("generate")}
            className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${
              mode === "generate"
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:text-indigo-700"
            }`}
          >
            Generate from a situation
          </button>
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`rounded-xl px-4 py-2 text-sm font-black transition-colors ${
              mode === "write"
                ? "bg-indigo-600 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:text-indigo-700"
            }`}
          >
            Use my own text
          </button>
        </div>

        {mode === "generate" ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {SITUATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setScenario(preset)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-[#78aeb2] hover:text-[#285d68]"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div>
              <label htmlFor="dialogue-scenario" className="field-label">
                Situation given to the two speakers
              </label>
              <textarea
                id="dialogue-scenario"
                value={scenario}
                onChange={(event) => setScenario(event.target.value)}
                rows={2}
                placeholder="A customer orders lunch, asks about a vegetarian dish and pays by card."
                className="teacher-input resize-y"
              />
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="dialogue-turns" className="field-label">
                  Exchanges ({turns})
                </label>
                <input
                  id="dialogue-turns"
                  type="range"
                  min={3}
                  max={24}
                  value={turns}
                  onChange={(event) => setTurns(Number(event.target.value))}
                  className="teacher-input w-48 bg-white"
                />
              </div>
              <div>
                <label htmlFor="dialogue-register" className="field-label">
                  Register
                </label>
                <select
                  id="dialogue-register"
                  value={register}
                  onChange={(event) => setRegister(event.target.value as typeof register)}
                  className="teacher-input w-32"
                >
                  <option value="polite">polite</option>
                  <option value="informal">informal</option>
                  <option value="formal">formal</option>
                </select>
              </div>
              <div className="min-w-56 flex-1">
                <label htmlFor="dialogue-vocabulary" className="field-label">
                  Target vocabulary (optional)
                </label>
                <input
                  id="dialogue-vocabulary"
                  value={vocabulary}
                  onChange={(event) => setVocabulary(event.target.value)}
                  placeholder="starter, main course, bill, tip"
                  className="teacher-input"
                />
              </div>
              <button
                type="button"
                onClick={() => void handleGenerate()}
                disabled={isGenerating || !scenario.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? "Writing…" : "Generate dialogue"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <div>
              <label htmlFor="dialogue-draft" className="field-label">
                Paste or type the dialogue
              </label>
              <textarea
                id="dialogue-draft"
                value={draftText}
                onChange={(event) => setDraftText(event.target.value)}
                rows={7}
                placeholder={"Waiter: Good evening!\nCustomer: A table for two, please."}
                className="teacher-input resize-y font-mono text-xs"
              />
            </div>
            <button
              type="button"
              onClick={handleParseText}
              disabled={!draftText.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              <Wand2 size={16} /> Read into two voices
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-xl border border-[#cfe3e0] bg-[#e8f3f1] p-3 text-sm font-semibold text-[#285d68]">
            {notice}
          </p>
        ) : null}
      </section>

      <DialogueLineEditor
        lines={lines}
        labels={labels}
        onLinesChange={(next) => {
          setLines(next);
          setSegments([]);
        }}
        onLabelsChange={setLabels}
      />

      <DialogueVoicePanel
        catalogue={catalogue}
        selection={selection}
        onSelectionChange={setSelection}
        onVoiceCreated={handleVoiceCreated}
      />

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold text-slate-500">
          Each line is generated with its speaker&apos;s voice, then joined into one MP3.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleSynthesize()}
            disabled={isSynthesizing || lines.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            {isSynthesizing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileAudio size={16} />
            )}
            {isSynthesizing ? "Creating audio…" : "Create the audio"}
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={segments.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            <Save size={16} /> Save to library
          </button>
        </div>
      </section>

      {segments.length > 0 ? (
        <DialogueAudioPlayer
          segments={segments}
          lines={lines}
          labels={labels}
          baseName={baseName}
        />
      ) : null}

      <DialogueLibrary
        dialogues={dialogues}
        onLoadScript={handleLoadFromLibrary}
        onDelete={handleDeleteFromLibrary}
        onRename={(record, nextTitle) => {
          updateDialogue(record.id, { title: nextTitle });
          if (savedId === record.id) setTitle(nextTitle);
        }}
        onSynced={(record, syncState) => updateDialogue(record.id, { syncState })}
      />
    </div>
  );
}


