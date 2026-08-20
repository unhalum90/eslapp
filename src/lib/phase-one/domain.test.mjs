import assert from "node:assert/strict";
import test from "node:test";
import {
  assessVocabularyReuse,
  buildPracticePayload,
  calculateProgress,
  createDistributionCode,
  normalizeVocabularyTerm,
  vocabularyCompleteness,
} from "./domain.ts";

const vocabulary = [
  {
    id: "vocab_1",
    term: "Turn left",
    translationFr: "Tournez à gauche",
    phonetic: "/tɜːn left/",
    imageUrl: "https://example.test/left.png",
    audio: [{ accent: "GB", url: "https://example.test/left.mp3" }],
    tags: ["directions"],
    notes: "",
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  },
];

const unit = {
  id: "unit_1",
  lineageRootId: "unit_1",
  title: "London directions",
  theme: "Finding your way",
  level: "5e",
  schoolYear: "2026–2027",
  status: "draft",
  finalTask: {
    title: "Give a visitor directions",
    performanceType: "pair role-play",
    brief: "Practise together.",
    successCriteria: ["Use landmarks"],
  },
  sessions: [{
    id: "session_1",
    title: "Getting oriented",
    objective: "Ask for directions",
    durationMinutes: 55,
    reactivationTargetPercentage: 20,
    notes: "teacher-only note",
  }],
  vocabulary: [{ vocabularyId: "vocab_1", purpose: "reactivation", sourceUnitId: "unit_0" }],
  grammarPoints: ["imperatives"],
  sourceReferences: [],
  curriculumReferences: [],
  decisions: [{
    id: "decision_1",
    kind: "choice",
    text: "private planning rationale",
    active: true,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
  }],
  distributionCode: "LONDON",
  published: true,
  createdAt: "2026-08-20T00:00:00.000Z",
  updatedAt: "2026-08-20T00:00:00.000Z",
};

test("normalizes accents, casing and whitespace for global vocabulary matching", () => {
  assert.equal(normalizeVocabularyTerm("  Café   CORNER! "), "cafe corner");
});

test("prevents duplicate vocabulary in a unit", () => {
  assert.equal(
    assessVocabularyReuse("turn left", unit.id, { units: [unit], vocabulary }).kind,
    "duplicate",
  );
});

test("treats a term from another unit as deliberate reactivation", () => {
  const newUnit = { ...unit, id: "unit_2", vocabulary: [] };
  const assessment = assessVocabularyReuse("Turn left", newUnit.id, {
    units: [unit, newUnit],
    vocabulary,
  });
  assert.equal(assessment.kind, "reactivation");
  assert.equal(assessment.sourceUnitId, unit.id);
});

test("calculates bounded manual class progress", () => {
  assert.equal(calculateProgress(2, 4), 50);
  assert.equal(calculateProgress(8, 3), 100);
  assert.equal(calculateProgress(-1, 3), 0);
});

test("measures the four required vocabulary facets", () => {
  assert.equal(vocabularyCompleteness(vocabulary[0]), 100);
  assert.equal(vocabularyCompleteness({ ...vocabulary[0], imageUrl: "", audio: [] }), 50);
});

test("creates stable-format distribution codes", () => {
  assert.match(createDistributionCode(), /^[A-Z0-9]{6}$/);
});

test("publishes only the anonymous practice contract", () => {
  const payload = buildPracticePayload(unit, vocabulary);
  assert.equal(payload.vocabulary[0].purpose, "reactivation");
  assert.equal(payload.sessions[0].objective, "Ask for directions");
  assert.equal("decisions" in payload, false);
  assert.equal("sourceReferences" in payload, false);
  assert.equal("notes" in payload.sessions[0], false);
});
