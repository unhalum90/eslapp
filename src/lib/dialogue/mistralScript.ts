import "server-only";

import {
  MISTRAL_API_BASE_URL,
  MISTRAL_API_KEY_ENV_VAR,
} from "@/lib/dialogue/catalog";
import {
  extractJsonObject,
  normalizeDialogueScriptPayload,
  type DialogueScriptPayload,
} from "@/lib/dialogue/domain";
import type { DialogueLevel } from "@/lib/dialogue/types";

/**
 * Mistral chat fallback for dialogue scripts, so the Dialogue Builder works with
 * a single `MISTRAL_API_KEY` and no OpenAI/Anthropic key.
 */
export const MISTRAL_SCRIPT_MODEL_ENV_VAR = "MISTRAL_MODEL_DIALOGUE_SCRIPT";
export const MISTRAL_SCRIPT_DEFAULT_MODEL = "mistral-small-latest";

export class MistralScriptError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "MistralScriptError";
    this.status = status;
  }
}

export function resolveDialogueScriptModel(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env[MISTRAL_SCRIPT_MODEL_ENV_VAR]?.trim();
  return configured && configured.length > 0 ? configured : MISTRAL_SCRIPT_DEFAULT_MODEL;
}

export function isMistralScriptConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env[MISTRAL_API_KEY_ENV_VAR]?.trim());
}

const SCRIPT_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          speaker: { type: "string", enum: ["A", "B"] },
          text: { type: "string" },
        },
        required: ["speaker", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["title", "lines"],
  additionalProperties: false,
} as const;

function scriptSystemPrompt(level: DialogueLevel, turns: number, register: string, vocabulary: string): string {
  return `You write two-voice English dialogues for French ESL teachers.

Return only a JSON object with this exact shape:
{"title": "short classroom title in English", "lines": [{"speaker": "A", "text": "..."}]}

Rules:
- Speak only with speakers A and B, always alternating and starting with A.
- Produce exactly ${turns} lines in total.
- Keep every line under 25 words, natural for spoken English, with contractions and everyday chunks.
- Level ${level}: ${
    level === "A1" || level === "A2"
      ? "simple present, basic questions, high-frequency vocabulary."
      : "past tenses, modals and linking words are allowed."
  }
- Register: ${register}.
- Never add stage directions, narrator text, translations, brackets or speaker names inside "text".
${vocabulary ? `- Weave in this target vocabulary naturally: ${vocabulary}.` : ""}
- The dialogue must resolve the scenario realistically.`;
}

async function mistralChat(body: Record<string, unknown>): Promise<string> {
  const key = process.env[MISTRAL_API_KEY_ENV_VAR]?.trim();
  if (!key) {
    throw new MistralScriptError(`${MISTRAL_API_KEY_ENV_VAR} is not configured on the server.`, 0);
  }

  const response = await fetch(`${MISTRAL_API_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new MistralScriptError(detail.slice(0, 300), response.status);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content.trim()) {
    throw new MistralScriptError("Mistral returned an empty script.", response.status);
  }
  return content;
}

export async function generateDialogueScriptWithMistral(input: {
  scenario: string;
  level: DialogueLevel;
  turns: number;
  vocabulary?: string;
  register?: string;
  model?: string;
}): Promise<DialogueScriptPayload> {
  const register = input.register ?? "polite";
  const vocabulary = input.vocabulary?.trim() ?? "";
  const model = input.model ?? resolveDialogueScriptModel();

  const messages = [
    { role: "system", content: scriptSystemPrompt(input.level, input.turns, register, vocabulary) },
    {
      role: "user",
      content: `Situation: ${input.scenario}\n\nWrite the dialogue now as JSON only.`,
    },
  ];

  const attempt = async (responseFormat?: Record<string, unknown>) => {
    const content = await mistralChat({
      model,
      messages,
      temperature: 0.7,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    });
    return normalizeDialogueScriptPayload(extractJsonObject(content));
  };

  let parsed: DialogueScriptPayload | null = null;
  try {
    parsed = await attempt({
      type: "json_schema",
      json_schema: { name: "dialogue_script", schema: SCRIPT_JSON_SCHEMA, strict: true },
    });
  } catch (error) {
    // Older models reject json_schema; fall back to plain JSON mode.
    const status = error instanceof MistralScriptError ? error.status : 0;
    if (status !== 400 && status !== 422) throw error;
  }

  if (!parsed) parsed = await attempt({ type: "json_object" });
  if (!parsed) {
    throw new MistralScriptError("Mistral did not return a usable dialogue.", 500);
  }
  return parsed;
}

export function describeMistralScriptError(error: unknown): string {
  if (error instanceof MistralScriptError) {
    if (error.status === 0) return error.message;
    if (error.status === 401) return `${MISTRAL_API_KEY_ENV_VAR} was rejected by Mistral.`;
    if (error.status === 429) return "Mistral is rate limiting script generation. Try again shortly.";
    if (error.status >= 500) return "Mistral script generation is temporarily unavailable.";
    return `Mistral script generation failed: ${error.message}`;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Dialogue generation did not complete. Please try again.";
}
