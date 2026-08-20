"use server";

import { generateText, Output } from "ai";
import { z } from "zod";
import { resolveTextModel } from "@/lib/ai/runtime";
import type { TextAgentId } from "@/lib/ai/catalog";

export interface GeneratedVocabulary {
  english: string;
  category: string;
  emoji: string;
}

export interface GeneratedGridPrompt {
  text: string;
  type: "positive" | "negative" | "question";
}

export interface GeneratedActivityPack {
  topic: string;
  level: string;
  vocabulary: GeneratedVocabulary[];
  gridPrompts: GeneratedGridPrompt[];
}

const activityPackSchema = z.object({
  vocabulary: z
    .array(
      z.object({
        english: z.string().min(1),
        category: z.string().min(1),
        emoji: z.string().min(1),
      }),
    )
    .length(48),
  gridPrompts: z
    .array(
      z.object({
        text: z.string().min(1),
        type: z.enum(["positive", "negative", "question"]),
      }),
    )
    .length(36),
});

export async function generateActivities(
  topic: string,
  level: string = "A1-A2",
  requestedAgent?: TextAgentId,
): Promise<GeneratedActivityPack> {
  const normalizedTopic = topic.trim();
  if (!normalizedTopic) throw new Error("Enter a topic before generating activities.");

  const { model } = await resolveTextModel(requestedAgent);
  const { output } = await generateText({
    model,
    reasoning: "medium",
    output: Output.object({ schema: activityPackSchema }),
    instructions:
      "You create accurate, age-appropriate ESL classroom material for French secondary-school teachers.",
    prompt: `Create an activity pack about "${normalizedTopic}" for CECRL level ${level}.

Requirements:
- Exactly 48 vocabulary items divided into four distinct categories of 12.
- Every vocabulary item has a suitable emoji.
- Exactly 36 short grid prompts of two to four words.
- Grid prompts contain exactly 12 positive, 12 negative, and 12 question items.
- Avoid duplicate vocabulary and keep every item appropriate for ${level}.`,
  });

  return {
    topic: normalizedTopic,
    level,
    vocabulary: output.vocabulary,
    gridPrompts: output.gridPrompts,
  };
}
