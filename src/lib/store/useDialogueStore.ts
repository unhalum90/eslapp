"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_DIALOGUE_VOICES, DEFAULT_SPEAKER_LABELS } from "@/lib/dialogue/domain";
import type { DialogueLevel, DialogueRecord, DialogueSpeakerLabels } from "@/lib/dialogue/types";

interface DialogueStore {
  /** Metadata and scripts only; MP3 blobs live in IndexedDB / Supabase Storage. */
  dialogues: DialogueRecord[];
  speakerLabels: DialogueSpeakerLabels;
  voiceSelection: { A: string; B: string };
  draftText: string;
  scenario: string;
  title: string;
  level: DialogueLevel;
  saveDialogue: (record: DialogueRecord) => void;
  updateDialogue: (id: string, patch: Partial<DialogueRecord>) => void;
  deleteDialogue: (id: string) => void;
  setSpeakerLabels: (labels: DialogueSpeakerLabels) => void;
  setVoiceSelection: (selection: { A: string; B: string }) => void;
  setDraftText: (draftText: string) => void;
  setScenario: (scenario: string) => void;
  setTitle: (title: string) => void;
  setLevel: (level: DialogueLevel) => void;
}

export const useDialogueStore = create<DialogueStore>()(
  persist(
    (set) => ({
      dialogues: [],
      speakerLabels: DEFAULT_SPEAKER_LABELS,
      voiceSelection: { A: DEFAULT_DIALOGUE_VOICES.A, B: DEFAULT_DIALOGUE_VOICES.B },
      draftText: "",
      scenario: "",
      title: "",
      level: "A2",

      saveDialogue: (record) =>
        set((state) => {
          const others = state.dialogues.filter((item) => item.id !== record.id);
          return { dialogues: [record, ...others] };
        }),

      updateDialogue: (id, patch) =>
        set((state) => ({
          dialogues: state.dialogues.map((item) =>
            item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item,
          ),
        })),

      deleteDialogue: (id) =>
        set((state) => ({ dialogues: state.dialogues.filter((item) => item.id !== id) })),

      setSpeakerLabels: (speakerLabels) => set({ speakerLabels }),
      setVoiceSelection: (voiceSelection) => set({ voiceSelection }),
      setDraftText: (draftText) => set({ draftText }),
      setScenario: (scenario) => set({ scenario }),
      setTitle: (title) => set({ title }),
      setLevel: (level) => set({ level }),
    }),
    { name: "esl-architect-dialogues", version: 1 },
  ),
);
