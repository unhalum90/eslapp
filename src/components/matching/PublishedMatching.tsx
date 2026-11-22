import { matchingPublication } from "@/lib/matching/publication";
import { MatchingPlayer } from "./MatchingPlayer";

export async function PublishedMatching({ code }: { code: string }) {
  let activity = null;
  let failure = "";
  try {
    activity = await matchingPublication(code);
  } catch (error) {
    failure = error instanceof Error ? error.message : "Try again later.";
  }
  if (activity) return <MatchingPlayer activity={activity} />;
  return (
    <div
      role={failure ? "alert" : undefined}
      className="mx-auto max-w-lg p-8 text-center"
    >
      <h1 className="text-2xl font-bold">
        {failure ? "Could not load activity" : "Activity unavailable"}
      </h1>
      <p className="mt-3">
        {failure ||
          "This link may have been revoked. Ask your teacher for the current link."}
      </p>
    </div>
  );
}
