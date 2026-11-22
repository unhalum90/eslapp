import { createElement, createEmptyDocument, createId, createInteraction, createPage, DEFAULT_TEXT_STYLE } from "./document";
import type { CanvasElement, ElementType, Frame, HotspotIcon, StudioAction, StudioDocument, TextStyle } from "./types";

export interface StudioTemplate {
  id: string;
  name: string;
  routine: string;
  description: string;
  build: () => StudioDocument;
}

function el(
  type: ElementType,
  frame: Omit<Frame, "rotation">,
  name: string,
  index: number,
  patch: (element: CanvasElement) => void = () => undefined,
): CanvasElement {
  const element = createElement(type, { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 }, index);
  element.frame = { ...frame, rotation: 0 };
  element.name = name;
  patch(element);
  return element;
}

function text(frame: Omit<Frame, "rotation">, name: string, index: number, value: string, style: Partial<TextStyle> = {}, label = ""): CanvasElement {
  return el("text", frame, name, index, (element) => {
    element.content = { type: "text", text: value, style: { ...DEFAULT_TEXT_STYLE, ...style } };
    element.accessibility.label = label;
  });
}

function shape(frame: Omit<Frame, "rotation">, name: string, index: number, fill: string, stroke = "transparent", radius = 12, ellipse = false): CanvasElement {
  return el("shape", frame, name, index, (element) => {
    element.content = { type: "shape", shape: ellipse ? "ellipse" : "rectangle", fill, stroke, strokeWidth: stroke === "transparent" ? 0 : 2, radius };
    element.accessibility.decorative = true;
  });
}

function hotspot(
  frame: Omit<Frame, "rotation">,
  name: string,
  index: number,
  label: string,
  actions: StudioAction[],
  options: { icon?: HotspotIcon; number?: number | null; color?: string } = {},
): CanvasElement {
  return el("hotspot", frame, name, index, (element) => {
    element.content = {
      type: "hotspot",
      label,
      icon: options.number != null ? "number" : options.icon ?? "audio",
      number: options.number ?? null,
      color: options.color ?? "#d45b3f",
      showHint: true,
      transparent: false,
    };
    element.interactions = [createInteraction(actions)];
  });
}

function question(
  frame: Omit<Frame, "rotation">,
  name: string,
  index: number,
  prompt: string,
  options: string[],
  correctIndex: number,
  feedback: { correct: string; retry: string },
  onCorrect: StudioAction[] = [],
): CanvasElement {
  return el("singleChoice", frame, name, index, (element) => {
    const built = options.map((label) => ({ id: createId("opt"), label }));
    element.content = {
      type: "singleChoice",
      prompt,
      options: built,
      correctOptionId: built[correctIndex].id,
      correctFeedback: feedback.correct,
      retryFeedback: feedback.retry,
      allowRetry: true,
      onCorrect,
    };
  });
}

const tooltip = (value: string): StudioAction => ({ type: "tooltip", text: value, imageAssetId: null, audioAssetId: null });
const modal = (title: string, value: string, size: "small" | "medium" | "large" = "medium"): StudioAction => ({ type: "modal", title, text: value, size, imageAssetId: null, audioAssetId: null });
const next: StudioAction = { type: "navigate", target: "next" };

function blank(): StudioDocument {
  return createEmptyDocument("Nouvelle leçon");
}

function townMap(): StudioDocument {
  const doc = createEmptyDocument("Directions in town");
  doc.settings.instructions = "Listen to the directions, find the place on the map, then answer the question.";
  doc.settings.completionMessage = "Great job! You found your way around town.";
  doc.level = "6e";

  const map = createPage({ name: "Town map", background: { type: "color", value: "#eef2e6" }, notes: "Remplacez les étiquettes des zones 1 à 3 par des fichiers audio (Interaction → Audio). Les textes servent de script." });
  let i = 0;
  const blocks = [
    ["Bakery", 120, 80, "#f6d9b8"],
    ["Bank", 420, 80, "#cfe3f5"],
    ["School", 820, 80, "#dcd3f0"],
    ["Cinema", 120, 440, "#f5cfcf"],
    ["Park", 420, 440, "#cdebd2"],
    ["Station", 820, 440, "#f3e3b5"],
  ] as const;
  map.elements.push(shape({ x: 0, y: 300, width: 1280, height: 90 }, "Main Street", i++, "#c9c9c3"));
  map.elements.push(shape({ x: 340, y: 0, width: 70, height: 720 }, "Church Road", i++, "#c9c9c3"));
  map.elements.push(shape({ x: 740, y: 0, width: 70, height: 720 }, "Station Road", i++, "#c9c9c3"));
  map.elements.push(text({ x: 480, y: 318, width: 240, height: 50 }, "Main Street label", i++, "MAIN STREET", { fontSize: 22, bold: true, align: "center", color: "#ffffff", padding: 4 }));
  for (const [label, x, y, fill] of blocks) {
    map.elements.push(shape({ x, y, width: 200, height: 170 }, `${label} building`, i++, fill, "#8a8a80", 16));
    map.elements.push(text({ x, y: y + 60, width: 200, height: 50 }, `${label} label`, i++, label, { fontSize: 26, bold: true, align: "center", padding: 4 }));
  }
  map.elements.push(text({ x: 40, y: 640, width: 420, height: 56 }, "Start label", i++, "You are here", { fontSize: 22, bold: true, color: "#d45b3f", padding: 4 }));
  map.elements.push(shape({ x: 20, y: 646, width: 20, height: 20 }, "Start dot", i++, "#d45b3f", "transparent", 10, true));
  map.elements.push(hotspot({ x: 1080, y: 560, width: 64, height: 64 }, "Zone 1", i++, "Directions 1",
    [tooltip("Go straight on Main Street. Turn left into Church Road. It's on your right, opposite the bank.")], { number: 1 }));
  map.elements.push(hotspot({ x: 1160, y: 560, width: 64, height: 64 }, "Zone 2", i++, "Directions 2",
    [tooltip("Walk along Main Street and turn right into Station Road. It's the big building on your left at the end.")], { number: 2 }));
  map.elements.push(hotspot({ x: 1080, y: 640, width: 64, height: 64 }, "Zone 3", i++, "Directions 3",
    [tooltip("Go past the park. It's between the cinema and the park, on Main Street.")], { number: 3 }));
  map.elements.push(hotspot({ x: 1160, y: 640, width: 64, height: 64 }, "Help", i++, "Useful words",
    [modal("Useful words", "go straight on · turn left · turn right · opposite · next to · between · behind · on your left / right", "small")], { icon: "info", color: "#285d68" }));
  map.elements.push(hotspot({ x: 960, y: 20, width: 300, height: 56 }, "Go to question", i++, "Answer the question", [next], { icon: "arrow", color: "#285d68" }));

  const check = createPage({ name: "Check", background: { type: "color", value: "#ffffff" } });
  check.elements.push(text({ x: 80, y: 60, width: 1120, height: 70 }, "Title", 0, "Where do the directions take you?", { fontSize: 40, bold: true }));
  check.elements.push(question({ x: 80, y: 160, width: 560, height: 360 }, "Question 1", 1,
    "Directions 1: where do you arrive?", ["At the bakery", "At the school", "At the station"], 0,
    { correct: "Yes! Opposite the bank is the bakery.", retry: "Listen again: 'turn left into Church Road… opposite the bank'." }));
  check.elements.push(question({ x: 660, y: 160, width: 560, height: 360 }, "Question 2", 2,
    "Directions 2: where do you arrive?", ["At the park", "At the station", "At the cinema"], 1,
    { correct: "Correct! The station is at the end of Station Road.", retry: "Try again: 'turn right into Station Road'." }));
  check.elements.push(hotspot({ x: 60, y: 600, width: 300, height: 56 }, "Back to map", 3, "Back to the map", [{ type: "navigate", target: map.id }], { icon: "arrow", color: "#285d68" }));

  doc.pages = [map, check];
  return doc;
}

function exploreImage(): StudioDocument {
  const doc = createEmptyDocument("Explore a cultural image");
  doc.settings.navigationMode = "linear";
  doc.settings.instructions = "Click the information points on the picture, read, then check what you remember.";
  const explore = createPage({ name: "Explore", background: { type: "color", value: "#fbfaf6" }, notes: "Remplacez l'image par votre document (Médias → Importer) puis déplacez les points d'information." });
  explore.elements.push(el("image", { x: 80, y: 40, width: 840, height: 640 }, "Main picture", 0, (element) => {
    element.content = { type: "image", assetId: null, alt: "Describe the picture here", fit: "contain", radius: 12 };
  }));
  explore.elements.push(text({ x: 950, y: 40, width: 300, height: 120 }, "Instructions", 1, "Click the ① ② ③ points to discover the picture.", { fontSize: 22 }));
  explore.elements.push(hotspot({ x: 200, y: 160, width: 56, height: 56 }, "Point 1", 2, "Information 1", [modal("Did you know?", "Write a short fact here.", "small")], { number: 1, color: "#285d68" }));
  explore.elements.push(hotspot({ x: 500, y: 300, width: 56, height: 56 }, "Point 2", 3, "Information 2", [modal("Did you know?", "Write a short fact here.", "small")], { number: 2, color: "#285d68" }));
  explore.elements.push(hotspot({ x: 700, y: 520, width: 56, height: 56 }, "Point 3", 4, "Information 3", [modal("Did you know?", "Write a short fact here.", "small")], { number: 3, color: "#285d68" }));
  const check = createPage({ name: "Check" });
  check.elements.push(text({ x: 80, y: 60, width: 1120, height: 70 }, "Title", 0, "What do you remember?", { fontSize: 40, bold: true }));
  check.elements.push(question({ x: 80, y: 160, width: 640, height: 340 }, "Question", 1, "Write your question here", ["Answer A", "Answer B", "Answer C"], 0, { correct: "Well done!", retry: "Go back and look at the picture again." }));
  doc.pages = [explore, check];
  return doc;
}

function noticePredictReveal(): StudioDocument {
  const doc = createEmptyDocument("Notice, predict, reveal");
  doc.settings.instructions = "Read the examples, guess the rule, then click Reveal.";
  const page = createPage({ name: "Notice", background: { type: "color", value: "#ffffff" } });
  page.elements.push(text({ x: 80, y: 50, width: 1120, height: 70 }, "Title", 0, "What do you notice?", { fontSize: 40, bold: true }));
  page.elements.push(text({ x: 80, y: 150, width: 700, height: 220 }, "Examples", 1, "She plays tennis on Saturdays.\nHe watches TV in the evening.\nMy brother goes to school by bus.", { fontSize: 30, background: "#f4f2eb", padding: 20, radius: 16 }));
  page.elements.push(text({ x: 80, y: 400, width: 700, height: 80 }, "Prompt", 2, "Predict: what happens to the verb with he / she / it?", { fontSize: 26, italic: true }));
  const rule = text({ x: 820, y: 150, width: 380, height: 330 }, "Rule (hidden)", 3, "The rule\n\nWith he, she and it, add -s (or -es) to the verb:\nplay → plays\nwatch → watches\ngo → goes", { fontSize: 24, background: "#e8f3f1", padding: 20, radius: 16 });
  rule.initiallyVisible = false;
  page.elements.push(rule);
  page.elements.push(hotspot({ x: 820, y: 500, width: 220, height: 60 }, "Reveal", 4, "Reveal the rule", [{ type: "setVisibility", elementIds: [rule.id], mode: "show" }], { icon: "eye", color: "#285d68" }));
  page.elements.push(hotspot({ x: 1060, y: 500, width: 140, height: 60 }, "Hide", 5, "Hide the rule", [{ type: "setVisibility", elementIds: [rule.id], mode: "hide" }], { icon: "none", color: "#8a8a80" }));
  const practice = createPage({ name: "Practice" });
  practice.elements.push(text({ x: 80, y: 60, width: 1120, height: 70 }, "Title", 0, "Your turn", { fontSize: 40, bold: true }));
  practice.elements.push(question({ x: 80, y: 160, width: 600, height: 320 }, "Question", 1, "My sister ___ to music every day.", ["listen", "listens", "listening"], 1, { correct: "Yes: she → listens.", retry: "Look at the rule again: he/she/it + -s." }));
  doc.pages = [page, practice];
  return doc;
}

function readChooseExplain(): StudioDocument {
  const doc = createEmptyDocument("Read, choose, explain");
  doc.settings.instructions = "Read the text, choose the best answer, then read the explanation.";
  const read = createPage({ name: "Read", background: { type: "color", value: "#ffffff" } });
  read.elements.push(text({ x: 80, y: 50, width: 1120, height: 70 }, "Title", 0, "A message from Tom", { fontSize: 40, bold: true }));
  read.elements.push(text({ x: 80, y: 140, width: 620, height: 420 }, "Passage", 1, "Hi Lucy,\n\nI can't come to the cinema on Saturday because I have a football match in the morning and a family lunch at 1 pm. Can we go on Sunday afternoon instead? The film starts at 3 pm.\n\nSee you soon,\nTom", { fontSize: 24, background: "#fbfaf6", padding: 24, radius: 16 }));
  read.elements.push(question({ x: 740, y: 140, width: 460, height: 420 }, "Question", 2, "Why can't Tom go on Saturday?", ["He is ill.", "He is busy all day.", "The cinema is closed."], 1, { correct: "Right! A match in the morning and a lunch at 1 pm.", retry: "Read the second sentence again." }, [next]));
  const explain = createPage({ name: "Explain" });
  explain.elements.push(text({ x: 80, y: 60, width: 1120, height: 70 }, "Title", 0, "Why is it correct?", { fontSize: 40, bold: true }));
  explain.elements.push(text({ x: 80, y: 160, width: 1120, height: 240 }, "Explanation", 1, "Tom gives two reasons: a football match (morning) and a family lunch (1 pm). So he is busy all day.\n\nUseful language: because · instead · Can we…?", { fontSize: 28, background: "#e8f3f1", padding: 24, radius: 16 }));
  doc.pages = [read, explain];
  return doc;
}

export const STUDIO_TEMPLATES: StudioTemplate[] = [
  {
    id: "town-map",
    name: "Écouter → repérer → répondre",
    routine: "Plan de ville et itinéraires",
    description: "Un plan avec zones numérotées, de l'aide lexicale et deux questions de vérification. Remplacez les étiquettes par vos fichiers audio.",
    build: townMap,
  },
  {
    id: "explore-image",
    name: "Explorer → lire → vérifier",
    routine: "Image culturelle ou carte",
    description: "Une grande image avec des points d'information qui ouvrent des fenêtres, puis une question.",
    build: exploreImage,
  },
  {
    id: "notice-predict-reveal",
    name: "Observer → prédire → révéler",
    routine: "Grammaire ou inférence visuelle",
    description: "Des exemples, une consigne de prédiction, une règle cachée révélée au clic, puis un exercice.",
    build: noticePredictReveal,
  },
  {
    id: "read-choose-explain",
    name: "Lire → choisir → expliquer",
    routine: "Lecture courte avec feedback",
    description: "Un texte court, une question à choix unique avec feedback et une page d'explication.",
    build: readChooseExplain,
  },
  {
    id: "blank",
    name: "Document vierge",
    routine: "Partir de zéro",
    description: "Une page vide au format 16:9.",
    build: blank,
  },
];

export function buildTemplate(templateId: string): StudioDocument {
  const template = STUDIO_TEMPLATES.find((candidate) => candidate.id === templateId) ?? STUDIO_TEMPLATES[STUDIO_TEMPLATES.length - 1];
  return template.build();
}
