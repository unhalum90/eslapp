export type DialogueLevel = "A1" | "A2" | "B1" | "B2";

export type DialogueSpeaker = "A" | "B";

export type DialogueSource = "text" | "generated";

export type DialogueSyncState = "local" | "pending" | "synced";

export interface DialogueLine {
  id: string;
  speaker: DialogueSpeaker;
  text: string;
}

export interface DialogueSpeakerLabels {
  A: string;
  B: string;
}

export interface DialogueVoiceOption {
  /** Mistral voice UUID, usable as `voice_id` in speech generation. */
  id: string;
  /** Human-readable preset slug such as `gb_jane_neutral`; empty for cloned voices. */
  slug: string;
  name: string;
  gender: string | null;
  languages: string[];
  type: "preset" | "custom";
  tags: string[];
}

export interface DialogueAudioSegment {
  speaker: DialogueSpeaker;
  base64: string;
  bytes: number;
  mime: string;
}

export interface DialogueRecord {
  id: string;
  title: string;
  scenario: string;
  level: DialogueLevel;
  source: DialogueSource;
  speakerLabels: DialogueSpeakerLabels;
  voices: { A: string; B: string; model: string };
  lines: DialogueLine[];
  audioMime: string;
  audioBytes: number;
  durationSeconds: number;
  createdAt: string;
  updatedAt: string;
  syncState: DialogueSyncState;
}

export interface ParsedDialogue {
  lines: DialogueLine[];
  labels: DialogueSpeakerLabels;
  /** True when the text used explicit speaker markers such as `A:` or `**Waiter:**`. */
  detected: boolean;
}
