import type { Metadata } from "next";
import { TeacherAccount } from "@/components/auth/TeacherAccount";

export const metadata: Metadata = {
  title: "Teacher Account | ESL Architect",
  description: "Sign in to publish ESL practice links across devices.",
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Teacher access</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Account</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use an email magic link to publish permanent practice codes beyond this browser.
        </p>
      </div>
      <TeacherAccount />
    </div>
  );
}
