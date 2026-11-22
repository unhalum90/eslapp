import { NextResponse } from "next/server";
import { z } from "zod";
import { createSpeakingFolder, libraryUserId, listSpeakingFolders, renameSpeakingFolder } from "@/lib/speaking/library";
import { SpeakingApiError } from "@/lib/speaking/mistral";

export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET() {
  const userId = await libraryUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to use speaking folders." }, { status: 401 });
  try {
    return NextResponse.json({ folders: await listSpeakingFolders(userId) }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Could not load speaking folders." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const userId = await libraryUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to use speaking folders." }, { status: 401 });
  try {
    const { name } = z.object({ name: z.string().trim().min(1).max(80) }).parse(await request.json());
    return NextResponse.json(await createSpeakingFolder(userId, name), { headers: noStore });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a folder name of up to 80 characters." }, { status: 400 });
    if (error instanceof SpeakingApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not create the folder." }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const userId = await libraryUserId();
  if (!userId) return NextResponse.json({ error: "Sign in to use speaking folders." }, { status: 401 });
  try {
    const { id, name } = z.object({ id: z.uuid(), name: z.string().trim().min(1).max(80) }).parse(await request.json());
    return NextResponse.json(await renameSpeakingFolder(userId, id, name), { headers: noStore });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: "Enter a folder name of up to 80 characters." }, { status: 400 });
    if (error instanceof SpeakingApiError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Could not rename the folder." }, { status: 502 });
  }
}
