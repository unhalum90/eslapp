import type {
  PhaseOneData,
  PublishedPracticeUnit,
  ReuseAssessment,
  UnitContent,
  UnitRevision,
  VocabularyItem,
} from "./types";
import type {
  GeneratedUnitAgentProposal,
  UnitAgentMaterialDraft,
  UnitAgentSection,
  UnitAgentVocabularyDraft,
} from "../unit-agent/types";

export const MAX_UNIT_SESSIONS = 8;

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function createDistributionCode(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => (byte % 36).toString(36))
    .join("")
    .toUpperCase();
}

export function cloneUnit(unit: UnitContent): UnitContent {
  return structuredClone(unit);
}

export function deleteUnitFromPhaseOne(
  data: PhaseOneData,
  unitId: string,
  timestamp = new Date().toISOString(),
): PhaseOneData {
  if (!data.units.some((unit) => unit.id === unitId)) return data;

  const byId = new Map(data.units.map((unit) => [unit.id, unit]));
  const findDetachedRoot = (unit: UnitContent): string | null => {
    let cursor = unit;
    const visited = new Set<string>();
    while (cursor.parentUnitId && !visited.has(cursor.id)) {
      visited.add(cursor.id);
      if (cursor.parentUnitId === unitId) return cursor.id;
      const parent = byId.get(cursor.parentUnitId);
      if (!parent) return null;
      cursor = parent;
    }
    return null;
  };

  return {
    ...data,
    units: data.units
      .filter((unit) => unit.id !== unitId)
      .map((unit) => {
        const detachedRootId = findDetachedRoot(unit);
        if (!detachedRootId) return unit;
        return {
          ...unit,
          parentUnitId: unit.parentUnitId === unitId ? undefined : unit.parentUnitId,
          lineageRootId: detachedRootId,
          updatedAt: timestamp,
        };
      }),
    classRuns: data.classRuns.filter((run) => run.unitId !== unitId),
    revisions: data.revisions.filter((revision) => revision.unitId !== unitId),
  };
}

export function createRevision(unit: UnitContent, label: string): UnitRevision {
  return {
    id: createId("revision"),
    unitId: unit.id,
    label: label.trim() || "Saved version",
    createdAt: new Date().toISOString(),
    snapshot: cloneUnit(unit),
  };
}

export function applyAgentProposalToUnit(
  unit: UnitContent,
  proposal: GeneratedUnitAgentProposal,
  sections: UnitAgentSection[],
  timestamp = new Date().toISOString(),
): UnitContent {
  const selected = new Set(sections);
  const patch = proposal.patch;

  return {
    ...unit,
    title:
      selected.has("unitTitle") && patch.unitTitle !== null ? patch.unitTitle : unit.title,
    theme: selected.has("theme") && patch.theme !== null ? patch.theme : unit.theme,
    finalTask:
      selected.has("finalTask") && patch.finalTask !== null
        ? { ...patch.finalTask, successCriteria: [...patch.finalTask.successCriteria] }
        : unit.finalTask,
    grammarPoints:
      selected.has("grammarPoints") && patch.grammarPoints !== null
        ? [...patch.grammarPoints]
        : unit.grammarPoints,
    sessions:
      selected.has("sessions") && patch.sessions !== null
        ? patch.sessions.slice(0, MAX_UNIT_SESSIONS).map((session, index) => ({
            ...session,
            id: unit.sessions[index]?.id ?? createId("session"),
          }))
        : unit.sessions,
    decisions: [
      ...unit.decisions,
      {
        id: createId("decision"),
        kind: "choice",
        text: `Accepted Unit Architect proposal: ${proposal.title} (${sections.join(", ")}).`,
        active: true,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    updatedAt: timestamp,
  };
}

export function mergeAgentVocabulary(
  unit: UnitContent,
  vocabulary: VocabularyItem[],
  drafts: UnitAgentVocabularyDraft[],
  imageSelections: Record<number, string>,
  timestamp = new Date().toISOString(),
): { unit: UnitContent; vocabulary: VocabularyItem[] } {
  let nextVocabulary = [...vocabulary];
  let links = [...unit.vocabulary];

  drafts.forEach((draft, index) => {
    const normalized = normalizeVocabularyTerm(draft.term);
    if (!normalized) return;

    const existingIndex = nextVocabulary.findIndex(
      (item) => normalizeVocabularyTerm(item.term) === normalized,
    );
    const selectedImage = imageSelections[index] ?? "";

    if (existingIndex >= 0) {
      const existing = nextVocabulary[existingIndex];
      if (!links.some((link) => link.vocabularyId === existing.id)) {
        links = [...links, { vocabularyId: existing.id, purpose: "new" }];
      }
      if (selectedImage && !existing.imageUrl) {
        nextVocabulary[existingIndex] = {
          ...existing,
          imageUrl: selectedImage,
          updatedAt: timestamp,
        };
      }
      return;
    }

    const vocabularyId = createId("vocab");
    nextVocabulary = [
      ...nextVocabulary,
      {
        id: vocabularyId,
        term: draft.term.trim(),
        translationFr: draft.translationFr.trim(),
        phonetic: draft.phonetic.trim(),
        imageUrl: selectedImage,
        audio: [],
        tags: draft.tags.map((tag) => tag.trim()).filter(Boolean),
        notes: draft.notes.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ];
    links = [...links, { vocabularyId, purpose: "new" }];
  });

  return {
    unit: { ...unit, vocabulary: links, updatedAt: timestamp },
    vocabulary: nextVocabulary,
  };
}

export function mergeAgentMaterials(
  unit: UnitContent,
  drafts: UnitAgentMaterialDraft[],
  imageSelections: Record<string, string>,
  timestamp = new Date().toISOString(),
): UnitContent {
  const materials = [...(unit.materials ?? [])];
  const existingTitles = new Set(
    materials.map((material) => normalizeVocabularyTerm(material.title)),
  );

  drafts.forEach((draft, materialIndex) => {
    const normalizedTitle = normalizeVocabularyTerm(draft.title);
    if (!normalizedTitle || existingTitles.has(normalizedTitle)) return;
    existingTitles.add(normalizedTitle);
    materials.push({
      id: createId("material"),
      kind: draft.kind,
      title: draft.title.trim(),
      purpose: draft.purpose.trim(),
      instructions: draft.instructions.trim(),
      studentContent: draft.studentContent.trim(),
      teacherNotes: draft.teacherNotes.trim(),
      imageUrls: draft.imagePrompts
        .map((_, imageIndex) => imageSelections[`material:${materialIndex}:${imageIndex}`])
        .filter(Boolean),
      createdAt: timestamp,
      updatedAt: timestamp,
    });
  });

  return { ...unit, materials, updatedAt: timestamp };
}

export function normalizeVocabularyTerm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[^a-z0-9\s'-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(value: string): Set<string> {
  return new Set(normalizeVocabularyTerm(value).split(" ").filter(Boolean));
}

function similarity(left: string, right: string): number {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (a.size === 0 || b.size === 0) return 0;
  const intersection = [...a].filter((token) => b.has(token)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

export function assessVocabularyReuse(
  term: string,
  unitId: string,
  data: Pick<PhaseOneData, "units" | "vocabulary">,
): ReuseAssessment {
  const normalized = normalizeVocabularyTerm(term);
  const unit = data.units.find((candidate) => candidate.id === unitId);
  if (!unit || !normalized) {
    return { kind: "available", message: "Ready to add as a new global item." };
  }

  const exact = data.vocabulary.find(
    (item) => normalizeVocabularyTerm(item.term) === normalized,
  );

  if (exact && unit.vocabulary.some((link) => link.vocabularyId === exact.id)) {
    return {
      kind: "duplicate",
      vocabularyId: exact.id,
      message: `“${exact.term}” is already attached to this unit.`,
    };
  }

  if (exact) {
    const source = data.units.find((candidate) =>
      candidate.vocabulary.some((link) => link.vocabularyId === exact.id),
    );
    if (source) {
      return {
        kind: "reactivation",
        vocabularyId: exact.id,
        sourceUnitId: source.id,
        message: `Reuse “${exact.term}” deliberately as reactivation from ${source.title}.`,
      };
    }
    return {
      kind: "similar",
      vocabularyId: exact.id,
      message: `A global item named “${exact.term}” already exists. Attach it instead of duplicating it.`,
    };
  }

  const related = data.vocabulary.find((item) => similarity(item.term, term) >= 0.6);
  if (related) {
    return {
      kind: "similar",
      vocabularyId: related.id,
      message: `This looks similar to the global item “${related.term}”. Review before creating another item.`,
    };
  }

  return { kind: "available", message: "Ready to add as a new global item." };
}

export function vocabularyCompleteness(item: VocabularyItem): number {
  const facets = [
    item.imageUrl.trim(),
    item.audio.length > 0 ? "audio" : "",
    item.translationFr.trim(),
    item.phonetic.trim(),
  ];
  return Math.round((facets.filter(Boolean).length / facets.length) * 100);
}

export function calculateProgress(currentSession: number, sessionCount: number): number {
  if (sessionCount <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((currentSession / sessionCount) * 100)));
}

export function buildPracticePayload(
  unit: UnitContent,
  vocabulary: VocabularyItem[],
): PublishedPracticeUnit {
  return {
    schemaVersion: 1,
    unitId: unit.id,
    title: unit.title,
    theme: unit.theme,
    level: unit.level,
    finalTaskTitle: unit.finalTask.title,
    distributionCode: unit.distributionCode,
    sessions: unit.sessions.map(({ id, title, objective }) => ({ id, title, objective })),
    vocabulary: unit.vocabulary.flatMap((link) => {
      const item = vocabulary.find((candidate) => candidate.id === link.vocabularyId);
      if (!item) return [];
      return [
        {
          id: item.id,
          term: item.term,
          translationFr: item.translationFr,
          phonetic: item.phonetic,
          imageUrl: item.imageUrl,
          audio: item.audio,
          purpose: link.purpose,
        },
      ];
    }),
  };
}
