/**
 * Interactive Studio document model.
 *
 * The document is a plain JSON tree with stable IDs. Text is stored as plain
 * strings with per-element styling (no author HTML), which removes the need
 * for a sanitizer in the public player. Everything here is validated by
 * `schema.ts` at save, publish and load time.
 */

export type Id = string;

export const STUDIO_SCHEMA_VERSION = 1;
export const STUDIO_RUNTIME_VERSION = "1.0";

export type StudioLevel = "6e" | "5e" | "4e" | "3e";
export const STUDIO_LEVELS: StudioLevel[] = ["6e", "5e", "4e", "3e"];

export const STUDIO_LIMITS = {
  maxPages: 40,
  maxElementsPerPage: 80,
  maxTextLength: 4000,
  maxLabelLength: 200,
  maxActionsPerInteraction: 12,
  maxInteractionsPerElement: 4,
  maxOptions: 8,
  maxAssets: 200,
  maxImageBytes: 8 * 1024 * 1024,
  maxAudioBytes: 25 * 1024 * 1024,
  logicalWidth: 1280,
  logicalHeight: 720,
} as const;

export type TextAlign = "left" | "center" | "right";

export type FontFamily = "sans" | "serif" | "rounded" | "mono" | "hand" | "display";
export type VerticalAlign = "top" | "middle" | "bottom";

export interface TextStyle {
  fontSize: number;
  bold: boolean;
  italic: boolean;
  align: TextAlign;
  color: string;
  background: string | null;
  padding: number;
  radius: number;
  /** Optional additions (schema v1 documents without them use defaults). */
  fontFamily?: FontFamily;
  shadow?: boolean;
  lineHeight?: number;
  verticalAlign?: VerticalAlign;
}

export type ShapeKind =
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "rightTriangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "star"
  | "arrowRight"
  | "arrowLeft"
  | "arrowUp"
  | "arrowDown"
  | "chevron"
  | "speechBubble"
  | "heart"
  | "cloud"
  | "plus"
  | "parallelogram"
  | "trapezoid"
  | "halfCircle"
  | "ring";

export const SHAPE_KINDS: ShapeKind[] = [
  "rectangle",
  "ellipse",
  "triangle",
  "rightTriangle",
  "diamond",
  "pentagon",
  "hexagon",
  "octagon",
  "star",
  "arrowRight",
  "arrowLeft",
  "arrowUp",
  "arrowDown",
  "chevron",
  "speechBubble",
  "heart",
  "cloud",
  "plus",
  "parallelogram",
  "trapezoid",
  "halfCircle",
  "ring",
];

export type ButtonVariant = "filled" | "outline" | "soft";
export type ButtonShape = "pill" | "rounded" | "square";
export type LineDash = "solid" | "dashed" | "dotted";
export type BackgroundPattern = "none" | "dots" | "grid" | "lines";

export type HotspotIcon =
  | "audio"
  | "info"
  | "question"
  | "pin"
  | "eye"
  | "arrow"
  | "star"
  | "number"
  | "none";

export type NavigateTarget = Id | "next" | "previous";

export type StudioAction =
  | {
      type: "tooltip";
      text: string;
      imageAssetId: Id | null;
      audioAssetId: Id | null;
    }
  | {
      type: "modal";
      title: string;
      text: string;
      size: "small" | "medium" | "large";
      imageAssetId: Id | null;
      audioAssetId: Id | null;
    }
  | { type: "navigate"; target: NavigateTarget }
  | { type: "playAudio"; assetId: Id | null }
  | { type: "stopAudio" }
  | { type: "setVisibility"; elementIds: Id[]; mode: "show" | "hide" | "toggle" }
  | { type: "externalLink"; url: string };

export type StudioActionType = StudioAction["type"];

export type InteractionTrigger = "activate" | "hoverOrFocus";

export interface Interaction {
  id: Id;
  trigger: InteractionTrigger;
  actions: StudioAction[];
}

export interface ChoiceOption {
  id: Id;
  label: string;
}

export type ElementContent =
  | { type: "text"; text: string; style: TextStyle }
  | {
      type: "image";
      assetId: Id | null;
      alt: string;
      fit: "contain" | "cover" | "fill";
      radius: number;
    }
  | {
      type: "shape";
      shape: ShapeKind;
      fill: string;
      stroke: string;
      strokeWidth: number;
      radius: number;
      shadow?: boolean;
    }
  | {
      type: "icon";
      /** Name from the curated icon registry (see icons.ts). */
      name: string;
      color: string;
      background: string | null;
      backgroundShape: "circle" | "rounded" | "none";
      strokeWidth: number;
    }
  | {
      type: "button";
      label: string;
      variant: ButtonVariant;
      shape: ButtonShape;
      color: string;
      textColor: string;
      fontSize: number;
      icon: string | null;
    }
  | {
      type: "line";
      stroke: string;
      strokeWidth: number;
      dash: LineDash;
      startArrow: boolean;
      endArrow: boolean;
    }
  | {
      type: "hotspot";
      label: string;
      icon: HotspotIcon;
      number: number | null;
      color: string;
      showHint: boolean;
      /** Transparent hotspots sit over an existing picture; filled ones are visible buttons. */
      transparent: boolean;
    }
  | {
      type: "audio";
      assetId: Id | null;
      label: string;
      transcript: string;
      showTranscript: boolean;
    }
  | {
      type: "singleChoice";
      prompt: string;
      options: ChoiceOption[];
      correctOptionId: Id;
      correctFeedback: string;
      retryFeedback: string;
      allowRetry: boolean;
      onCorrect: StudioAction[];
    };

export type ElementType = ElementContent["type"];

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface CanvasElement {
  id: Id;
  name: string;
  frame: Frame;
  opacity: number;
  lockedInEditor: boolean;
  initiallyVisible: boolean;
  content: ElementContent;
  interactions: Interaction[];
  accessibility: {
    label: string;
    readingOrder: number;
    decorative: boolean;
  };
}

export type PageBackground =
  | { type: "color"; value: string }
  | { type: "gradient"; from: string; to: string; angle: number }
  | { type: "image"; assetId: Id; fit: "contain" | "cover" | "fill"; color: string };

export interface StudioPage {
  id: Id;
  name: string;
  hiddenFromNavigation: boolean;
  background: PageBackground;
  /** Optional decorative overlay drawn above the background colour/image. */
  pattern?: BackgroundPattern;
  /** Private teacher notes; stripped from published snapshots. */
  notes: string;
  elements: CanvasElement[];
}

export type AssetKind = "image" | "audio";

export interface StudioAsset {
  id: Id;
  kind: AssetKind;
  name: string;
  mime: string;
  bytes: number;
  /** Storage path inside the private studio bucket (owner-scoped). */
  path: string;
  width?: number;
  height?: number;
  duration?: number;
  /** Only present in published snapshots: a public, pinned URL. */
  url?: string;
}

export type NavigationMode = "linear" | "exploration";

export interface StudioSettings {
  navigationMode: NavigationMode;
  showInteractiveHints: boolean;
  instructions: string;
  completionMessage: string;
  contentLanguage: "en" | "fr";
}

export interface StudioDocument {
  schemaVersion: number;
  id: Id;
  title: string;
  level: StudioLevel | null;
  logicalSize: { width: number; height: number };
  settings: StudioSettings;
  pages: StudioPage[];
  assets: Record<Id, StudioAsset>;
}

export interface PublicationInfo {
  code: string;
  version: number;
  publishedAt: string;
  active: boolean;
  /** Revision of the draft that produced the active version. */
  publishedRevision: number;
}

export interface LessonRecord {
  id: Id;
  ownerId: Id;
  revision: number;
  createdAt: string;
  updatedAt: string;
  teacherNotes: string;
  document: StudioDocument;
  publication: PublicationInfo | null;
}

export interface LessonSummary {
  id: Id;
  title: string;
  level: StudioLevel | null;
  pageCount: number;
  updatedAt: string;
  revision: number;
  publication: PublicationInfo | null;
}

export interface PublishedSnapshot {
  publicationId: Id;
  lessonId: Id;
  code: string;
  version: number;
  schemaVersion: number;
  runtimeVersion: string;
  createdAt: string;
  /** Learner-visible document only: notes stripped, asset URLs pinned. */
  document: StudioDocument;
  assetManifest: { assetId: Id; path: string; mime: string; bytes: number }[];
}

export interface AnswerState {
  selectedOptionId: Id;
  correct: boolean;
  attempts: number;
}

export interface PlayerSession {
  currentPageId: Id;
  visitedPageIds: Id[];
  visitedElementIds: Id[];
  completedActivityIds: Id[];
  visibilityOverrides: Record<Id, boolean>;
  answers: Record<Id, AnswerState>;
  finished: boolean;
}

export interface LintIssue {
  severity: "error" | "warning";
  code: string;
  message: string;
  pageId?: Id;
  elementId?: Id;
}
