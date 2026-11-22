import "server-only";
import { createClient } from "@supabase/supabase-js";
import { activitySchema } from "./domain";

export async function matchingPublication(code: string) {
  if (!/^[a-f0-9]{32}$/.test(code)) return null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) throw new Error("Activity storage is not configured.");
  // Anonymous read: no student identity, auth cookies or attempt writes.
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db
    .from("matching_publications")
    .select("payload")
    .eq("code", code)
    .maybeSingle();
  if (error)
    throw new Error(
      "This activity could not be loaded. Please try again later.",
    );
  if (!data) return null;
  const parsed = activitySchema.safeParse(data.payload);
  return parsed.success ? parsed.data : null;
}
