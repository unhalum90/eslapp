import type {
  DocumentAdaptation,
  DocumentRole,
  PrintProfile,
  UnitContent,
  UnitMaterial,
} from "@/lib/phase-one/types";

export const ASSESSMENT_PACK_ROLES = [
  "assessment",
  "assessment:pap",
  "correction",
  "rubric",
] as const;

export interface GeneratedAssessmentItem {
  id: string;
  prompt: string;
  choices: string[];
  expectedAnswer: string;
  points: number;
  papSupports: string[];
}

export interface GeneratedAssessmentSection {
  id: string;
  skill: "vocabulary" | "reading" | "listening" | "grammar" | "culture" | "production";
  title: string;
  instructionEn: string;
  instructionFr: string;
  supportText: string;
  items: GeneratedAssessmentItem[];
}

export interface GeneratedRubricCriterion {
  criterion: string;
  secureDescriptor: string;
  developingDescriptor: string;
  beginningDescriptor: string;
  maxPoints: number;
}

export interface GeneratedAssessmentPack {
  title: string;
  durationMinutes: number;
  studentMission: string;
  sections: GeneratedAssessmentSection[];
  rubric: GeneratedRubricCriterion[];
  papGeneralSupports: string[];
}

export interface AssessmentPackArtifact extends Omit<UnitMaterial, "id" | "createdAt" | "updatedAt"> {
  role: DocumentRole;
  adaptation: DocumentAdaptation;
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

function list(items: string[]): string {
  if (items.length === 0) return "";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function answerLines(count = 2): string {
  return Array.from({ length: count }, () => '<p class="answer-line">........................................................................................................</p>').join("");
}

function totalPoints(pack: GeneratedAssessmentPack): number {
  const exercisePoints = pack.sections.flatMap((section) => section.items).reduce((sum, item) => sum + item.points, 0);
  const rubricPoints = pack.rubric.reduce((sum, criterion) => sum + criterion.maxPoints, 0);
  return exercisePoints + rubricPoints;
}

function renderAssessment(
  unit: UnitContent,
  pack: GeneratedAssessmentPack,
  pap: boolean,
  correction: boolean,
): string {
  const sections = pack.sections
    .map((section, sectionIndex) => {
      const items = section.items
        .map((item, itemIndex) => {
          const choices = item.choices.length
            ? `<ul class="choice-list">${item.choices.map((choice) => `<li>${escapeHtml(choice)}</li>`).join("")}</ul>`
            : "";
          const papSupport = pap && item.papSupports.length
            ? `<aside class="boost-box"><h3>AIDE</h3>${list(item.papSupports)}</aside>`
            : "";
          const response = correction
            ? `<p class="answer"><strong>Réponse :</strong> ${escapeHtml(item.expectedAnswer)} <strong>(${item.points} pt${item.points > 1 ? "s" : ""})</strong></p>`
            : answerLines(section.skill === "production" ? 5 : 2);
          return `<section class="assessment-item" data-task-id="${escapeHtml(item.id)}"><h3>${sectionIndex + 1}.${itemIndex + 1} · ${escapeHtml(item.prompt)} <span>/${item.points}</span></h3>${choices}${papSupport}${response}</section>`;
        })
        .join("");
      return `<section class="task assessment-section" data-section-id="${escapeHtml(section.id)}"><h2>${sectionIndex + 1}. ${escapeHtml(section.title)}</h2><p class="instruction"><strong>${escapeHtml(section.instructionEn)}</strong>${pap ? `<br /><span>${escapeHtml(section.instructionFr)}</span>` : ""}</p>${section.supportText ? `<blockquote class="source-box">${escapeHtml(section.supportText).replaceAll("\n", "<br />")}</blockquote>` : ""}${items}</section>`;
    })
    .join("");

  return `<article class="teacher-document assessment-document ${pap ? "pap-document" : ""} ${correction ? "correction-document" : ""}"><header class="document-heading"><p class="sequence-kicker">${escapeHtml(unit.title)}</p><h1>${escapeHtml(pack.title)}</h1><p>${correction ? "Correction" : pap ? "Version guidée PAP" : "Évaluation"} · ${escapeHtml(unit.level)} · ${pack.durationMinutes} min · /${totalPoints(pack)}</p></header><p class="student-fields">Name: ____________________ &nbsp;&nbsp; Class: __________ &nbsp;&nbsp; Date: __________</p><blockquote class="goal-box"><strong>Your mission</strong><br />${escapeHtml(pack.studentMission)}</blockquote>${pap ? `<aside class="pap-note"><h2>Pour réussir</h2>${list(pack.papGeneralSupports)}</aside>` : ""}${sections}</article>`;
}

function renderRubric(unit: UnitContent, pack: GeneratedAssessmentPack): string {
  const rows = pack.rubric.map((criterion) => `<tr><td><strong>${escapeHtml(criterion.criterion)}</strong><br />/${criterion.maxPoints}</td><td>${escapeHtml(criterion.secureDescriptor)}</td><td>${escapeHtml(criterion.developingDescriptor)}</td><td>${escapeHtml(criterion.beginningDescriptor)}</td></tr>`).join("");
  return `<article class="teacher-document rubric-document"><header class="document-heading"><p class="sequence-kicker">${escapeHtml(unit.title)}</p><h1>Grille d’évaluation & autoévaluation</h1><p>${escapeHtml(unit.level)} · tâche finale</p></header><blockquote class="goal-box"><strong>${escapeHtml(unit.finalTask.title)}</strong><br />${escapeHtml(unit.finalTask.brief)}</blockquote><table><thead><tr><th>Critère</th><th>Maîtrisé</th><th>En cours</th><th>À renforcer</th></tr></thead><tbody>${rows}</tbody></table><section class="trace-box"><h2>Mon bilan</h2><p>Je suis fier / fière de : ............................................................................................</p><p>Mon prochain objectif : ............................................................................................</p></section></article>`;
}

function printProfile(role: DocumentRole, template: "classic" | "themed"): PrintProfile {
  return {
    paper: "A4",
    orientation: "portrait",
    targetPages: role === "rubric" ? 1 : 2,
    copiesPerPage: 1,
    colorMode: role === "correction" ? "accent" : template === "themed" ? "monochrome" : "accent",
    template,
  };
}

export function buildAssessmentPackArtifacts({
  unit,
  familyId,
  pack,
}: {
  unit: UnitContent;
  familyId: string;
  pack: GeneratedAssessmentPack;
}): AssessmentPackArtifact[] {
  const template = unit.packPreferences?.printTemplate ?? "classic";
  const sharedTaskIds = pack.sections.flatMap((section) => section.items.map((item) => item.id));
  const common = {
    kind: "worksheet" as const,
    purpose: `Évaluation alignée sur la tâche finale : ${unit.finalTask.title}`,
    imageUrls: [],
    familyId,
    sharedTaskIds,
  };

  return [
    {
      ...common,
      title: `${unit.title} · Évaluation`,
      instructions: "Version standard prête à imprimer, sans réponses.",
      studentContent: renderAssessment(unit, pack, false, false),
      teacherNotes: "",
      role: "assessment",
      adaptation: "standard",
      sortOrder: 500,
      printProfile: printProfile("assessment", template),
    },
    {
      ...common,
      title: `${unit.title} · Évaluation PAP`,
      instructions: "Même évaluation avec consignes segmentées et aides visibles.",
      studentContent: renderAssessment(unit, pack, true, false),
      teacherNotes: "",
      role: "assessment",
      adaptation: "pap",
      sortOrder: 510,
      printProfile: printProfile("assessment", template),
    },
    {
      ...common,
      title: `${unit.title} · Correction de l’évaluation`,
      instructions: "Correction alignée, réponses et points visibles.",
      studentContent: renderAssessment(unit, pack, false, true),
      teacherNotes: "",
      role: "correction",
      adaptation: "standard",
      sortOrder: 520,
      printProfile: printProfile("correction", template),
    },
    {
      ...common,
      title: `${unit.title} · Grille et autoévaluation`,
      instructions: "Grille critériée utilisable par l’enseignant et l’élève.",
      studentContent: renderRubric(unit, pack),
      teacherNotes: "",
      role: "rubric",
      adaptation: "standard",
      sortOrder: 530,
      printProfile: printProfile("rubric", template),
    },
  ];
}

export function assessmentRoleKey(material: UnitMaterial): string {
  if (material.role === "assessment" && material.adaptation === "pap") return "assessment:pap";
  return material.role ?? material.kind;
}
