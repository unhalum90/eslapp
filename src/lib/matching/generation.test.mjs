import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const ts = require("typescript");
require.extensions[".ts"] = (module, filename) =>
  module._compile(
    ts.transpileModule(readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
const { generationInput, hydrateGenerated } = require("./generation.ts");
const request = generationInput.parse({
  source: "animal sounds",
  level: "A1",
  language: "English",
  pairCount: 2,
  speech: true,
});
const output = () => ({
  title: "Animals",
  taskDescription: "Match the sounds.",
  help: "Think of a farm.",
  feedback: "Well done!",
  speechLocale: "en-GB",
  pairs: [
    {
      first: { text: "Cat", hint: "A pet" },
      second: { text: "Meow", hint: "A sound" },
    },
    {
      first: { text: "Dog", hint: "A pet" },
      second: { text: "Woof", hint: "A sound" },
    },
  ],
  decoys: [{ text: "Moo", hint: "" }],
});
test("AI hydration creates a separate editable draft with real IDs and speech settings", () => {
  const result = hydrateGenerated(output(), request);
  assert.equal(result.status, "draft");
  assert.equal(result.config.pairs.length, 2);
  assert.equal(result.config.pairs[0].first.type, "speech");
  assert.equal(result.config.pairs[0].first.locale, "en-GB");
  assert.equal(result.config.pairs[0].second.type, "text");
  assert.notEqual(result.id, hydrateGenerated(output(), request).id);
  assert.notEqual(
    result.config.pairs[0].first.id,
    result.config.pairs[1].first.id,
  );
});
test("AI output rejects incorrect pair counts, duplicate answers and incomplete cards", () => {
  assert.throws(
    () => hydrateGenerated(output(), { ...request, pairCount: 3 }),
    /wrong number/,
  );
  const duplicate = output();
  duplicate.pairs[1].second.text = "  MEOW ";
  assert.throws(() => hydrateGenerated(duplicate, request), /ambiguous/);
  const empty = output();
  empty.pairs[0].first.text = "";
  assert.throws(() => hydrateGenerated(empty, request));
});
test("generation request limits keep the proof to matching-pairs text and speech", () => {
  for (const invalid of [
    { source: "" },
    { source: "x".repeat(10001) },
    { pairCount: 1 },
    { pairCount: 17 },
    { level: "C2" },
    { agent: "unknown" },
  ])
    assert.equal(
      generationInput.safeParse({ ...request, ...invalid }).success,
      false,
    );
});
