import { z } from "zod";

const id = z.string().min(1).max(100);
export const groupingSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    template: z.literal("group_assignment"),
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
      groups: z
        .array(z.object({ id, title: z.string().max(100) }))
        .min(2)
        .max(6),
      items: z
        .array(
          z.object({
            id,
            text: z.string().max(500),
            hint: z.string().max(300),
            groupId: id,
          }),
        )
        .max(40),
    }),
  })
  .superRefine((a, ctx) => {
    const ids = [
      a.id,
      ...a.config.groups.map((g) => g.id),
      ...a.config.items.map((i) => i.id),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Activity, group and card IDs must be unique.",
      });
    if (
      a.config.items.some(
        (i) => !a.config.groups.some((g) => g.id === i.groupId),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Every card must belong to an existing group.",
      });
  });
export type GroupingActivity = z.infer<typeof groupingSchema>;
export type GroupingItem = GroupingActivity["config"]["items"][number];
export type GroupAssignments = Record<string, string>;
export type GroupResults = Record<string, "correct" | "incorrect">;
export function groupingErrors(a: GroupingActivity): string[] {
  const errors: string[] = [];
  if (!a.title.trim()) errors.push("Give your activity a title.");
  if (a.config.items.length < 4) errors.push("Add at least four cards.");
  if (a.config.groups.some((g) => !g.title.trim()))
    errors.push("Name every group.");
  if (
    new Set(a.config.groups.map((g) => g.title.trim().toLocaleLowerCase()))
      .size !== a.config.groups.length
  )
    errors.push("Give each group a distinct name.");
  if (a.config.items.some((i) => !i.text.trim()))
    errors.push("Enter text for every card.");
  if (
    a.config.groups.some((g) => !a.config.items.some((i) => i.groupId === g.id))
  )
    errors.push("Each group needs at least one card.");
  return errors;
}
export function evaluateGroups(
  a: GroupingActivity,
  placements: GroupAssignments,
): GroupResults {
  return Object.fromEntries(
    a.config.items
      .filter((i) => placements[i.id])
      .map((i) => [
        i.id,
        placements[i.id] === i.groupId ? "correct" : "incorrect",
      ]),
  );
}
export function groupsComplete(
  a: GroupingActivity,
  placements: GroupAssignments,
  results: GroupResults,
) {
  return (
    a.config.items.length > 0 &&
    a.config.items.every(
      (i) => placements[i.id] === i.groupId && results[i.id] === "correct",
    )
  );
}
export function moveToGroup(
  a: GroupingActivity,
  placements: GroupAssignments,
  cardId: string,
  groupId: string,
): GroupAssignments {
  if (
    !a.config.items.some((i) => i.id === cardId) ||
    (groupId && !a.config.groups.some((g) => g.id === groupId))
  )
    return placements;
  const next = { ...placements };
  if (groupId) next[cardId] = groupId;
  else delete next[cardId];
  return next;
}
export const groupingGenerationInput = z.object({
  source: z.string().trim().min(1).max(10000),
  level: z.enum(["A1", "A2", "B1", "B2"]),
  language: z.string().trim().min(2).max(80),
  groupCount: z.number().int().min(2).max(6),
  itemCount: z.number().int().min(4).max(24),
  speech: z.boolean(),
  sourceOnly: z.boolean(),
  agent: z.enum(["codex-terra", "claude-opus"]).optional(),
});
export const generatedGroupingSchema = z.object({
  title: z.string().trim().min(1).max(200),
  taskDescription: z.string().max(1000),
  help: z.string().max(1000),
  feedback: z.string().max(500),
  speechLocale: z.string().min(2).max(40),
  groups: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(100),
        items: z
          .array(
            z.object({
              text: z.string().trim().min(1).max(500),
              hint: z.string().max(300),
            }),
          )
          .min(1)
          .max(24),
      }),
    )
    .min(2)
    .max(6),
});
export function hydrateGrouping(
  input: unknown,
  request: z.infer<typeof groupingGenerationInput>,
): GroupingActivity {
  const output = generatedGroupingSchema.parse(input);
  if (
    output.groups.length !== request.groupCount ||
    output.groups.reduce((n, g) => n + g.items.length, 0) !== request.itemCount
  )
    throw new Error(
      "The agent returned the wrong number of groups or cards. Try again.",
    );
  const texts = output.groups.flatMap((g) =>
    g.items.map((i) => i.text.trim().toLocaleLowerCase()),
  );
  if (new Set(texts).size !== texts.length)
    throw new Error("The agent returned duplicate vocabulary. Try again.");
  if (request.sourceOnly) {
    const allowed = new Set(
      request.source
        .split("\n")
        .map((line) => line.split(" — ")[0].trim().toLocaleLowerCase())
        .filter(Boolean),
    );
    if (texts.some((text) => !allowed.has(text)))
      throw new Error(
        "The agent used vocabulary outside the uploaded source. Try again.",
      );
  }
  const groups = output.groups.map((g) => ({
    id: crypto.randomUUID(),
    title: g.title,
  }));
  const activity = groupingSchema.parse({
    schemaVersion: 1,
    id: crypto.randomUUID(),
    template: "group_assignment",
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
      groups,
      items: output.groups.flatMap((g, index) =>
        g.items.map((i) => ({
          ...i,
          id: crypto.randomUUID(),
          groupId: groups[index].id,
        })),
      ),
    },
  });
  const errors = groupingErrors(activity);
  if (errors.length) throw new Error(errors.join(" "));
  return activity;
}
