import "server-only";

import {
  MISTRAL_API_BASE_URL,
  MISTRAL_API_KEY_ENV_VAR,
  resolveDialogueTtsModel,
  type VoxtralSpeechFormat,
} from "@/lib/dialogue/catalog";
import { DIALOGUE_LIMITS } from "@/lib/dialogue/domain";
import type {
  DialogueAudioSegment,
  DialogueLine,
  DialogueVoiceOption,
} from "@/lib/dialogue/types";

/**
 * Minimal Mistral client for Voxtral Mini TTS. The repository talks to every
 * other provider over HTTP as well, so no extra SDK dependency is introduced.
 * Docs: POST /v1/audio/speech -> { audio_data: "<base64>" }
 *       GET  /v1/audio/voices, POST /v1/audio/voices
 */

export class VoxtralError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "VoxtralError";
    this.status = status;
  }
}

interface MistralVoicePayload {
  id?: string;
  name?: string;
  slug?: string | null;
  languages?: string[] | null;
  gender?: string | null;
  type?: string | null;
  tags?: string[] | null;
}

interface MistralVoiceListPayload {
  items?: MistralVoicePayload[];
  total?: number;
}

type VoiceRefKind = "id" | "slug" | "model-default";

interface VoiceRef {
  kind: VoiceRefKind;
  value: string;
}

function apiKey(): string {
  const key = process.env[MISTRAL_API_KEY_ENV_VAR]?.trim();
  if (!key) {
    throw new VoxtralError(
      `${MISTRAL_API_KEY_ENV_VAR} is not configured on the server. Add it to .env.local and restart the dev server.`,
      0,
    );
  }
  return key;
}

async function mistralFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${MISTRAL_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}

async function readMistralError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown; message?: unknown };
    const detail = payload.detail ?? payload.message;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((entry) => (entry as { msg?: string }).msg ?? "")
        .filter(Boolean)
        .join("; ");
    }
    return JSON.stringify(detail ?? payload).slice(0, 300);
  } catch {
    return response.statusText || `HTTP ${response.status}`;
  }
}

function mimeForFormat(format: VoxtralSpeechFormat): string {
  switch (format) {
    case "wav":
      return "audio/wav";
    case "opus":
      return "audio/ogg";
    case "flac":
      return "audio/flac";
    case "pcm":
      return "audio/L16";
    default:
      return "audio/mpeg";
  }
}

function normalizeVoice(payload: MistralVoicePayload, index = 0): DialogueVoiceOption {
  const slug = payload.slug?.trim() ?? "";
  const id = payload.id?.trim() ?? slug;
  return {
    id: id || `voice-${index}`,
    slug,
    name: payload.name?.trim() || slug || "Voice",
    gender: payload.gender ?? null,
    languages: (payload.languages ?? []).filter((language): language is string => Boolean(language)),
    type: payload.type === "custom" ? "custom" : "preset",
    tags: (payload.tags ?? []).filter((tag): tag is string => Boolean(tag)),
  };
}

/**
 * Mistral caps `limit` at 100. Presets and clones are both returned so a teacher
 * can reuse a voice she recorded once.
 */
export async function listDialogueVoices(): Promise<DialogueVoiceOption[]> {
  const voices: DialogueVoiceOption[] = [];
  let offset = 0;

  for (let page = 0; page < 5; page += 1) {
    const response = await mistralFetch(
      `/audio/voices?type=all&limit=${DIALOGUE_LIMITS.maxVoicePageSize}&offset=${offset}`,
    );
    if (!response.ok) {
      throw new VoxtralError(await readMistralError(response), response.status);
    }

    const payload = (await response.json()) as MistralVoiceListPayload;
    const items = payload.items ?? [];
    voices.push(...items.map((item, index) => normalizeVoice(item, offset + index)));
    offset += items.length;

    const total = payload.total ?? voices.length;
    if (items.length === 0 || voices.length >= total) break;
  }

  return voices;
}

/** Remembers which voice identifier shape Mistral accepted, so lines stay fast. */
let preferredVoiceRef: VoiceRefKind | null = null;

function voiceRefCandidates(voice: DialogueVoiceOption): VoiceRef[] {
  const candidates: VoiceRef[] = [];
  if (voice.id) candidates.push({ kind: "id", value: voice.id });
  if (voice.slug) candidates.push({ kind: "slug", value: voice.slug });
  candidates.push({ kind: "model-default", value: "" });

  if (!preferredVoiceRef) return candidates;
  const preferred = candidates.find((candidate) => candidate.kind === preferredVoiceRef);
  if (!preferred) return candidates;
  return [preferred, ...candidates.filter((candidate) => candidate.kind !== preferred.kind)];
}

function isVoiceReferenceError(error: VoxtralError): boolean {
  if (error.status !== 400 && error.status !== 404 && error.status !== 422) return false;
  return /voice|slug|audio reference|ref_audio/i.test(error.message);
}

interface SpeechRequestResult {
  ok: boolean;
  base64?: string;
  error?: VoxtralError;
}

async function requestSpeech(params: {
  text: string;
  format: VoxtralSpeechFormat;
  model: string;
  voiceRef: VoiceRef;
}): Promise<SpeechRequestResult> {
  const body: Record<string, unknown> = {
    input: params.text,
    response_format: params.format,
    stream: false,
    model: params.model,
  };
  if (params.voiceRef.value) body.voice_id = params.voiceRef.value;

  let response = await mistralFetch("/audio/speech", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await readMistralError(response);
    const modelRejected =
      response.status === 400 && /model/i.test(detail) && params.model.length > 0;
    if (!modelRejected) return { ok: false, error: new VoxtralError(detail, response.status) };

    // Fall back to the API's default speech model when the pinned id is retired.
    delete body.model;
    response = await mistralFetch("/audio/speech", {
      method: "POST",
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      return { ok: false, error: new VoxtralError(await readMistralError(response), response.status) };
    }
  }

  const payload = (await response.json()) as { audio_data?: string };
  if (!payload.audio_data) {
    return { ok: false, error: new VoxtralError("Mistral returned no audio data.", response.status) };
  }
  return { ok: true, base64: payload.audio_data };
}

export async function synthesizeSpeech(input: {
  text: string;
  voice: DialogueVoiceOption;
  format?: VoxtralSpeechFormat;
  model?: string;
}): Promise<{ base64: string; mime: string; model: string }> {
  const format = input.format ?? "mp3";
  const model = input.model ?? resolveDialogueTtsModel();
  let lastError: VoxtralError | null = null;

  for (const voiceRef of voiceRefCandidates(input.voice)) {
    const result = await requestSpeech({ text: input.text, format, model, voiceRef });
    if (result.ok && result.base64) {
      preferredVoiceRef = voiceRef.kind;
      return { base64: result.base64, mime: mimeForFormat(format), model };
    }
    if (result.error) {
      lastError = result.error;
      if (!isVoiceReferenceError(result.error)) throw result.error;
    }
  }

  throw lastError ?? new VoxtralError("Speech generation failed for this line.");
}

const SPEECH_CONCURRENCY = 4;

/**
 * Generates one MP3 per line so the player can highlight the active speaker.
 * The caller concatenates the segments for the downloadable file.
 */
export async function synthesizeDialogue(input: {
  lines: DialogueLine[];
  voiceA: DialogueVoiceOption;
  voiceB: DialogueVoiceOption;
  format?: VoxtralSpeechFormat;
}): Promise<{ segments: DialogueAudioSegment[]; model: string }> {
  const format = input.format ?? "mp3";
  const model = resolveDialogueTtsModel();
  const segments = new Array<DialogueAudioSegment>(input.lines.length);
  let cursor = 0;
  let firstError: unknown = null;

  const worker = async () => {
    while (cursor < input.lines.length && !firstError) {
      const index = cursor;
      cursor += 1;
      const line = input.lines[index];
      try {
        const speech = await synthesizeSpeech({
          text: line.text,
          voice: line.speaker === "B" ? input.voiceB : input.voiceA,
          format,
          model,
        });
        segments[index] = {
          speaker: line.speaker,
          base64: speech.base64,
          bytes: base64Bytes(speech.base64),
          mime: speech.mime,
        };
      } catch (error) {
        firstError = firstError ?? error;
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(SPEECH_CONCURRENCY, input.lines.length) }, () => worker()),
  );

  if (firstError) throw firstError;
  return { segments, model };
}

function base64Bytes(base64: string): number {
  const normalized = base64.replace(/\s+/g, "").replace(/=+$/, "");
  return Math.floor((normalized.length * 3) / 4);
}

/** Clones a voice from a short (2–3 second) recording the teacher uploads. */
export async function createDialogueVoice(input: {
  name: string;
  sampleBase64: string;
  filename: string;
  languages?: string[];
  gender?: string | null;
}): Promise<DialogueVoiceOption> {
  const response = await mistralFetch("/audio/voices", {
    method: "POST",
    body: JSON.stringify({
      name: input.name,
      sample_audio: input.sampleBase64,
      sample_filename: input.filename,
      languages: input.languages ?? ["en"],
      ...(input.gender ? { gender: input.gender } : {}),
    }),
  });

  if (!response.ok) {
    throw new VoxtralError(await readMistralError(response), response.status);
  }

  const payload = (await response.json()) as MistralVoicePayload;
  return { ...normalizeVoice(payload), type: "custom" };
}

export function describeVoxtralError(error: unknown): string {
  if (error instanceof VoxtralError) {
    if (error.status === 0) return error.message;
    if (error.status === 401) {
      return `${MISTRAL_API_KEY_ENV_VAR} was rejected by Mistral. Check the key in .env.local.`;
    }
    if (error.status === 402) {
      return "The Mistral account has no remaining credit for speech generation.";
    }
    if (error.status === 422 || error.status === 400) {
      return `Mistral rejected the request: ${error.message}`;
    }
    if (error.status === 429) {
      return "Mistral is rate limiting speech generation. Wait a few seconds and try again.";
    }
    if (error.status >= 500) {
      return "Mistral speech generation is temporarily unavailable. Try again shortly.";
    }
    return `Mistral speech generation failed: ${error.message}`;
  }

  if (error instanceof Error && error.message) return error.message;
  return "Speech generation failed. Check the server logs for details.";
}


