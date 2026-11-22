import assert from "node:assert/strict";
import test from "node:test";
import { stripLeadingAuphonicCredit } from "./transcript.ts";

function turn(text, speakerId = null) {
  return { speakerId, text, start: null, end: null };
}

test("removes the first two turns when they contain an Auphonic credit", () => {
  const cleaned = stripLeadingAuphonicCredit({
    text: "Credit Audio post production by Auphonic Hello",
    language: "en",
    diarized: true,
    turns: [
      turn("This file was cleaned automatically."),
      turn("Audio post production by Auphonic."),
      turn("Hello, how are you?", "speaker_0"),
    ],
  });

  assert.deepEqual(cleaned.turns, [turn("Hello, how are you?", "speaker_0")]);
  assert.equal(cleaned.text, "Hello, how are you?");
});

test("removes a two-line credit embedded at the start of one turn", () => {
  const cleaned = stripLeadingAuphonicCredit({
    text: "Auphonic credit\nAudio post-production\nGood morning.",
    language: "en",
    diarized: false,
    turns: [turn("Auphonic credit\nAudio post-production\nGood morning.")],
  });

  assert.equal(cleaned.turns[0].text, "Good morning.");
});

test("keeps the opening two turns when no cleanup credit is present", () => {
  const original = [turn("Good morning.", "speaker_0"), turn("Hello!", "speaker_1")];
  const cleaned = stripLeadingAuphonicCredit({ text: "Good morning. Hello!", language: "en", turns: original, diarized: true });

  assert.deepEqual(cleaned.turns, original);
});
