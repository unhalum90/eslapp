import {
  STUDIO_LIMITS,
  STUDIO_SCHEMA_VERSION,
  type CanvasElement,
  type ElementContent,
  type ElementType,
  type Frame,
  type Id,
  type Interaction,
  type LintIssue,
  type NavigateTarget,
  type PlayerSession,
  type StudioAction,
  type StudioAsset,
  type StudioDocument,
  type StudioPage,
  type TextStyle,
} from "./types";

// ---------------------------------------------------------------------------
// IDs
// ---------------------------------------------------------------------------

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function createId(prefix = ""): string {
  let body = "";
  const bytes = new Uint8Array(10);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (const byte of bytes) body += ALPHABET[byte % ALPHABET.length];
  return prefix ? `${prefix}_${body}` : body;
}

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontSize: 28,
  bold: false,
  italic: false,
  align: "left",
  color: "#18282b",
  background: null,
  padding: 8,
  radius: 8,
};

export function createPage(partial: Partial<StudioPage> = {}): StudioPage {
  return {
    id: createId("page"),
    name: "Page",
    hiddenFromNavigation: false,
    background: { type: "color", value: "#ffffff" },
    notes: "",
    elements: [],
    ...partial,
  };
}

export function createEmptyDocument(title = "Nouvelle leçon"): StudioDocument {
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    id: createId("doc"),
    title,
    level: null,
    logicalSize: { width: STUDIO_LIMITS.logicalWidth, height: STUDIO_LIMITS.logicalHeight },
    settings: {
      navigationMode: "linear",
      showInteractiveHints: true,
      instructions: "",
      completionMessage: "Well done! You finished the activity.",
      contentLanguage: "en",
    },
    pages: [createPage({ name: "Page 1" })],
    assets: {},
  };
}

export function defaultContent(type: ElementType): ElementContent {
  switch (type) {
    case "text":
      return { type: "text", text: "Your text", style: { ...DEFAULT_TEXT_STYLE } };
    case "image":
      return { type: "image", assetId: null, alt: "", fit: "contain", radius: 0 };
    case "shape":
      return { type: "shape", shape: "rectangle", fill: "#e8f3f1", stroke: "#285d68", strokeWidth: 2, radius: 12, shadow: false };
    case "icon":
      return { type: "icon", name: "Star", color: "#285d68", background: null, backgroundShape: "none", strokeWidth: 2 };
    case "button":
      return { type: "button", label: "Next", variant: "filled", shape: "pill", color: "#285d68", textColor: "#ffffff", fontSize: 24, icon: "ArrowRight" };
    case "line":
      return { type: "line", stroke: "#285d68", strokeWidth: 4, dash: "solid", startArrow: false, endArrow: true };
    case "hotspot":
      return {
        type: "hotspot",
        label: "Listen",
        icon: "audio",
        number: null,
        color: "#d45b3f",
        showHint: true,
        transparent: false,
      };
    case "audio":
      return { type: "audio", assetId: null, label: "Listen", transcript: "", showTranscript: false };
    case "singleChoice":
      return {
        type: "singleChoice",
        prompt: "Where is the bakery?",
        options: [
          { id: createId("opt"), label: "Next to the bank" },
          { id: createId("opt"), label: "Opposite the school" },
          { id: createId("opt"), label: "Behind the station" },
        ],
        correctOptionId: "",
        correctFeedback: "Yes! Well done.",
        retryFeedback: "Not quite. Listen again and try once more.",
        allowRetry: true,
        onCorrect: [],
      };
  }
}

const DEFAULT_FRAMES: Record<ElementType, { width: number; height: number }> = {
  text: { width: 420, height: 80 },
  image: { width: 400, height: 300 },
  shape: { width: 240, height: 160 },
  icon: { width: 96, height: 96 },
  button: { width: 220, height: 64 },
  line: { width: 320, height: 24 },
  hotspot: { width: 64, height: 64 },
  audio: { width: 360, height: 88 },
  singleChoice: { width: 520, height: 300 },
};

export function defaultElementName(type: ElementType, index: number): string {
  const names: Record<ElementType, string> = {
    text: "Texte",
    image: "Image",
    shape: "Forme",
    icon: "Icône",
    button: "Bouton",
    line: "Ligne",
    hotspot: "Zone",
    audio: "Audio",
    singleChoice: "Question",
  };
  return `${names[type]} ${index}`;
}

export function createElement(
  type: ElementType,
  position: { x: number; y: number },
  index: number,
  overrides: Partial<CanvasElement> = {},
): CanvasElement {
  const content = defaultContent(type);
  if (content.type === "singleChoice") content.correctOptionId = content.options[0].id;
  const defaultFrame = DEFAULT_FRAMES[type];
  return {
    id: createId("el"),
    name: defaultElementName(type, index),
    frame: {
      x: Math.round(position.x - defaultFrame.width / 2),
      y: Math.round(position.y - defaultFrame.height / 2),
      width: defaultFrame.width,
      height: defaultFrame.height,
      rotation: 0,
    },
    opacity: 1,
    lockedInEditor: false,
    initiallyVisible: true,
    content,
    interactions: type === "hotspot" || type === "button" ? [createInteraction(type === "button" ? [{ type: "navigate", target: "next" }] : [])] : [],
    accessibility: { label: "", readingOrder: index, decorative: type === "shape" || type === "icon" || type === "line" },
    ...overrides,
  };
}

export function createInteraction(actions: StudioAction[] = []): Interaction {
  return { id: createId("ix"), trigger: "activate", actions };
}

export function defaultAction(type: StudioAction["type"]): StudioAction {
  switch (type) {
    case "tooltip":
      return { type: "tooltip", text: "", imageAssetId: null, audioAssetId: null };
    case "modal":
      return { type: "modal", title: "", text: "", size: "medium", imageAssetId: null, audioAssetId: null };
    case "navigate":
      return { type: "navigate", target: "next" };
    case "playAudio":
      return { type: "playAudio", assetId: null };
    case "stopAudio":
      return { type: "stopAudio" };
    case "setVisibility":
      return { type: "setVisibility", elementIds: [], mode: "toggle" };
    case "externalLink":
      return { type: "externalLink", url: "https://" };
  }
}

// ---------------------------------------------------------------------------
// Lookups and cloning
// ---------------------------------------------------------------------------

export function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

export function findPage(doc: StudioDocument, pageId: Id | null | undefined): StudioPage | undefined {
  return doc.pages.find((page) => page.id === pageId);
}

export function findElement(doc: StudioDocument, elementId: Id): { page: StudioPage; element: CanvasElement } | undefined {
  for (const page of doc.pages) {
    const element = page.elements.find((candidate) => candidate.id === elementId);
    if (element) return { page, element };
  }
  return undefined;
}

/** `next` / `previous` skip pages hidden from navigation (pop-ups, detours). */
export function resolveNavigateTarget(doc: StudioDocument, currentPageId: Id, target: NavigateTarget): Id | null {
  const index = doc.pages.findIndex((page) => page.id === currentPageId);
  if (target === "next") {
    for (let i = index + 1; i < doc.pages.length; i += 1) if (!doc.pages[i].hiddenFromNavigation) return doc.pages[i].id;
    return null;
  }
  if (target === "previous") {
    for (let i = index - 1; i >= 0; i -= 1) if (!doc.pages[i].hiddenFromNavigation) return doc.pages[i].id;
    return null;
  }
  return findPage(doc, target)?.id ?? null;
}

export function elementAccessibleName(element: CanvasElement): string {
  if (element.accessibility.label.trim()) return element.accessibility.label.trim();
  switch (element.content.type) {
    case "hotspot":
      return element.content.label || element.name;
    case "audio":
      return element.content.label || element.name;
    case "text":
      return element.content.text.slice(0, 80) || element.name;
    case "image":
      return element.content.alt || element.name;
    case "singleChoice":
      return element.content.prompt.slice(0, 80) || element.name;
    case "button":
      return element.content.label || element.name;
    default:
      return element.name;
  }
}

export function isInteractive(element: CanvasElement): boolean {
  return element.interactions.some((interaction) => interaction.actions.length > 0) || element.content.type === "singleChoice" || element.content.type === "audio";
}

/** Duplicates a page with fresh IDs, remapping internal references. */
export function duplicatePage(page: StudioPage): StudioPage {
  const copy = clone(page);
  const idMap = new Map<Id, Id>();
  copy.id = createId("page");
  copy.name = `${page.name} (copie)`;
  for (const element of copy.elements) {
    const next = createId("el");
    idMap.set(element.id, next);
    element.id = next;
  }
  for (const element of copy.elements) {
    for (const interaction of element.interactions) {
      interaction.id = createId("ix");
      remapActions(interaction.actions, idMap);
    }
    if (element.content.type === "singleChoice") remapActions(element.content.onCorrect, idMap);
  }
  return copy;
}

export function duplicateElement(element: CanvasElement): CanvasElement {
  const copy = clone(element);
  copy.id = createId("el");
  copy.name = `${element.name} (copie)`;
  copy.frame = { ...copy.frame, x: copy.frame.x + 24, y: copy.frame.y + 24 };
  for (const interaction of copy.interactions) interaction.id = createId("ix");
  return copy;
}

function remapActions(actions: StudioAction[], idMap: Map<Id, Id>) {
  for (const action of actions) {
    if (action.type === "setVisibility") {
      action.elementIds = action.elementIds.map((target) => idMap.get(target) ?? target);
    }
  }
}

/** Duplicates a whole document with fresh page/element IDs; assets are shared by path. */
export function duplicateDocument(doc: StudioDocument, title: string): StudioDocument {
  const copy = clone(doc);
  copy.id = createId("doc");
  copy.title = title;
  const pageMap = new Map<Id, Id>();
  for (const page of copy.pages) {
    const next = createId("page");
    pageMap.set(page.id, next);
    page.id = next;
  }
  const elementMap = new Map<Id, Id>();
  for (const page of copy.pages) {
    for (const element of page.elements) {
      const next = createId("el");
      elementMap.set(element.id, next);
      element.id = next;
    }
  }
  const remap = (actions: StudioAction[]) => {
    for (const action of actions) {
      if (action.type === "navigate" && action.target !== "next" && action.target !== "previous") {
        action.target = pageMap.get(action.target) ?? action.target;
      }
      if (action.type === "setVisibility") {
        action.elementIds = action.elementIds.map((target) => elementMap.get(target) ?? target);
      }
    }
  };
  for (const page of copy.pages) {
    for (const element of page.elements) {
      for (const interaction of element.interactions) {
        interaction.id = createId("ix");
        remap(interaction.actions);
      }
      if (element.content.type === "singleChoice") remap(element.content.onCorrect);
    }
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Asset usage
// ---------------------------------------------------------------------------

export function collectActionAssetIds(actions: StudioAction[], into: Set<Id>) {
  for (const action of actions) {
    if (action.type === "playAudio" && action.assetId) into.add(action.assetId);
    if ((action.type === "tooltip" || action.type === "modal")) {
      if (action.imageAssetId) into.add(action.imageAssetId);
      if (action.audioAssetId) into.add(action.audioAssetId);
    }
  }
}

export function usedAssetIds(doc: StudioDocument): Set<Id> {
  const used = new Set<Id>();
  for (const page of doc.pages) {
    if (page.background.type === "image") used.add(page.background.assetId);
    for (const element of page.elements) {
      const content = element.content;
      if ((content.type === "image" || content.type === "audio") && content.assetId) used.add(content.assetId);
      for (const interaction of element.interactions) collectActionAssetIds(interaction.actions, used);
      if (content.type === "singleChoice") collectActionAssetIds(content.onCorrect, used);
    }
  }
  return used;
}

export function assetExtension(asset: Pick<StudioAsset, "mime" | "name">): string {
  const byMime: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "audio/mpeg": "mp3",
    "audio/mp3": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/webm": "webm",
  };
  if (byMime[asset.mime]) return byMime[asset.mime];
  const fromName = asset.name.split(".").pop()?.toLowerCase();
  return fromName && /^[a-z0-9]{1,5}$/.test(fromName) ? fromName : "bin";
}

// ---------------------------------------------------------------------------
// Lint: blocking errors and warnings before publication
// ---------------------------------------------------------------------------

export function lintDocument(doc: StudioDocument): LintIssue[] {
  const issues: LintIssue[] = [];
  const pageIds = new Set(doc.pages.map((page) => page.id));
  const allElementIds = new Set<Id>();
  for (const page of doc.pages) for (const element of page.elements) allElementIds.add(element.id);
  const navigatedTo = new Set<Id>();

  const checkActions = (actions: StudioAction[], pageId: Id, elementId: Id, trigger: "activate" | "hoverOrFocus" | "onCorrect") => {
    for (const action of actions) {
      if (action.type === "navigate") {
        if (action.target !== "next" && action.target !== "previous") {
          if (!pageIds.has(action.target)) {
            issues.push({ severity: "error", code: "nav-missing", message: "Une action « Aller à la page » vise une page supprimée.", pageId, elementId });
          } else navigatedTo.add(action.target);
        }
      }
      if (action.type === "playAudio") {
        if (!action.assetId) issues.push({ severity: "error", code: "audio-missing", message: "Une action « Audio » n'a pas de fichier audio.", pageId, elementId });
        else if (!doc.assets[action.assetId]) issues.push({ severity: "error", code: "audio-missing", message: "Une action « Audio » référence un média supprimé.", pageId, elementId });
      }
      if (action.type === "tooltip" || action.type === "modal") {
        if (action.imageAssetId && !doc.assets[action.imageAssetId]) issues.push({ severity: "error", code: "asset-missing", message: "Une fenêtre/étiquette référence une image supprimée.", pageId, elementId });
        if (action.audioAssetId && !doc.assets[action.audioAssetId]) issues.push({ severity: "error", code: "asset-missing", message: "Une fenêtre/étiquette référence un audio supprimé.", pageId, elementId });
        if (!action.text.trim() && !action.imageAssetId && !action.audioAssetId) issues.push({ severity: "warning", code: "empty-content", message: "Une fenêtre/étiquette est vide.", pageId, elementId });
      }
      if (action.type === "setVisibility") {
        if (action.elementIds.length === 0) issues.push({ severity: "warning", code: "visibility-empty", message: "Une action « Afficher/masquer » ne cible aucun élément.", pageId, elementId });
        for (const target of action.elementIds) {
          if (!allElementIds.has(target)) issues.push({ severity: "error", code: "visibility-missing", message: "Une action « Afficher/masquer » cible un élément supprimé.", pageId, elementId });
        }
      }
      if (action.type === "externalLink" && !/^https:\/\//.test(action.url)) {
        issues.push({ severity: "error", code: "link-scheme", message: "Les liens externes doivent commencer par https://.", pageId, elementId });
      }
      if (trigger === "hoverOrFocus" && (action.type === "navigate" || action.type === "modal" || action.type === "externalLink")) {
        issues.push({ severity: "warning", code: "hover-essential", message: "Le survol ne doit pas être le seul moyen d'ouvrir une fenêtre ou de naviguer : ajoutez un déclencheur « Clic ».", pageId, elementId });
      }
    }
  };

  doc.pages.forEach((page, pageIndex) => {
    if (page.background.type === "image" && !doc.assets[page.background.assetId]) {
      issues.push({ severity: "error", code: "bg-missing", message: `La page « ${page.name} » a un fond image supprimé.`, pageId: page.id });
    }
    if (page.elements.length === 0 && doc.pages.length > 1) {
      issues.push({ severity: "warning", code: "page-empty", message: `La page « ${page.name} » est vide.`, pageId: page.id });
    }
    for (const element of page.elements) {
      const content = element.content;
      const interactive = isInteractive(element);
      if (interactive && !elementAccessibleName(element).trim()) {
        issues.push({ severity: "error", code: "label-missing", message: `« ${element.name} » est interactif mais n'a pas d'étiquette accessible.`, pageId: page.id, elementId: element.id });
      }
      if (content.type === "image") {
        if (content.assetId && !doc.assets[content.assetId]) issues.push({ severity: "error", code: "asset-missing", message: `« ${element.name} » référence une image supprimée.`, pageId: page.id, elementId: element.id });
        if (!content.assetId) issues.push({ severity: "warning", code: "image-empty", message: `« ${element.name} » n'a pas d'image.`, pageId: page.id, elementId: element.id });
        if (!content.alt.trim() && !element.accessibility.decorative) issues.push({ severity: "warning", code: "alt-missing", message: `« ${element.name} » n'a pas de texte alternatif.`, pageId: page.id, elementId: element.id });
      }
      if (content.type === "audio") {
        if (!content.assetId) issues.push({ severity: "error", code: "audio-missing", message: `« ${element.name} » n'a pas de fichier audio.`, pageId: page.id, elementId: element.id });
        else if (!doc.assets[content.assetId]) issues.push({ severity: "error", code: "audio-missing", message: `« ${element.name} » référence un audio supprimé.`, pageId: page.id, elementId: element.id });
        if (!content.transcript.trim()) issues.push({ severity: "warning", code: "transcript-missing", message: `« ${element.name} » n'a pas de transcription.`, pageId: page.id, elementId: element.id });
      }
      if (content.type === "singleChoice") {
        if (content.options.length < 2) issues.push({ severity: "error", code: "options-few", message: `« ${element.name} » a besoin d'au moins deux réponses.`, pageId: page.id, elementId: element.id });
        if (!content.options.some((option) => option.id === content.correctOptionId)) issues.push({ severity: "error", code: "correct-missing", message: `« ${element.name} » n'a pas de bonne réponse définie.`, pageId: page.id, elementId: element.id });
        if (content.options.some((option) => !option.label.trim())) issues.push({ severity: "warning", code: "option-empty", message: `« ${element.name} » a une réponse vide.`, pageId: page.id, elementId: element.id });
        checkActions(content.onCorrect, page.id, element.id, "onCorrect");
      }
      if ((content.type === "hotspot" || content.type === "button") && element.interactions.every((interaction) => interaction.actions.length === 0)) {
        issues.push({ severity: "warning", code: "hotspot-idle", message: `« ${element.name} » n'a aucune action.`, pageId: page.id, elementId: element.id });
      }
      if (content.type === "button" && !content.label.trim()) {
        issues.push({ severity: "error", code: "button-label", message: `Le bouton « ${element.name} » n'a pas de texte.`, pageId: page.id, elementId: element.id });
      }
      for (const interaction of element.interactions) checkActions(interaction.actions, page.id, element.id, interaction.trigger);
    }
    if (page.hiddenFromNavigation && pageIndex > 0 && !navigatedTo.has(page.id) && doc.settings.navigationMode === "exploration") {
      // Evaluated after the loop below as navigatedTo is still being filled; handled separately.
    }
  });

  if (doc.settings.navigationMode === "exploration") {
    doc.pages.forEach((page, index) => {
      if (index > 0 && !navigatedTo.has(page.id) && page.hiddenFromNavigation) {
        issues.push({ severity: "warning", code: "page-unreachable", message: `La page cachée « ${page.name} » n'est atteinte par aucune action.`, pageId: page.id });
      }
    });
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Player session
// ---------------------------------------------------------------------------

export function createSession(doc: StudioDocument): PlayerSession {
  return {
    currentPageId: doc.pages[0]?.id ?? "",
    visitedPageIds: doc.pages[0] ? [doc.pages[0].id] : [],
    visitedElementIds: [],
    completedActivityIds: [],
    visibilityOverrides: {},
    answers: {},
    finished: false,
  };
}

export function isElementVisible(element: CanvasElement, session: Pick<PlayerSession, "visibilityOverrides">): boolean {
  const override = session.visibilityOverrides[element.id];
  return override === undefined ? element.initiallyVisible : override;
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export function clampFrame(frame: Frame, logical: { width: number; height: number }): Frame {
  const width = Math.max(8, Math.min(frame.width, logical.width * 2));
  const height = Math.max(8, Math.min(frame.height, logical.height * 2));
  const x = Math.max(-width + 16, Math.min(frame.x, logical.width - 16));
  const y = Math.max(-height + 16, Math.min(frame.y, logical.height - 16));
  return { ...frame, x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
}

export function sortedByReadingOrder(elements: CanvasElement[]): CanvasElement[] {
  return [...elements].sort((a, b) => a.accessibility.readingOrder - b.accessibility.readingOrder || a.frame.y - b.frame.y || a.frame.x - b.frame.x);
}

export function pageCountLabel(count: number): string {
  return `${count} page${count > 1 ? "s" : ""}`;
}
