import assert from "node:assert/strict";
import test from "node:test";
import {
  applyAgentProposalToUnit,
  assessVocabularyReuse,
  buildPracticePayload,
  calculateProgress,
  createDistributionCode,
  deleteUnitFromPhaseOne,
  mergeAgentVocabulary,
  mergeAgentMaterials,
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
  materials: [],
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

test("applies only approved Unit Architect sections and records the choice", () => {
  const proposal = {
    title: "Tighten the backward plan",
    rationale: "The grammar should follow the task.",
    patch: {
      unitTitle: "A new title",
      theme: "A new theme",
      finalTask: null,
      grammarPoints: ["imperatives", "question forms"],
      sessions: null,
    },
  };
  const timestamp = "2026-08-21T08:00:00.000Z";
  const updated = applyAgentProposalToUnit(unit, proposal, ["grammarPoints"], timestamp);

  assert.equal(updated.title, unit.title);
  assert.equal(updated.theme, unit.theme);
  assert.deepEqual(updated.grammarPoints, ["imperatives", "question forms"]);
  assert.equal(updated.updatedAt, timestamp);
  assert.match(updated.decisions.at(-1).text, /Accepted Unit Architect proposal/);
});

test("preserves matching session identities and caps an agent plan at eight sessions", () => {
  const sessions = Array.from({ length: 10 }, (_, index) => ({
    title: `Session ${index + 1}`,
    objective: `Objective ${index + 1}`,
    durationMinutes: 55,
    reactivationTargetPercentage: 20,
    notes: "",
  }));
  const proposal = {
    title: "Build the session path",
    rationale: "Create a coherent sequence.",
    patch: {
      unitTitle: null,
      theme: null,
      finalTask: null,
      grammarPoints: null,
      sessions,
    },
  };
  const updated = applyAgentProposalToUnit(unit, proposal, ["sessions"]);

  assert.equal(updated.sessions.length, 8);
  assert.equal(updated.sessions[0].id, unit.sessions[0].id);
});

test("creates agent vocabulary with the selected generated image", () => {
  const timestamp = "2026-08-21T09:00:00.000Z";
  const result = mergeAgentVocabulary(
    unit,
    vocabulary,
    [
      {
        term: "zebra crossing",
        translationFr: "passage piéton",
        phonetic: "/ˌzebrə ˈkrɒsɪŋ/",
        tags: ["directions", " London "],
        notes: "Street vocabulary",
        imagePrompt: "A London zebra crossing seen from pavement level",
      },
    ],
    { 0: "data:image/webp;base64,selected" },
    timestamp,
  );

  const created = result.vocabulary.find((item) => item.term === "zebra crossing");
  assert.equal(created.imageUrl, "data:image/webp;base64,selected");
  assert.deepEqual(created.tags, ["directions", "London"]);
  assert.ok(result.unit.vocabulary.some((link) => link.vocabularyId === created.id));
});

test("reuses existing vocabulary without overwriting an existing image", () => {
  const result = mergeAgentVocabulary(
    { ...unit, vocabulary: [] },
    vocabulary,
    [
      {
        term: "turn left",
        translationFr: "tourner à gauche",
        phonetic: "",
        tags: [],
        notes: "",
        imagePrompt: "A left-turn arrow",
      },
    ],
    { 0: "data:image/webp;base64,new" },
  );

  assert.equal(result.vocabulary.length, vocabulary.length);
  assert.equal(result.vocabulary[0].imageUrl, vocabulary[0].imageUrl);
  assert.equal(result.unit.vocabulary[0].vocabularyId, vocabulary[0].id);
});

test("creates complete classroom materials with only selected visuals", () => {
  const timestamp = "2026-08-21T10:00:00.000Z";
  const updated = mergeAgentMaterials(
    unit,
    [
      {
        kind: "worksheet",
        title: "London route challenge",
        purpose: "Rehearse the final role-play.",
        instructions: "Read the map and write directions.",
        studentContent: "Route A: Start at Westminster and reach the London Eye.",
        teacherNotes: "Accept equivalent direction phrases.",
        imagePrompts: ["A simple London street map", "A London bus icon"],
      },
    ],
    { "material:0:1": "data:image/webp;base64,bus" },
    timestamp,
  );

  assert.equal(updated.materials.length, 1);
  assert.equal(updated.materials[0].studentContent.includes("Route A"), true);
  assert.deepEqual(updated.materials[0].imageUrls, ["data:image/webp;base64,bus"]);
  assert.equal(updated.materials[0].updatedAt, timestamp);
});

test("does not add a duplicate material title", () => {
  const existing = {
    ...unit,
    materials: [
      {
        id: "material_1",
        kind: "activity",
        title: "Direction race",
        purpose: "Practice directions",
        instructions: "Work in pairs.",
        studentContent: "Take turns.",
        teacherNotes: "",
        imageUrls: [],
        createdAt: unit.createdAt,
        updatedAt: unit.updatedAt,
      },
    ],
  };
  const updated = mergeAgentMaterials(
    existing,
    [
      {
        kind: "activity",
        title: " direction RACE ",
        purpose: "Duplicate",
        instructions: "",
        studentContent: "Duplicate",
        teacherNotes: "",
        imagePrompts: [],
      },
    ],
    {},
  );

  assert.equal(updated.materials.length, 1);
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

test("deletes one unit and preserves its descendants as an independent lineage", () => {
  const child = {
    ...structuredClone(unit),
    id: "unit_child",
    lineageRootId: unit.id,
    parentUnitId: unit.id,
  };
  const grandchild = {
    ...structuredClone(unit),
    id: "unit_grandchild",
    lineageRootId: unit.id,
    parentUnitId: child.id,
  };
  const other = { ...structuredClone(unit), id: "unit_other", lineageRootId: "unit_other" };
  const data = {
    schemaVersion: 1,
    classes: [],
    units: [unit, child, grandchild, other],
    classRuns: [
      { id: "run_deleted", classId: "class_1", unitId: unit.id },
      { id: "run_kept", classId: "class_1", unitId: other.id },
    ],
    vocabulary,
    revisions: [
      { id: "revision_deleted", unitId: unit.id, snapshot: unit },
      { id: "revision_kept", unitId: other.id, snapshot: other },
    ],
  };

  const next = deleteUnitFromPhaseOne(data, unit.id, "2026-08-21T15:30:00.000Z");
  assert.deepEqual(next.units.map((item) => item.id), [child.id, grandchild.id, other.id]);
  assert.equal(next.units[0].parentUnitId, undefined);
  assert.equal(next.units[0].lineageRootId, child.id);
  assert.equal(next.units[1].parentUnitId, child.id);
  assert.equal(next.units[1].lineageRootId, child.id);
  assert.deepEqual(next.classRuns.map((run) => run.id), ["run_kept"]);
  assert.deepEqual(next.revisions.map((revision) => revision.id), ["revision_kept"]);
});
