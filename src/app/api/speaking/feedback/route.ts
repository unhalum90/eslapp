import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiIdentity } from "@/lib/ai/authorization";
import { assessSpeakingTranscript, SpeakingApiError } from "@/lib/speaking/mistral";

export const runtime = "nodejs";
export const maxDuration = 90;

const requestSchema = z.object({
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  task: z.string().max(500),
  turns: z.array(z.object({
    speakerId: z.string().max(100).nullable(),
    text: z.string().trim().min(1).max(2000),
    start: z.number().nonnegative().nullable(),
    end: z.number().nonnegative().nullable(),
  })).min(1).max(150),
}).refine((data) => data.turns.reduce((sum, turn) => sum + turn.text.length, 0) <= 20_000);

export async function POST(request: Request) {
  if (!(await getAiIdentity())) {
    return NextResponse.json({ error: "Sign in with a teacher account to analyze recordings." }, { status: 401 });
  }
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Review the transcript. The analysis limit is 20,000 characters." }, { status: 400 });
    }
    const feedback = await assessSpeakingTranscript(parsed.data);
    return NextResponse.json(feedback, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof SpeakingApiError ? error : null;
    console.error("[speaking] feedback failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: known?.message || "Feedback could not be generated. Please try again." },
      { status: known?.status || 500 },
    );
  }
}
