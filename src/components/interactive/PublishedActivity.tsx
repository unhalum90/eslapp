import { interactivePublication } from "@/lib/interactive/publication";
import { OrderingPlayer } from "@/components/ordering/OrderingPlayer";
import { GroupingPlayer } from "@/components/grouping/GroupingPlayer";
import { MatchingPlayer } from "@/components/matching/MatchingPlayer";
export async function PublishedActivity({ code }: { code: string }) {
  let activity = null;
  let failure = "";
  try {
    activity = await interactivePublication(code);
  } catch (e) {
    failure = e instanceof Error ? e.message : "Try again later.";
  }
  if (activity)
    return activity.template === "group_assignment" ? (
      <GroupingPlayer activity={activity} />
    ) : activity.template === "simple_order" ? (
      <OrderingPlayer activity={activity} />
    ) : (
      <MatchingPlayer activity={activity} />
    );
  return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <h1 className="text-2xl font-bold">Activity unavailable</h1>
      <p className="mt-3">
        {failure ||
          "This link may have been revoked. Ask your teacher for the current link."}
      </p>
    </div>
  );
}
