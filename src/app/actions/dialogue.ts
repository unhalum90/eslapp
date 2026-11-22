"use server";

import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import { resolveTextModel } from "@/lib/ai/runtime";
import { TEXT_AGENTS, type TextAgentId } from "@/lib/ai/catalog";
import {
  isVoxtralConfigured,
  resolveDialogueTtsModel,
  VOXTRAL_TTS_LABEL,
} from "@/lib/dialogue/catalog";
import {
  applyDialogueLimits,
  createDialogueLineId,
  DIALOGUE_LIMITS,
  validateDialogueLines,
} from "@/lib/dialogue/domain";
import {
  createDialogueVoice,
  describeVoxtralError,
  listDialogueVoices,
  synthesizeDialogue,
} from "@/lib/dialogue/voxtral";
import {
  describeMistralScriptError,
  generateDialogueScriptWithMistral,
  isMistralScriptConfigured,
  resolveDialogueScriptModel,
} from "@/lib/dialogue/mistralScript";
import type {
  DialogueAudioSegment,
  DialogueLevel,
  DialogueLine,
  DialogueVoiceOption,
} from "@/lib/dialogue/types";

const dialogueSchema = z.object({
  title: z.string().min(1).max(120),
  lines: z
    .array(
      z.object({
        speaker: z.enum(["A", "B"]),
        text: z.string().min(1).max(DIALOGUE_LIMITS.maxCharsPerLine),
      }),
    )
    .min(DIALOGUE_LIMITS.minLines)
    .max(DIALOGUE_LIMITS.maxLines),
});

const DIALOGUE_INSTRUCTIONS = `You write two-voice English dialogues that a French ESL teacher can play in class.

Rules:
- Speak only with the two speakers A and B, always alternating and starting with A.
- Keep every line under 25 words and natural for spoken English, with contractions and everyday chunks.
- Match the requested CECRL level: A1/A2 use simple present, basic questions and high-frequency words; B1/B2 may use past tenses, modals and linking words.
- Never add stage directions, narrator text, translations, brackets or speaker names inside the line text.
- Weave in the requested target vocabulary when it fits naturally.
- The dialogue must resolve the scenario realistically in the requested number of exchanges.
- Give the dialogue a short classroom title in English.`;

export interface GenerateDialogueInput {
  scenario: string;
  level: DialogueLevel;
  turns: number;
  vocabulary?: string;
  register?: "informal" | "polite" | "formal";
  agent?: TextAgentId;
}

export type DialogueScriptEngine = "openai" | "anthropic" | "mistral";

export type GenerateDialogueResult =
  | { ok: true; title: string; lines: DialogueLine[]; engine: DialogueScriptEngine; engineLabel: string }
  | { ok: false; message: string };

export interface SynthesizeDialogueInput {
  lines: DialogueLine[];
  voiceA: DialogueVoiceOption;
  voiceB: DialogueVoiceOption;
}

export type SynthesizeDialogueResult =
  | { ok: true; segments: DialogueAudioSegment[]; model: string }
  | { ok: false; message: string };

export interface VoiceCatalogueResult {
  ok: boolean;
  configured: boolean;
  label: string;
  model: string;
  voices: DialogueVoiceOption[];
  message?: string;
}

export type CloneVoiceResult =
  | { ok: true; voice: DialogueVoiceOption }
  | { ok: false; message: string };

function shouldFallBackToMistral(error: unknown): boolean {
  const detail = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    detail.includes("not configured") ||
    detail.includes("api key") ||
    detail.includes("401") ||
    detail.includes("unauthorized") ||
    detail.includes("incorrect")
  );
}

export async function generateDialogueScript(
  input: GenerateDialogueInput,
): Promise<GenerateDialogueResult> {
  const scenario = input.scenario.trim();
  if (!scenario) {
    return { ok: false, message: "Describe the situation before generating a dialogue." };
  }

  const turns = Math.min(24, Math.max(3, Math.round(input.turns || 8)));
  const register = input.register ?? "polite";
  const vocabulary = input.vocabulary?.trim() ?? "";
  const agent: TextAgentId = input.agent ?? "codex-terra";
  const providerKey =
    agent === "claude-opus" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY;

  if (providerKey) {
    try {
      const { model } = await resolveTextModel(agent);
      const { output } = await generateText({
        model,
        reasoning: "medium",
        instructions: DIALOGUE_INSTRUCTIONS,
        output: Output.object({ schema: dialogueSchema }),
        prompt: `Write a dialogue for this situation: ${scenario}

Target level: ${input.level}
Register: ${register}
Exchanges: exactly ${turns} turns in total (${turns} lines split between A and B).
${vocabulary ? `Target vocabulary to use naturally: ${vocabulary}` : "No specific vocabulary list."}`,
      });

      return {
        ok: true,
        title: output.title.trim(),
        lines: applyDialogueLimits(
          output.lines.map((line) => ({
            id: createDialogueLineId(),
            speaker: line.speaker,
            text: line.text.trim(),
          })),
        ),
        engine: agent === "claude-opus" ? "anthropic" : "openai",
        engineLabel: TEXT_AGENTS[agent].label,
      };
    } catch (error) {
      console.error("[dialogue] script generation failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });

      if (NoOutputGeneratedError.isInstance(error) || NoObjectGeneratedError.isInstance(error)) {
        return { ok: false, message: "The script could not be structured. Try generating it again." };
      }

      const detail = error instanceof Error ? error.message.toLowerCase() : "";
      if (detail.includes("sign in")) {
        return {
          ok: false,
          message: "Sign in with the teacher account before generating dialogues.",
        };
      }
      // A missing or rejected paid key should not block the tool: fall through to Mistral.
      if (!shouldFallBackToMistral(error)) {
        return { ok: false, message: "Dialogue generation did not complete. Please try again." };
      }
    }
  }

  if (isMistralScriptConfigured()) {
    try {
      const model = resolveDialogueScriptModel();
      const script = await generateDialogueScriptWithMistral({
        scenario,
        level: input.level,
        turns,
        vocabulary,
        register,
        model,
      });
      return {
        ok: true,
        title: script.title,
        lines: script.lines,
        engine: "mistral",
        engineLabel: `Mistral · ${model}`,
      };
    } catch (error) {
      console.error("[dialogue] mistral script generation failed", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      return { ok: false, message: describeMistralScriptError(error) };
    }
  }

  return {
    ok: false,
    message:
      "No script engine is configured on the server. Add MISTRAL_API_KEY (recommended), OPENAI_API_KEY or ANTHROPIC_API_KEY to the deployment environment and redeploy.",
  };
}

function sanitizeVoice(voice: DialogueVoiceOption | undefined, fallbackName: string): DialogueVoiceOption {
  return {
    id: typeof voice?.id === "string" ? voice.id.trim() : "",
    slug: typeof voice?.slug === "string" ? voice.slug.trim() : "",
    name: typeof voice?.name === "string" && voice.name.trim() ? voice.name.trim() : fallbackName,
    gender: typeof voice?.gender === "string" ? voice.gender : null,
    languages: Array.isArray(voice?.languages) ? voice.languages.filter(Boolean) : [],
    type: voice?.type === "custom" ? "custom" : "preset",
    tags: Array.isArray(voice?.tags) ? voice.tags.filter(Boolean) : [],
  };
}

export async function synthesizeDialogueAudio(
  input: SynthesizeDialogueInput,
): Promise<SynthesizeDialogueResult> {
  if (!isVoxtralConfigured()) {
    return {
      ok: false,
      message: "Add MISTRAL_API_KEY to .env.local and restart the server to generate audio.",
    };
  }

  const lines = applyDialogueLimits(
    (input.lines ?? [])
      .filter((line) => typeof line?.text === "string" && line.text.trim().length > 0)
      .map((line) => ({
        id: line.id || createDialogueLineId(),
        speaker: line.speaker === "B" ? ("B" as const) : ("A" as const),
        text: line.text.trim(),
      })),
  );

  const problem = validateDialogueLines(lines);
  if (problem) return { ok: false, message: problem };

  try {
    const { segments, model } = await synthesizeDialogue({
      lines,
      voiceA: sanitizeVoice(input.voiceA, "Voice A"),
      voiceB: sanitizeVoice(input.voiceB, "Voice B"),
      format: "mp3",
    });
    return { ok: true, segments, model };
  } catch (error) {
    console.error("[dialogue] speech generation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, message: describeVoxtralError(error) };
  }
}

export async function listDialogueVoiceCatalogue(): Promise<VoiceCatalogueResult> {
  const model = resolveDialogueTtsModel();
  const base = { configured: isVoxtralConfigured(), label: VOXTRAL_TTS_LABEL, model };

  if (!base.configured) {
    return {
      ...base,
      ok: false,
      voices: [],
      message: "Add MISTRAL_API_KEY to .env.local and restart the server to load voices.",
    };
  }

  try {
    return { ...base, ok: true, voices: await listDialogueVoices() };
  } catch (error) {
    console.error("[dialogue] voice listing failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ...base, ok: false, voices: [], message: describeVoxtralError(error) };
  }
}

export async function cloneDialogueVoice(input: {
  name: string;
  sampleBase64: string;
  filename: string;
  gender?: string | null;
}): Promise<CloneVoiceResult> {
  const name = input.name?.trim();
  const sampleBase64 = input.sampleBase64?.trim();
  if (!name) return { ok: false, message: "Give the cloned voice a name." };
  if (!sampleBase64) return { ok: false, message: "Record or upload a 2–3 second audio sample." };

  const sampleBytes = Math.floor((sampleBase64.replace(/=+$/, "").length * 3) / 4);
  if (sampleBytes > DIALOGUE_LIMITS.maxVoiceSampleBytes) {
    return { ok: false, message: "Keep the voice sample under 5 MB (2–3 seconds is enough)." };
  }

  try {
    const voice = await createDialogueVoice({
      name,
      sampleBase64,
      filename: input.filename?.trim() || "voice-sample.mp3",
      gender: input.gender ?? null,
    });
    return { ok: true, voice };
  } catch (error) {
    console.error("[dialogue] voice cloning failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, message: describeVoxtralError(error) };
  }
}
