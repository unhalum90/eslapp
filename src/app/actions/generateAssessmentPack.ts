"use server";

import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import type { TextAgentId } from "@/lib/ai/catalog";
import { resolveTextModel } from "@/lib/ai/runtime";
import type { CefrLevel, LevelCode } from "@/lib/phase-one/types";
import type { GeneratedAssessmentPack } from "@/lib/teacher-pack/assessmentPack";

const itemSchema = z.object({
  prompt: z.string().min(1),
  choices: z.array(z.string().min(1)).max(8),
  expectedAnswer: z.string().min(1),
  points: z.number().int().min(1).max(8),
  papSupports: z.array(z.string().min(1)).max(6),
});

const assessmentSchema = z.object({
  title: z.string().min(1),
  durationMinutes: z.number().int().min(35).max(90),
  studentMission: z.string().min(1),
  sections: z.array(z.object({
    skill: z.enum(["vocabulary", "reading", "listening", "grammar", "culture", "production"]),
    title: z.string().min(1),
    instructionEn: z.string().min(1),
    instructionFr: z.string().min(1),
    supportText: z.string().max(2400),
    // Keeping at most three scored items per section leaves room for the
    // rubric while preserving a genuine /20 total with every entry worth at
    // least one point.
    items: z.array(itemSchema).min(1).max(3),
  })).min(3).max(5),
  rubric: z.array(z.object({
    criterion: z.string().min(1),
    secureDescriptor: z.string().min(1),
    developingDescriptor: z.string().min(1),
    beginningDescriptor: z.string().min(1),
    maxPoints: z.number().int().min(1).max(8),
  })).min(3).max(5),
  papGeneralSupports: z.array(z.string().min(1)).min(2).max(7),
});

export interface AssessmentGenerationContext {
  unit: {
    title: string;
    theme: string;
    level: LevelCode;
    problematic: string;
    culturalAxis: string;
    cefrEntry: CefrLevel | null;
    cefrTarget: CefrLevel | null;
    grammarPoints: string[];
    lexicalFields: string[];
    phonologyPoints: string[];
    finalTask: string;
    finalTaskBrief: string;
    successCriteria: string[];
  };
  sessions: Array<{ title: string; objective: string; expectedProduction: string }>;
}

export type GenerateAssessmentPackResult =
  | { ok: true; pack: GeneratedAssessmentPack }
  | { ok: false; message: string };

const ASSESSMENT_INSTRUCTIONS = `You create a coordinated end-of-sequence assessment pack for a French collège English teacher.

Rules:
- Assess only language, culture and communicative work explicitly present in the supplied sequence. No surprise skills.
- Use a progression from recognition/comprehension to contextual language and justified production.
- Write short English student instructions. Add concise French support instructions for PAP.
- Standard and PAP keep exactly the same ordered sections and items. PAP adds access supports; it does not lower the learning objective.
- Provide complete answers for a separate correction.
- The combined item points and rubric points must total exactly 20.
- Use 3–5 meaningful sections. Keep the student assessment suitable for two A4 pages.
- The rubric prioritizes meaning, organization and target-language use before spelling precision.
- Use original supports. Never copy publisher texts, branded characters, third-party worksheet wording or proprietary layouts.
- Do not claim an original support is authentic and do not invent official curriculum requirements.
- Keep the tone direct, practical and classroom-ready.`;

function ensureTwentyPoints(pack: GeneratedAssessmentPack): GeneratedAssessmentPack {
  const next = structuredClone(pack);
  const entries: Array<{ get: () => number; set: (value: number) => void }> = [
    ...next.sections.flatMap((section) => section.items.map((item) => ({
      get: () => item.points,
      set: (value: number) => { item.points = value; },
    }))),
    ...next.rubric.map((criterion) => ({
      get: () => criterion.maxPoints,
      set: (value: number) => { criterion.maxPoints = value; },
    })),
  ];
  let total = entries.reduce((sum, entry) => sum + entry.get(), 0);

  if (total < 20 && entries.length) {
    for (let index = entries.length - 1; total < 20 && index >= 0; index -= 1) {
      const entry = entries[index];
      const addable = Math.min(20 - total, Math.max(0, 8 - entry.get()));
      entry.set(entry.get() + addable);
      total += addable;
    }
    return next;
  }

  for (let index = entries.length - 1; total > 20 && index >= 0; index -= 1) {
    const entry = entries[index];
    const removable = Math.min(total - 20, Math.max(0, entry.get() - 1));
    entry.set(entry.get() - removable);
    total -= removable;
  }

  return next;
}

export async function generateAssessmentPack(
  context: AssessmentGenerationContext,
  requestedAgent?: TextAgentId,
): Promise<GenerateAssessmentPackResult> {
  try {
    const { model } = await resolveTextModel(requestedAgent);
    const { output } = await generateText({
      model,
      reasoning: "medium",
      instructions: ASSESSMENT_INSTRUCTIONS,
      output: Output.object({ schema: assessmentSchema }),
      prompt: `Create the aligned standard, PAP, correction and rubric source model.\n\n${JSON.stringify(context, null, 2)}`,
    });
    const withIds: GeneratedAssessmentPack = {
      ...output,
      sections: output.sections.map((section, sectionIndex) => ({
        ...section,
        id: `S${sectionIndex + 1}`,
        items: section.items.map((item, itemIndex) => ({
          ...item,
          id: `S${sectionIndex + 1}T${itemIndex + 1}`,
        })),
      })),
    };
    return { ok: true, pack: ensureTwentyPoints(withIds) };
  } catch (error) {
    console.error("[assessment-pack] generation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    if (NoOutputGeneratedError.isInstance(error) || NoObjectGeneratedError.isInstance(error)) {
      return { ok: false, message: "L’évaluation n’a pas pu être structurée. Relancez la génération." };
    }
    const detail = error instanceof Error ? error.message.toLowerCase() : "";
    if (detail.includes("sign in")) {
      return { ok: false, message: "Connectez-vous avec le compte enseignant pour générer l’évaluation." };
    }
    if (detail.includes("not configured")) {
      return { ok: false, message: "Le modèle de génération n’est pas encore configuré." };
    }
    return { ok: false, message: "La génération de l’évaluation n’a pas abouti. Réessayez dans un instant." };
  }
}
