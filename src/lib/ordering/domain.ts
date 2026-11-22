import { z } from "zod";
const id = z.string().min(1).max(100);
export const orderingSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    template: z.literal("simple_order"),
    title: z.string().max(200),
    locale: z.literal("en"),
    taskDescription: z.string().max(4000),
    help: z.string().max(4000),
    feedback: z.string().max(4000),
    status: z.enum(["draft", "published"]),
    config: z.object({
      checkMode: z.enum(["manual", "automatic"]),
      speech: z.boolean(),
      speechLocale: z.string().max(40),
      orderingRule: z.string().max(1000),
      items: z
        .array(
          z.object({
            id,
            text: z.string().max(500),
            hint: z.string().max(300),
          }),
        )
        .max(40),
    }),
  })
  .superRefine((a, ctx) => {
    const ids = [a.id, ...a.config.items.map((i) => i.id)];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Activity and card IDs must be unique.",
      });
  });
export type OrderingActivity = z.infer<typeof orderingSchema>;
export type OrderResult = "correct" | "incorrect";
export function orderingErrors(a: OrderingActivity) {
  const errors: string[] = [];
  if (!a.title.trim()) errors.push("Give your activity a title.");
  if (!a.config.orderingRule.trim())
    errors.push("Explain the ordering rule for learners.");
  if (a.config.items.length < 3) errors.push("Add at least three cards.");
  if (a.config.items.some((i) => !i.text.trim()))
    errors.push("Enter text for every card.");
  const texts = a.config.items.map((i) => i.text.trim().toLocaleLowerCase());
  if (new Set(texts).size !== texts.length)
    errors.push(
      "Use distinct card text so learners can tell each position apart.",
    );
  return errors;
}
export function moveInOrder(
  order: string[],
  cardId: string,
  targetIndex: number,
) {
  const from = order.indexOf(cardId);
  if (
    from < 0 ||
    !Number.isInteger(targetIndex) ||
    targetIndex < 0 ||
    targetIndex >= order.length ||
    from === targetIndex
  )
    return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(targetIndex, 0, cardId);
  return next;
}
export function evaluateOrder(
  a: OrderingActivity,
  order: string[],
): Record<string, OrderResult> {
  return Object.fromEntries(
    a.config.items.map((item, index) => [
      item.id,
      order[index] === item.id ? "correct" : "incorrect",
    ]),
  );
}
export function orderComplete(
  a: OrderingActivity,
  order: string[],
  results: Record<string, OrderResult>,
) {
  return (
    a.config.items.length > 0 &&
    order.length === a.config.items.length &&
    a.config.items.every(
      (item, index) =>
        order[index] === item.id && results[item.id] === "correct",
    )
  );
}
export function shuffledOrder(a: OrderingActivity) {
  const ids = a.config.items.map((i) => i.id);
  const result = [...ids];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  if (result.length > 1 && result.every((id, index) => id === ids[index]))
    result.push(result.shift()!);
  return result;
}
export const orderingGenerationInput = z.object({
  source: z.string().trim().min(1).max(10000),
  level: z.enum(["A1", "A2", "B1", "B2"]),
  language: z.string().trim().min(2).max(80),
  itemCount: z.number().int().min(3).max(20),
  speech: z.boolean(),
  sourceOnly: z.boolean(),
  orderMode: z.enum(["auto", "alphabetical", "sequence"]),
  agent: z.enum(["codex-terra", "claude-opus"]).optional(),
});
export const generatedOrderingSchema = z.object({
  title: z.string().trim().min(1).max(200),
  taskDescription: z.string().max(1000),
  help: z.string().max(1000),
  feedback: z.string().max(500),
  speechLocale: z.string().min(2).max(40),
  orderMode: z.enum(["alphabetical", "sequence"]),
  orderingRule: z.string().trim().min(1).max(1000),
  items: z
    .array(
      z.object({
        text: z.string().trim().min(1).max(500),
        hint: z.string().max(300),
      }),
    )
    .min(3)
    .max(20),
});
export function hydrateOrdering(
  input: unknown,
  request: z.infer<typeof orderingGenerationInput>,
): OrderingActivity {
  const output = generatedOrderingSchema.parse(input);
  if (output.items.length !== request.itemCount)
    throw new Error("The agent returned the wrong number of cards. Try again.");
  if (request.orderMode !== "auto" && request.orderMode !== output.orderMode)
    throw new Error(
      "The agent did not follow the requested ordering rule. Try again.",
    );
  if (request.sourceOnly) {
    const allowed = new Set(
      request.source
        .split("\n")
        .map((line) => line.split(" — ")[0].trim().toLocaleLowerCase()),
    );
    if (output.items.some((i) => !allowed.has(i.text.toLocaleLowerCase())))
      throw new Error(
        "The agent used vocabulary outside the uploaded source. Try again.",
      );
  }
  const items = [...output.items];
  if (output.orderMode === "alphabetical")
    items.sort((a, b) =>
      a.text.localeCompare(b.text, "en", {
        sensitivity: "base",
        numeric: true,
      }),
    );
  const a = orderingSchema.parse({
    schemaVersion: 1,
    id: crypto.randomUUID(),
    template: "simple_order",
    title: output.title,
    locale: "en",
    taskDescription: output.taskDescription,
    help: output.help,
    feedback: output.feedback,
    status: "draft",
    config: {
      checkMode: "manual",
      speech: request.speech,
      speechLocale: output.speechLocale,
      orderingRule: output.orderingRule,
      items: items.map((i) => ({ ...i, id: crypto.randomUUID() })),
    },
  });
  const errors = orderingErrors(a);
  if (errors.length) throw new Error(errors.join(" "));
  return a;
}
