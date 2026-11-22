/**
 * Mistral speech configuration. Kept free of `server-only` so the same labels and
 * limits can be reused by client components; the API key itself is only ever read
 * inside `voxtral.ts`.
 *
 * The environment variable names follow the `MISTRAL_MODEL_*` convention already
 * used by the deployment configuration.
 */
export const VOXTRAL_TTS_LABEL = "Voxtral Mini TTS";
export const VOXTRAL_TTS_DESCRIPTION = "Mistral speech generation with two distinct voices";
export const VOXTRAL_TTS_DEFAULT_MODEL = "voxtral-mini-tts-2603";
export const VOXTRAL_TTS_MODEL_ALIAS = "voxtral-mini-tts-latest";
export const MISTRAL_API_KEY_ENV_VAR = "MISTRAL_API_KEY";
export const MISTRAL_TTS_MODEL_ENV_VAR = "MISTRAL_MODEL_DIALOGUE_TTS";
export const MISTRAL_API_BASE_URL = "https://api.mistral.ai/v1";

export type VoxtralSpeechFormat = "mp3" | "wav" | "pcm" | "flac" | "opus";

export const VOXTRAL_DEFAULT_SPEECH_FORMAT: VoxtralSpeechFormat = "mp3";

export function resolveDialogueTtsModel(
  env: Record<string, string | undefined> = process.env,
): string {
  const configured = env[MISTRAL_TTS_MODEL_ENV_VAR]?.trim();
  return configured && configured.length > 0 ? configured : VOXTRAL_TTS_DEFAULT_MODEL;
}

export function isVoxtralConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env[MISTRAL_API_KEY_ENV_VAR]?.trim());
}
