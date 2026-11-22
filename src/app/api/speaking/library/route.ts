import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSpeakingRecord,
  getSpeakingRecord,
  getSpeakingTranscriptRecord,
  libraryUserId,
  listSpeakingRecords,
  moveSpeakingRecord,
  updateSpeakingRecord,
} from "@/lib/speaking/library";
import { SpeakingApiError } from "@/lib/speaking/mistral";

export const runtime = "nodejs";
export const maxDuration = 180;

const turn = z.object({
  speakerId: z.string().max(100).nullable(),
  text: z.string().max(10_000),
  start: z.number().finite().nonnegative().nullable(),
  end: z.number().finite().nonnegative().nullable(),
});
const transcription = z.object({
  text: z.string().max(500_000),
  language: z.string().max(50).nullable(),
  turns: z.array(turn).max(5000),
  diarized: z.boolean(),
});
const feedback = z.object({
  overview: z.string().max(10_000),
  strengths: z.array(z.string().max(2000)).max(100),
  items: z.array(z.object({
    turnIndex: z.number().int().nonnegative(),
    category: z.enum(["grammar", "vocabulary", "word order", "expression"]),
    quote: z.string().max(2000),
    suggestion: z.string().max(2000),
    explanation: z.string().max(5000),
  })).max(2000),
});
const record = z.object({
  filename: z.string().trim().min(1).max(255),
  transcription,
  turns: z.array(turn).max(5000),
  speakerNames: z.record(z.string().max(100), z.string().max(100)),
  level: z.enum(["A1", "A2", "B1", "B2", "C1"]),
  task: z.string().max(500),
  feedback: feedback.nullable(),
  folderId: z.uuid().nullable().optional(),
});

function failure(error: unknown) {
  const known = error instanceof SpeakingApiError ? error : null;
  console.error("[speaking] library request failed", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json({ error: known?.message || "Could not use the speaking library." }, { status: known?.status || 500 });
}

function signedOut() {
  return NextResponse.json({ error: "Sign in with your teacher account to use the speaking library.", signInRequired: true }, { status: 401 });
}

export async function GET(request: Request) {
  const userId = await libraryUserId();
  if (!userId) return signedOut();
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      const saved = url.searchParams.get("transcript") === "1"
        ? await getSpeakingTranscriptRecord(userId, id)
        : await getSpeakingRecord(userId, id);
      return NextResponse.json(saved, { headers: { "Cache-Control": "no-store" } });
    }
    const offset = Math.min(10_000, Math.max(0, Number(url.searchParams.get("offset") || 0) || 0));
    return NextResponse.json(await listSpeakingRecords(userId, offset), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const userId = await libraryUserId();
  if (!userId) return signedOut();
  try {
    if (Number(request.headers.get("content-length") || 0) > 2_000_000) throw new SpeakingApiError("Analysis is too large to save.", 413);
    const body = await request.json();
    const input = record.parse(body);
    const token = typeof body.token === "string" ? body.token : "";
    const ticket = typeof body.ticket === "string" ? body.ticket : "";
    return NextResponse.json(await createSpeakingRecord(userId, { token, ticket }, input), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Saved analysis is invalid." }, { status: 400 });
    return failure(error);
  }
}

export async function PUT(request: Request) {
  const userId = await libraryUserId();
  if (!userId) return signedOut();
  try {
    if (Number(request.headers.get("content-length") || 0) > 2_000_000) throw new SpeakingApiError("Analysis is too large to save.", 413);
    const body = await request.json();
    const input = record.parse(body);
    const id = typeof body.id === "string" ? body.id : "";
    return NextResponse.json(await updateSpeakingRecord(userId, id, input), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Saved analysis is invalid." }, { status: 400 });
    return failure(error);
  }
}

export async function PATCH(request: Request) {
  const userId = await libraryUserId();
  if (!userId) return signedOut();
  try {
    const body = z.object({ id: z.uuid(), folderId: z.uuid().nullable() }).parse(await request.json());
    return NextResponse.json(await moveSpeakingRecord(userId, body.id, body.folderId), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Invalid folder or recording." }, { status: 400 });
    return failure(error);
  }
}
