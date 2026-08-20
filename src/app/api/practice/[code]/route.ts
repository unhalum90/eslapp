import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Practice storage is not configured." }, { status: 503 });
  }

  const supabase = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase
    .from("unit_publications")
    .select("payload")
    .eq("code", code.toUpperCase())
    .eq("published", true)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Practice lookup failed." }, { status: 503 });
  }
  if (!data) {
    return NextResponse.json({ error: "Practice not found." }, { status: 404 });
  }
  return NextResponse.json(data.payload, {
    headers: { "Cache-Control": "no-store" },
  });
}
