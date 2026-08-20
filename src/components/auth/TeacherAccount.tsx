"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LogOut, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function TeacherAccount() {
  const [email, setEmail] = useState("");
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (active) setSignedInEmail(data.user?.email ?? null);
    });
    return () => {
      active = false;
    };
  }, [supabase]);

  if (!supabase) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
        Supabase is not configured. The authoring workspace remains available on this device, but
        cross-device publishing and teacher sign-in are disabled.
      </div>
    );
  }

  const sendMagicLink = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/account` },
    });
    setMessage(error ? error.message : "Check your email for a secure sign-in link.");
    setBusy(false);
  };

  const signOut = async () => {
    setBusy(true);
    await supabase.auth.signOut();
    setSignedInEmail(null);
    setMessage("Signed out on this device.");
    setBusy(false);
  };

  if (signedInEmail) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="text-emerald-600" />
          <div>
            <p className="font-black text-emerald-950">Signed in</p>
            <p className="text-sm text-emerald-800">{signedInEmail}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void signOut()}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-bold text-emerald-900 disabled:opacity-50"
        >
          <LogOut size={16} /> Sign out
        </button>
        {message && <p className="mt-3 text-sm text-emerald-800">{message}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <label className="text-sm font-bold text-slate-900" htmlFor="teacher-email">
        Teacher email
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-2.5 text-slate-400" size={18} />
          <input
            id="teacher-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="teacher@example.com"
            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-indigo-500"
          />
        </div>
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={() => void sendMagicLink()}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Email sign-in link
        </button>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">
        Sign-in is only required for cross-device publication. Students open practice links
        anonymously and do not create accounts.
      </p>
      {message && <p className="mt-3 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</p>}
    </div>
  );
}
