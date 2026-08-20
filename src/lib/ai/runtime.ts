import "server-only";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { requireAiIdentity } from "@/lib/ai/authorization";
import {
  normalizeTextAgent,
  TEXT_AGENTS,
  type TextAgentId,
} from "@/lib/ai/catalog";

export async function resolveTextModel(requestedAgent: TextAgentId | undefined) {
  const identity = await requireAiIdentity();
  const agent = normalizeTextAgent(requestedAgent);

  if (agent === "claude-opus" && !identity.isOwner) {
    throw new Error("Only the app owner can select Claude Opus 4.8.");
  }

  if (agent === "claude-opus") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured.");
    const anthropic = createAnthropic({ apiKey });
    return { agent, model: anthropic(TEXT_AGENTS[agent].model), identity };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  const openai = createOpenAI({ apiKey });
  return { agent, model: openai.responses(TEXT_AGENTS[agent].model), identity };
}
