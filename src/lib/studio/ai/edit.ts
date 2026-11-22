import { createId } from "../document";
import { buildDocument } from "./layout";
import type { PagePlan, SlidePlan } from "./plan";
import type { StudioDocument } from "../types";
/** Build a page through the same engine; replacement keeps inbound links valid. */
export function applyPagePlan(doc: StudioDocument, plan: PagePlan, targetId?: string) {
  if (plan.layout === "menu") throw new Error("Un menu doit être créé avec le plan de la leçon.");
  if (!targetId && doc.pages.length >= 40) throw new Error("La leçon a déjà 40 pages.");
  const wrapper: SlidePlan = { title: doc.title.slice(0,80) || "Leçon", level: doc.level ?? "6e", contentLanguage: doc.settings.contentLanguage, theme: "ocean", instructions: doc.settings.instructions.slice(0,240) || "Explore and learn.", pages: [{layout:"title",heading:"Introduction"}, plan, {layout:"ending",heading:"Well done!"}] };
  const page = buildDocument(wrapper).document.pages[1];
  if (targetId) {
    const index = doc.pages.findIndex(p => p.id === targetId);
    if (index < 0) throw new Error("Cette page a été supprimée.");
    const old = doc.pages[index];
    page.id = old.id; page.hiddenFromNavigation = old.hiddenFromNavigation;
    page.elements.push(...old.elements.filter(e => e.content.type === "button" && e.content.label === "Menu"));
    page.elements.forEach((e,i) => { e.accessibility.readingOrder = i; });
    doc.pages[index] = page;
  } else {
    const menuButton = doc.pages.flatMap(p => p.elements).find(e => e.content.type === "button" && e.content.label === "Menu");
    if (menuButton) {
      const back = structuredClone(menuButton); back.id = createId("el");
      back.interactions.forEach(i => { i.id = createId("ix"); });
      back.accessibility.readingOrder = page.elements.length; page.elements.push(back);
    }
    doc.pages.push(page);
  }
  return page.id;
}
