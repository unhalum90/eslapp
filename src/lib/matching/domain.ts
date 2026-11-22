import { z } from "zod";

const id = z.string().min(1).max(100);
const short = z.string().max(4000);
const media = z.object({
  url: z.string().max(2000),
  label: z.string().max(300),
  startSeconds: z.number().min(0).max(86400).optional(),
  endSeconds: z.number().min(0).max(86400).optional(),
  muted: z.boolean().optional(),
});
export const cardSchema = z.object({
  id,
  type: z.enum(["text", "image", "speech", "audio", "video"]),
  text: short,
  hint: short,
  locale: z.string().max(40),
  voice: z.string().max(200).optional(),
  media,
});
export const activitySchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    template: z.literal("matching_pairs"),
    title: z.string().max(200),
    locale: z.literal("en"),
    taskDescription: short,
    help: short,
    feedback: short,
    status: z.enum(["draft", "published"]),
    config: z.object({
      checkMode: z.enum(["manual", "automatic"]),
      colorSides: z.boolean(),
      attachment: z.enum(["vertical", "horizontal"]),
      pairs: z
        .array(z.object({ id, first: cardSchema, second: cardSchema }))
        .min(1)
        .max(50),
      decoys: z.array(cardSchema).max(3),
    }),
  })
  .superRefine((activity, ctx) => {
    const ids = [
      activity.id,
      ...activity.config.pairs.flatMap((p) => [p.id, p.first.id, p.second.id]),
      ...activity.config.decoys.map((c) => c.id),
    ];
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "All activity, pair and card IDs must be unique.",
      });
  });
export type MatchingActivity = z.infer<typeof activitySchema>;
export type MatchingCard = z.infer<typeof cardSchema>;
export type Attachment = {
  first: string;
  second: string;
  result: "pending" | "correct" | "incorrect";
};
export const uid = () => crypto.randomUUID();
export function newCard(): MatchingCard {
  return {
    id: uid(),
    type: "text",
    text: "",
    hint: "",
    locale: "en-GB",
    media: { url: "", label: "" },
  };
}
export function newPair() {
  return { id: uid(), first: newCard(), second: newCard() };
}
export function newActivity(): MatchingActivity {
  return {
    schemaVersion: 1,
    id: uid(),
    template: "matching_pairs",
    title: "",
    locale: "en",
    taskDescription: "",
    help: "",
    feedback: "You matched every pair. Well done!",
    status: "draft",
    config: {
      checkMode: "manual",
      colorSides: true,
      attachment: "vertical",
      pairs: [newPair()],
      decoys: [],
    },
  };
}
export function exampleActivity(kind = 0): MatchingActivity {
  const a = newActivity();
  a.title = kind ? "Everyday opposites" : "Animals and their sounds";
  a.taskDescription = kind
    ? "Match each word with its opposite."
    : "Match each animal with the sound it makes. One sound is extra!";
  a.config.pairs = (
    kind
      ? [
          ["Hot", "Cold"],
          ["Big", "Small"],
          ["Happy", "Sad"],
        ]
      : [
          ["Cat", "Meow"],
          ["Dog", "Woof"],
          ["Bird", "Tweet"],
        ]
  ).map(([first, second]) => ({
    id: uid(),
    first: { ...newCard(), text: first },
    second: { ...newCard(), text: second },
  }));
  if (!kind) a.config.decoys = [{ ...newCard(), text: "Moo" }];
  return a;
}
export function configured(c: MatchingCard) {
  return Boolean(
    c.text.trim() ||
    c.media.url.trim() ||
    c.media.label.trim() ||
    c.hint.trim(),
  );
}
export function safeMediaUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function cardErrors(c: MatchingCard): string[] {
  if (c.type === "text" || c.type === "speech")
    return c.text.trim() ? [] : ["Enter card text."];
  const errors: string[] = [];
  if (!safeMediaUrl(c.media.url))
    errors.push("Enter a public HTTPS media URL.");
  if (!c.media.label.trim()) errors.push("Add an accessible description.");
  if (
    c.type === "video" &&
    safeMediaUrl(c.media.url) &&
    !new URL(c.media.url).pathname.toLowerCase().endsWith(".mp4")
  )
    errors.push(
      "Use a direct .mp4 video URL. Provider embeds are not supported yet.",
    );
  if (
    c.media.endSeconds !== undefined &&
    c.media.endSeconds <= (c.media.startSeconds ?? 0)
  )
    errors.push("End time must be after the start time.");
  return errors;
}
export function validationErrors(
  a: MatchingActivity,
): { path: string; message: string }[] {
  const errors: { path: string; message: string }[] = [];
  if (!a.title.trim())
    errors.push({ path: "title", message: "Give your activity a title." });
  if (a.config.pairs.length < 2)
    errors.push({ path: "pairs", message: "Add at least two complete pairs." });
  a.config.pairs.forEach((p, i) =>
    (["first", "second"] as const).forEach((side) =>
      cardErrors(p[side]).forEach((message) =>
        errors.push({
          path: `pair-${i}-${side}`,
          message: `Pair ${i + 1}, ${side} card: ${message}`,
        }),
      ),
    ),
  );
  a.config.decoys.forEach((c, i) => {
    if (configured(c))
      cardErrors(c).forEach((message) =>
        errors.push({
          path: `decoy-${i}`,
          message: `Extra card ${i + 1}: ${message}`,
        }),
      );
  });
  return errors;
}
export function cards(a: MatchingActivity) {
  return [
    ...a.config.pairs.flatMap((p) => [
      { card: p.first, side: "A" },
      { card: p.second, side: "B" },
    ]),
    ...a.config.decoys
      .filter(configured)
      .map((card) => ({ card, side: "Extra" })),
  ];
}
export function isCorrect(a: MatchingActivity, first: string, second: string) {
  return (
    first !== second &&
    a.config.pairs.some(
      (p) =>
        (p.first.id === first && p.second.id === second) ||
        (p.first.id === second && p.second.id === first),
    )
  );
}
export function attach(
  a: MatchingActivity,
  current: Attachment[],
  first: string,
  second: string,
): Attachment[] {
  const validIds = new Set(cards(a).map((c) => c.card.id));
  if (
    first === second ||
    !validIds.has(first) ||
    !validIds.has(second) ||
    current.some(
      (p) =>
        [p.first, p.second].includes(first) ||
        [p.first, p.second].includes(second),
    )
  )
    return current;
  return [
    ...current,
    {
      first,
      second,
      result:
        a.config.checkMode === "manual"
          ? "pending"
          : isCorrect(a, first, second)
            ? "correct"
            : "incorrect",
    },
  ];
}
export function evaluate(
  a: MatchingActivity,
  current: Attachment[],
): Attachment[] {
  return current.map((p) => ({
    ...p,
    result: isCorrect(a, p.first, p.second) ? "correct" : "incorrect",
  }));
}
export function completed(a: MatchingActivity, current: Attachment[]) {
  return (
    a.config.pairs.length > 0 &&
    a.config.pairs.every((p) =>
      current.some(
        (m) =>
          m.result === "correct" &&
          ((m.first === p.first.id && m.second === p.second.id) ||
            (m.first === p.second.id && m.second === p.first.id)),
      ),
    )
  );
}
export function shuffle<T>(values: T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
