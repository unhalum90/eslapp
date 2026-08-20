import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { parseOwnerEmails } from "@/lib/ai/catalog";

export interface AiIdentity {
  email: string;
  isOwner: boolean;
}

export async function getAiIdentity(): Promise<AiIdentity | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email?.trim().toLocaleLowerCase("en");
  if (!email) return null;

  return {
    email,
    isOwner: parseOwnerEmails(process.env.APP_OWNER_EMAILS).has(email),
  };
}

export async function requireAiIdentity(): Promise<AiIdentity> {
  const identity = await getAiIdentity();
  if (!identity) {
    throw new Error("Sign in with a teacher account before using paid AI generation.");
  }
  return identity;
}
