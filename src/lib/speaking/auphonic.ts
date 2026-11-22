import { createHmac, timingSafeEqual } from "node:crypto";
import { SpeakingApiError } from "./mistral";

const BASE = "https://auphonic.com/api";
const TOKEN_AGE_MS = 3 * 60 * 60 * 1000;

function key() {
  const value = process.env.AUPHONIC_API_KEY?.trim();
  if (!value) throw new SpeakingApiError("Auphonic is not configured on the server.", 503);
  return value;
}

function headers() { return { Authorization: `bearer ${key()}` }; }

async function auphonicData<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.status_code !== 200 || !payload?.data) {
    console.error("[speaking] Auphonic request failed", response.status, payload?.error_code || "unknown");
    throw new SpeakingApiError(response.status === 429 ? "Auphonic is busy. Please try again shortly." : "Auphonic could not clean this recording.", response.status === 429 ? 429 : 502);
  }
  return payload.data as T;
}

function signature(value: string) { return createHmac("sha256", key()).update(value).digest("hex"); }

export function issueAuphonicToken(uuid: string, sourceId: string) {
  const body = `${uuid}.${sourceId}.${Date.now()}`;
  return `${body}.${signature(body)}`;
}

export function verifyAuphonicToken(token: string) {
  const match = /^([A-Za-z0-9]{20,32})\.([a-f0-9]{32})\.(\d{13})\.([a-f0-9]{64})$/.exec(token);
  if (!match) throw new SpeakingApiError("Invalid audio processing session.", 400);
  const body = `${match[1]}.${match[2]}.${match[3]}`;
  const expected = Buffer.from(signature(body), "hex");
  const actual = Buffer.from(match[4], "hex");
  if (!timingSafeEqual(expected, actual) || Date.now() - Number(match[3]) > TOKEN_AGE_MS || Number(match[3]) > Date.now() + 60_000) {
    throw new SpeakingApiError("Audio processing session expired. Please start again.", 400);
  }
  return { uuid: match[1], sourceId: match[2] };
}

export async function startAuphonic(sourceUrl: string, sourceId: string) {
  const created = await auphonicData<{ uuid: string }>(await fetch(`${BASE}/productions.json`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      metadata: { title: "Student speaking" },
      input_file: sourceUrl,
      action: "start",
      output_files: [{ format: "mp3", bitrate: "128", mono_mixdown: true }],
      algorithms: {
        denoise: true,
        denoisemethod: "speech_isolation",
        denoiseamount: 0,
        leveler: true,
        filtering: true,
        filtermethod: "autoeq",
        normloudness: true,
        silence_cutter: false,
        filler_cutter: false,
        cough_cutter: false,
        music_cutter: false,
      },
    }),
    cache: "no-store",
  }));
  if (!/^[A-Za-z0-9]{20,32}$/.test(created.uuid)) throw new SpeakingApiError("Auphonic did not create a valid processing session.", 502);
  return issueAuphonicToken(created.uuid, sourceId);
}

type Production = { status: number; status_string?: string; output_files?: { format: string; download_url?: string }[] };

export async function getAuphonicProduction(uuid: string): Promise<Production> {
  return auphonicData<Production>(await fetch(`${BASE}/production/${uuid}.json`, { headers: headers(), cache: "no-store" }));
}

export async function getCleanedAudio(uuid: string): Promise<File> {
  const production = await getAuphonicProduction(uuid);
  if (production.status !== 3) throw new SpeakingApiError("Auphonic is still processing this recording.", 409);
  const download = production.output_files?.find((item) => item.format === "mp3")?.download_url;
  if (!download) throw new SpeakingApiError("Auphonic did not return a cleaned MP3.", 502);
  const url = new URL(download);
  if (url.hostname !== "auphonic.com" || !url.pathname.startsWith(`/api/download/audio-result/${uuid}/`)) {
    throw new SpeakingApiError("Auphonic returned an invalid download URL.", 502);
  }
  url.searchParams.set("bearer_token", key());
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new SpeakingApiError("The cleaned audio could not be downloaded from Auphonic.", 502);
  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > 100_000_000) throw new SpeakingApiError("The cleaned audio is empty or too large.", 502);
  return new File([bytes], "cleaned-speaking.mp3", { type: "audio/mpeg" });
}
