import { z } from "zod";
import { ICON_NAMES } from "../iconNames";
const text = (max: number) => z.string().trim().min(1).max(max).refine(v => !/<[^>]*>/.test(v), "Texte brut uniquement");
const heading = text(60);
const icon = z.enum(ICON_NAMES);
export const routines = ["listen-locate-respond", "explore-read-check", "notice-predict-reveal", "read-choose-explain", "vocabulary", "free"] as const;
export const hotspotPlanSchema = z.object({ label: text(80), purpose: z.enum(["tooltip", "audio", "window", "link"]), anchor: z.enum(["topLeft", "topRight", "bottomLeft", "bottomRight", "center"]) });
export const pagePlanSchema = z.discriminatedUnion("layout", [
  z.object({ layout: z.literal("title"), heading, subheading: text(180).optional(), iconName: icon.optional() }),
  z.object({ layout: z.literal("menu"), heading, items: z.array(z.object({ label: text(50), targetPageIndex: z.number().int().min(0) })).min(2).max(8) }),
  z.object({ layout: z.literal("textImage"), heading, body: text(420), imagePrompt: text(500).optional(), iconName: icon.optional(), imageSide: z.enum(["left", "right"]), hotspots: z.array(hotspotPlanSchema).max(4).optional() }),
  z.object({ layout: z.literal("twoColumns"), heading, left: z.object({ title: text(40), lines: z.array(text(90)).min(1).max(4) }), right: z.object({ title: text(40), lines: z.array(text(90)).min(1).max(4) }) }),
  z.object({ layout: z.literal("vocabulary"), heading, items: z.array(z.object({ word: text(32), translation: text(40).optional(), iconName: icon.optional() })).min(4).max(8) }),
  z.object({ layout: z.literal("question"), heading: heading.optional(), prompt: text(180), options: z.array(text(70)).min(2).max(4), correctIndex: z.number().int().min(0), correctFeedback: text(180), retryFeedback: text(180) }),
  z.object({ layout: z.literal("ending"), heading, body: text(240).optional() }),
]);
export const slidePlanSchema = z.object({ title: text(80), level: z.enum(["6e", "5e", "4e", "3e"]), contentLanguage: z.enum(["en", "fr"]), theme: z.enum(["ocean", "forest", "sunset", "slate", "paper", "night", "candy"]), instructions: text(240), pages: z.array(pagePlanSchema).min(3).max(12) }).superRefine((plan, ctx) => {
  plan.pages.forEach((p, i) => {
    if (p.layout === "question" && p.correctIndex >= p.options.length) ctx.addIssue({ code: "custom", path: ["pages", i, "correctIndex"], message: "Réponse hors limites" });
    if (p.layout === "menu") p.items.forEach((item, j) => {
      const target = plan.pages[item.targetPageIndex];
      if (!target || target.layout === "menu" || target.layout === "title") ctx.addIssue({ code: "custom", path: ["pages", i, "items", j], message: "Destination de menu invalide" });
    });
  });
});
export type SlidePlan = z.infer<typeof slidePlanSchema>;
export type PagePlan = z.infer<typeof pagePlanSchema>;
export const generationInputSchema = z.object({ topic: text(1500), level: z.enum(["6e", "5e", "4e", "3e"]), routine: z.enum(routines), pageCount: z.number().int().min(3).max(12), contentLanguage: z.enum(["en", "fr"]), extraInstructions: z.string().max(1500).optional(), agent: z.enum(["codex-terra", "claude-opus"]).optional() });
