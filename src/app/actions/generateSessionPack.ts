"use server";

import { generateText, NoObjectGeneratedError, NoOutputGeneratedError, Output } from "ai";
import { z } from "zod";
import { resolveTextModel } from "@/lib/ai/runtime";
import type { TextAgentId } from "@/lib/ai/catalog";
import type { CefrLevel, LevelCode } from "@/lib/phase-one/types";
import type { GeneratedSessionPack, GeneratedSessionStage } from "@/lib/teacher-pack/sessionPack";

const phaseSchema = z.enum([
  "Réactivation",
  "Anticipation",
  "Input",
  "Compréhension",
  "Fait de langue",
  "Entraînement",
  "Production",
  "Trace écrite",
  "Homework",
]);

const stageSchema = z.object({
  phase: phaseSchema,
  minutes: z.number().int().min(1).max(25),
  teacherAction: z.string().min(1),
  studentAction: z.string().min(1),
});

const taskSchema = z.object({
  title: z.string().min(1),
  instructionEn: z.string().min(1),
  instructionFr: z.string().min(1),
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).max(8),
  expectedAnswer: z.string().min(1),
  papSupports: z.array(z.string().min(1)).max(8),
  sentenceStarters: z.array(z.string().min(1)).max(5),
});

const sessionPackSchema = z.object({
  title: z.string().min(1),
  enquiryQuestion: z.string().min(1),
  objective: z.string().min(1),
  support: z.object({
    title: z.string().min(1),
    kind: z.enum(["text", "audio", "video", "image", "teacher_resource"]),
    classroomContent: z.string().min(40).max(2200),
    sourceNote: z.string(),
  }),
  stages: z.array(stageSchema).min(6).max(9),
  tasks: z.array(taskSchema).min(3).max(5),
  languageFocus: z.object({
    grammar: z.array(z.string()).max(5),
    vocabulary: z.array(z.string()).max(14),
    phonology: z.array(z.string()).max(4),
  }),
  finalProduction: z.object({
    instructionEn: z.string().min(1),
    successCriteria: z.array(z.string().min(1)).min(2).max(5),
    papStarters: z.array(z.string().min(1)).min(1).max(5),
  }),
  traceEcrite: z.string().min(1),
  homework: z.string().min(1),
  differentiationNotes: z.array(z.string().min(1)).min(2).max(8),
});

export interface SessionPackGenerationContext {
  unit: {
    title: string;
    theme: string;
    level: LevelCode;
    culturalAxis: string;
    problematic: string;
    cefrEntry: CefrLevel | null;
    cefrTarget: CefrLevel | null;
    finalTask: string;
    finalTaskBrief: string;
    grammarPoints: string[];
    lexicalFields: string[];
  };
  session: {
    title: string;
    objective: string;
    question: string;
    durationMinutes: number;
    notes: string;
  };
  sessionNumber: number;
  previousSessions: Array<{ title: string; objective: string }>;
  sourceSummaries: Array<{ title: string; kind: string; notes: string }>;
}

export type GenerateSessionPackResult =
  | { ok: true; pack: GeneratedSessionPack }
  | { ok: false; message: string };

const TEACHER_PACK_INSTRUCTIONS = `You create one coordinated lesson pack for a French collège English teacher.

The teacher's house style is non-negotiable:
- One 45–55 minute lesson with one clear linguistic/cultural outcome.
- Bilingual and classroom-ready: short English student instructions; concise French metalinguistic help and PAP scaffolding.
- Use this sequence: retrieval or anticipation → input → closed comprehension → language noticing → controlled practice → guided production → trace écrite → homework.
- Reception must precede production. Reuse earlier language and make the final production advance the sequence's final task.
- Keep the voice direct, practical and teacher-like. Avoid corporate or academic filler.
- Standard and PAP versions must keep the same objective and ordered tasks. PAP changes access, not intellectual ambition.
- PAP support should segment instructions and add checkboxes, word banks, sentence starters or reduced copying.
- Create content that fits a two-page student handout. Keep the central support concise and tasks bounded.
- Create an original classroom support when source contents are not supplied. Never reproduce branded characters, publisher text, copyrighted worksheet wording or a proprietary layout.
- Do not invent official curriculum claims or pretend an original support is authentic.
- expectedAnswer must be complete enough to power a separate correction.
- traceEcrite must be short, reusable English target language, not a French lesson summary.
- Teacher actions are written in concise French. Student actions are concrete and observable.

Return only the requested structured lesson pack.`;

function normalizeStageMinutes(
  stages: GeneratedSessionStage[],
  requestedDuration: number,
): GeneratedSessionStage[] {
  const target = Math.min(55, Math.max(45, requestedDuration || 55));
  const next = stages.map((stage) => ({ ...stage }));
  let total = next.reduce((sum, stage) => sum + stage.minutes, 0);

  if (total < target) {
    const preferredIndex = next.findIndex((stage) => stage.phase === "Production");
    const index = preferredIndex >= 0 ? preferredIndex : next.length - 1;
    next[index].minutes += target - total;
    return next;
  }

  for (let index = next.length - 1; total > target && index >= 0; index -= 1) {
    const removable = Math.min(total - target, Math.max(0, next[index].minutes - 2));
    next[index].minutes -= removable;
    total -= removable;
  }

  return next;
}

export async function generateSessionPack(
  context: SessionPackGenerationContext,
  requestedAgent?: TextAgentId,
): Promise<GenerateSessionPackResult> {
  try {
    const { model } = await resolveTextModel(requestedAgent);
    const { output } = await generateText({
      model,
      reasoning: "medium",
      instructions: TEACHER_PACK_INSTRUCTIONS,
      output: Output.object({ schema: sessionPackSchema }),
      prompt: `Build the complete pack for session ${context.sessionNumber}.\n\n${JSON.stringify(
        context,
        null,
        2,
      )}`,
    });

    return {
      ok: true,
      pack: {
        ...output,
        stages: normalizeStageMinutes(output.stages, context.session.durationMinutes),
        tasks: output.tasks.map((task, index) => ({ ...task, id: `T${index + 1}` })),
      },
    };
  } catch (error) {
    console.error("[session-pack] generation failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });

    if (NoOutputGeneratedError.isInstance(error) || NoObjectGeneratedError.isInstance(error)) {
      return {
        ok: false,
        message: "La proposition n'a pas pu être structurée. Relancez la génération de cette séance.",
      };
    }

    const detail = error instanceof Error ? error.message.toLowerCase() : "";
    if (detail.includes("sign in")) {
      return { ok: false, message: "Connectez-vous avec le compte enseignant pour générer le dossier." };
    }
    if (detail.includes("not configured")) {
      return { ok: false, message: "Le modèle de génération n'est pas encore configuré." };
    }

    return {
      ok: false,
      message: "La génération n'a pas abouti. Réessayez dans un instant.",
    };
  }
}
