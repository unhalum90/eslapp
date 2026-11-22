import { NextResponse } from "next/server";
import {
  isVoxtralConfigured,
  resolveDialogueTtsModel,
  VOXTRAL_TTS_LABEL,
} from "@/lib/dialogue/catalog";
import {
  isMistralScriptConfigured,
  resolveDialogueScriptModel,
} from "@/lib/dialogue/mistralScript";

export const dynamic = "force-dynamic";

/**
 * Zero-cost configuration check for the Dialogue Builder deployment.
 * Reports only booleans and model ids, never key material, and generates no audio.
 */
export async function GET() {
  const scriptProvider =
    process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY ? "openai/anthropic" : "mistral";

  return NextResponse.json({
    ok: true,
    service: "dialogue-builder",
    speech: {
      provider: "Mistral",
      label: VOXTRAL_TTS_LABEL,
      configured: isVoxtralConfigured(),
      model: resolveDialogueTtsModel(),
    },
    script: {
      provider: scriptProvider,
      mistralFallbackConfigured: isMistralScriptConfigured(),
      mistralModel: resolveDialogueScriptModel(),
    },
    library: {
      supabaseConfigured: Boolean(
        process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      ),
    },
  });
}
