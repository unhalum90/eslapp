export interface SpeakingTurn {
  speakerId: string | null;
  text: string;
  start: number | null;
  end: number | null;
}

export interface SpeakingTranscription {
  text: string;
  language: string | null;
  turns: SpeakingTurn[];
  diarized: boolean;
}

export interface SpeakingFeedbackItem {
  turnIndex: number;
  category: "grammar" | "vocabulary" | "word order" | "expression";
  quote: string;
  suggestion: string;
  explanation: string;
}

export interface SpeakingFeedback {
  overview: string;
  strengths: string[];
  items: SpeakingFeedbackItem[];
}

export interface SavedSpeakingRecord {
  id: string;
  folderId?: string | null;
  filename: string;
  createdAt: string;
  updatedAt: string;
  transcription: SpeakingTranscription;
  turns: SpeakingTurn[];
  speakerNames: Record<string, string>;
  level: "A1" | "A2" | "B1" | "B2" | "C1";
  task: string;
  feedback: SpeakingFeedback | null;
}

export interface SavedSpeakingSummary {
  id: string;
  folderId: string | null;
  filename: string;
  createdAt: string;
  updatedAt: string;
  hasFeedback: boolean;
}

export interface SpeakingFolder {
  id: string;
  name: string;
  createdAt: string;
}
