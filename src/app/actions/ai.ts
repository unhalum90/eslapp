"use server";

import { generateText as generateTextWithModel } from "ai";
import { resolveTextModel } from "@/lib/ai/runtime";
import type { TextAgentId } from "@/lib/ai/catalog";

const ESL_ARCHITECT_INSTRUCTIONS = `You are The ESL Architect, an AI assistant for French ESL teachers.

Output rules:
1. Return only plain, classroom-ready text.
2. Do not return JSON, code fences, internal reasoning, or meta-commentary.
3. If asked for an image, describe the intended illustration in text.
4. For document edits, return the complete modified text.
5. Respect the supplied teacher context and do not invent student results.`;

export async function generateText(
  prompt: string,
  context: string = "",
  requestedAgent?: TextAgentId,
) {
  const { model } = await resolveTextModel(requestedAgent);
  const request = context
    ? `Existing text:\n${context}\n\nTeacher request:\n${prompt}`
    : `Teacher request:\n${prompt}`;

  const { text } = await generateTextWithModel({
    model,
    instructions: ESL_ARCHITECT_INSTRUCTIONS,
    prompt: request,
    reasoning: "medium",
  });

  return text.trim();
}
