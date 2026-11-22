"use server";
import { activitySchema, validationErrors } from "@/lib/matching/domain";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function owner() {
  const db = await createServerSupabaseClient();
  if (!db)
    throw new Error(
      "Cloud storage is not configured. Your device drafts still work.",
    );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    throw new Error("Sign in to sync drafts or publish learner links.");
  return { db, user };
}
function failure(error: unknown) {
  return {
    ok: false as const,
    message:
      error instanceof Error ? error.message : "Activity storage failed.",
  };
}
export async function saveMatchingDraft(input: unknown) {
  try {
    const activity = activitySchema.parse(input);
    const { db, user } = await owner();
    const { error } = await db
      .from("matching_activities")
      .upsert({
        id: activity.id,
        owner_id: user.id,
        payload: { ...activity, status: "draft" },
        updated_at: new Date().toISOString(),
      });
    if (error)
      throw new Error(
        "Could not sync the draft. Check that the matching-pairs database migration has been applied.",
      );
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}
export async function listMatchingDrafts() {
  try {
    const { db, user } = await owner();
    const { data, error } = await db
      .from("matching_activities")
      .select("payload")
      .eq("owner_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error)
      throw new Error(
        "Could not load cloud drafts. Check the matching-pairs database migration.",
      );
    return {
      ok: true as const,
      activities: (data ?? []).flatMap((row) => {
        const parsed = activitySchema.safeParse(row.payload);
        return parsed.success ? [parsed.data] : [];
      }),
    };
  } catch (e) {
    return failure(e);
  }
}
export async function publishMatching(input: unknown) {
  try {
    const activity = activitySchema.parse(input);
    const errors = validationErrors(activity);
    if (errors.length) throw new Error(errors.map((e) => e.message).join(" "));
    const { db, user } = await owner();
    const code = crypto.randomUUID().replaceAll("-", "");
    const { error } = await db
      .from("matching_publications")
      .insert({
        code,
        activity_id: activity.id,
        owner_id: user.id,
        payload: {
          ...activity,
          status: "published",
          config: {
            ...activity.config,
            decoys: activity.config.decoys.filter(
              (c) => c.text.trim() || c.media.url.trim(),
            ),
          },
        },
      });
    if (error)
      throw new Error(
        "Publishing failed. Check that the matching-pairs database migration has been applied.",
      );
    return { ok: true as const, code };
  } catch (e) {
    return failure(e);
  }
}
export async function unpublishMatching(code: string) {
  try {
    const { db, user } = await owner();
    const { error } = await db
      .from("matching_publications")
      .delete()
      .eq("code", code)
      .eq("owner_id", user.id);
    if (error) throw new Error("Could not revoke this link.");
    return { ok: true as const };
  } catch (e) {
    return failure(e);
  }
}
