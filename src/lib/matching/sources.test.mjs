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
const {
  inspectVocabularyFile,
  MAX_VOCABULARY_FILE_BYTES,
} = require("./upload.ts");
const { vocabularySource } = require("./vocabulary.ts");
const { scatterPositions, scatterCardWidth } = require("./scatter.ts");
const { zipSync, strToU8 } = require("fflate");
const mammoth = require("mammoth");

test("upload validates actual signatures, extensions, sizes and UTF-8", () => {
  assert.equal(
    inspectVocabularyFile("words.pdf", strToU8("%PDF-1.7 sample")).kind,
    "pdf",
  );
  assert.equal(
    inspectVocabularyFile(
      "photo.PNG",
      new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ).kind,
    "image",
  );
  assert.equal(
    inspectVocabularyFile("words.csv", strToU8("cat,chat\\ndog,chien")).kind,
    "text",
  );
  for (const [name, bytes] of [
    ["fake.png", strToU8("fake")],
    ["old.doc", strToU8("old")],
    ["bad.txt", new Uint8Array([0xff])],
    ["empty.txt", new Uint8Array()],
    ["huge.txt", new Uint8Array(MAX_VOCABULARY_FILE_BYTES + 1)],
  ])
    assert.throws(() => inspectVocabularyFile(name, bytes));
});
test("Word document is recognized and text extracted without HTML rendering", async () => {
  const bytes = zipSync({
    "[Content_Types].xml": strToU8(
      '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    ),
    "word/document.xml": strToU8(
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>cat — chat</w:t></w:r></w:p><w:p><w:r><w:t>dog — chien</w:t></w:r></w:p></w:body></w:document>',
    ),
  });
  assert.equal(inspectVocabularyFile("vocabulary.docx", bytes).kind, "docx");
  assert.match(
    (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value,
    /cat — chat/,
  );
  assert.throws(() =>
    inspectVocabularyFile(
      "fake.docx",
      zipSync({ "unrelated.txt": strToU8("hi") }),
    ),
  );
});
test("extraction deduplicates vocabulary, preserves translations and rejects unreadable sources", () => {
  const result = vocabularySource({
    vocabulary: [
      { term: "Cat", meaning: "chat" },
      { term: "cat", meaning: "duplicate" },
      { term: "Dog", meaning: "chien" },
    ],
    note: "",
  });
  assert.equal(result.source, "Cat — chat\nDog — chien");
  assert.equal(result.vocabulary.length, 2);
  assert.throws(
    () => vocabularySource({ vocabulary: [], note: "unreadable" }),
    /Fewer than two/,
  );
});
test("freeform board is deterministic per attempt, changes on replay, stays in bounds and limits overlaps", () => {
  for (const width of [240, 375, 700, 1024]) {
    const sizes = Array.from({ length: 18 }, (_, i) => ({
      id: String(i),
      width: scatterCardWidth(width, i, 42),
      height: 100 + (i % 4) * 35,
    }));
    const a = scatterPositions(sizes, width, 42);
    assert.deepEqual(a, scatterPositions(sizes, width, 42));
    assert.notDeepEqual(
      a.positions,
      scatterPositions(sizes, width, 43).positions,
    );
    assert.equal(a.positions.length, sizes.length);
    for (const [i, p] of a.positions.entries()) {
      assert.ok(p.left >= 0 && p.left + sizes[i].width <= width);
      assert.ok(p.top >= 0 && p.top + sizes[i].height <= a.height);
      for (let j = 0; j < i; j++) {
        const q = a.positions[j];
        const ox =
          Math.min(p.left + sizes[i].width, q.left + sizes[j].width) -
          Math.max(p.left, q.left);
        const oy =
          Math.min(p.top + sizes[i].height, q.top + sizes[j].height) -
          Math.max(p.top, q.top);
        assert.ok(ox <= 16.001 || oy <= 16.001);
      }
    }
  }
});

const { scheduleMatchingSound } = require("./sound.ts");
test("correct and incorrect feedback schedule distinct short sounds at a modest volume", () => {
  function fakeAudio() {
    const frequencies = [],
      starts = [],
      stops = [],
      volumes = [];
    return {
      frequencies,
      starts,
      stops,
      volumes,
      currentTime: 0,
      destination: {},
      createOscillator: () => ({
        frequency: {
          setValueAtTime: (frequency) => frequencies.push(frequency),
        },
        connect() {},
        disconnect() {},
        start: (time) => starts.push(time),
        stop: (time) => stops.push(time),
      }),
      createGain: () => ({
        gain: {
          setValueAtTime() {},
          linearRampToValueAtTime: (value) => volumes.push(value),
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        disconnect() {},
      }),
    };
  }
  const correct = fakeAudio(),
    incorrect = fakeAudio();
  scheduleMatchingSound(correct, true);
  scheduleMatchingSound(incorrect, false);
  assert.deepEqual(correct.frequencies, [523.25, 659.25, 783.99]);
  assert.deepEqual(incorrect.frequencies, [220, 164.81]);
  assert.ok(correct.stops.at(-1) < 0.5 && incorrect.stops.at(-1) < 0.5);
  assert.ok(
    [...correct.volumes, ...incorrect.volumes].every(
      (volume) => volume <= 0.12,
    ),
  );
});
