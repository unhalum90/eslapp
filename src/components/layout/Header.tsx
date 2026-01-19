import Link from "next/link";
import { BookOpen } from "lucide-react";

export function Header() {
    return (
        <header className="h-16 border-b bg-white px-6 flex items-center justify-between z-10 sticky top-0">
            <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                    <BookOpen size={24} />
                </div>
                <span className="font-bold text-xl text-slate-900 tracking-tight">The ESL Architect</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>Demo User</span>
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
            </div>
        </header>
    );
}
