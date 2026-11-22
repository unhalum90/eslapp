import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDialogueLimits,
  base64ByteLength,
  base64ToBytes,
  bytesToBase64,
  DEFAULT_DIALOGUE_VOICES,
  DIALOGUE_LIMITS,
  dialogueFileName,
  estimateDialogueSeconds,
  extractJsonObject,
  findVoiceBySlug,
  formatDialogueDuration,
  formatDialogueScript,
  groupVoicesByLanguage,
  leadingId3v2Length,
  mp3BytesFromBase64Segments,
  normalizeDialogueScriptPayload,
  parseDialogueScript,
  validateDialogueLines,
} from "./domain.ts";

function id3v2Tag(payloadLength) {
  const bytes = new Uint8Array(10 + payloadLength);
  bytes[0] = 0x49; // I
  bytes[1] = 0x44; // D
  bytes[2] = 0x33; // 3
  bytes[3] = 0x03;
  bytes[4] = 0x00;
  bytes[5] = 0x00;
  bytes[6] = (payloadLength >> 21) & 0x7f;
  bytes[7] = (payloadLength >> 14) & 0x7f;
  bytes[8] = (payloadLength >> 7) & 0x7f;
  bytes[9] = payloadLength & 0x7f;
  return bytes;
}

function id3v1Tag() {
  const bytes = new Uint8Array(128);
  bytes[0] = 0x54; // T
  bytes[1] = 0x41; // A
  bytes[2] = 0x47; // G
  return bytes;
}

function concat(...parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const combined = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }
  return combined;
}

const FRAME = new Uint8Array([0xff, 0xfb, 0x90, 0x00]);

test("parses explicit A/B speaker markers", () => {
  const parsed = parseDialogueScript("A: Hello, can I help you?\nB: Yes, please.\nA: Of course.");
  assert.equal(parsed.detected, true);
  assert.deepEqual(
    parsed.lines.map((line) => line.speaker),
    ["A", "B", "A"],
  );
  assert.equal(parsed.lines[0].text, "Hello, can I help you?");
  assert.deepEqual(parsed.labels, { A: "Speaker A", B: "Speaker B" });
});

test("reads bold and em dash speaker names and keeps them stable", () => {
  const parsed = parseDialogueScript(
    ["**Waiter:** Good evening.", "**Customer:** A table for two, please.", "Waiter — Certainly."].join("\n"),
  );
  assert.equal(parsed.detected, true);
  assert.deepEqual(parsed.labels, { A: "Waiter", B: "Customer" });
  assert.deepEqual(
    parsed.lines.map((line) => line.speaker),
    ["A", "B", "A"],
  );
  assert.equal(parsed.lines[2].text, "Certainly.");
});

test("numbered scripts alternate speakers", () => {
  const parsed = parseDialogueScript("1. Where is the station?\n2) Go straight ahead.\n3. Thank you!");
  assert.equal(parsed.detected, false);
  assert.deepEqual(
    parsed.lines.map((line) => line.speaker),
    ["A", "B", "A"],
  );
});

test("plain prose becomes an alternating dialogue", () => {
  const parsed = parseDialogueScript(
    "Excuse me, is this seat free? Yes of course, please sit down. Thank you very much.",
  );
  assert.equal(parsed.detected, false);
  assert.equal(parsed.lines.length, 3);
  assert.deepEqual(
    parsed.lines.map((line) => line.speaker),
    ["A", "B", "A"],
  );
});

test("strips inner ID3 tags and trailing ID3v1 tags when joining MP3 segments", () => {
  const first = bytesToBase64(concat(id3v2Tag(20), FRAME, id3v1Tag()));
  const second = bytesToBase64(concat(id3v2Tag(20), FRAME, FRAME));

  assert.equal(leadingId3v2Length(id3v2Tag(20)), 30);

  const combined = mp3BytesFromBase64Segments([first, second]);
  assert.equal(combined.length, 30 + FRAME.length + FRAME.length * 2);
  assert.deepEqual([...combined.subarray(0, 3)], [0x49, 0x44, 0x33]);

  const withoutHeaders = mp3BytesFromBase64Segments([first, second], { keepFirstId3: false });
  assert.equal(withoutHeaders.length, FRAME.length * 3);
});

test("base64 helpers round-trip arbitrary bytes", () => {
  const bytes = new Uint8Array([0, 1, 2, 250, 255, 128]);
  const base64 = bytesToBase64(bytes);
  assert.equal(base64ByteLength(base64), bytes.length);
  assert.deepEqual([...base64ToBytes(base64)], [...bytes]);
});

test("dialogue metrics and file names are classroom friendly", () => {
  const lines = parseDialogueScript("A: Good morning!\nB: Hello, how are you today?").lines;
  assert.ok(estimateDialogueSeconds(lines) > 0);
  assert.equal(formatDialogueDuration(95), "1:35");
  assert.equal(dialogueFileName("Ordering at a Restaurant!"), "ordering-at-a-restaurant.mp3");
  assert.equal(dialogueFileName("   "), "dialogue.mp3");
  assert.equal(formatDialogueScript(lines, { A: "Waiter", B: "Customer" }).split("\n")[0], "Waiter: Good morning!");
});

test("validation guards empty and oversized scripts", () => {
  assert.match(validateDialogueLines([]), /at least 2 lines/);
  const single = parseDialogueScript("A: Only one line here").lines;
  assert.match(validateDialogueLines(single), /at least 2 lines/);

  const long = Array.from({ length: DIALOGUE_LIMITS.maxLines + 5 }, (_, index) => ({
    id: `line_${index}`,
    speaker: index % 2 === 0 ? "A" : "B",
    text: "Hello there",
  }));
  assert.match(validateDialogueLines(long), /at most 60 lines/);

  const clamped = applyDialogueLimits([
    { id: "a", speaker: "A", text: "x".repeat(DIALOGUE_LIMITS.maxCharsPerLine + 25) },
  ]);
  assert.equal(clamped[0].text.length, DIALOGUE_LIMITS.maxCharsPerLine);
});

test("extracts a JSON object from fenced or chatty model replies", () => {
  assert.deepEqual(extractJsonObject('```json\n{"title":"Café","lines":[]}\n```'), {
    title: "Café",
    lines: [],
  });
  assert.deepEqual(extractJsonObject('Sure! Here it is:\n{"a":1}\nHope that helps.'), { a: 1 });
  assert.equal(extractJsonObject("no json here"), null);
  assert.equal(extractJsonObject(""), null);
});

test("normalizes loose script payloads into two-voice lines", () => {
  const payload = normalizeDialogueScriptPayload({
    title: "Ordering lunch",
    lines: [
      { who: "Waiter", text: "Good evening!" },
      { name: "Customer", text: "  A table for two, please. " },
      { speaker: "A", text: "   " },
      { speaker: "B", text: "This way." },
    ],
  });
  assert.ok(payload);
  assert.equal(payload.title, "Ordering lunch");
  assert.equal(payload.lines.length, 3);
  assert.deepEqual(
    payload.lines.map((line) => line.speaker),
    ["A", "B", "B"],
  );
  assert.equal(payload.lines[1].text, "A table for two, please.");

  assert.equal(normalizeDialogueScriptPayload({ lines: [{ speaker: "A", text: "Only one" }] }), null);
  assert.equal(normalizeDialogueScriptPayload("not an object"), null);
  const untitled = normalizeDialogueScriptPayload({
    lines: [
      { speaker: "A", text: "Hi" },
      { speaker: "B", text: "Hello" },
    ],
  });
  assert.equal(untitled.title, "Classroom dialogue");
});

test("voice catalogue helpers group British English first", () => {
  const voices = [
    { id: "1", slug: "en_paul_neutral", name: "Paul - Neutral", gender: "male", languages: ["en_us"], type: "preset", tags: [] },
    { id: "2", slug: "fr_marie_neutral", name: "Marie - Neutral", gender: "female", languages: ["fr_fr"], type: "preset", tags: [] },
    { id: "3", slug: "gb_jane_neutral", name: "Jane - Neutral", gender: "female", languages: ["en_gb"], type: "preset", tags: [] },
  ];
  const groups = groupVoicesByLanguage(voices);
  assert.deepEqual(
    groups.map((group) => group.code),
    ["en_gb", "en_us", "fr_fr"],
  );
  assert.equal(groups[0].label, "British English");
  assert.equal(findVoiceBySlug(voices, "GB_JANE_NEUTRAL").name, "Jane - Neutral");
  assert.equal(findVoiceBySlug(voices, "missing"), null);
  assert.equal(DEFAULT_DIALOGUE_VOICES.A, "gb_jane_neutral");
});
