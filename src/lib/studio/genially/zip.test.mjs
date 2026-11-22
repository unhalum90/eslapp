import assert from "node:assert/strict";
import test from "node:test";
import { matchZipEntry } from "./zip.ts";

const ROOT = "genially_abc/";
const NAMES = [
  "genially_abc/genially.html",
  "genially_abc/images/4ee119ea-bg-c37a893b.png",
  "genially_abc/images/1715348501653-Screenshot+2024-05-10+at+3.41.16 PM-7cc9c69d.png",
  "genially_abc/images/1715348541171-Screenshot+2024-05-10+at+3.42.10â\u0080¯PM-65f144d3.png",
  "genially_abc/audios/0014d3d0-sound-8efb9416.mpga",
];

test("exact paths match directly", () => {
  assert.equal(matchZipEntry(NAMES, ROOT, "images/4ee119ea-bg-c37a893b.png"), "genially_abc/images/4ee119ea-bg-c37a893b.png");
  assert.equal(matchZipEntry(NAMES, ROOT, "audios/0014d3d0-sound-8efb9416.mpga"), "genially_abc/audios/0014d3d0-sound-8efb9416.mpga");
});

test("different hash suffix and whitespace encodings still match", () => {
  assert.equal(
    matchZipEntry(NAMES, ROOT, "images/1715348501653-Screenshot+2024-05-10+at+3.41.16 PM-d56a3799.png"),
    "genially_abc/images/1715348501653-Screenshot+2024-05-10+at+3.41.16 PM-7cc9c69d.png",
  );
  assert.equal(
    matchZipEntry(NAMES, ROOT, "images/1715348541171-Screenshot+2024-05-10+at+3.42.10 PM-1a118077.png"),
    "genially_abc/images/1715348541171-Screenshot+2024-05-10+at+3.42.10â\u0080¯PM-65f144d3.png",
  );
});

test("unrelated files do not match", () => {
  assert.equal(matchZipEntry(NAMES, ROOT, "images/nothing-here-00000000.png"), null);
  assert.equal(matchZipEntry(NAMES, ROOT, "images/4ee119ea-bg-c37a893b.jpg"), null);
});

test("ambiguous background filenames do not silently select the wrong artwork", () => {
  const names = ["images/panel-11111111.png", "images/panel-22222222.png"];
  assert.equal(matchZipEntry(names, "", "images/panel-33333333.png"), null);
  assert.equal(matchZipEntry(names, "", "images/panel-22222222.png"), names[1]);
});
