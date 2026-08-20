import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_TEXT_AGENT,
  IMAGE_AGENT,
  normalizeTextAgent,
  parseOwnerEmails,
  TEXT_AGENTS,
} from "./catalog.ts";

test("Codex Terra is the safe default text agent", () => {
  assert.equal(DEFAULT_TEXT_AGENT, "codex-terra");
  assert.equal(normalizeTextAgent(undefined), "codex-terra");
  assert.equal(normalizeTextAgent("unknown-agent"), "codex-terra");
});

test("the owner can select the configured production model IDs", () => {
  assert.equal(TEXT_AGENTS["codex-terra"].model, "gpt-5.6-terra");
  assert.equal(TEXT_AGENTS["claude-opus"].model, "claude-opus-4-8");
  assert.equal(normalizeTextAgent("claude-opus"), "claude-opus");
});

test("Nano Banana 2 remains the dedicated image model", () => {
  assert.equal(IMAGE_AGENT.model, "gemini-3.1-flash-image");
  assert.equal(IMAGE_AGENT.requiredEnvironmentVariable, "GOOGLE_API_KEY");
});

test("owner email parsing is normalized and ignores empty entries", () => {
  assert.deepEqual(
    [...parseOwnerEmails(" Owner@Example.com, second@example.com, ")],
    ["owner@example.com", "second@example.com"],
  );
});
