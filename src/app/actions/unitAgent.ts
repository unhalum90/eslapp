"use server";

import {
  generateText,
  NoObjectGeneratedError,
  NoOutputGeneratedError,
  Output,
} from "ai";
import { z } from "zod";
import { resolveTextModel } from "@/lib/ai/runtime";
import type { TextAgentId } from "@/lib/ai/catalog";
import type {
  UnitAgentActionResult,
  UnitAgentErrorCode,
  UnitAgentRequest,
} from "@/lib/unit-agent/types";

const finalTaskSchema = z.object({
  title: z.string().min(1),
  performanceType: z.string(),
  brief: z.string(),
  successCriteria: z.array(z.string()),
});

const sessionSchema = z.object({
  title: z.string().min(1),
  objective: z.string(),
  durationMinutes: z.number().int().min(1).max(240),
  reactivationTargetPercentage: z.number().int().min(0).max(100),
  notes: z.string(),
  question: z.string(),
  communicativeObjectives: z.array(z.string()).max(4),
  culturalObjectives: z.array(z.string()).max(4),
  grammarFocus: z.array(z.string()).max(5),
  vocabularyFocus: z.array(z.string()).max(12),
  phonologyFocus: z.array(z.string()).max(4),
  expectedProduction: z.string(),
  traceEcrite: z.string(),
  homework: z.string(),
  differentiationNotes: z.array(z.string()).max(6),
  assessmentNotes: z.string(),
});

const vocabularyItemSchema = z.object({
  term: z.string().min(1),
  translationFr: z.string(),
  phonetic: z.string(),
  tags: z.array(z.string()),
  notes: z.string(),
  imagePrompt: z.string().min(1),
});

const materialSchema = z.object({
  kind: z.enum(["worksheet", "activity"]),
  title: z.string().min(1),
  purpose: z.string(),
  instructions: z.string(),
  studentContent: z.string().min(1),
  teacherNotes: z.string(),
  imagePrompts: z.array(z.string().min(1)).max(6),
});

const responseSchema = z.object({
  assistantMessage: z.string().min(1),
  proposal: z
    .object({
      title: z.string().min(1),
      rationale: z.string(),
      patch: z.object({
        unitTitle: z.string().min(1).nullable(),
        theme: z.string().nullable(),
        finalTask: finalTaskSchema.nullable(),
        grammarPoints: z.array(z.string()).nullable(),
        sessions: z.array(sessionSchema).max(8).nullable(),
        vocabularyItems: z.array(vocabularyItemSchema).max(20).nullable(),
        materials: z.array(materialSchema).max(10).nullable(),
      }),
    })
    .nullable(),
});

const UNIT_ARCHITECT_INSTRUCTIONS = `You are Assistant de séquence, a planning partner for a French collège English teacher.

Your job is to discuss and improve the active sequence using backward design from the final task.

Rules:
1. Treat the supplied structured unit as the source of truth.
2. Obey every active constraint, choice and rejection in the decision record. Never repeat a rejected proposal.
3. Do not invent student results, student identities, source contents or official curriculum claims.
4. Keep every session causally connected to the final task. A unit can contain at most eight sessions.
5. Preserve existing fields unless the teacher asks to change them.
6. When the teacher asks to generate or change unit content, return a proposal. Every non-null patch section is a complete replacement for that section.
7. Use null for every section you are not proposing to change.
8. When asked to create vocabulary, return complete vocabularyItems with French translation, phonetic transcription, useful tags and one precise imagePrompt per item.
9. Image prompts must describe one clean educational visual with no written labels unless text is pedagogically necessary. Do not generate the image yourself; the teacher chooses an image provider after reviewing the vocabulary proposal.
10. When asked to build a worksheet or activity, return complete classroom-ready materials. studentContent must contain the actual printable or playable content, not an outline or a promise. Add imagePrompts only for visuals that materially improve the artifact.
11. Format studentContent as clean semantic HTML suitable for a rich-text editor and Google Docs. Use only document tags such as h1, h2, h3, p, strong, em, ul, ol, li, blockquote, hr and table elements. Never use Markdown, code fences, scripts, inline styles or a full html/body wrapper.
12. Keep answer keys, differentiation notes and delivery guidance in teacherNotes, never inside studentContent. Format non-empty teacherNotes with the same safe semantic HTML rules and never use Markdown.
13. When the teacher is only asking a question, return a helpful assistantMessage and set proposal to null.
14. Keep assistantMessage and rationale concise. Reply in the same language as the teacher.
15. The teacher must approve proposals, so do not claim that you already changed the unit.
16. A blank unit is a valid starting point, never an error. If the title is empty or "New unit" and there is no theme, final task or session, switch into discovery mode.
17. In discovery mode, ask one focused question at a time unless the teacher explicitly asks for ideas. Accept partial thoughts such as a theme, cultural topic, language goal, final task or source.
18. If the teacher asks for ideas in discovery mode, offer a small, varied set appropriate to the supplied class level. Only return a proposal when the teacher chooses a direction or explicitly asks you to draft it.
19. Do not create worksheets or activities for a blank unit. Explain what minimum choice is missing and ask the next useful question with proposal set to null.
20. Preserve this teacher's recurring lesson arc: retrieval or anticipation → input → closed comprehension → language noticing → controlled practice → guided production → trace écrite → homework.
21. Write direct classroom-ready language. Student task verbs and target-language models are in concise English; metalinguistic explanations, planning notes and PAP scaffolds are in concise French.
22. PAP changes access, not the learning objective: segment instructions, add word banks, checkboxes, models or sentence starters, and preserve the same final outcome.
23. Treat the sequence frame, cultural axis, problematic, CEFR trajectory and final task as a connected system. Do not propose isolated activities that do not advance it.
24. When the teacher needs a coordinated teacher/standard/PAP/correction pack, direct them to the relevant session's dedicated pack action instead of proposing four independent materials here.
25. Never reproduce branded characters, publisher text, third-party worksheet wording or proprietary layouts. Create original classroom content and distinguish source references from supplied source contents.`;

export async function askUnitArchitect(
  request: UnitAgentRequest,
  requestedAgent?: TextAgentId,
): Promise<UnitAgentActionResult> {
  const prompt = request.prompt.trim();
  if (!prompt) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "Write a request for Unit Architect first.",
      retryable: false,
    };
  }

  try {
    const { model } = await resolveTextModel(requestedAgent);
    const recentConversation = request.conversation.slice(-12);
    const { output } = await generateText({
      model,
      instructions: UNIT_ARCHITECT_INSTRUCTIONS,
      output: Output.object({ schema: responseSchema }),
      prompt: `Active unit context:\n${JSON.stringify(request.context, null, 2)}\n\nRecent conversation:\n${JSON.stringify(recentConversation, null, 2)}\n\nTeacher request:\n${prompt}`,
      reasoning: "medium",
    });

    return { ok: true, response: output };
  } catch (error) {
    const failure = describeUnitAgentFailure(error);
    console.error("[unit-agent] request failed", {
      code: failure.code,
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return { ok: false, ...failure };
  }
}

function describeUnitAgentFailure(error: unknown): {
  code: UnitAgentErrorCode;
  message: string;
  retryable: boolean;
} {
  const detail = error instanceof Error ? error.message.toLowerCase() : "";

  if (detail.includes("sign in")) {
    return {
      code: "AUTH_REQUIRED",
      message: "Sign in with a teacher account to use Unit Architect.",
      retryable: false,
    };
  }

  if (detail.includes("only the app owner")) {
    return {
      code: "ACCESS_DENIED",
      message: "This agent is limited to the app owner. Choose Codex Terra 5.6 or use the owner account.",
      retryable: false,
    };
  }

  if (detail.includes("not configured")) {
    return {
      code: "AGENT_NOT_CONFIGURED",
      message: "Unit Architect’s planning connection is not ready. Restart the app and try again.",
      retryable: false,
    };
  }

  if (NoOutputGeneratedError.isInstance(error) || NoObjectGeneratedError.isInstance(error)) {
    return {
      code: "STRUCTURED_OUTPUT_FAILED",
      message: "The agent answered, but its unit proposal could not be validated. Try again or make the request more specific.",
      retryable: true,
    };
  }

  return {
    code: "PROVIDER_FAILED",
    message: "The text provider could not complete this request. Try again in a moment.",
    retryable: true,
  };
}
