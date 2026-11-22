import { NextResponse } from "next/server";
import { getAiIdentity } from "@/lib/ai/authorization";
import { createSpeakingUpload, deleteSpeakingSource, verifySpeakingUpload } from "@/lib/speaking/storage";
import { SpeakingApiError } from "@/lib/speaking/mistral";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!(await getAiIdentity())) return NextResponse.json({ error: "Sign in with a teacher account to upload recordings." }, { status: 401 });
  try {
    const { size } = await request.json();
    const upload = await createSpeakingUpload(size);
    return NextResponse.json(upload, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof SpeakingApiError ? error : null;
    console.error("[speaking] upload setup failed", error instanceof Error ? error.name : "UnknownError");
    return NextResponse.json({ error: known?.message || "Could not prepare the upload." }, { status: known?.status || 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await getAiIdentity())) return NextResponse.json({ error: "Sign in with a teacher account." }, { status: 401 });
  try {
    const { ticket } = await request.json();
    const upload = verifySpeakingUpload(typeof ticket === "string" ? ticket : "");
    await deleteSpeakingSource(upload.id);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const known = error instanceof SpeakingApiError ? error : null;
    return NextResponse.json({ error: known?.message || "Could not remove the temporary upload." }, { status: known?.status || 500 });
  }
}
