"use server";

import { getAiIdentity } from "@/lib/ai/authorization";
import { IMAGE_AGENT, TEXT_AGENTS } from "@/lib/ai/catalog";

export async function getAiConfiguration() {
  const identity = await getAiIdentity();
  return {
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
  };
}
