import assert from "node:assert/strict";
import test from "node:test";
import { buildSessionPackArtifacts, materialRoleKey } from "./sessionPack.ts";
import { assessmentRoleKey, buildAssessmentPackArtifacts } from "./assessmentPack.ts";

const unit = {
  id: "unit_test",
  lineageRootId: "unit_test",
  title: "Blackwood Manor",
  theme: "An original country-house mystery",
  level: "4e",
  schoolYear: "2026–2027",
  status: "draft",
  sequenceFrame: {
    sequenceOrder: 2,
    period: "November",
    culturalAxis: "Imaginary worlds",
    problematic: "How can evidence reveal the truth?",
    notions: [],
    cefrEntry: "A2",
    cefrTarget: "A2+",
    communicativeGoals: [],
    lexicalFields: ["evidence", "suspects"],
    phonologyPoints: [],
    reactivatedGrammarPoints: [],
  },
  packPreferences: {
    includeTeacherGuides: true,
    includeStudentSheets: true,
    includePap: true,
    includeAssessment: true,
    includeCorrection: true,
    includeRubric: true,
    printTemplate: "classic",
  },
  finalTask: {
    title: "Solve the case",
    performanceType: "Oral presentation",
    brief: "Use the evidence and defend one conclusion.",
    successCriteria: ["Use evidence", "Justify the conclusion"],
  },
  sessions: [],
  materials: [],
  vocabulary: [],
  grammarPoints: ["past continuous", "modals of deduction"],
  sourceReferences: [],
  curriculumReferences: [],
  decisions: [],
  distributionCode: "TEST01",
  published: false,
  createdAt: "2026-08-26T00:00:00.000Z",
  updatedAt: "2026-08-26T00:00:00.000Z",
};

const session = {
  id: "session_1",
  title: "Inspect the room",
  objective: "Identify and describe three pieces of evidence.",
  durationMinutes: 55,
  reactivationTargetPercentage: 20,
  notes: "",
};

const lessonPack = {
  title: "Inspect the room",
  enquiryQuestion: "What happened in the library?",
  objective: session.objective,
  support: {
    title: "The inspector's notes",
    kind: "text",
    classroomContent: "The window was open. A wet footprint was visible near the desk.",
    sourceNote: "Original classroom text.",
  },
  stages: [
    { phase: "Réactivation", minutes: 5, teacherAction: "Faire rappeler le lexique.", studentAction: "Nommer trois objets." },
    { phase: "Input", minutes: 8, teacherAction: "Distribuer le support.", studentAction: "Lire individuellement." },
    { phase: "Compréhension", minutes: 10, teacherAction: "Faire justifier.", studentAction: "Cocher et citer." },
    { phase: "Fait de langue", minutes: 8, teacherAction: "Faire observer must/might.", studentAction: "Classer les hypothèses." },
    { phase: "Entraînement", minutes: 8, teacherAction: "Lancer le travail en binôme.", studentAction: "Comparer les indices." },
    { phase: "Production", minutes: 10, teacherAction: "Faire produire une hypothèse.", studentAction: "Justifier une conclusion." },
    { phase: "Trace écrite", minutes: 4, teacherAction: "Valider la trace.", studentAction: "Copier la trace." },
    { phase: "Homework", minutes: 2, teacherAction: "Donner le devoir.", studentAction: "Noter le devoir." },
  ],
  tasks: [
    {
      id: "T1",
      title: "Spot the clues",
      instructionEn: "Read and tick the three clues.",
      instructionFr: "Lis puis coche les trois indices.",
      prompt: "Which details are evidence?",
      options: ["the open window", "the blue carpet"],
      expectedAnswer: "The open window is evidence.",
      papSupports: ["Relis la première phrase."],
      sentenceStarters: ["I can see…"],
    },
  ],
  languageFocus: { grammar: ["must / might"], vocabulary: ["clue", "footprint"], phonology: ["word stress"] },
  finalProduction: {
    instructionEn: "Explain your first hypothesis.",
    successCriteria: ["Name one clue", "Use might"],
    papStarters: ["The suspect might… because…"],
  },
  traceEcrite: "The suspect might have entered through the window.",
  homework: "Learn the trace and the clue vocabulary.",
  differentiationNotes: ["Keep the same hypothesis task.", "Provide sentence starters."],
};

test("session generation creates four aligned artifacts without leaking answers", () => {
  const artifacts = buildSessionPackArtifacts({
    unit: { ...unit, sessions: [session] },
    session,
    sessionNumber: 1,
    familyId: "pack_1",
    pack: lessonPack,
  });
  assert.deepEqual(artifacts.map(materialRoleKey), ["teacher_guide", "student_sheet", "student_sheet:pap", "correction"]);
  assert.ok(artifacts.every((artifact) => artifact.sharedTaskIds.join(",") === "T1"));
  assert.equal(artifacts[1].studentContent.includes("The open window is evidence."), false);
  assert.equal(artifacts[2].studentContent.includes("The open window is evidence."), false);
  assert.equal(artifacts[3].studentContent.includes("The open window is evidence."), true);
});

test("assessment generation keeps standard, PAP and correction numbering aligned", () => {
  const pack = {
    title: "End-of-sequence assessment",
    durationMinutes: 55,
    studentMission: "Study the evidence and defend your conclusion.",
    sections: [{
      id: "S1",
      skill: "reading",
      title: "Read the report",
      instructionEn: "Read and answer.",
      instructionFr: "Lis puis réponds.",
      supportText: "The window was open.",
      items: [{
        id: "S1T1",
        prompt: "What was open?",
        choices: [],
        expectedAnswer: "The window was open.",
        points: 4,
        papSupports: ["Surligne le sujet."],
      }],
    }],
    rubric: [
      { criterion: "Meaning", secureDescriptor: "Clear", developingDescriptor: "Mostly clear", beginningDescriptor: "Partial", maxPoints: 6 },
      { criterion: "Evidence", secureDescriptor: "Relevant", developingDescriptor: "Some", beginningDescriptor: "Limited", maxPoints: 5 },
      { criterion: "Language", secureDescriptor: "Controlled", developingDescriptor: "Understandable", beginningDescriptor: "Fragile", maxPoints: 5 },
    ],
    papGeneralSupports: ["Lis une consigne à la fois.", "Utilise les aides."],
  };
  const artifacts = buildAssessmentPackArtifacts({ unit, familyId: "assessment_1", pack });
  assert.deepEqual(artifacts.map(assessmentRoleKey), ["assessment", "assessment:pap", "correction", "rubric"]);
  assert.ok(artifacts.slice(0, 3).every((artifact) => artifact.sharedTaskIds.join(",") === "S1T1"));
  assert.equal(artifacts[0].studentContent.includes("The window was open.</strong>"), false);
  assert.equal(artifacts[2].studentContent.includes("Réponse :</strong> The window was open."), true);
});
