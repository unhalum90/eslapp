import type {
  CurriculumReference,
  FinalTask,
  LevelCode,
  SourceReference,
  UnitContent,
  UnitDecision,
  UnitSession,
  UnitMaterial,
  VocabularyItem,
} from "@/lib/phase-one/types";

export type UnitAgentSection =
  | "unitTitle"
  | "theme"
  | "finalTask"
  | "grammarPoints"
  | "sessions"
  | "vocabularyItems"
  | "materials";

export type UnitAgentProposalStatus =
  | "pending"
  | "applied"
  | "partially_applied"
  | "rejected";

export type UnitAgentSessionDraft = Omit<UnitSession, "id">;

export interface UnitAgentVocabularyDraft {
  term: string;
  translationFr: string;
  phonetic: string;
  tags: string[];
  notes: string;
  imagePrompt: string;
}

export type UnitAgentMaterialDraft = Omit<
  UnitMaterial,
  "id" | "imageUrls" | "createdAt" | "updatedAt"
> & {
  imagePrompts: string[];
};

export interface UnitAgentProposalPatch {
  unitTitle: string | null;
  theme: string | null;
  finalTask: FinalTask | null;
  grammarPoints: string[] | null;
  sessions: UnitAgentSessionDraft[] | null;
  vocabularyItems: UnitAgentVocabularyDraft[] | null;
  materials: UnitAgentMaterialDraft[] | null;
}

export interface GeneratedUnitAgentProposal {
  title: string;
  rationale: string;
  patch: UnitAgentProposalPatch;
}

export interface UnitAgentProposal extends GeneratedUnitAgentProposal {
  id: string;
  status: UnitAgentProposalStatus;
  appliedSections: UnitAgentSection[];
}

export interface UnitAgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  proposal?: UnitAgentProposal;
  errorCode?: UnitAgentErrorCode;
}

export type UnitAgentErrorCode =
  | "AUTH_REQUIRED"
  | "ACCESS_DENIED"
  | "AGENT_NOT_CONFIGURED"
  | "STRUCTURED_OUTPUT_FAILED"
  | "PROVIDER_FAILED"
  | "INVALID_REQUEST";

export interface UnitAgentContext {
  unit: Pick<
    UnitContent,
    | "id"
    | "title"
    | "theme"
    | "level"
    | "schoolYear"
    | "status"
    | "sequenceFrame"
    | "packPreferences"
    | "finalTask"
    | "sessions"
    | "materials"
    | "grammarPoints"
  >;
  vocabulary: Array<
    Pick<VocabularyItem, "term" | "translationFr" | "phonetic" | "tags" | "notes">
  >;
  sources: SourceReference[];
  curriculumReferences: CurriculumReference[];
  decisions: UnitDecision[];
  activeTab:
    | "plan"
    | "vocabulary"
    | "materials"
    | "sources"
    | "decisions"
    | "delivery";
  level: LevelCode;
}

export interface UnitAgentRequest {
  prompt: string;
  context: UnitAgentContext;
  conversation: Array<Pick<UnitAgentMessage, "role" | "content">>;
}

export interface UnitAgentResponse {
  assistantMessage: string;
  proposal: GeneratedUnitAgentProposal | null;
}

export type UnitAgentActionResult =
  | { ok: true; response: UnitAgentResponse }
  | {
      ok: false;
      code: UnitAgentErrorCode;
      message: string;
      retryable: boolean;
    };
