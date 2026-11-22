"use server";

import { getAiIdentity, isAiAuthenticationRequired } from "@/lib/ai/authorization";
import { IMAGE_AGENT, IMAGE_AGENTS, TEXT_AGENTS } from "@/lib/ai/catalog";
import {
  isVoxtralConfigured,
  MISTRAL_API_KEY_ENV_VAR,
  resolveDialogueTtsModel,
  VOXTRAL_TTS_LABEL,
} from "@/lib/dialogue/catalog";

export async function getAiConfiguration() {
  const identity = await getAiIdentity();
  return {
    authenticationRequired: isAiAuthenticationRequired(),
    authenticated: Boolean(identity),
    canSelectAgent: identity?.isOwner ?? false,
    agents: {
      "codex-terra": {
        ...TEXT_AGENTS["codex-terra"],
        configured: Boolean(process.env.OPENAI_API_KEY),
      },
      "claude-opus": {
        ...TEXT_AGENTS["claude-opus"],
        configured: Boolean(process.env.ANTHROPIC_API_KEY),
      },
    },
    imageAgent: {
      ...IMAGE_AGENT,
      configured: Boolean(process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY),
    },
    imageAgents: {
      gemini: {
        ...IMAGE_AGENTS.gemini,
        configured: Boolean(process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY),
      },
      openai: {
        ...IMAGE_AGENTS.openai,
        configured: Boolean(process.env.OPENAI_API_KEY),
      },
    },
    voiceAgent: {
      id: "voxtral-mini-tts",
      label: VOXTRAL_TTS_LABEL,
      provider: "Mistral",
      model: resolveDialogueTtsModel(),
      requiredEnvironmentVariable: MISTRAL_API_KEY_ENV_VAR,
      configured: isVoxtralConfigured(),
    },
  };
}
