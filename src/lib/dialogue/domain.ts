import type {
  DialogueLevel,
  DialogueLine,
  DialogueSpeaker,
  DialogueSpeakerLabels,
  DialogueVoiceOption,
  ParsedDialogue,
} from "./types";

/**
 * Pure dialogue helpers shared by the server actions, the browser UI and the
 * node test suite. This module deliberately has no runtime imports so it can be
 * loaded with `node --experimental-strip-types`.
 */

export const DIALOGUE_LIMITS = {
  minLines: 2,
  maxLines: 60,
  maxCharsPerLine: 600,
  /** Mistral bills per character, so one generation stays well under a cent. */
  maxScriptChars: 12_000,
  maxVoicePageSize: 100,
  maxVoiceSampleBytes: 5_000_000,
} as const;

export const DIALOGUE_LEVELS: DialogueLevel[] = ["A1", "A2", "B1", "B2"];

export const DEFAULT_SPEAKER_LABELS: DialogueSpeakerLabels = {
  A: "Speaker A",
  B: "Speaker B",
};

/**
 * British English presets, matching the variety taught in French secondary
 * schools. Both slugs exist in Mistral's preset voice catalogue.
 */
export const DEFAULT_DIALOGUE_VOICES = {
  A: "gb_jane_neutral",
  B: "gb_oliver_neutral",
} as const;

const VOICE_LANGUAGE_LABELS: Record<string, string> = {
  en_gb: "British English",
  en_us: "American English",
  fr_fr: "French",
};

const VOICE_LANGUAGE_ORDER = ["en_gb", "en_us", "fr_fr"];

export interface DialogueVoiceGroup {
  code: string;
  label: string;
  voices: DialogueVoiceOption[];
}

export function voiceLanguageLabel(code: string): string {
  return VOICE_LANGUAGE_LABELS[code] ?? code.replace(/_/g, " ").toUpperCase();
}

export function groupVoicesByLanguage(voices: DialogueVoiceOption[]): DialogueVoiceGroup[] {
  const groups = new Map<string, DialogueVoiceOption[]>();
  for (const voice of voices) {
    const code = voice.languages[0]?.trim() || "other";
    const bucket = groups.get(code);
    if (bucket) bucket.push(voice);
    else groups.set(code, [voice]);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => {
      const leftIndex = VOICE_LANGUAGE_ORDER.indexOf(left);
      const rightIndex = VOICE_LANGUAGE_ORDER.indexOf(right);
      const safeLeft = leftIndex === -1 ? VOICE_LANGUAGE_ORDER.length : leftIndex;
      const safeRight = rightIndex === -1 ? VOICE_LANGUAGE_ORDER.length : rightIndex;
      return safeLeft - safeRight || left.localeCompare(right);
    })
    .map(([code, items]) => ({
      code,
      label: voiceLanguageLabel(code),
      voices: [...items].sort((left, right) => left.name.localeCompare(right.name)),
    }));
}

export function findVoiceBySlug(
  voices: DialogueVoiceOption[],
  slug: string,
): DialogueVoiceOption | null {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;
  return (
    voices.find((voice) => voice.slug.toLowerCase() === normalized) ??
    voices.find((voice) => voice.id.toLowerCase() === normalized) ??
    null
  );
}

function randomId(): string {
  const globalCrypto = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (globalCrypto?.randomUUID) return globalCrypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}

export function createDialogueId(): string {
  return `dialogue_${randomId()}`;
}

export function createDialogueLineId(): string {
  return `line_${randomId()}`;
}

function displaySpeakerName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  if (trimmed !== trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase()) return trimmed;
  return trimmed
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function cleanLineText(value: string): string {
  return value
    .replace(/^[-–—•*]\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/\*\*/g, "")
    .trim();
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function trailingId3v1Length(bytes: Uint8Array): number {
  const TAG_LENGTH = 128;
  if (bytes.length < TAG_LENGTH) return 0;
  const start = bytes.length - TAG_LENGTH;
  const isTag =
    bytes[start] === 0x54 && bytes[start + 1] === 0x41 && bytes[start + 2] === 0x47;
  return isTag ? TAG_LENGTH : 0;
}

/** Returns the byte length of a leading ID3v2 tag, or 0 when there is none. */
export function leadingId3v2Length(bytes: Uint8Array): number {
  if (bytes.length < 10) return 0;
  const hasMarker = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  if (!hasMarker) return 0;
  const size =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);
  const footer = (bytes[5] & 0x10) !== 0 ? 10 : 0;
  return Math.min(bytes.length, 10 + size + footer);
}

function base64ToBinary(base64: string): string {
  const globalAtob = (globalThis as { atob?: (value: string) => string }).atob;
  if (typeof globalAtob === "function") return globalAtob(base64);
  const buffer = (
    globalThis as unknown as {
      Buffer?: {
        from: (value: string, encoding: string) => { toString: (encoding: string) => string };
      };
    }
  ).Buffer;
  if (buffer) return buffer.from(base64, "base64").toString("binary");
  throw new Error("No base64 decoder is available in this runtime.");
}

export function base64ToBytes(base64: string): Uint8Array {
  const normalized = base64.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const remainder = normalized.length % 4;
  const padded =
    remainder === 0 ? normalized : normalized.padEnd(normalized.length + (4 - remainder), "=");
  const binary = base64ToBinary(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const CHUNK = 0x8000;
  for (let index = 0; index < bytes.length; index += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK));
  }
  const globalBtoa = (globalThis as { btoa?: (value: string) => string }).btoa;
  if (typeof globalBtoa === "function") return globalBtoa(binary);
  const buffer = (
    globalThis as unknown as {
      Buffer?: {
        from: (value: string, encoding: string) => { toString: (encoding: string) => string };
      };
    }
  ).Buffer;
  if (buffer) return buffer.from(binary, "binary").toString("base64");
  throw new Error("No base64 encoder is available in this runtime.");
}

export function base64ByteLength(base64: string): number {
  const normalized = base64.replace(/\s+/g, "").replace(/=+$/, "");
  if (!normalized) return 0;
  return Math.floor((normalized.length * 3) / 4);
}

/**
 * Joins the per-line MP3 responses into one playable stream. Mistral returns a
 * complete MP3 per request, so every segment after the first is stripped of its
 * ID3 header and trailing ID3v1 tags are dropped to avoid mid-stream tags.
 */
export function mp3BytesFromBase64Segments(
  segments: string[],
  options: { keepFirstId3?: boolean } = {},
): Uint8Array {
  const keepFirstId3 = options.keepFirstId3 ?? true;
  const parts: Uint8Array[] = [];

  segments.forEach((segment, index) => {
    const bytes = base64ToBytes(segment);
    const start = index === 0 && keepFirstId3 ? 0 : leadingId3v2Length(bytes);
    const end = bytes.length - trailingId3v1Length(bytes);
    if (end > start) parts.push(bytes.subarray(start, end));
  });

  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(total);
  let cursor = 0;
  for (const part of parts) {
    combined.set(part, cursor);
    cursor += part.length;
  }
  return combined;
}

export function mp3BlobFromBase64Segments(segments: string[]): Blob {
  const bytes = mp3BytesFromBase64Segments(segments);
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: "audio/mpeg" });
}

export function audioBlobFromBase64(base64: string, mime = "audio/mpeg"): Blob {
  const bytes = base64ToBytes(base64);
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: mime });
}

export function applyDialogueLimits(lines: DialogueLine[]): DialogueLine[] {
  return lines.slice(0, DIALOGUE_LIMITS.maxLines).map((line) => ({
    ...line,
    text:
      line.text.length > DIALOGUE_LIMITS.maxCharsPerLine
        ? line.text.slice(0, DIALOGUE_LIMITS.maxCharsPerLine).trimEnd()
        : line.text,
  }));
}

export function dialogueScriptChars(lines: DialogueLine[]): number {
  return lines.reduce((sum, line) => sum + line.text.length, 0);
}

export function dialogueWordCount(lines: DialogueLine[]): number {
  return lines.reduce((sum, line) => sum + countWords(line.text), 0);
}

/** Rough classroom estimate: ~150 words per minute plus a short pause per turn. */
export function estimateDialogueSeconds(lines: DialogueLine[]): number {
  const words = dialogueWordCount(lines);
  if (words === 0) return 0;
  return Math.round(words / 2.5 + lines.length * 0.4);
}

export function formatDialogueDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

export function dialogueFileName(title: string, extension = "mp3"): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "dialogue";
  return `${base}.${extension}`;
}

export function validateDialogueLines(lines: DialogueLine[]): string | null {
  const usable = lines.filter((line) => line.text.trim().length > 0);
  if (usable.length < DIALOGUE_LIMITS.minLines) {
    return `Add at least ${DIALOGUE_LIMITS.minLines} lines with text before generating audio.`;
  }
  if (lines.length > DIALOGUE_LIMITS.maxLines) {
    return `A dialogue can hold at most ${DIALOGUE_LIMITS.maxLines} lines.`;
  }
  const chars = dialogueScriptChars(usable);
  if (chars > DIALOGUE_LIMITS.maxScriptChars) {
    return `This script is ${chars} characters; the limit is ${DIALOGUE_LIMITS.maxScriptChars}.`;
  }
  return null;
}

export function formatDialogueScript(
  lines: DialogueLine[],
  labels: DialogueSpeakerLabels = DEFAULT_SPEAKER_LABELS,
): string {
  return lines
    .map((line) => `${labels[line.speaker] ?? line.speaker}: ${line.text.trim()}`)
    .join("\n");
}

export interface DialogueScriptPayload {
  title: string;
  lines: DialogueLine[];
}

/** Pulls a JSON object out of a model reply, tolerating code fences and prose. */
export function extractJsonObject(content: string): unknown | null {
  const trimmed = content?.trim() ?? "";
  if (!trimmed) return null;

  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidate = fenced ? fenced[1] : trimmed;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Accepts the loose shapes a chat model can return (`speaker`/`who`/`name`,
 * speaker names instead of A/B, extra keys) and produces usable dialogue lines.
 */
export function normalizeDialogueScriptPayload(payload: unknown): DialogueScriptPayload | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as { title?: unknown; lines?: unknown };
  if (!Array.isArray(record.lines)) return null;

  const lines: DialogueLine[] = [];
  record.lines.forEach((entry, index) => {
    if (!entry || typeof entry !== "object") return;
    const line = entry as { speaker?: unknown; text?: unknown; who?: unknown; name?: unknown };
    const text = typeof line.text === "string" ? cleanLineText(line.text) : "";
    if (!text) return;

    const raw = `${line.speaker ?? line.who ?? line.name ?? ""}`.trim().toLowerCase();
    const speaker: DialogueSpeaker =
      raw.startsWith("b") || raw === "2"
        ? "B"
        : raw.startsWith("a") || raw === "1"
          ? "A"
          : index % 2 === 0
            ? "A"
            : "B";

    lines.push({ id: createDialogueLineId(), speaker, text });
  });

  if (lines.length < DIALOGUE_LIMITS.minLines) return null;

  const title =
    typeof record.title === "string" && record.title.trim()
      ? record.title.trim().slice(0, 120)
      : "Classroom dialogue";

  return { title, lines: applyDialogueLimits(lines) };
}

/**
 * Reads the formats a teacher naturally types: `A: ...`, `**Waiter:** ...`,
 * `Waiter — ...`, `1. ...`, or plain paragraphs that alternate speakers.
 */
export function parseDialogueScript(raw: string): ParsedDialogue {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (!text) {
    return { lines: [], labels: { ...DEFAULT_SPEAKER_LABELS }, detected: false };
  }

  const labels: DialogueSpeakerLabels = { ...DEFAULT_SPEAKER_LABELS };
  const labelled = new Set<DialogueSpeaker>();
  const nameToSpeaker = new Map<string, DialogueSpeaker>();
  const lines: DialogueLine[] = [];
  let detected = false;
  let alternating: DialogueSpeaker = "A";

  const pushLine = (speaker: DialogueSpeaker, value: string) => {
    const cleaned = cleanLineText(value);
    if (!cleaned) return;
    lines.push({ id: createDialogueLineId(), speaker, text: cleaned });
    alternating = speaker === "A" ? "B" : "A";
  };

  const takeSpeaker = (rawName: string): DialogueSpeaker => {
    const name = rawName.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    const known = nameToSpeaker.get(key);
    if (known) return known;

    const direct =
      key === "a" || key === "speaker a"
        ? "A"
        : key === "b" || key === "speaker b"
          ? "B"
          : undefined;
    if (direct) {
      nameToSpeaker.set(key, direct);
      return direct;
    }

    const used = new Set(nameToSpeaker.values());
    const speaker: DialogueSpeaker = !used.has("A") ? "A" : !used.has("B") ? "B" : alternating;
    nameToSpeaker.set(key, speaker);
    if (!labelled.has(speaker)) {
      labels[speaker] = displaySpeakerName(name);
      labelled.add(speaker);
    }
    return speaker;
  };

  for (const row of text.split("\n")) {
    const line = row.trim();
    if (!line) continue;

    const bold = /^\*\*([^*]{1,40}?)\s*[:：–—-]?\s*\*\*\s*(.*)$/.exec(line);
    if (bold && bold[2].trim()) {
      pushLine(takeSpeaker(bold[1]), bold[2]);
      detected = true;
      continue;
    }

    const colon = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'’-]{0,23}?)\s*[:：]\s*(.+)$/.exec(line);
    if (colon) {
      pushLine(takeSpeaker(colon[1]), colon[2]);
      detected = true;
      continue;
    }

    const dash = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ .'’-]{0,23}?)\s+[–—]\s*(.+)$/.exec(line);
    if (dash) {
      pushLine(takeSpeaker(dash[1]), dash[2]);
      detected = true;
      continue;
    }

    const numbered = /^\(?\d{1,2}[.)]\s*(.+)$/.exec(line);
    if (numbered) {
      pushLine(alternating, numbered[1]);
      continue;
    }

    pushLine(alternating, line);
  }

  if (!detected && lines.length === 1) {
    const sentences = splitSentences(lines[0].text);
    if (sentences.length > 1) {
      lines.splice(
        0,
        1,
        ...sentences.map((sentence, index) => ({
          id: createDialogueLineId(),
          speaker: (index % 2 === 0 ? "A" : "B") as DialogueSpeaker,
          text: sentence,
        })),
      );
    }
  }

  return { lines: applyDialogueLimits(lines), labels, detected };
}

