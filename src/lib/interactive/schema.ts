import { z } from "zod";
import { activitySchema, validationErrors } from "@/lib/matching/domain";
import { groupingSchema, groupingErrors } from "@/lib/grouping/domain";
import { orderingSchema, orderingErrors } from "@/lib/ordering/domain";
export const interactiveActivitySchema = z.union([
  activitySchema,
  groupingSchema,
  orderingSchema,
]);
export type InteractiveActivity = z.infer<typeof interactiveActivitySchema>;
export function interactiveErrors(a: InteractiveActivity) {
  return a.template === "matching_pairs"
    ? validationErrors(a).map((e) => e.message)
    : a.template === "group_assignment"
      ? groupingErrors(a)
      : orderingErrors(a);
}
