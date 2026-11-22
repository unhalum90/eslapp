"use client";

import { useMemo, useState } from "react";
import { Loader2, Mic, UserPlus } from "lucide-react";
import { cloneDialogueVoice } from "@/app/actions/dialogue";
import { groupVoicesByLanguage } from "@/lib/dialogue/domain";
import type { DialogueVoiceOption } from "@/lib/dialogue/types";

export interface VoiceCatalogue {
  configured: boolean;
  label: string;
  model: string;
  voices: DialogueVoiceOption[];
  message?: string;
}

interface DialogueVoicePanelProps {
  catalogue: VoiceCatalogue;
  selection: { A: string; B: string };
  onSelectionChange: (selection: { A: string; B: string }) => void;
  onVoiceCreated: (voice: DialogueVoiceOption) => void;
}

function voiceValue(voice: DialogueVoiceOption): string {
  return voice.slug || voice.id;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.slice(result.indexOf(",") + 1) : result;
      if (!base64) reject(new Error("Could not read the audio sample."));
      else resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the audio sample."));
    reader.readAsDataURL(file);
  });
}

export function DialogueVoicePanel({
  catalogue,
  selection,
  onSelectionChange,
  onVoiceCreated,
}: DialogueVoicePanelProps) {
  const [sampleName, setSampleName] = useState("");
  const [sampleGender, setSampleGender] = useState("female");
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [cloneMessage, setCloneMessage] = useState("");

  const groups = useMemo(() => groupVoicesByLanguage(catalogue.voices), [catalogue.voices]);

  const renderOptions = () =>
    groups.map((group) => (
      <optgroup key={group.code} label={group.label}>
        {group.voices.map((voice) => (
          <option key={voice.id} value={voiceValue(voice)}>
            {voice.name}
            {voice.type === "custom" ? " (my voice)" : ""}
          </option>
        ))}
      </optgroup>
    ));

  const handleClone = async () => {
    if (!sampleName.trim() || !sampleFile) {
      setCloneMessage("Add a name and a 2–3 second recording first.");
      return;
    }
    setIsCloning(true);
    setCloneMessage("");
    try {
      const sampleBase64 = await fileToBase64(sampleFile);
      const result = await cloneDialogueVoice({
        name: sampleName.trim(),
        sampleBase64,
        filename: sampleFile.name || "voice-sample.mp3",
        gender: sampleGender,
      });
      if (!result.ok) {
        setCloneMessage(result.message);
        return;
      }
      onVoiceCreated(result.voice);
      setSampleName("");
      setSampleFile(null);
      setCloneMessage(`Voice "${result.voice.name}" is ready to use.`);
    } catch (error) {
      console.error("[dialogue] clone request failed", error);
      setCloneMessage("The voice sample could not be uploaded.");
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
          <Mic size={18} className="text-indigo-600" /> Voices
        </h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-slate-600">
          {catalogue.label} · {catalogue.model}
        </span>
      </div>

      {!catalogue.configured ? (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          {catalogue.message ??
            "Add MISTRAL_API_KEY to .env.local and restart the server to load voices."}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="voice-a" className="field-label">
            Voice A (first speaker)
          </label>
          <select
            id="voice-a"
            value={selection.A}
            onChange={(event) => onSelectionChange({ ...selection, A: event.target.value })}
            className="teacher-input"
          >
            <option value="">Mistral default voice</option>
            {renderOptions()}
          </select>
        </div>
        <div>
          <label htmlFor="voice-b" className="field-label">
            Voice B (second speaker)
          </label>
          <select
            id="voice-b"
            value={selection.B}
            onChange={(event) => onSelectionChange({ ...selection, B: event.target.value })}
            className="teacher-input"
          >
            <option value="">Mistral default voice</option>
            {renderOptions()}
          </select>
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h4 className="flex items-center gap-2 text-sm font-black text-slate-800">
          <UserPlus size={15} /> Clone a voice from a 3-second recording
        </h4>
        <p className="mt-1 text-xs text-slate-500">
          Useful for a colleague&apos;s voice or a second character. Record on your phone and upload
          the file (MP3 or WAV).
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="clone-name" className="field-label">
              Voice name
            </label>
            <input
              id="clone-name"
              value={sampleName}
              onChange={(event) => setSampleName(event.target.value)}
              placeholder="Mrs Martin"
              className="teacher-input w-44"
            />
          </div>
          <div>
            <label htmlFor="clone-gender" className="field-label">
              Gender label
            </label>
            <select
              id="clone-gender"
              value={sampleGender}
              onChange={(event) => setSampleGender(event.target.value)}
              className="teacher-input w-28"
            >
              <option value="female">female</option>
              <option value="male">male</option>
            </select>
          </div>
          <div>
            <label htmlFor="clone-file" className="field-label">
              Sample
            </label>
            <input
              id="clone-file"
              type="file"
              accept="audio/*"
              onChange={(event) => setSampleFile(event.target.files?.[0] ?? null)}
              className="teacher-input w-56 file:mr-2 file:rounded file:border-0 file:bg-indigo-50 file:px-2 file:py-1 file:text-xs file:font-bold file:text-indigo-700"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleClone()}
            disabled={isCloning || !catalogue.configured}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
          >
            {isCloning ? <Loader2 size={15} className="animate-spin" /> : <Mic size={15} />}
            Clone voice
          </button>
        </div>
        {cloneMessage ? (
          <p className="mt-2 text-xs font-semibold text-slate-600">{cloneMessage}</p>
        ) : null}
      </div>
    </section>
  );
}
