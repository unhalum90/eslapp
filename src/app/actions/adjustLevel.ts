"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { resolveTextModel } from "@/lib/ai/runtime";
import type { TextAgentId } from "@/lib/ai/catalog";

export interface LevelAdjustmentResult {
  adjustedText: string;
  originalLevel: string;
  targetLevel: string;
  wordCount: { original: number; adjusted: number };
  complexity: string;
}

const adjustmentSchema = z.object({
  adjustedText: z.string().min(1),
  originalLevel: z.enum(["A1", "A2", "B1", "B2", "Unknown"]),
  complexity: z.string().min(1),
});

const CECRL_LEVELS = new Set(["A1", "A2", "B1", "B2"]);

export async function adjustLevel(
  text: string,
  targetLevel: string,
  requestedAgent?: TextAgentId,
): Promise<LevelAdjustmentResult> {
  if (!text.trim()) throw new Error("Select text before adjusting its level.");
  if (!CECRL_LEVELS.has(targetLevel)) throw new Error("Unsupported CECRL target level.");

  const { model } = await resolveTextModel(requestedAgent);
  const { output } = await generateText({
    model,
    reasoning: "medium",
    output: Output.object({ schema: adjustmentSchema }),
    instructions:
      "You are an expert ESL text adapter for French secondary-school teachers. Preserve meaning and return pedagogically usable English.",
    prompt: `Rewrite the text for CECRL level ${targetLevel}.

Level guidance:
- A1: very simple sentences, high-frequency vocabulary, mostly present tense.
- A2: simple connected sentences, everyday vocabulary, present and past.
- B1: connected discourse, broader vocabulary, standard basic tenses.
- B2: complex sentences, abstract vocabulary, conditional and nuanced expression.

Original text:
${text}`,
  });

  return {
    ...output,
    targetLevel,
    wordCount: {
      original: text.trim().split(/\s+/).length,
      adjusted: output.adjustedText.trim().split(/\s+/).length,
    },
  };
}
