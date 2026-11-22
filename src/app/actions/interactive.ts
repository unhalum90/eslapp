"use server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  interactiveActivitySchema,
  interactiveErrors,
} from "@/lib/interactive/schema";
async function owner() {
  const db = await createServerSupabaseClient();
  if (!db)
    throw new Error(
      "Cloud storage is not configured. Device drafts remain available.",
    );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user)
    throw new Error("Sign in to sync drafts or publish learner links.");
  return { db, user };
}
function fail(e: unknown) {
  return {
    ok: false as const,
    message: e instanceof Error ? e.message : "Activity storage failed.",
  };
}
export async function saveInteractiveDraft(input: unknown) {
  try {
    const a = interactiveActivitySchema.parse(input);
    const { db, user } = await owner();
    const { error } = await db
      .from("matching_activities")
      .upsert({
        id: a.id,
        owner_id: user.id,
        payload: { ...a, status: "draft" },
        updated_at: new Date().toISOString(),
      });
    if (error)
      throw new Error(
        "Cloud save failed. Check the interactive activity database migration.",
      );
    return { ok: true as const };
  } catch (e) {
    return fail(e);
  }
}
export async function listInteractiveDrafts() {
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
        "Cloud drafts could not be loaded. Check the activity database migration.",
      );
    return {
      ok: true as const,
      activities: (data ?? []).flatMap((row) => {
        const parsed = interactiveActivitySchema.safeParse(row.payload);
        return parsed.success ? [parsed.data] : [];
      }),
    };
  } catch (e) {
    return fail(e);
  }
}
export async function publishInteractive(input: unknown) {
  try {
    const a = interactiveActivitySchema.parse(input);
    const errors = interactiveErrors(a);
    if (errors.length) throw new Error(errors.join(" "));
    const { db, user } = await owner();
    const code = crypto.randomUUID().replaceAll("-", "");
    const { error } = await db
      .from("matching_publications")
      .insert({
        code,
        activity_id: a.id,
        owner_id: user.id,
        payload: { ...a, status: "published" },
      });
    if (error)
      throw new Error(
        "Publishing failed. Check the activity database migration.",
      );
    return { ok: true as const, code };
  } catch (e) {
    return fail(e);
  }
}
export async function revokeInteractive(code: string) {
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
    return fail(e);
  }
}
