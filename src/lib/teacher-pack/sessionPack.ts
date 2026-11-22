import type {
  DocumentAdaptation,
  DocumentRole,
  PrintProfile,
  UnitContent,
  UnitMaterial,
  UnitSession,
} from "@/lib/phase-one/types";

export const SESSION_PACK_ROLES = [
  "teacher_guide",
  "student_sheet",
  "student_sheet:pap",
  "correction",
] as const;

export type SessionPhase =
  | "Réactivation"
  | "Anticipation"
  | "Input"
  | "Compréhension"
  | "Fait de langue"
  | "Entraînement"
  | "Production"
  | "Trace écrite"
  | "Homework";

export interface GeneratedSessionStage {
  phase: SessionPhase;
  minutes: number;
  teacherAction: string;
  studentAction: string;
}

export interface GeneratedSessionTask {
  id: string;
  title: string;
  instructionEn: string;
  instructionFr: string;
  prompt: string;
  options: string[];
  expectedAnswer: string;
  papSupports: string[];
  sentenceStarters: string[];
}

export interface GeneratedSessionPack {
  title: string;
  enquiryQuestion: string;
  objective: string;
  support: {
    title: string;
    kind: "text" | "audio" | "video" | "image" | "teacher_resource";
    classroomContent: string;
    sourceNote: string;
  };
  stages: GeneratedSessionStage[];
  tasks: GeneratedSessionTask[];
  languageFocus: {
    grammar: string[];
    vocabulary: string[];
    phonology: string[];
  };
  finalProduction: {
    instructionEn: string;
    successCriteria: string[];
    papStarters: string[];
  };
  traceEcrite: string;
  homework: string;
  differentiationNotes: string[];
}

export interface SessionPackArtifact extends Omit<UnitMaterial, "id" | "createdAt" | "updatedAt"> {
  role: DocumentRole;
  adaptation: DocumentAdaptation;
  sessionId: string;
  familyId: string;
  sortOrder: number;
  printProfile: PrintProfile;
  sharedTaskIds: string[];
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function paragraphs(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replaceAll("\n", "<br />")}</p>`)
    .join("");
}

function list(items: string[], className = ""): string {
  if (items.length === 0) return "";
  return `<ul${className ? ` class="${className}"` : ""}>${items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("")}</ul>`;
}

function answerLines(count = 3): string {
  return Array.from({ length: count }, () => '<p class="answer-line">........................................................................................................</p>').join("");
}

function documentTitle(
  sequenceTitle: string,
  sessionNumber: number,
  sessionTitle: string,
  suffix: string,
): string {
  return `${sequenceTitle} · Séance ${sessionNumber} · ${sessionTitle} · ${suffix}`;
}

function printProfile(
  role: DocumentRole,
  template: "classic" | "themed",
): PrintProfile {
  return {
    paper: "A4",
    orientation: "portrait",
    targetPages: role === "teacher_guide" ? 2 : 2,
    copiesPerPage: 1,
    colorMode: template === "themed" ? "monochrome" : "accent",
    template,
  };
}

function renderSupport(pack: GeneratedSessionPack): string {
  return `<section class="source-box"><h2>Support · ${escapeHtml(pack.support.title)}</h2>${paragraphs(
    pack.support.classroomContent,
  )}<p class="source-note">${escapeHtml(pack.support.sourceNote)}</p></section>`;
}

function renderStudentTasks(pack: GeneratedSessionPack, pap: boolean, correction: boolean): string {
  return pack.tasks
    .map((task, index) => {
      const instruction = pap
        ? `<p class="instruction"><strong>${escapeHtml(task.instructionEn)}</strong><br /><span>${escapeHtml(task.instructionFr)}</span></p>`
        : `<p class="instruction"><strong>${escapeHtml(task.instructionEn)}</strong></p>`;
      const options = list(task.options, "choice-list");
      const support = pap
        ? `<aside class="boost-box"><h3>NEED A BOOST?</h3>${list(task.papSupports)}${
            task.sentenceStarters.length > 0
              ? `<p><strong>Start with:</strong> ${task.sentenceStarters
                  .map(escapeHtml)
                  .join(" / ")}</p>`
              : ""
          }</aside>`
        : "";
      const answer = correction
        ? `<p class="answer"><strong>Réponse attendue :</strong> ${escapeHtml(task.expectedAnswer)}</p>`
        : answerLines(pap ? 4 : 3);

      return `<section class="task" data-task-id="${escapeHtml(task.id)}"><h2>${index + 1}. ${escapeHtml(
        task.title,
      )}</h2>${instruction}<p>${escapeHtml(task.prompt)}</p>${options}${support}${answer}</section>`;
    })
    .join("");
}

function renderStudentDocument(
  unit: UnitContent,
  session: UnitSession,
  sessionNumber: number,
  pack: GeneratedSessionPack,
  pap: boolean,
  correction: boolean,
): string {
  const variant = correction ? "Correction" : pap ? "Fiche guidée PAP" : "Fiche élève";
  const productionSupport = pap
    ? `<aside class="boost-box"><h3>Pour commencer</h3>${list(pack.finalProduction.papStarters)}</aside>`
    : "";

  return `<article class="teacher-document ${pap ? "pap-document" : ""} ${
    correction ? "correction-document" : ""
  }"><header class="document-heading"><p class="sequence-kicker">${escapeHtml(unit.title)}</p><h1>Séance ${sessionNumber} · ${escapeHtml(
    pack.title || session.title,
  )}</h1><p>${variant} · ${escapeHtml(unit.level)}</p></header><blockquote class="goal-box"><strong>Today's goal</strong><br />${escapeHtml(
    pack.objective,
  )}</blockquote><p class="student-fields">Name: ____________________ &nbsp;&nbsp; Class: __________ &nbsp;&nbsp; Date: __________</p>${renderSupport(
    pack,
  )}${renderStudentTasks(pack, pap, correction)}<section class="task production-task"><h2>${
    pack.tasks.length + 1
  }. YOUR TURN!</h2><p class="instruction"><strong>${escapeHtml(
    pack.finalProduction.instructionEn,
  )}</strong></p>${productionSupport}<h3>Success checklist</h3>${list(
    pack.finalProduction.successCriteria,
  )}${correction ? "" : answerLines(pap ? 6 : 5)}</section><section class="trace-box"><h2>TRACE ÉCRITE</h2><p>${escapeHtml(
    pack.traceEcrite,
  )}</p></section><section class="homework-box"><h2>HOMEWORK</h2><p>${escapeHtml(
    pack.homework,
  )}</p></section></article>`;
}

function renderTeacherGuide(
  unit: UnitContent,
  session: UnitSession,
  sessionNumber: number,
  pack: GeneratedSessionPack,
): string {
  const totalMinutes = pack.stages.reduce((total, stage) => total + stage.minutes, 0);
  const stageRows = pack.stages
    .map(
      (stage) => `<tr><td><strong>${escapeHtml(stage.phase)}</strong><br />${stage.minutes} min</td><td>${escapeHtml(
        stage.teacherAction,
      )}</td><td>${escapeHtml(stage.studentAction)}</td></tr>`,
    )
    .join("");
  const answers = pack.tasks
    .map(
      (task, index) => `<li data-task-id="${escapeHtml(task.id)}"><strong>${index + 1}. ${escapeHtml(
        task.title,
      )}</strong> — ${escapeHtml(task.expectedAnswer)}</li>`,
    )
    .join("");

  return `<article class="teacher-document teacher-guide"><header class="document-heading"><p class="sequence-kicker">${escapeHtml(
    unit.title,
  )}</p><h1>Séance ${sessionNumber} · ${escapeHtml(pack.title || session.title)}</h1><p>Fiche professeur · ${escapeHtml(
    unit.level,
  )} · ${totalMinutes} minutes</p></header><blockquote class="goal-box"><strong>Question de séance</strong><br />${escapeHtml(
    pack.enquiryQuestion,
  )}<br /><strong>Objectif</strong><br />${escapeHtml(pack.objective)}</blockquote><section><h2>Ancrage dans la séquence</h2><p><strong>Problématique :</strong> ${escapeHtml(
    unit.sequenceFrame?.problematic || unit.theme,
  )}</p><p><strong>Tâche finale :</strong> ${escapeHtml(unit.finalTask.title)}</p></section><section><h2>Déroulé</h2><table><thead><tr><th>Phase</th><th>Professeur</th><th>Élèves</th></tr></thead><tbody>${stageRows}</tbody></table></section><section><h2>Langue</h2><div class="language-grid"><div><h3>Grammar</h3>${list(
    pack.languageFocus.grammar,
  )}</div><div><h3>Vocabulary</h3>${list(pack.languageFocus.vocabulary)}</div><div><h3>Phonology</h3>${list(
    pack.languageFocus.phonology,
  )}</div></div></section><section><h2>Correction rapide</h2><ol class="answer-key">${answers}</ol></section><section class="trace-box"><h2>TRACE ÉCRITE</h2><p>${escapeHtml(
    pack.traceEcrite,
  )}</p></section><section class="pap-note"><h2>Différenciation / PAP</h2>${list(
    pack.differentiationNotes,
  )}</section><section class="homework-box"><h2>HOMEWORK</h2><p>${escapeHtml(
    pack.homework,
  )}</p></section></article>`;
}

export function buildSessionPackArtifacts({
  unit,
  session,
  sessionNumber,
  familyId,
  pack,
}: {
  unit: UnitContent;
  session: UnitSession;
  sessionNumber: number;
  familyId: string;
  pack: GeneratedSessionPack;
}): SessionPackArtifact[] {
  const template = unit.packPreferences?.printTemplate ?? "classic";
  const sharedTaskIds = pack.tasks.map((task) => task.id);
  const common = {
    kind: "worksheet" as const,
    purpose: `Supports coordonnés pour la séance ${sessionNumber}: ${pack.objective}`,
    imageUrls: [],
    sessionId: session.id,
    familyId,
    sharedTaskIds,
  };

  return [
    {
      ...common,
      title: documentTitle(unit.title, sessionNumber, pack.title, "Fiche professeur"),
      instructions: "Déroulé minuté, objectifs, correction, trace écrite et différenciation.",
      studentContent: renderTeacherGuide(unit, session, sessionNumber, pack),
      teacherNotes: "",
      role: "teacher_guide",
      adaptation: "standard",
      sortOrder: 10,
      printProfile: printProfile("teacher_guide", template),
    },
    {
      ...common,
      title: documentTitle(unit.title, sessionNumber, pack.title, "Fiche élève"),
      instructions: "Fiche élève standard, sans réponses.",
      studentContent: renderStudentDocument(unit, session, sessionNumber, pack, false, false),
      teacherNotes: "",
      role: "student_sheet",
      adaptation: "standard",
      sortOrder: 20,
      printProfile: printProfile("student_sheet", template),
    },
    {
      ...common,
      title: documentTitle(unit.title, sessionNumber, pack.title, "Fiche guidée PAP"),
      instructions: "Même objectif et mêmes tâches, avec consignes segmentées et aides visibles.",
      studentContent: renderStudentDocument(unit, session, sessionNumber, pack, true, false),
      teacherNotes: "",
      role: "student_sheet",
      adaptation: "pap",
      sortOrder: 30,
      printProfile: printProfile("student_sheet", template),
    },
    {
      ...common,
      title: documentTitle(unit.title, sessionNumber, pack.title, "Correction"),
      instructions: "Correction alignée sur la fiche standard.",
      studentContent: renderStudentDocument(unit, session, sessionNumber, pack, false, true),
      teacherNotes: "",
      role: "correction",
      adaptation: "standard",
      sortOrder: 40,
      printProfile: printProfile("correction", template),
    },
  ];
}

export function materialRoleKey(material: UnitMaterial): string {
  if (material.role === "student_sheet" && material.adaptation === "pap") {
    return "student_sheet:pap";
  }
  return material.role ?? material.kind;
}

export function sessionPackCompleteness(materials: UnitMaterial[]): number {
  const available = new Set(materials.map(materialRoleKey));
  return SESSION_PACK_ROLES.filter((role) => available.has(role)).length;
}

export function roleLabel(material: Pick<UnitMaterial, "role" | "adaptation" | "kind">): string {
  if (material.role === "teacher_guide") return "Fiche professeur";
  if (material.role === "student_sheet" && material.adaptation === "pap") return "Version PAP";
  if (material.role === "student_sheet") return "Fiche élève";
  if (material.role === "correction") return "Correction";
  if (material.role === "assessment") return material.adaptation === "pap" ? "Évaluation PAP" : "Évaluation";
  if (material.role === "rubric") return "Grille";
  if (material.role === "support_sheet") return "Support";
  if (material.role === "vocabulary_cards") return "Cartes de lexique";
  if (material.role === "final_task") return "Tâche finale";
  return material.kind === "activity" ? "Activité" : "Document";
}
