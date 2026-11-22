import { NextResponse } from "next/server";
import { getAiIdentity } from "@/lib/ai/authorization";
import { getAuphonicProduction, getCleanedAudio, startAuphonic, verifyAuphonicToken } from "@/lib/speaking/auphonic";
import { SpeakingApiError, transcribeSpeakingAudio } from "@/lib/speaking/mistral";
import { deleteSpeakingSource, signedSpeakingSource } from "@/lib/speaking/storage";

export const runtime = "nodejs";
export const maxDuration = 180;

export async function POST(request: Request) {
  if (!(await getAiIdentity())) {
    return NextResponse.json({ error: "Sign in with a teacher account to transcribe recordings." }, { status: 401 });
  }
  try {
    const { ticket } = await request.json();
    const source = await signedSpeakingSource(typeof ticket === "string" ? ticket : "");
    return NextResponse.json({ token: await startAuphonic(source.url, source.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof SpeakingApiError ? error : null;
    console.error("[speaking] transcription failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json(
      { error: known?.message || "Transcription failed. Please try again." },
      { status: known?.status || 500 },
    );
  }
}

export async function GET(request: Request) {
  if (!(await getAiIdentity())) {
    return NextResponse.json({ error: "Sign in with a teacher account to transcribe recordings." }, { status: 401 });
  }
  try {
    const { uuid, sourceId } = verifyAuphonicToken(new URL(request.url).searchParams.get("token") || "");
    if (new URL(request.url).searchParams.get("audio") === "1") {
      const cleaned = await getCleanedAudio(uuid);
      return new Response(cleaned.stream(), {
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Disposition": "attachment; filename=\"speaking-auphonic.mp3\"",
          "Cache-Control": "no-store",
        },
      });
    }
    const production = await getAuphonicProduction(uuid);
    if (production.status === 3 || production.status === 2) await deleteSpeakingSource(sourceId);
    return NextResponse.json({
      status: production.status,
      done: production.status === 3,
      failed: production.status === 2,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof SpeakingApiError ? error : null;
    return NextResponse.json({ error: known?.message || "Could not check Auphonic processing." }, { status: known?.status || 500 });
  }
}

export async function PUT(request: Request) {
  if (!(await getAiIdentity())) {
    return NextResponse.json({ error: "Sign in with a teacher account to transcribe recordings." }, { status: 401 });
  }
  try {
    const { token } = await request.json();
    const { uuid } = verifyAuphonicToken(typeof token === "string" ? token : "");
    const cleaned = await getCleanedAudio(uuid);
    return NextResponse.json(await transcribeSpeakingAudio(cleaned), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof SpeakingApiError ? error : null;
    console.error("[speaking] cleaned transcription failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: known?.message || "Transcription failed. Please try again." }, { status: known?.status || 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await getAiIdentity())) {
    return NextResponse.json({ error: "Sign in with a teacher account to transcribe recordings." }, { status: 401 });
  }
  try {
    const { ticket } = await request.json();
    const source = await signedSpeakingSource(typeof ticket === "string" ? ticket : "");
    const response = await fetch(source.url, { cache: "no-store", signal: AbortSignal.timeout(60_000) });
    if (!response.ok) throw new SpeakingApiError("Could not read the uploaded recording.", 502);
    const audio = new File([await response.blob()], "speaking-original.mp3", { type: "audio/mpeg" });
    return NextResponse.json(await transcribeSpeakingAudio(audio), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof SpeakingApiError ? error : null;
    console.error("[speaking] direct transcription failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: known?.message || "Transcription failed. Please try again." }, { status: known?.status || 500 });
  }
}
