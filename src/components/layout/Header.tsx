import Link from "next/link";
import { BookOpen } from "lucide-react";
import { AgentSelector } from "@/components/ai/AgentSelector";

export function Header() {
    return (
        <header className="h-16 border-b bg-white px-3 sm:px-6 flex items-center justify-between z-10 sticky top-0">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                    <BookOpen size={24} />
                </div>
                <span className="hidden font-bold text-xl text-slate-900 tracking-tight md:inline">The ESL Architect</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600 sm:gap-4">
                <AgentSelector />
                <Link href="/workspace" className="hidden hover:text-indigo-600 sm:inline">Teacher workspace</Link>
                <Link href="/account" className="rounded-full bg-slate-100 px-3 py-2 font-semibold hover:bg-indigo-50 hover:text-indigo-700">
                    Account
                </Link>
            </div>
        </header>
    );
}
