import type { CanvasElement, ElementContent, LintIssue, StudioDocument, StudioPage } from "../types";
import { createEmptyDocument, createElement, createPage, DEFAULT_TEXT_STYLE, lintDocument } from "../document";
import { slidePlanSchema, type SlidePlan } from "./plan";
export const THEMES = {
  ocean: { background: "#edf8fc", ink: "#123747", accent: "#175e78" },
  forest: { background: "#eef7ee", ink: "#183d2b", accent: "#28613d" },
  sunset: { background: "#fff2e8", ink: "#512d24", accent: "#963d25" },
  slate: { background: "#eef2f6", ink: "#253247", accent: "#435674" },
  paper: { background: "#faf6ed", ink: "#3f3528", accent: "#70522c" },
  night: { background: "#172338", ink: "#f5f8ff", accent: "#334b70" },
  candy: { background: "#fff0f8", ink: "#512643", accent: "#863b72" },
} as const;
export interface TodoItem { pageId: string; elementId: string; label: string; purpose: string }
export function isIncomplete(e: CanvasElement) { return e.content.type === "hotspot" && e.interactions.every(i => i.actions.length === 0); }
export function buildDocument(input: SlidePlan, options: { seed?: string } = {}): { document: StudioDocument; todo: TodoItem[]; report: LintIssue[] } {
  const plan = slidePlanSchema.parse(input);
  let sequence = 0;
  const id = (prefix: string) => `${prefix}_${options.seed ?? crypto.randomUUID()}_${++sequence}`;
  const palette = THEMES[plan.theme];
  const young = plan.level === "6e" || plan.level === "5e";
  const bodySize = young ? 30 : 26;
  const doc = createEmptyDocument(plan.title); doc.id = id("doc"); doc.level = plan.level;
  doc.settings.instructions = plan.instructions; doc.settings.contentLanguage = plan.contentLanguage;
  const ending = plan.pages.find(p => p.layout === "ending");
  if (ending?.layout === "ending") doc.settings.completionMessage = ending.body ?? ending.heading;
  const todo: TodoItem[] = [];
  const pages: StudioPage[] = plan.pages.map((p, index) => createPage({ id: id("page"), name: p.heading ?? `Question ${index + 1}`, background: { type: "color", value: palette.background } }));
  plan.pages.forEach((p, index) => {
    const page = pages[index];
    page.notes = `Disposition IA : ${p.layout}`;
    const add = (content: ElementContent, x: number, y: number, width: number, height: number, label = "") => {
      const e = createElement(content.type, { x: 0, y: 0 }, page.elements.length, { id: id("el"), name: label || p.layout, content, frame: { x, y, width, height, rotation: 0 }, interactions: [], accessibility: { label, readingOrder: page.elements.length, decorative: content.type === "shape" || content.type === "icon" } });
      page.elements.push(e); return e;
    };
    const text = (value: string, x: number, y: number, w: number, h: number, size = bodySize, bold = false) => add({ type: "text", text: value, style: { ...DEFAULT_TEXT_STYLE, fontSize: size, bold, color: palette.ink, padding: 0, fontFamily: young ? "rounded" : "sans", lineHeight: 1.25 } }, x, y, w, h, value.slice(0, 60));
    const icon = (name: string, x: number, y: number) => add({ type: "icon", name, color: palette.ink, background: null, backgroundShape: "none", strokeWidth: 2 }, x, y, 72, 72);
    const button = (label: string, target: string, x: number, y: number, width = 552) => {
      const e = add({ type: "button", label, variant: "filled", shape: "rounded", color: palette.accent, textColor: "#ffffff", fontSize: 24, icon: null }, x, y, width, 72, label);
      e.interactions = [{ id: id("ix"), trigger: "activate", actions: [{ type: "navigate", target }] }];
    };
    text(p.heading ?? (plan.contentLanguage === "fr" ? "À vous de jouer" : "Check your understanding"), 64, 104, 1152, 144, young ? 56 : 48, true);
    switch (p.layout) {
      case "title":
        if (p.subheading) text(p.subheading, 64, 300, 920, 220, 36);
        if (p.iconName) icon(p.iconName, 1100, 420);
        break;
      case "ending": if (p.body) text(p.body, 64, 300, 1100, 250, 36); break;
      case "menu": p.items.forEach((item, i) => button(item.label, pages[item.targetPageIndex].id, 64 + (i % 2) * 600, 256 + Math.floor(i / 2) * 96)); break;
      case "twoColumns":
        [p.left, p.right].forEach((column, i) => { const x = 64 + i * 600; text(column.title, x, 256, 552, 70, 32, true); column.lines.forEach((line, j) => text(line, x, 336 + j * 80, 552, 76)); }); break;
      case "vocabulary":
        p.items.forEach((item, i) => { const x = 64 + (i % 2) * 600; const y = 256 + Math.floor(i / 2) * 96; if (item.iconName) icon(item.iconName, x, y); text(item.word, x + 88, y, 460, 44, bodySize, true); if (item.translation) text(item.translation, x + 88, y + 44, 460, 44, 24); }); break;
      case "question": {
        const opts = p.options.map(label => ({ id: id("opt"), label }));
        add({ type: "singleChoice", prompt: p.prompt, options: opts, correctOptionId: opts[p.correctIndex].id, correctFeedback: p.correctFeedback, retryFeedback: p.retryFeedback, allowRetry: true, onCorrect: [] }, 64, 256, 1152, 400, p.prompt); break;
      }
      case "textImage": {
        const imageX = p.imageSide === "left" ? 64 : 664; const textX = p.imageSide === "left" ? 664 : 64;
        text(p.body, textX, 256, 552, 400);
        if (p.imagePrompt) { add({ type: "image", assetId: null, alt: p.imagePrompt.slice(0, 200), fit: "contain", radius: 24 }, imageX, 256, 552, 400, "Illustration à ajouter"); page.notes += `\nIllustration suggérée : ${p.imagePrompt}`; }
        else if (p.iconName) icon(p.iconName, imageX + 240, 400);
        p.hotspots?.forEach(h => {
          const x = imageX + (h.anchor.includes("Left") ? 24 : h.anchor.includes("Right") ? 432 : 228);
          const y = h.anchor.startsWith("top") ? 280 : h.anchor.startsWith("bottom") ? 536 : 408;
          const e = add({ type: "hotspot", label: h.label, icon: h.purpose === "audio" ? "audio" : "info", number: null, color: palette.accent, showHint: true, transparent: true }, x, y, 96, 96, h.label);
          e.name = `À compléter · ${h.label}`; todo.push({ pageId: page.id, elementId: e.id, label: h.label, purpose: h.purpose });
        }); break;
      }
    }
    const menuIndex = plan.pages.findIndex((candidate, i) => i < index && candidate.layout === "menu");
    if (menuIndex >= 0 && p.layout !== "menu") button("Menu", pages[menuIndex].id, 64, 24, 160);
  });
  doc.pages = pages;
  const report = lintDocument(doc);
  if (report.some(i => i.severity === "error")) throw new Error(report.filter(i => i.severity === "error").map(i => i.message).join(" "));
  return { document: doc, todo, report };
}
