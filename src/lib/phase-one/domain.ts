import type {
  PhaseOneData,
  PublishedPracticeUnit,
  ReuseAssessment,
  UnitContent,
  UnitRevision,
  VocabularyItem,
} from "./types";

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

export function createRevision(unit: UnitContent, label: string): UnitRevision {
  return {
    id: createId("revision"),
    unitId: unit.id,
    label: label.trim() || "Saved version",
    createdAt: new Date().toISOString(),
    snapshot: cloneUnit(unit),
  };
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
