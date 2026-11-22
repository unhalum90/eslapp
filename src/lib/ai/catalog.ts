export type TextAgentId = "codex-terra" | "claude-opus";
export type ImageAgentId = "gemini" | "openai";

export interface TextAgentDefinition {
  id: TextAgentId;
  label: string;
  provider: "OpenAI" | "Anthropic";
  model: string;
  requiredEnvironmentVariable: "OPENAI_API_KEY" | "ANTHROPIC_API_KEY";
}

export const DEFAULT_TEXT_AGENT: TextAgentId = "codex-terra";

export const TEXT_AGENTS: Record<TextAgentId, TextAgentDefinition> = {
  "codex-terra": {
    id: "codex-terra",
    label: "Codex Terra 5.6",
    provider: "OpenAI",
    model: "gpt-5.6-terra",
    requiredEnvironmentVariable: "OPENAI_API_KEY",
  },
  "claude-opus": {
    id: "claude-opus",
    label: "Claude Opus 4.8",
    provider: "Anthropic",
    model: "claude-opus-4-8",
    requiredEnvironmentVariable: "ANTHROPIC_API_KEY",
  },
};

export const IMAGE_AGENT = {
  id: "gemini",
  label: "Nano Banana 2",
  provider: "Google",
  model: "gemini-3.1-flash-image",
  requiredEnvironmentVariable: "GOOGLE_API_KEY",
} as const;

export const OPENAI_IMAGE_AGENT = {
  id: "openai",
  label: "GPT Image 2",
  provider: "OpenAI",
  model: "gpt-image-2",
  requiredEnvironmentVariable: "OPENAI_API_KEY",
} as const;

export const IMAGE_AGENTS = {
  gemini: IMAGE_AGENT,
  openai: OPENAI_IMAGE_AGENT,
} as const;

export function isImageAgentId(value: unknown): value is ImageAgentId {
  return value === "gemini" || value === "openai";
}

export function isTextAgentId(value: unknown): value is TextAgentId {
  return value === "codex-terra" || value === "claude-opus";
}

export function normalizeTextAgent(value: unknown): TextAgentId {
  return isTextAgentId(value) ? value : DEFAULT_TEXT_AGENT;
}

export function parseOwnerEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLocaleLowerCase("en"))
      .filter(Boolean),
  );
}
