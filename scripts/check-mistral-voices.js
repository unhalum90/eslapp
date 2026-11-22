/**
 * Verifies the Mistral Voxtral Mini TTS contract used by the Dialogue Builder:
 * which voice identifier shape `voice_id` accepts, whether the pinned model id is
 * valid, and that `response_format: "mp3"` returns base64 audio data.
 *
 * Usage: node scripts/check-mistral-voices.js
 */
require("dotenv").config({ path: ".env.local" });

const API = "https://api.mistral.ai/v1";
const MODEL = process.env.MISTRAL_MODEL_DIALOGUE_TTS || "voxtral-mini-tts-2603";

async function main() {
  const key = process.env.MISTRAL_API_KEY;
  if (!key) throw new Error("MISTRAL_API_KEY not found in .env.local");

  const voicesResponse = await fetch(`${API}/audio/voices?type=all&limit=100`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (!voicesResponse.ok) {
    throw new Error(`Voice listing failed: ${voicesResponse.status} ${voicesResponse.statusText}`);
  }
  const catalogue = await voicesResponse.json();
  const voices = catalogue.items || [];
  console.log(`Voices: ${voices.length} of ${catalogue.total} (page size ${catalogue.page_size})`);

  const byLanguage = voices.reduce((acc, voice) => {
    const code = (voice.languages || [])[0] || "unknown";
    acc[code] = (acc[code] || 0) + 1;
    return acc;
  }, {});
  console.log("By language:", byLanguage);

  const jane = voices.find((voice) => voice.slug === "gb_jane_neutral");
  if (!jane) throw new Error("Preset gb_jane_neutral not found");
  console.log(`Target voice: ${jane.name} -> id=${jane.id} slug=${jane.slug} type=${jane.type}`);

  const attempts = [
    { label: "voice_id = uuid + model", body: { voice_id: jane.id, model: MODEL } },
    { label: "voice_id = slug + model", body: { voice_id: jane.slug, model: MODEL } },
    { label: "voice_id = uuid, no model", body: { voice_id: jane.id } },
  ];

  for (const attempt of attempts) {
    const started = Date.now();
    const response = await fetch(`${API}/audio/speech`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        input: "Good evening, a table for two, please.",
        response_format: "mp3",
        stream: false,
        ...attempt.body,
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.log(`x ${attempt.label}: HTTP ${response.status} ${detail.slice(0, 200)}`);
      continue;
    }

    const payload = await response.json();
    const base64 = payload.audio_data || "";
    const bytes = Math.floor((base64.replace(/=+$/, "").length * 3) / 4);
    const head = Buffer.from(base64.slice(0, 16), "base64");
    console.log(
      `OK ${attempt.label}: ${bytes} bytes in ${Date.now() - started} ms, head=${head.toString("hex").slice(0, 12)} (${head.subarray(0, 3).toString("latin1")})`,
    );
    break;
  }
}

main().catch((error) => {
  console.error("Check failed:", error.message);
  process.exitCode = 1;
});
