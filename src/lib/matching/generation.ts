import { z } from "zod";
import {
  activitySchema,
  newActivity,
  newCard,
  uid,
  validationErrors,
} from "./domain";

export const generationInput = z.object({
  source: z.string().trim().min(1).max(10000),
  level: z.enum(["A1", "A2", "B1", "B2"]),
  language: z.string().trim().min(2).max(80),
  pairCount: z.number().int().min(2).max(16),
  speech: z.boolean(),
  agent: z.enum(["codex-terra", "claude-opus"]).optional(),
});
const item = z.object({
  text: z.string().trim().min(1).max(500),
  hint: z.string().max(300),
});
export const generatedSchema = z.object({
  title: z.string().trim().min(1).max(200),
  taskDescription: z.string().max(1000),
  help: z.string().max(1000),
  feedback: z.string().max(500),
  speechLocale: z.string().min(2).max(40),
  pairs: z
    .array(z.object({ first: item, second: item }))
    .min(2)
    .max(16),
  decoys: z.array(item).max(3),
});
export function hydrateGenerated(
  output: unknown,
  request: z.infer<typeof generationInput>,
) {
  const result = generatedSchema.parse(output);
  if (result.pairs.length !== request.pairCount)
    throw new Error("The agent returned the wrong number of pairs. Try again.");
  // Avoid ambiguous answer sets in this proof: one distinct visible answer per side.
  for (const side of ["first", "second"] as const) {
    const texts = result.pairs.map((p) =>
      p[side].text.trim().toLocaleLowerCase(),
    );
    if (new Set(texts).size !== texts.length)
      throw new Error(
        "The agent produced ambiguous duplicate answers. Try again.",
      );
  }
  const activity = newActivity();
  Object.assign(activity, {
    title: result.title,
    taskDescription: result.taskDescription,
    help: result.help,
    feedback: result.feedback,
  });
  activity.config.pairs = result.pairs.map((p) => ({
    id: uid(),
    first: {
      ...newCard(),
      ...p.first,
      type: request.speech ? "speech" : "text",
      locale: result.speechLocale,
    },
    second: { ...newCard(), ...p.second },
  }));
  activity.config.decoys = result.decoys.map((c) => ({ ...newCard(), ...c }));
  const parsed = activitySchema.parse(activity);
  if (validationErrors(parsed).length)
    throw new Error("The generated activity did not pass validation.");
  return parsed;
}
