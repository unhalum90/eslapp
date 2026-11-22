import { interactiveActivitySchema, type InteractiveActivity } from "./schema";
export const INTERACTIVE_DRAFT_KEYS = [
  "esl-matching-drafts-v1",
  "esl-grouping-drafts-v1",
  "esl-ordering-drafts-v1",
];
export function readDeviceActivities(): InteractiveActivity[] {
  return INTERACTIVE_DRAFT_KEYS.flatMap((key) => {
    const entries: unknown = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(entries)
      ? entries.flatMap((entry) => {
          const parsed = interactiveActivitySchema.safeParse(entry);
          return parsed.success ? [parsed.data] : [];
        })
      : [];
  });
}
export function saveDeviceActivity(input: InteractiveActivity) {
  const a = interactiveActivitySchema.parse(input);
  const key =
    a.template === "matching_pairs"
      ? INTERACTIVE_DRAFT_KEYS[0]
      : a.template === "group_assignment"
        ? INTERACTIVE_DRAFT_KEYS[1]
        : INTERACTIVE_DRAFT_KEYS[2];
  const entries: unknown = JSON.parse(localStorage.getItem(key) || "[]");
  const previous = Array.isArray(entries)
    ? entries.flatMap((entry) => {
        const p = interactiveActivitySchema.safeParse(entry);
        return p.success ? [p.data] : [];
      })
    : [];
  localStorage.setItem(
    key,
    JSON.stringify([a, ...previous.filter((d) => d.id !== a.id)]),
  );
}
